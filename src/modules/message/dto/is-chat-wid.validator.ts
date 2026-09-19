import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isChatWid } from '../../../engine/identity/wa-id';

/**
 * Whether a string can address a chat: an individual, group, channel, or broadcast list.
 * Uses {@link isChatWid} so new DTOs share the same identity rules as the rest of the gateway.
 */
export function isChatWidValue(value: unknown): boolean {
  return typeof value === 'string' && isChatWid(value);
}

@ValidatorConstraint({ name: 'isChatWid', async: false })
export class IsChatWidConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isChatWidValue(value);
  }
  defaultMessage(): string {
    return 'must be a WhatsApp chat id (@c.us, @lid, @g.us, @newsletter, or @broadcast)';
  }
}
