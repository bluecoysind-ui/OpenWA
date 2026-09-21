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
import { jsonColumnType } from '../../../common/utils/column-types';
import { BotAccessMode } from '../bot-access';

@Entity('bot_configs')
export class BotConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_bot_configs_sessionId')
  @Column({ type: 'varchar' })
  sessionId!: string;

  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session!: Session;

  @Column({ type: 'varchar', length: 16, default: BotAccessMode.ALL })
  accessMode!: BotAccessMode;

  @Column({ type: jsonColumnType() })
  allowList!: string[];

  @Column({ type: jsonColumnType() })
  blockList!: string[];

  @Column({ type: 'varchar', length: 8, default: '#' })
  prefix!: string;

  @Column({ type: 'boolean', default: true })
  commandsEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  autoRead!: boolean;

  @Column({ type: 'boolean', default: false })
  alwaysOnline!: boolean;

  @Column({ type: 'text', nullable: true })
  welcomeMessage!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  stickerPackName!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  stickerPackAuthor!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
