import { BadRequestException } from '@nestjs/common';
import { MESSAGE_TEXT_MAX_LENGTH } from './dto/send-message.dto';

/**
 * Deterministic WhatsApp-style text list. There is no native list message on either engine;
 * this is the formatted body that `send-text-list` hands to the ordinary send-text path.
 */
export function formatTextList(title: string, options: string[], footer?: string): string {
  const lines = [`*${title}*`, '', ...options.map((opt, i) => `${i + 1}. ${opt}`)];
  const trimmedFooter = footer?.trim();
  if (trimmedFooter) lines.push('', trimmedFooter);
  const text = lines.join('\n');
  if (text.length > MESSAGE_TEXT_MAX_LENGTH) {
    throw new BadRequestException('Formatted list exceeds the text-message length limit');
  }
  return text;
}
