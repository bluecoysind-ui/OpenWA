import { BadRequestException } from '@nestjs/common';

/**
 * WhatsApp's poll cap (same as the options array). `0` means unlimited on Baileys.
 */
export const POLL_SELECTABLE_COUNT_MAX = 12;

export interface PollChoiceInput {
  options: string[];
  allowMultipleAnswers?: boolean;
  selectableCount?: number;
}

export interface ResolvedPollChoice {
  allowMultipleAnswers: boolean;
  selectableCount: number;
}

/**
 * Resolve `selectableCount` vs `allowMultipleAnswers`.
 *
 * Precedence: an explicit `selectableCount` wins. Multiple is `selectableCount !== 1` (including
 * `0` = unlimited on Baileys; whatsapp-web.js approximates that as `allowMultipleAnswers: true`).
 * A boolean that disagrees is HTTP 400 rather than a silent override.
 */
export function resolvePollChoice(dto: PollChoiceInput): ResolvedPollChoice {
  const hasCount = dto.selectableCount !== undefined;
  const hasFlag = dto.allowMultipleAnswers !== undefined;

  if (hasCount) {
    const count = dto.selectableCount as number;
    if (count > dto.options.length) {
      throw new BadRequestException('selectableCount cannot exceed the number of options');
    }
    const impliedMultiple = count !== 1;
    if (hasFlag && impliedMultiple !== dto.allowMultipleAnswers) {
      throw new BadRequestException('selectableCount conflicts with allowMultipleAnswers');
    }
    return { allowMultipleAnswers: impliedMultiple, selectableCount: count };
  }

  const allowMultipleAnswers = dto.allowMultipleAnswers === true;
  return { allowMultipleAnswers, selectableCount: allowMultipleAnswers ? 0 : 1 };
}
