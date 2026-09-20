import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { WebhookDeliveryLog } from './entities/webhook-delivery-log.entity';
import {
  KEEP_PER_WEBHOOK,
  RETENTION_MS,
  recordWebhookDeliveryAttempt,
  type WebhookDeliveryAttemptInput,
} from './utils/record-delivery-attempt';

@Injectable()
export class WebhookDeliveryLogService {
  constructor(
    @InjectRepository(WebhookDeliveryLog, 'data')
    private readonly repo: Repository<WebhookDeliveryLog>,
  ) {}

  async record(input: WebhookDeliveryAttemptInput): Promise<void> {
    await recordWebhookDeliveryAttempt(this.repo, input);
  }

  async list(webhookId: string, sessionId: string): Promise<WebhookDeliveryLog[]> {
    return this.repo.find({
      where: { webhookId, sessionId },
      order: { createdAt: 'DESC' },
      take: KEEP_PER_WEBHOOK,
    });
  }

  async sweep(): Promise<number> {
    const result = await this.repo.delete({ createdAt: LessThan(new Date(Date.now() - RETENTION_MS)) });
    return result.affected ?? 0;
  }
}
