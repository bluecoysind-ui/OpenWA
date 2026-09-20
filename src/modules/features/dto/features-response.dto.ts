import { ApiProperty } from '@nestjs/swagger';

/** Boolean-only feature snapshot for UI gating. Never includes secrets or env values. */
export class FeaturesResponseDto {
  @ApiProperty({ description: 'SCHEDULED_MESSAGES is on (default on; inert until a job exists).' })
  scheduler!: boolean;

  @ApiProperty({ description: 'BOT_COMMANDS is on (opt-in). Per-session bot-config must also enable commands.' })
  botCommands!: boolean;

  @ApiProperty({ description: 'MEDIA_PERSIST is on (opt-in). List/delete stored inbound files only when true.' })
  mediaPersist!: boolean;

  @ApiProperty({ description: 'REMOVE_BG_API_KEY is non-empty. Never the key itself.' })
  removeBgConfigured!: boolean;

  @ApiProperty({ description: 'AUTO_REPLY_REGEX is on (opt-in). EXACT/CONTAINS/STARTS_WITH need no flag.' })
  regexRules!: boolean;

  @ApiProperty({ description: 'POLL_VOTE_EVENTS is on (opt-in). Webhook-only; not socket-subscribable.' })
  pollVoteEvents!: boolean;
}
