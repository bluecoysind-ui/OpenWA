import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from '../../session/entities/session.entity';

export enum ScheduledMessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ScheduledMediaType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
}

/**
 * One-shot delayed send. Recurrence is WP4b later. Status machine is at-most-once: a job is
 * claimed PENDING→SENDING with an atomic conditional UPDATE; a crash while SENDING marks FAILED
 * and never auto-resends.
 */
@Entity('scheduled_messages')
@Index('IDX_scheduled_messages_due', ['status', 'sendAtUtc'])
export class ScheduledMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_scheduled_messages_sessionId')
  @Column({ type: 'varchar' })
  sessionId!: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  @Column({ type: 'varchar' })
  chatId!: string;

  @Column({ type: 'datetime' })
  sendAtUtc!: Date;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;

  @Column({ type: 'text', nullable: true })
  text!: string | null;

  @Column({ type: 'text', nullable: true })
  mediaUrl!: string | null;

  @Column({ type: 'varchar', length: 16, default: ScheduledMediaType.TEXT })
  mediaType!: ScheduledMediaType;

  @Column({ type: 'text', nullable: true })
  caption!: string | null;

  @Column({ type: 'varchar', length: 16, default: ScheduledMessageStatus.PENDING })
  status!: ScheduledMessageStatus;

  @Column({ type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ type: 'varchar', nullable: true })
  sentMessageId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
