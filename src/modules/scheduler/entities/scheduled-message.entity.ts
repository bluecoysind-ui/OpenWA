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
import { jsonColumnType } from '../../../common/utils/column-types';
import { Session } from '../../session/entities/session.entity';
import type { RecurrenceKind } from '../scheduler-recurrence';

export enum ScheduledMessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum ScheduledMediaType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
}

/**
 * Delayed send, one-shot or recurring (daily/weekly/monthly). Status machine is at-most-once: a
 * fire is claimed PENDING→SENDING with an atomic conditional UPDATE. After a successful send the
 * same row is updated to the next fire (recurring) or SENT (terminal). A crash while SENDING on a
 * one-shot marks FAILED; on a series the occurrence is skipped and the next fire is scheduled.
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

  @Column({ type: 'varchar', length: 16, default: 'none' })
  recurrence!: RecurrenceKind;

  @Column({ type: 'int', default: 1 })
  recurrenceInterval!: number;

  @Column({ type: jsonColumnType(), nullable: true })
  daysOfWeek!: number[] | null;

  @Column({ type: 'int', nullable: true })
  dayOfMonth!: number | null;

  @Column({ type: 'datetime', nullable: true })
  untilUtc!: Date | null;

  @Column({ type: 'int', nullable: true })
  maxOccurrences!: number | null;

  @Column({ type: 'int', default: 0 })
  occurrenceCount!: number;

  @Column({ type: 'datetime', nullable: true })
  anchorAtUtc!: Date | null;

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
