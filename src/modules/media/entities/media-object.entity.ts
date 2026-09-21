import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

/** Index of inbound files stored when MEDIA_PERSIST is on. */
@Entity('media_objects')
@Unique('UQ_media_objects_storageKey', ['storageKey'])
@Index('IDX_media_objects_sessionId_createdAt', ['sessionId', 'createdAt'])
export class MediaObject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sessionId!: string;

  @Column()
  storageKey!: string;

  @Column({ type: 'varchar', nullable: true })
  messageId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
