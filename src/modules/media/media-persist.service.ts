import { Injectable, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { StorageService, isMissingObjectError } from '../../common/storage/storage.service';
import { isSafeStorageKey } from '../../common/utils/path-safety';
import { isUniqueViolation } from '../../common/utils/db-errors';
import { createLogger } from '../../common/services/logger.service';
import type { IncomingMessage } from '../../engine/interfaces/whatsapp-engine.interface';
import { MediaObject } from './entities/media-object.entity';

const DEFAULT_TTL_DAYS = 30;
const SWEEP_MS = 60 * 60 * 1000;

@Injectable()
export class MediaPersistService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('MediaPersistService');
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
    @InjectRepository(MediaObject, 'data')
    private readonly repo: Repository<MediaObject>,
  ) {}

  onModuleInit(): void {
    if (!this.enabled()) return;
    this.timer = setInterval(() => {
      void this.sweep().catch(err =>
        this.logger.warn('MEDIA_PERSIST sweep failed', { error: err instanceof Error ? err.message : String(err) }),
      );
    }, SWEEP_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  enabled(): boolean {
    return this.configService.get<boolean>('features.mediaPersist', false) === true;
  }

  storageKey(sessionId: string, messageId: string): string {
    return `sessions/${sessionId}/chat/${messageId}`;
  }

  publicUrl(sessionId: string, messageId: string): string {
    return `/api/sessions/${sessionId}/media/files/${encodeURIComponent(messageId)}`;
  }

  async persistInbound(sessionId: string, message: IncomingMessage): Promise<void> {
    if (!this.enabled() || !message.media?.data || !message.id) return;
    const key = this.storageKey(sessionId, message.id);
    if (!isSafeStorageKey(key)) return;
    await this.storage.putFile(key, Buffer.from(message.media.data, 'base64'));
    try {
      await this.repo.insert(this.repo.create({ sessionId, storageKey: key, messageId: message.id }));
    } catch (err) {
      if (!isUniqueViolation(err)) {
        this.logger.warn('MEDIA_PERSIST index write failed', {
          sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /** Set quoted.fileUrl only when that quoted message's bytes were already stored. No extra download. */
  async attachQuotedFileUrl(sessionId: string, message: IncomingMessage): Promise<void> {
    if (!this.enabled() || !message.quotedMessage?.hasMedia || !message.quotedMessage.id) return;
    const key = this.storageKey(sessionId, message.quotedMessage.id);
    const row = await this.repo.findOne({ where: { sessionId, storageKey: key } });
    if (row) message.quotedMessage.fileUrl = this.publicUrl(sessionId, message.quotedMessage.id);
  }

  async list(sessionId: string): Promise<Array<{ messageId: string | null; createdAt: Date; url: string }>> {
    this.assertEnabled();
    const rows = await this.repo.find({ where: { sessionId }, order: { createdAt: 'DESC' }, take: 500 });
    return rows.map(row => ({
      messageId: row.messageId,
      createdAt: row.createdAt,
      url: row.messageId ? this.publicUrl(sessionId, row.messageId) : '',
    }));
  }

  async get(sessionId: string, messageId: string): Promise<Buffer> {
    this.assertEnabled();
    const key = this.assertMessageKey(sessionId, messageId);
    const row = await this.repo.findOne({ where: { sessionId, storageKey: key } });
    if (!row) throw new NotFoundException('Stored media not found');
    try {
      return await this.storage.getFile(key);
    } catch (err) {
      if (isMissingObjectError(err)) throw new NotFoundException('Stored media not found');
      throw err;
    }
  }

  async remove(sessionId: string, messageId: string): Promise<void> {
    this.assertEnabled();
    const key = this.assertMessageKey(sessionId, messageId);
    const row = await this.repo.findOne({ where: { sessionId, storageKey: key } });
    if (!row) throw new NotFoundException('Stored media not found');
    await this.storage.deleteFile(key).catch(() => undefined);
    await this.repo.remove(row);
  }

  async sweep(): Promise<void> {
    if (!this.enabled()) return;
    const days = this.configService.get<number>('mediaPersist.ttlDays', DEFAULT_TTL_DAYS) ?? DEFAULT_TTL_DAYS;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const stale = await this.repo.find({ where: { createdAt: LessThan(cutoff) }, take: 200 });
    for (const row of stale) {
      await this.storage.deleteFile(row.storageKey).catch(() => undefined);
      await this.repo.remove(row);
    }
  }

  private assertEnabled(): void {
    if (!this.enabled()) throw new NotFoundException();
  }

  private assertMessageKey(sessionId: string, messageId: string): string {
    if (!messageId || /[/\\]/.test(messageId) || messageId.includes('..')) {
      throw new NotFoundException('Stored media not found');
    }
    const key = this.storageKey(sessionId, messageId);
    if (!isSafeStorageKey(key)) throw new NotFoundException('Stored media not found');
    return key;
  }
}
