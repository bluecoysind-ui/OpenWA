import { DataSource } from 'typeorm';
import { BadRequestException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';
import { ScheduledMediaType, ScheduledMessage, ScheduledMessageStatus } from './entities/scheduled-message.entity';
import { Session, SessionStatus } from '../session/entities/session.entity';
import { SEND_PACING_LIMITED } from '../message/send-pacing.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import type { MessageService } from '../message/message.service';
import type { WebhookService } from '../webhook/webhook.service';
import type { AuditService } from '../audit/audit.service';

describe('SchedulerService', () => {
  let ds: DataSource;
  let service: SchedulerService;
  let sendText: jest.Mock;
  let dispatch: jest.Mock;
  let logInfo: jest.Mock;
  let logError: jest.Mock;
  let flagOn = true;

  const config = {
    get: (key: string, def?: unknown) => {
      if (key === 'features.scheduledMessages') return flagOn;
      if (key === 'scheduler.maxPendingPerSession') return 2;
      if (key === 'scheduler.maxHorizonHours') return 24;
      if (key === 'scheduler.maxLatenessMs') return 60_000;
      if (key === 'scheduler.maxRecurringPerSession') return 1;
      if (key === 'scheduler.maxOccurrences') return 10;
      if (key === 'scheduler.minIntervalMs') return 3_600_000;
      return def;
    },
  } as unknown as ConfigService;

  const future = () => new Date(Date.now() + 3_600_000).toISOString();

  beforeEach(async () => {
    flagOn = true;
    ds = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [Session, ScheduledMessage],
      synchronize: true,
    });
    await ds.initialize();
    await ds
      .getRepository(Session)
      .save(ds.getRepository(Session).create({ id: 'sessA', name: 'sessA', status: SessionStatus.READY, config: {} }));
    sendText = jest.fn().mockResolvedValue({ messageId: 'wamid.1' });
    dispatch = jest.fn().mockResolvedValue(undefined);
    logInfo = jest.fn().mockResolvedValue(undefined);
    logError = jest.fn().mockResolvedValue(undefined);
    service = new SchedulerService(
      ds.getRepository(ScheduledMessage),
      {
        sendText,
        sendImage: jest.fn(),
        sendVideo: jest.fn(),
        sendDocument: jest.fn(),
        sendAudio: jest.fn(),
      } as unknown as MessageService,
      { dispatch } as unknown as WebhookService,
      { logInfo, logError } as unknown as AuditService,
      config,
    );
  });

  afterEach(async () => {
    await ds.destroy();
  });

  const create = (over: Record<string, unknown> = {}) =>
    service.create('sessA', {
      chatId: '628111@c.us',
      sendAt: future(),
      text: 'hello later',
      timezone: 'UTC',
      ...over,
    });

  it('creates a pending text job and lists it for the session', async () => {
    const job = await create();
    expect(job.status).toBe(ScheduledMessageStatus.PENDING);
    expect(job.sendAtUtc.toISOString()).toMatch(/Z$/);
    const listed = await service.findAll('sessA');
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(job.id);
    expect(logInfo).toHaveBeenCalledWith(
      AuditAction.SCHEDULED_MESSAGE_CREATED,
      // Jest asymmetric matchers are typed as any.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ sessionId: 'sessA', metadata: expect.objectContaining({ jobId: job.id }) }),
    );
    expect(JSON.stringify(logInfo.mock.calls)).not.toMatch(/hello later/);
  });

  it('refuses naive sendAt, unknown timezones, and the pending cap', async () => {
    await expect(create({ sendAt: '2026-09-21T15:00:00' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(create({ timezone: 'Not/AZone' })).rejects.toBeInstanceOf(BadRequestException);
    await create();
    await create({ text: 'second' });
    await expect(create({ text: 'third' })).rejects.toThrow(/cap/);
  });

  it('cancels a pending job and refuses cancel of a non-pending one', async () => {
    const job = await create();
    await service.cancel('sessA', job.id);
    expect((await service.findOne('sessA', job.id)).status).toBe(ScheduledMessageStatus.CANCELLED);
    await expect(service.cancel('sessA', job.id)).rejects.toBeInstanceOf(ConflictException);
    expect(logInfo).toHaveBeenCalledWith(
      AuditAction.SCHEDULED_MESSAGE_CANCELLED,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ sessionId: 'sessA', metadata: expect.objectContaining({ jobId: job.id }) }),
    );
  });

  it('sends due jobs at-most-once: claim sending first, then sent + webhook + audit', async () => {
    const job = await create({ sendAt: new Date(Date.now() - 1_000).toISOString() });
    await service.processDueJobs(new Date());
    expect(sendText).toHaveBeenCalledTimes(1);
    expect(sendText).toHaveBeenCalledWith('sessA', { chatId: '628111@c.us', text: 'hello later' });
    const stored = await service.findOne('sessA', job.id);
    expect(stored.status).toBe(ScheduledMessageStatus.SENT);
    expect(stored.sentMessageId).toBe('wamid.1');
    expect(dispatch).toHaveBeenCalledWith(
      'sessA',
      'scheduled.message.sent',
      expect.objectContaining({ jobId: job.id }),
    );
    expect(logInfo).toHaveBeenCalledWith(
      AuditAction.SCHEDULED_MESSAGE_SENT,
      expect.objectContaining({ sessionId: 'sessA' }),
    );
  });

  it('two claims of the same due job only send once', async () => {
    await create({ sendAt: new Date(Date.now() - 1_000).toISOString() });
    await Promise.all([service.processDueJobs(new Date()), service.processDueJobs(new Date())]);
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it('marks overdue jobs failed without sending', async () => {
    const repo = ds.getRepository(ScheduledMessage);
    const job = await repo.save(
      repo.create({
        sessionId: 'sessA',
        chatId: '628111@c.us',
        sendAtUtc: new Date(Date.now() - 120_000),
        timezone: 'UTC',
        text: 'too late',
        status: ScheduledMessageStatus.PENDING,
      }),
    );
    await service.processDueJobs(new Date());
    expect(sendText).not.toHaveBeenCalled();
    expect((await service.findOne('sessA', job.id)).status).toBe(ScheduledMessageStatus.FAILED);
    expect(dispatch).toHaveBeenCalledWith(
      'sessA',
      'scheduled.message.failed',
      expect.objectContaining({ jobId: job.id }),
    );
    expect(logError).toHaveBeenCalledWith(AuditAction.SCHEDULED_MESSAGE_FAILED, expect.anything());
  });

  it('reschedules on pacing 429 instead of failing', async () => {
    sendText.mockRejectedValueOnce(
      new HttpException({ code: SEND_PACING_LIMITED, message: 'paced' }, HttpStatus.TOO_MANY_REQUESTS),
    );
    const job = await create({ sendAt: new Date(Date.now() - 1_000).toISOString() });
    const before = Date.now();
    await service.processDueJobs(new Date());
    const stored = await service.findOne('sessA', job.id);
    expect(stored.status).toBe(ScheduledMessageStatus.PENDING);
    expect(stored.attemptCount).toBe(1);
    expect(new Date(stored.sendAtUtc).getTime()).toBeGreaterThanOrEqual(before + 30_000 - 50);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('crash recovery marks sending as failed and never resends', async () => {
    const job = await create();
    await ds.getRepository(ScheduledMessage).update(job.id, { status: ScheduledMessageStatus.SENDING });
    expect(await service.failInterruptedJobs()).toBe(1);
    expect((await service.findOne('sessA', job.id)).status).toBe(ScheduledMessageStatus.FAILED);
    await service.processDueJobs(new Date());
    expect(sendText).not.toHaveBeenCalled();
  });

  it('does not start the tick loop when SCHEDULED_MESSAGES is off', () => {
    flagOn = false;
    const setI = jest.spyOn(global, 'setInterval');
    service.onModuleInit();
    expect(setI).not.toHaveBeenCalled();
    setI.mockRestore();
    service.onModuleDestroy();
  });

  it('refuses create/update when the flag is off; cancel still works', async () => {
    const job = await create();
    flagOn = false;
    await expect(create({ text: 'nope' })).rejects.toThrow(/disabled/);
    await expect(service.update('sessA', job.id, { text: 'x' })).rejects.toThrow(/disabled/);
    await service.cancel('sessA', job.id);
    expect((await service.findOne('sessA', job.id)).status).toBe(ScheduledMessageStatus.CANCELLED);
  });

  it('sends a media URL as an image when mediaType is omitted', async () => {
    const sendImage = jest.fn().mockResolvedValue({ messageId: 'wamid.img' });
    service = new SchedulerService(
      ds.getRepository(ScheduledMessage),
      {
        sendText,
        sendImage,
        sendVideo: jest.fn(),
        sendDocument: jest.fn(),
        sendAudio: jest.fn(),
      } as unknown as MessageService,
      { dispatch } as unknown as WebhookService,
      { logInfo, logError } as unknown as AuditService,
      config,
    );
    const job = await create({
      text: undefined,
      mediaUrl: 'https://example.com/pic.jpg',
      mediaType: ScheduledMediaType.TEXT,
      sendAt: new Date(Date.now() - 1_000).toISOString(),
    });
    await service.processDueJobs(new Date());
    expect(sendImage).toHaveBeenCalledWith(
      'sessA',
      expect.objectContaining({ chatId: '628111@c.us', url: 'https://example.com/pic.jpg' }),
    );
    expect((await service.findOne('sessA', job.id)).status).toBe(ScheduledMessageStatus.SENT);
  });

  it('advances a daily job on the same row after a send', async () => {
    const job = await create({
      sendAt: new Date(Date.now() - 1_000).toISOString(),
      recurrence: 'daily',
      maxOccurrences: 5,
    });
    await service.processDueJobs(new Date());
    expect(sendText).toHaveBeenCalledTimes(1);
    const stored = await service.findOne('sessA', job.id);
    expect(stored.status).toBe(ScheduledMessageStatus.PENDING);
    expect(stored.occurrenceCount).toBe(1);
    expect(new Date(stored.sendAtUtc).getTime()).toBeGreaterThan(Date.now() + 20 * 3_600_000);
  });

  it('skips missed recurring fires after downtime instead of bursting', async () => {
    const repo = ds.getRepository(ScheduledMessage);
    const start = new Date(Date.now() - 3 * 86_400_000);
    const job = await repo.save(
      repo.create({
        sessionId: 'sessA',
        chatId: '628111@c.us',
        sendAtUtc: start,
        timezone: 'UTC',
        text: 'daily',
        status: ScheduledMessageStatus.PENDING,
        recurrence: 'daily',
        recurrenceInterval: 1,
        maxOccurrences: 10,
        occurrenceCount: 0,
        anchorAtUtc: start,
      }),
    );
    await service.processDueJobs(new Date());
    expect(sendText).not.toHaveBeenCalled();
    const stored = await service.findOne('sessA', job.id);
    expect(stored.status).toBe(ScheduledMessageStatus.PENDING);
    expect(stored.occurrenceCount).toBeGreaterThanOrEqual(2);
    expect(Date.now() - new Date(stored.sendAtUtc).getTime()).toBeLessThanOrEqual(60_000 + 5_000);
  });

  it('crash recovery on a recurring job skips the fire and schedules the next', async () => {
    const job = await create({ recurrence: 'daily', maxOccurrences: 5 });
    await ds.getRepository(ScheduledMessage).update(job.id, { status: ScheduledMessageStatus.SENDING });
    expect(await service.failInterruptedJobs()).toBe(1);
    const stored = await service.findOne('sessA', job.id);
    expect(stored.status).toBe(ScheduledMessageStatus.PENDING);
    expect(stored.occurrenceCount).toBe(1);
    expect(sendText).not.toHaveBeenCalled();
  });

  it('refuses a second active recurring job at the per-session cap', async () => {
    await create({ recurrence: 'daily', maxOccurrences: 3, text: 'first' });
    await expect(create({ recurrence: 'daily', maxOccurrences: 3, text: 'second' })).rejects.toThrow(
      /recurring-job cap/,
    );
  });

  it('pauses and resumes a pending job', async () => {
    const job = await create();
    const paused = await service.update('sessA', job.id, { status: ScheduledMessageStatus.PAUSED });
    expect(paused.status).toBe(ScheduledMessageStatus.PAUSED);
    await service.processDueJobs(new Date(Date.now() + 4_000_000));
    expect(sendText).not.toHaveBeenCalled();
    const resumed = await service.update('sessA', job.id, { status: ScheduledMessageStatus.PENDING });
    expect(resumed.status).toBe(ScheduledMessageStatus.PENDING);
  });

  it('refuses recurring without until or maxOccurrences', async () => {
    await expect(create({ recurrence: 'daily' })).rejects.toThrow(/until and\/or maxOccurrences/);
  });
});
