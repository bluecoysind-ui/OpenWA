import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ToStrictBoolean } from '../../../common/utils/strict-boolean';
import { MESSAGE_TEXT_MAX_LENGTH } from '../../message/dto/send-message.dto';
import { BotAccessMode } from '../bot-access';
import { BotConfig } from '../entities/bot-config.entity';

const ACCESS_MODES = Object.values(BotAccessMode);
export const BOT_ACCESS_LIST_MAX = 500;

export class UpdateBotConfigDto {
  @ApiPropertyOptional({ enum: ACCESS_MODES, default: BotAccessMode.ALL })
  @IsOptional()
  @IsIn(ACCESS_MODES)
  accessMode?: BotAccessMode;

  @ApiPropertyOptional({
    description: 'JIDs / user-parts allowed when accessMode is allow. Matched before rule conditions.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BOT_ACCESS_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(256, { each: true })
  allowList?: string[];

  @ApiPropertyOptional({
    description: 'JIDs / user-parts always denied. Evaluated before allow-list and before rule conditions.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BOT_ACCESS_LIST_MAX)
  @IsString({ each: true })
  @MaxLength(256, { each: true })
  blockList?: string[];

  @ApiPropertyOptional({ description: 'Command prefix (e.g. #). Default #.', default: '#' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  prefix?: string;

  @ApiPropertyOptional({ description: 'Per-session command switch. Global BOT_COMMANDS must also be on.' })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  commandsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Mark inbound chats read after an allowed message.' })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  autoRead?: boolean;

  @ApiPropertyOptional({ description: 'Set engine presence available when saved and a live engine exists.' })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  alwaysOnline?: boolean;

  @ApiPropertyOptional({
    description: 'Text sent to a group on group.join, through the paced send path. Empty disables.',
    maxLength: MESSAGE_TEXT_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MESSAGE_TEXT_MAX_LENGTH)
  welcomeMessage?: string | null;

  @ApiPropertyOptional({
    description: 'Sticker pack title applied to #sticker media converts.',
    maxLength: 128,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  stickerPackName?: string | null;

  @ApiPropertyOptional({
    description: 'Sticker pack author applied to #sticker media converts.',
    maxLength: 128,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  stickerPackAuthor?: string | null;
}

export class BotConfigResponseDto {
  @ApiProperty()
  @Expose()
  sessionId!: string;

  @ApiProperty({ enum: ACCESS_MODES })
  @Expose()
  accessMode!: BotAccessMode;

  @ApiProperty({ type: [String] })
  @Expose()
  allowList!: string[];

  @ApiProperty({ type: [String] })
  @Expose()
  blockList!: string[];

  @ApiProperty()
  @Expose()
  prefix!: string;

  @ApiProperty()
  @Expose()
  commandsEnabled!: boolean;

  @ApiProperty()
  @Expose()
  autoRead!: boolean;

  @ApiProperty()
  @Expose()
  alwaysOnline!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  welcomeMessage!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  stickerPackName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  stickerPackAuthor!: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  static fromEntity(row: BotConfig): BotConfigResponseDto {
    return plainToInstance(BotConfigResponseDto, row, { excludeExtraneousValues: true });
  }
}
