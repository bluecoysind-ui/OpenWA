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
import { LessThanOrEqual, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { createLogger } from '../../common/services/logger.service';
import { MessageService } from '../message/message.service';
import { isPacingLimitedError } from '../message/send-pacing.service';
import { WebhookService } from '../webhook/webhook.service';
import { CreateScheduledMessageDto, UpdateScheduledMessageDto } from './dto/scheduled-message.dto';
import { ScheduledMediaType, ScheduledMessage, ScheduledMessageStatus } from './entities/scheduled-message.entity';
import { assertIanaTimeZone, pacingBackoffMs, parseSendAtUtc } from './scheduler-time';

const TICK_MS = 5_000;
const CLAIM_BATCH = 20;
const ERROR_SNIPPET = 500;
const CLOCK_SKEW_MS = 2_000;

const INTERRUPTED_ERROR = 'interrupted (process restarted while sending)';

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
    });
    return this.jobs.save(job);
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
    if (job.status !== ScheduledMessageStatus.PENDING) {
      throw new ConflictException('Only pending jobs can be updated');
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
    }
    if (dto.text !== undefined) job.text = dto.text;
    if (dto.mediaUrl !== undefined) job.mediaUrl = dto.mediaUrl;
    if (dto.mediaType !== undefined) job.mediaType = dto.mediaType;
    if (dto.caption !== undefined) job.caption = dto.caption;
    if (!job.text && !job.mediaUrl) {
      throw new BadRequestException('Provide text or mediaUrl');
    }
    job.mediaType = this.resolveMediaType(job.mediaType, job.mediaUrl);
    return this.jobs.save(job);
  }

  async cancel(sessionId: string, jobId: string): Promise<void> {
    const job = await this.findOne(sessionId, jobId);
    if (job.status === ScheduledMessageStatus.SENDING) {
      throw new ConflictException('Job is currently sending and cannot be cancelled');
    }
    if (job.status !== ScheduledMessageStatus.PENDING) {
      throw new ConflictException('Only pending jobs can be cancelled');
    }
    const claimed = await this.claimStatus(job.id, ScheduledMessageStatus.PENDING, {
      status: ScheduledMessageStatus.CANCELLED,
    });
    if (!claimed) throw new ConflictException('Job is no longer pending');
  }

  /** Crash recovery: SENDING rows never auto-resend. */
  async failInterruptedJobs(): Promise<number> {
    const result = await this.jobs
      .createQueryBuilder()
      .update(ScheduledMessage)
      .set({ status: ScheduledMessageStatus.FAILED, lastError: INTERRUPTED_ERROR })
      .where('status = :st', { st: ScheduledMessageStatus.SENDING })
      .execute();
    const n = result.affected ?? 0;
    if (n > 0) this.logger.warn(`Marked ${n} interrupted scheduled message(s) failed`);
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
      await this.markFailed(job, 'overdue (beyond max lateness)');
      return;
    }

    try {
      const sent = await this.send(job);
      await this.jobs.update(job.id, {
        status: ScheduledMessageStatus.SENT,
        sentMessageId: sent.messageId ?? null,
        lastError: null,
      });
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
