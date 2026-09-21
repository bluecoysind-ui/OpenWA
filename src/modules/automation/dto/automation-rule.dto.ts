import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { ToStrictBoolean, ToStrictNumber } from '../../../common/utils/strict-boolean';
import { MESSAGE_TEXT_MAX_LENGTH } from '../../message/dto/send-message.dto';
import { WebhookFilters } from '../../webhook/filters/filter-types';
import { IsValidWebhookFilters } from '../../webhook/filters/filter-validation';
import { AutomationChatContext, AutomationMatchMode } from '../automation-match';
import { AutomationRule } from '../entities/automation-rule.entity';

const MATCH_MODES = Object.values(AutomationMatchMode);
const CHAT_CONTEXTS = Object.values(AutomationChatContext);

/** Longest quiet period a rule may ask for: one day. */
export const AUTOMATION_COOLDOWN_MAX_SECONDS = 86_400;

const CONDITIONS_DESCRIPTION =
  'Match conditions in the webhook filter format (message family: sender, recipient, chatId, body, ' +
  'type, isGroup, kind, fromMe, hasMedia, mentions). All conditions must match (AND). Omitted or ' +
  'empty means the rule matches every inbound message.';

const COOLDOWN_DESCRIPTION =
  'Quiet period per chat, in seconds: after the rule replies in a chat it stays silent there for ' +
  'this long (default 60, 0 disables). This is the guard against two auto-repliers answering each ' +
  'other forever, so disable it knowingly.';

export class CreateAutomationRuleDto {
  @ApiProperty({ description: 'Display name for the rule', example: 'Greet new enquiries', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Text sent back into the chat when the rule matches',
    example: 'Thanks for reaching out — we reply within the hour.',
    maxLength: MESSAGE_TEXT_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_TEXT_MAX_LENGTH)
  replyText!: string;

  @ApiPropertyOptional({ description: CONDITIONS_DESCRIPTION })
  @IsOptional()
  @IsValidWebhookFilters()
  conditions?: WebhookFilters | null;

  @ApiPropertyOptional({
    description: COOLDOWN_DESCRIPTION,
    default: 60,
    minimum: 0,
    maximum: AUTOMATION_COOLDOWN_MAX_SECONDS,
  })
  @IsOptional()
  @ToStrictNumber()
  @IsInt()
  @Min(0)
  @Max(AUTOMATION_COOLDOWN_MAX_SECONDS)
  cooldownSeconds?: number;

  @ApiPropertyOptional({ description: 'Whether the rule is active', default: true })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    enum: MATCH_MODES,
    default: AutomationMatchMode.CONTAINS,
    description: 'Body matcher applied after webhook-filter conditions. regex requires AUTO_REPLY_REGEX=true.',
  })
  @IsOptional()
  @IsIn(MATCH_MODES)
  matchMode?: AutomationMatchMode;

  @ApiPropertyOptional({
    description: 'Pattern for matchMode. Omitted = no extra body match (conditions-only).',
    maxLength: 1024,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  matchPattern?: string | null;

  @ApiPropertyOptional({ enum: CHAT_CONTEXTS, default: AutomationChatContext.ALL })
  @IsOptional()
  @IsIn(CHAT_CONTEXTS)
  chatContext?: AutomationChatContext;

  @ApiPropertyOptional({
    description: 'http(s) image URL sent as the reply (SSRF-safe fetch at send time). replyText becomes the caption.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  replyMediaUrl?: string | null;
}

export class UpdateAutomationRuleDto {
  @ApiPropertyOptional({ description: 'Display name for the rule', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Text sent back into the chat when the rule matches',
    maxLength: MESSAGE_TEXT_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_TEXT_MAX_LENGTH)
  replyText?: string;

  @ApiPropertyOptional({ description: CONDITIONS_DESCRIPTION })
  @IsOptional()
  @IsValidWebhookFilters()
  conditions?: WebhookFilters | null;

  @ApiPropertyOptional({ description: COOLDOWN_DESCRIPTION, minimum: 0, maximum: AUTOMATION_COOLDOWN_MAX_SECONDS })
  @IsOptional()
  @ToStrictNumber()
  @IsInt()
  @Min(0)
  @Max(AUTOMATION_COOLDOWN_MAX_SECONDS)
  cooldownSeconds?: number;

  @ApiPropertyOptional({ description: 'Whether the rule is active' })
  @IsOptional()
  @ToStrictBoolean()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ enum: MATCH_MODES })
  @IsOptional()
  @IsIn(MATCH_MODES)
  matchMode?: AutomationMatchMode;

  @ApiPropertyOptional({ maxLength: 1024, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  matchPattern?: string | null;

  @ApiPropertyOptional({ enum: CHAT_CONTEXTS })
  @IsOptional()
  @IsIn(CHAT_CONTEXTS)
  chatContext?: AutomationChatContext;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  replyMediaUrl?: string | null;
}

export class AutomationRuleResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  sessionId!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  enabled!: boolean;

  @ApiPropertyOptional({ description: CONDITIONS_DESCRIPTION, nullable: true })
  @Expose()
  conditions!: WebhookFilters | null;

  @ApiProperty()
  @Expose()
  replyText!: string;

  @ApiProperty()
  @Expose()
  cooldownSeconds!: number;

  @ApiProperty({ enum: MATCH_MODES })
  @Expose()
  matchMode!: AutomationMatchMode;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  matchPattern!: string | null;

  @ApiProperty({ enum: CHAT_CONTEXTS })
  @Expose()
  chatContext!: AutomationChatContext;

  @ApiPropertyOptional({ nullable: true })
  @Expose()
  replyMediaUrl!: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;

  static fromEntity(rule: AutomationRule): AutomationRuleResponseDto {
    return plainToInstance(AutomationRuleResponseDto, rule, { excludeExtraneousValues: true });
  }
}
