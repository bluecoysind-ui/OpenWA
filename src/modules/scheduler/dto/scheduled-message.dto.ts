import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MESSAGE_TEXT_MAX_LENGTH } from '../../message/dto/send-message.dto';
import { ScheduledMediaType, ScheduledMessage, ScheduledMessageStatus } from '../entities/scheduled-message.entity';
import { RECURRENCE_KINDS, type RecurrenceKind } from '../scheduler-recurrence';

const MEDIA_TYPES = Object.values(ScheduledMediaType);
const PATCHABLE_STATUS = [ScheduledMessageStatus.PENDING, ScheduledMessageStatus.PAUSED] as const;

/** Absolute ceiling on maxOccurrences regardless of env (DTO + MCP). Service still clamps to the env cap. */
export const MAX_OCCURRENCES_CEILING = 10_000;

export class CreateScheduledMessageDto {
  @ApiProperty({ description: 'Destination chat JID', example: '628123456789@c.us' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  chatId!: string;

  @ApiProperty({
    description:
      'ISO-8601 instant with offset (UTC or ±HH:MM). Naive local datetimes are refused. Stored as UTC; `timezone` is kept for display and recurrence math.',
    example: '2026-09-21T15:00:00Z',
  })
  @IsString()
  @IsNotEmpty()
  sendAt!: string;

  @ApiPropertyOptional({
    description: 'IANA timezone used for display and recurrence (DST-correct). Default UTC.',
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

  @ApiPropertyOptional({
    enum: RECURRENCE_KINDS,
    default: 'none',
    description: 'none = one-shot. Recurring jobs require until and/or maxOccurrences.',
  })
  @IsOptional()
  @IsIn(RECURRENCE_KINDS)
  recurrence?: RecurrenceKind;

  @ApiPropertyOptional({
    description: 'Repeat every N days/weeks/months. Default 1. Ignored when recurrence is none.',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Weekdays for weekly recurrence: 0=Sun … 6=Sat. Default: weekday of sendAt.',
    type: [Number],
    example: [1, 3],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Day of month for monthly recurrence (1–31; 31 clamps to last day). Default: day of sendAt.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Inclusive end: YYYY-MM-DD (end of that day in the job timezone) or an ISO instant with offset.',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  until?: string;

  @ApiPropertyOptional({
    description:
      'Max fires including the first. Required (alone or with until) when recurrence is not none. Hard-capped.',
    minimum: 1,
    maximum: MAX_OCCURRENCES_CEILING,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_OCCURRENCES_CEILING)
  maxOccurrences?: number;
}

export class UpdateScheduledMessageDto {
  @ApiPropertyOptional({
    description: 'ISO-8601 instant with offset. Pending or paused jobs only.',
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

  @ApiPropertyOptional({ enum: RECURRENCE_KINDS })
  @IsOptional()
  @IsIn(RECURRENCE_KINDS)
  recurrence?: RecurrenceKind;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  until?: string | null;

  @ApiPropertyOptional({ maximum: MAX_OCCURRENCES_CEILING })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_OCCURRENCES_CEILING)
  maxOccurrences?: number | null;

  @ApiPropertyOptional({
    enum: PATCHABLE_STATUS,
    description: 'Pause or resume. Only pending↔paused.',
  })
  @IsOptional()
  @IsIn(PATCHABLE_STATUS)
  status?: (typeof PATCHABLE_STATUS)[number];
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

  @ApiProperty({ description: 'Next (or only) fire as UTC ISO-8601' })
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

  @ApiProperty({ enum: RECURRENCE_KINDS })
  @Expose()
  recurrence!: RecurrenceKind;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }: { obj: ScheduledMessage }) => obj.recurrenceInterval ?? 1, { toClassOnly: true })
  interval!: number;

  @ApiProperty({ nullable: true, type: [Number] })
  @Expose()
  daysOfWeek!: number[] | null;

  @ApiProperty({ nullable: true })
  @Expose()
  dayOfMonth!: number | null;

  @ApiProperty({ nullable: true, description: 'Inclusive end instant (UTC ISO-8601)' })
  @Expose()
  @Transform(({ obj }: { obj: ScheduledMessage }) => (obj.untilUtc ? new Date(obj.untilUtc).toISOString() : null), {
    toClassOnly: true,
  })
  until!: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  maxOccurrences!: number | null;

  @ApiProperty()
  @Expose()
  occurrenceCount!: number;

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
