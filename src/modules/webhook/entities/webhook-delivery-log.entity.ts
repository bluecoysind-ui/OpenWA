import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type WebhookDeliveryStatus = 'success' | 'failed';

/**
 * One HTTP attempt against a webhook. Q6: status, HTTP code, duration, attempt, error snippet only.
 * Never request/response bodies. Retention 30 days or last 500 per webhook.
 */
@Entity('webhook_deliveries')
@Index('IDX_webhook_deliveries_webhookId_createdAt', ['webhookId', 'createdAt'])
export class WebhookDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  webhookId!: string;

  @Column()
  sessionId!: string;

  @Column({ length: 16 })
  status!: WebhookDeliveryStatus;

  @Column({ type: 'int', nullable: true })
  httpCode!: number | null;

  @Column({ type: 'int' })
  durationMs!: number;

  @Column({ type: 'int' })
  attempt!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  errorSnippet!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
