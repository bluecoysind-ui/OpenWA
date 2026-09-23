import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Not, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { createLogger } from '../../common/services/logger.service';
import { MessageService } from '../message/message.service';
import { isPacingLimitedError } from '../message/send-pacing.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto } from './dto/scheduled-message.dto';
import { ScheduledMediaType, ScheduledMessage, ScheduledMessageStatus } from './entities/scheduled-message.entity';
import {
  assertRecurrenceRule,
  nextOccurrence,
  parseUntilUtc,
  skipMissedOccurrences,
  zonedParts,
  type RecurrenceKind,
  type RecurrenceRule,
} from './scheduler-recurrence';
import { assertIanaTimeZone, pacingBackoffMs, parseSendAtUtc } from './scheduler-time';

const TICK_MS = 5_000;
const CLAIM_BATCH = 20;
const ERROR_SNIPPET = 500;
const CLOCK_SKEW_MS = 2_000;

const INTERRUPTED_ERROR = 'interrupted (process restarted while sending)';
const EDITABLE = new Set([ScheduledMessageStatus.PENDING, ScheduledMessageStatus.PAUSED]);
const ACTIVE_RECURRING = [
  ScheduledMessageStatus.PENDING,
  ScheduledMessageStatus.PAUSED,
  ScheduledMessageStatus.SENDING,
];

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('SchedulerService');
  private timer?: ReturnType<typeof setInterval>;
  private ticking = false;

  constructor(
    @InjectRepository(ScheduledMessage, 'data')
    private readonly jobs: Repository<ScheduledMessage>,
    private readonly messages: MessageService,
    private readonly webhooks: WebhookService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    void this.boot();
  }

  private async boot(): Promise<void> {
    try {
      await this.ensureRecurrenceSchema();
    } catch (err) {
      this.logger.error(
        'Scheduler schema check failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
    void this.failInterruptedJobs().catch(err =>
      this.logger.error('Scheduler crash-recovery failed', err instanceof Error ? err.stack : String(err)),
    );
    if (!this.flagOn()) {
      this.logger.log('Scheduled-message loop idle (SCHEDULED_MESSAGES=false)');
      return;
    }
    this.timer = setInterval(() => {
      this.tick().catch(err =>
        this.logger.error('Scheduler tick failed', err instanceof Error ? err.stack : String(err)),
      );
    }, TICK_MS);
    this.timer.unref?.();
  }

  private async ensureRecurrenceSchema(): Promise<void> {
    const type = this.jobs.manager.connection.options.type;
    if (type !== 'better-sqlite3' && type !== 'postgres') return;

    const needed: Array<[string, string]> = [
      ['recurrence', `varchar(16) NOT NULL DEFAULT 'none'`],
      ['recurrenceInterval', `integer NOT NULL DEFAULT 1`],
      ['daysOfWeek', `text`],
      ['dayOfMonth', `integer`],
      ['untilUtc', type === 'postgres' ? 'timestamp' : 'datetime'],
      ['maxOccurrences', `integer`],
      ['occurrenceCount', `integer NOT NULL DEFAULT 0`],
      ['anchorAtUtc', type === 'postgres' ? 'timestamp' : 'datetime'],
    ];

    let existing: Set<string>;
    if (type === 'postgres') {
      const rows = (await this.jobs.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'scheduled_messages'`,
      )) as Array<{ column_name: string }>;
      if (rows.length === 0) return;
      existing = new Set(rows.map(r => r.column_name));
    } else {
      const rows = (await this.jobs.query(`PRAGMA table_info("scheduled_messages")`)) as Array<{ name: string }>;
      if (rows.length === 0) return;
      existing = new Set(rows.map(r => r.name));
    }

    for (const [column, ddl] of needed) {
      if (existing.has(column)) continue;
      await this.jobs.query(`ALTER TABLE "scheduled_messages" ADD COLUMN "${column}" ${ddl}`);
      this.logger.log(`Added scheduled_messages.${column} (missed migration 178690)`);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async create(sessionId: string, dto: CreateScheduledMessageDto): Promise<ScheduledMessage> {
    this.assertFlagOn();
    if (!dto.text && !dto.mediaUrl) {
      throw new BadRequestException('Provide text or mediaUrl');
    }
    const timezone = dto.timezone?.trim() || 'UTC';
    assertIanaTimeZone(timezone);
    const sendAtUtc = parseSendAtUtc(dto.sendAt);
    this.assertHorizon(sendAtUtc);
    this.assertNotTooLate(sendAtUtc);
    await this.assertPendingCap(sessionId);

    const recurrence = this.applyRecurrenceFields(dto, timezone, sendAtUtc);
    if (recurrence.recurrence !== 'none') {
      await this.assertRecurringCap(sessionId);
    }

    const mediaType = this.resolveMediaType(dto.mediaType, dto.mediaUrl);
    const job = this.jobs.create({
      sessionId,
      chatId: dto.chatId,
      sendAtUtc,
      timezone,
      text: dto.text ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      mediaType,
      caption: dto.caption ?? null,
      status: ScheduledMessageStatus.PENDING,
      attemptCount: 0,
      occurrenceCount: 0,
      anchorAtUtc: sendAtUtc,
      ...recurrence,
    });
    const saved = await this.jobs.save(job);
    void this.audit.logInfo(AuditAction.SCHEDULED_MESSAGE_CREATED, {
      sessionId,
      metadata: { jobId: saved.id, chatId: saved.chatId, mediaType: saved.mediaType },
    });
    return saved;
  }

  async findAll(sessionId: string): Promise<ScheduledMessage[]> {
    return this.jobs.find({ where: { sessionId }, order: { sendAtUtc: 'ASC', createdAt: 'ASC' } });
  }

  async findOne(sessionId: string, jobId: string): Promise<ScheduledMessage> {
    const job = await this.jobs.findOne({ where: { id: jobId, sessionId } });
    if (!job) throw new NotFoundException('Scheduled message not found');
    return job;
  }

  async update(sessionId: string, jobId: string, dto: UpdateScheduledMessageDto): Promise<ScheduledMessage> {
    this.assertFlagOn();
    const job = await this.findOne(sessionId, jobId);
    if (!EDITABLE.has(job.status)) {
      throw new ConflictException('Only pending or paused jobs can be updated');
    }
    if (dto.timezone !== undefined) {
      const timezone = dto.timezone.trim() || 'UTC';
      assertIanaTimeZone(timezone);
      job.timezone = timezone;
    }
    if (dto.sendAt !== undefined) {
      const sendAtUtc = parseSendAtUtc(dto.sendAt);
      this.assertHorizon(sendAtUtc);
      this.assertNotTooLate(sendAtUtc);
      job.sendAtUtc = sendAtUtc;
      if (!job.anchorAtUtc) job.anchorAtUtc = sendAtUtc;
    }
    if (dto.text !== undefined) job.text = dto.text;
    if (dto.mediaUrl !== undefined) job.mediaUrl = dto.mediaUrl;
    if (dto.mediaType !== undefined) job.mediaType = dto.mediaType;
    if (dto.caption !== undefined) job.caption = dto.caption;
    if (!job.text && !job.mediaUrl) {
      throw new BadRequestException('Provide text or mediaUrl');
    }
    job.mediaType = this.resolveMediaType(job.mediaType, job.mediaUrl);

    const becomingRecurring =
      (dto.recurrence !== undefined ? dto.recurrence : job.recurrence) !== 'none' && job.recurrence === 'none';
    const fields = this.applyRecurrenceFields(
      {
        recurrence: dto.recurrence ?? job.recurrence,
        interval: dto.interval ?? job.recurrenceInterval,
        daysOfWeek: dto.daysOfWeek === undefined ? (job.daysOfWeek ?? undefined) : (dto.daysOfWeek ?? undefined),
        dayOfMonth: dto.dayOfMonth === undefined ? (job.dayOfMonth ?? undefined) : (dto.dayOfMonth ?? undefined),
        until: dto.until === undefined ? undefined : (dto.until ?? undefined),
        maxOccurrences:
          dto.maxOccurrences === undefined ? (job.maxOccurrences ?? undefined) : (dto.maxOccurrences ?? undefined),
      },
      job.timezone,
      job.sendAtUtc,
      { existingUntil: dto.until === undefined ? job.untilUtc : null },
    );
    if (dto.until === null) fields.untilUtc = null;
    if (becomingRecurring) await this.assertRecurringCap(sessionId);
    Object.assign(job, fields);

    if (dto.status === ScheduledMessageStatus.PAUSED) {
      job.status = ScheduledMessageStatus.PAUSED;
    } else if (dto.status === ScheduledMessageStatus.PENDING) {
      job.status = ScheduledMessageStatus.PENDING;
    }
    return this.jobs.save(job);
  }

  async cancel(sessionId: string, jobId: string): Promise<void> {
    const job = await this.findOne(sessionId, jobId);
    if (job.status === ScheduledMessageStatus.SENDING) {
      throw new ConflictException('Job is currently sending and cannot be cancelled');
    }
    if (!EDITABLE.has(job.status)) {
      throw new ConflictException('Only pending or paused jobs can be cancelled');
    }
    const claimed = await this.claimStatus(job.id, job.status, {
      status: ScheduledMessageStatus.CANCELLED,
    });
    if (!claimed) throw new ConflictException('Job is no longer pending');
    void this.audit.logInfo(AuditAction.SCHEDULED_MESSAGE_CANCELLED, {
      sessionId,
      metadata: { jobId: job.id, chatId: job.chatId },
    });
  }

  /** Crash recovery: one-shot SENDING → FAILED; recurring skips that fire and schedules the next. */
  async failInterruptedJobs(): Promise<number> {
    const rows = await this.jobs.find({ where: { status: ScheduledMessageStatus.SENDING } });
    let n = 0;
    for (const job of rows) {
      if (this.isRecurring(job)) {
        await this.finishOccurrence(job, new Date(), { lastError: INTERRUPTED_ERROR });
      } else {
        await this.jobs.update(job.id, { status: ScheduledMessageStatus.FAILED, lastError: INTERRUPTED_ERROR });
      }
      n += 1;
    }
    if (n > 0) this.logger.warn(`Recovered ${n} interrupted scheduled message(s)`);
    return n;
  }

  async tick(now = new Date()): Promise<void> {
    if (!this.flagOn() || this.ticking) return;
    this.ticking = true;
    try {
      await this.processDueJobs(now);
    } finally {
      this.ticking = false;
    }
  }

  async processDueJobs(now = new Date()): Promise<void> {
    const due = await this.jobs.find({
      where: { status: ScheduledMessageStatus.PENDING, sendAtUtc: LessThanOrEqual(now) },
      order: { sendAtUtc: 'ASC' },
      take: CLAIM_BATCH,
    });
    for (const job of due) {
      await this.processOne(job, now);
    }
  }

  private async processOne(job: ScheduledMessage, now: Date): Promise<void> {
    const claimed = await this.claimDue(job.id, now);
    if (!claimed) return;

    if (this.isTooLate(job.sendAtUtc, now)) {
      if (this.isRecurring(job)) {
        await this.finishOccurrence(job, now, { lastError: 'skipped: overdue (beyond max lateness)' });
        return;
      }
      await this.markFailed(job, 'overdue (beyond max lateness)');
      return;
    }

    try {
      const sent = await this.send(job);
      if (this.isRecurring(job)) {
        await this.finishOccurrence(job, now, { sentMessageId: sent.messageId ?? null, lastError: null });
      } else {
        await this.jobs.update(job.id, {
          status: ScheduledMessageStatus.SENT,
          sentMessageId: sent.messageId ?? null,
          lastError: null,
        });
      }
      void this.webhooks.dispatch(job.sessionId, 'scheduled.message.sent', {
        sessionId: job.sessionId,
        jobId: job.id,
        chatId: job.chatId,
        messageId: sent.messageId ?? null,
      });
      void this.audit.logInfo(AuditAction.SCHEDULED_MESSAGE_SENT, {
        sessionId: job.sessionId,
        metadata: { jobId: job.id, chatId: job.chatId, messageId: sent.messageId ?? null },
      });
    } catch (error) {
      if (isPacingLimitedError(error)) {
        const attempt = job.attemptCount + 1;
        const delay = pacingBackoffMs(job.attemptCount);
        await this.jobs.update(job.id, {
          status: ScheduledMessageStatus.PENDING,
          attemptCount: attempt,
          sendAtUtc: new Date(now.getTime() + delay),
          lastError: 'rescheduled: send pacing limited',
        });
        return;
      }
      await this.markFailed(job, this.errorSnippet(error));
    }
  }

  private async finishOccurrence(
    job: ScheduledMessage,
    now: Date,
    patch: { sentMessageId?: string | null; lastError?: string | null },
  ): Promise<void> {
    const remaining = job.maxOccurrences == null ? 10_000 : job.maxOccurrences - job.occurrenceCount - 1;
    const terminal = (occurrenceCount: number) => ({
      status: ScheduledMessageStatus.SENT,
      occurrenceCount,
      sentMessageId: patch.sentMessageId ?? job.sentMessageId,
      lastError: patch.lastError ?? null,
      attemptCount: 0,
    });
    if (remaining <= 0) {
      await this.jobs.update(job.id, terminal(job.occurrenceCount + 1));
      return;
    }
    const { next, skipped } = skipMissedOccurrences(
      job.sendAtUtc,
      now,
      job.timezone,
      this.ruleOf(job),
      job.anchorAtUtc ?? job.sendAtUtc,
      this.maxLatenessMs(),
      job.untilUtc,
      remaining,
    );
    const occurrenceCount = job.occurrenceCount + 1 + skipped;
    if (!next) {
      await this.jobs.update(job.id, terminal(occurrenceCount));
      return;
    }
    await this.jobs.update(job.id, {
      status: ScheduledMessageStatus.PENDING,
      sendAtUtc: next,
      occurrenceCount,
      sentMessageId: patch.sentMessageId ?? job.sentMessageId,
      lastError: patch.lastError ?? null,
      attemptCount: 0,
    });
  }

  private async send(job: ScheduledMessage): Promise<{ messageId?: string }> {
    const mediaType = this.resolveMediaType(job.mediaType, job.mediaUrl);
    if (mediaType === ScheduledMediaType.TEXT || !job.mediaUrl) {
      const result = await this.messages.sendText(job.sessionId, {
        chatId: job.chatId,
        text: job.text ?? job.caption ?? '',
      });
      return { messageId: result.messageId };
    }
    const media = { chatId: job.chatId, url: job.mediaUrl, caption: job.caption ?? job.text ?? undefined };
    if (mediaType === ScheduledMediaType.VIDEO) {
      const result = await this.messages.sendVideo(job.sessionId, media);
      return { messageId: result.messageId };
    }
    if (mediaType === ScheduledMediaType.DOCUMENT) {
      const result = await this.messages.sendDocument(job.sessionId, media);
      return { messageId: result.messageId };
    }
    if (mediaType === ScheduledMediaType.AUDIO) {
      const result = await this.messages.sendAudio(job.sessionId, { chatId: job.chatId, url: job.mediaUrl });
      return { messageId: result.messageId };
    }
    const result = await this.messages.sendImage(job.sessionId, media);
    return { messageId: result.messageId };
  }

  private async markFailed(job: ScheduledMessage, lastError: string): Promise<void> {
    await this.jobs.update(job.id, { status: ScheduledMessageStatus.FAILED, lastError });
    void this.webhooks.dispatch(job.sessionId, 'scheduled.message.failed', {
      sessionId: job.sessionId,
      jobId: job.id,
      chatId: job.chatId,
      error: lastError,
    });
    void this.audit.logError(AuditAction.SCHEDULED_MESSAGE_FAILED, {
      sessionId: job.sessionId,
      metadata: { jobId: job.id, chatId: job.chatId },
      errorMessage: lastError,
    });
  }

  private async claimDue(id: string, now: Date): Promise<boolean> {
    const result = await this.jobs
      .createQueryBuilder()
      .update(ScheduledMessage)
      .set({ status: ScheduledMessageStatus.SENDING })
      .where('id = :id AND status = :from AND sendAtUtc <= :now', {
        id,
        from: ScheduledMessageStatus.PENDING,
        now,
      })
      .execute();
    return (result.affected ?? 0) === 1;
  }

  private async claimStatus(
    id: string,
    from: ScheduledMessageStatus,
    set: { status: ScheduledMessageStatus } & Record<string, unknown>,
  ): Promise<boolean> {
    const result = await this.jobs
      .createQueryBuilder()
      .update(ScheduledMessage)
      .set(set)
      .where('id = :id AND status = :from', { id, from })
      .execute();
    return (result.affected ?? 0) === 1;
  }

  private applyRecurrenceFields(
    dto: {
      recurrence?: RecurrenceKind;
      interval?: number;
      daysOfWeek?: number[];
      dayOfMonth?: number;
      until?: string;
      maxOccurrences?: number;
    },
    timezone: string,
    sendAtUtc: Date,
    opts: { existingUntil?: Date | null } = {},
  ): Pick<
    ScheduledMessage,
    'recurrence' | 'recurrenceInterval' | 'daysOfWeek' | 'dayOfMonth' | 'untilUtc' | 'maxOccurrences'
  > {
    const kind: RecurrenceKind = dto.recurrence ?? 'none';
    if (kind === 'none') {
      return {
        recurrence: 'none',
        recurrenceInterval: 1,
        daysOfWeek: null,
        dayOfMonth: null,
        untilUtc: dto.until ? parseUntilUtc(dto.until, timezone) : (opts.existingUntil ?? null),
        maxOccurrences: dto.maxOccurrences ?? null,
      };
    }
    const parts = zonedParts(sendAtUtc, timezone);
    const interval = dto.interval ?? 1;
    const daysOfWeek = kind === 'weekly' ? (dto.daysOfWeek?.length ? dto.daysOfWeek : [parts.weekday]) : null;
    const dayOfMonth = kind === 'monthly' ? (dto.dayOfMonth ?? parts.day) : null;
    const rule: RecurrenceRule = {
      kind,
      interval,
      daysOfWeek: daysOfWeek ?? undefined,
      dayOfMonth: dayOfMonth ?? undefined,
    };
    assertRecurrenceRule(rule);
    const untilUtc = dto.until ? parseUntilUtc(dto.until, timezone) : (opts.existingUntil ?? null);
    let maxOccurrences = dto.maxOccurrences ?? null;
    if (maxOccurrences != null) {
      maxOccurrences = Math.min(maxOccurrences, this.maxOccurrencesCap());
    }
    if (!untilUtc && maxOccurrences == null) {
      throw new BadRequestException('Recurring jobs require until and/or maxOccurrences');
    }
    const next = nextOccurrence(sendAtUtc, timezone, rule, sendAtUtc);
    if (next.getTime() - sendAtUtc.getTime() < this.minIntervalMs()) {
      throw new BadRequestException(`Recurrence interval must be at least ${this.minIntervalMs() / 3_600_000} hour(s)`);
    }
    return {
      recurrence: kind,
      recurrenceInterval: interval,
      daysOfWeek,
      dayOfMonth,
      untilUtc,
      maxOccurrences,
    };
  }

  private isRecurring(job: ScheduledMessage): boolean {
    return job.recurrence !== 'none';
  }

  private ruleOf(job: ScheduledMessage): RecurrenceRule {
    return {
      kind: job.recurrence,
      interval: job.recurrenceInterval || 1,
      daysOfWeek: job.daysOfWeek ?? undefined,
      dayOfMonth: job.dayOfMonth ?? undefined,
    };
  }

  private flagOn(): boolean {
    return this.config.get<boolean>('features.scheduledMessages') !== false;
  }

  private assertFlagOn(): void {
    if (!this.flagOn()) {
      throw new BadRequestException('Scheduled messages are disabled (SCHEDULED_MESSAGES=false)');
    }
  }

  private maxPending(): number {
    return this.config.get<number>('scheduler.maxPendingPerSession', 100);
  }

  private maxHorizonHours(): number {
    return this.config.get<number>('scheduler.maxHorizonHours', 720);
  }

  private maxLatenessMs(): number {
    return this.config.get<number>('scheduler.maxLatenessMs', 6 * 60 * 60 * 1000);
  }

  private maxRecurring(): number {
    return this.config.get<number>('scheduler.maxRecurringPerSession', 20);
  }

  private maxOccurrencesCap(): number {
    return this.config.get<number>('scheduler.maxOccurrences', 366);
  }

  private minIntervalMs(): number {
    return this.config.get<number>('scheduler.minIntervalMs', 3_600_000);
  }

  private async assertPendingCap(sessionId: string): Promise<void> {
    const cap = this.maxPending();
    if (cap <= 0) return;
    const pending = await this.jobs.count({
      where: { sessionId, status: ScheduledMessageStatus.PENDING },
    });
    if (pending >= cap) {
      throw new BadRequestException(`Pending scheduled-message cap reached (${cap} per session)`);
    }
  }

  private async assertRecurringCap(sessionId: string): Promise<void> {
    const cap = this.maxRecurring();
    if (cap <= 0) return;
    const active = await this.jobs.count({
      where: { sessionId, recurrence: Not('none'), status: In(ACTIVE_RECURRING) },
    });
    if (active >= cap) {
      throw new BadRequestException(`Active recurring-job cap reached (${cap} per session)`);
    }
  }

  private assertHorizon(sendAtUtc: Date): void {
    const hours = this.maxHorizonHours();
    if (hours <= 0) return;
    if (sendAtUtc.getTime() > Date.now() + hours * 3_600_000) {
      throw new BadRequestException(`sendAt is more than ${hours} hours ahead`);
    }
  }

  private assertNotTooLate(sendAtUtc: Date): void {
    if (this.isTooLate(sendAtUtc, new Date())) {
      throw new BadRequestException('sendAt is too far in the past (beyond max lateness)');
    }
  }

  private isTooLate(sendAtUtc: Date, now: Date): boolean {
    const late = now.getTime() - new Date(sendAtUtc).getTime();
    return late > this.maxLatenessMs() + CLOCK_SKEW_MS;
  }

  private resolveMediaType(
    mediaType: ScheduledMediaType | undefined,
    mediaUrl: string | null | undefined,
  ): ScheduledMediaType {
    if (mediaUrl && (!mediaType || mediaType === ScheduledMediaType.TEXT)) return ScheduledMediaType.IMAGE;
    return mediaType ?? ScheduledMediaType.TEXT;
  }

  private errorSnippet(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    return raw.length > ERROR_SNIPPET ? `${raw.slice(0, ERROR_SNIPPET)}…` : raw;
  }
}
