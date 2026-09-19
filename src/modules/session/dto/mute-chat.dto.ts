import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';
import { ToStrictNumber } from '../../../common/utils/strict-boolean';

/** 365 days. WhatsApp mute presets are hours/weeks; this is a sanity cap, not a protocol limit. */
export const MUTE_DURATION_SEC_MAX = 31_536_000;

export class MuteChatDto {
  @ApiProperty({
    description: "Chat ID in the active engine's native format (e.g. 1234567890-123@g.us on whatsapp-web.js)",
    example: '1234567890-123@g.us',
  })
  @IsString()
  @IsNotEmpty()
  // Engine-neutral structural check (localpart@host, no whitespace) so a different engine's JID scheme
  // (e.g. Baileys `…@s.whatsapp.net`) is accepted too; the adapter validates/normalises for its engine.
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'chatId must be a valid chat JID in the form localpart@host',
  })
  chatId!: string;

  @ApiPropertyOptional({
    description:
      'Mute for this many seconds from now. Cannot be sent together with `muteUntil`. ' +
      `Positive integer, max ${MUTE_DURATION_SEC_MAX} (365 days).`,
    example: 3600,
  })
  @IsOptional()
  @ToStrictNumber()
  @IsInt()
  @Min(1)
  @Max(MUTE_DURATION_SEC_MAX)
  durationSec?: number;

  @ApiProperty({
    description:
      'Absolute epoch-MILLISECONDS timestamp at which the mute expires, or `null` to unmute now. ' +
      'Required unless `durationSec` is sent — omitting both is rejected rather than guessed, because the two plausible readings ' +
      '(unmute vs mute forever) are opposites. To mute indefinitely, send a far-future timestamp. ' +
      'Milliseconds, not seconds: a seconds-scale value is an instant in 1970, so the mute expires ' +
      'immediately while the request still answers 200. Cannot be sent together with `durationSec`.',
    example: 1800000000000,
    type: Number,
    nullable: true,
    required: false,
  })
  @ValidateIf((o: MuteChatDto) => o.durationSec === undefined && o.muteUntil !== null)
  @IsInt()
  @Min(1)
  muteUntil?: number | null;
}

export function resolveMuteUntil(dto: MuteChatDto, nowMs: number = Date.now()): number | null {
  const hasDuration = dto.durationSec !== undefined;
  const hasUntil = dto.muteUntil !== undefined;
  if (hasDuration && hasUntil) {
    throw new BadRequestException('durationSec and muteUntil cannot both be sent');
  }
  if (hasDuration) {
    return nowMs + (dto.durationSec as number) * 1000;
  }
  if (!hasUntil) {
    throw new BadRequestException('muteUntil or durationSec is required');
  }
  return dto.muteUntil as number | null;
}
