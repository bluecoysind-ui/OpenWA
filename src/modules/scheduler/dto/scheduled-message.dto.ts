import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';
import { MESSAGE_TEXT_MAX_LENGTH } from '../../message/dto/send-message.dto';
import { ScheduledMediaType, ScheduledMessage, ScheduledMessageStatus } from '../entities/scheduled-message.entity';

const MEDIA_TYPES = Object.values(ScheduledMediaType);

export class CreateScheduledMessageDto {
  @ApiProperty({ description: 'Destination chat JID', example: '628123456789@c.us' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  chatId!: string;

  @ApiProperty({
    description:
      'ISO-8601 instant with offset (UTC or ±HH:MM). Naive local datetimes are refused. Stored as UTC; `timezone` is kept for display.',
    example: '2026-09-21T15:00:00Z',
  })
  @IsString()
  @IsNotEmpty()
  sendAt!: string;

  @ApiPropertyOptional({
    description: 'IANA timezone stored with the job (display / future recurrence). Default UTC.',
    example: 'Asia/Jakarta',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Text body. Required when mediaUrl is omitted.',
    maxLength: MESSAGE_TEXT_MAX_LENGTH,
  })
  @IsOptional()
  @ValidateIf((o: CreateScheduledMessageDto) => !o.mediaUrl)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_TEXT_MAX_LENGTH)
  text?: string;

  @ApiPropertyOptional({
    description:
      'http(s) media URL. Fetched at send time through the SSRF-safe send path. Required when text is omitted.',
    example: 'https://example.com/image.jpg',
  })
  @IsOptional()
  @ValidateIf((o: CreateScheduledMessageDto) => !o.text)
  @IsUrl({ require_tld: false })
  mediaUrl?: string;

  @ApiPropertyOptional({ enum: MEDIA_TYPES, default: ScheduledMediaType.TEXT })
  @IsOptional()
  @IsIn(MEDIA_TYPES)
  mediaType?: ScheduledMediaType;

  @ApiPropertyOptional({ description: 'Caption for a media send', maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}

export class UpdateScheduledMessageDto {
  @ApiPropertyOptional({
    description: 'ISO-8601 instant with offset. Only pending jobs can be rescheduled.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sendAt?: string;

  @ApiPropertyOptional({ description: 'IANA timezone' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ maxLength: MESSAGE_TEXT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MESSAGE_TEXT_MAX_LENGTH)
  text?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUrl({ require_tld: false })
  mediaUrl?: string | null;

  @ApiPropertyOptional({ enum: MEDIA_TYPES })
  @IsOptional()
  @IsIn(MEDIA_TYPES)
  mediaType?: ScheduledMediaType;

  @ApiPropertyOptional({ maxLength: 1024 })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string | null;
}

export class ScheduledMessageResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  sessionId!: string;

  @ApiProperty()
  @Expose()
  chatId!: string;

  @ApiProperty({ description: 'Scheduled instant as UTC ISO-8601' })
  @Expose()
  @Transform(({ obj }: { obj: ScheduledMessage }) => new Date(obj.sendAtUtc).toISOString(), { toClassOnly: true })
  sendAt!: string;

  @ApiProperty()
  @Expose()
  timezone!: string;

  @ApiProperty({ nullable: true })
  @Expose()
  text!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  mediaUrl!: string | null;

  @ApiProperty({ enum: MEDIA_TYPES })
  @Expose()
  mediaType!: ScheduledMediaType;

  @ApiProperty({ nullable: true })
  @Expose()
  caption!: string | null;

  @ApiProperty({ enum: ScheduledMessageStatus })
  @Expose()
  status!: ScheduledMessageStatus;

  @ApiProperty()
  @Expose()
  attemptCount!: number;

  @ApiProperty({ nullable: true })
  @Expose()
  lastError!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  sentMessageId!: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  static fromEntity(job: ScheduledMessage): ScheduledMessageResponseDto {
    return plainToInstance(ScheduledMessageResponseDto, job, { excludeExtraneousValues: true });
  }
}
