import { localDateTimeToIsoInstant } from './akg-datetime.ts';

export const CONTACT_CHECK_MAX = 50;
export const MEDIA_UPLOAD_MAX_BYTES = 18 * 1024 * 1024;

export type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly';

export type ScheduledCreateInput = {
  chatId: string;
  localDateTime: string;
  timeZone: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  recurrence?: RecurrenceKind;
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  until?: string;
  maxOccurrences?: number;
};

export function buildScheduledCreateBody(input: ScheduledCreateInput) {
  const body: Record<string, unknown> = {
    chatId: input.chatId,
    sendAt: localDateTimeToIsoInstant(input.localDateTime, input.timeZone),
    timezone: input.timeZone,
  };
  if (input.text?.trim()) body.text = input.text.trim();
  if (input.mediaUrl?.trim()) {
    body.mediaUrl = input.mediaUrl.trim();
    body.mediaType = input.mediaType || 'image';
  }
  if (input.caption?.trim()) body.caption = input.caption.trim();
  const recurrence = input.recurrence ?? 'none';
  if (recurrence !== 'none') {
    body.recurrence = recurrence;
    body.interval = input.interval && input.interval > 0 ? input.interval : 1;
    if (recurrence === 'weekly' && input.daysOfWeek?.length) body.daysOfWeek = input.daysOfWeek;
    if (recurrence === 'monthly' && input.dayOfMonth) body.dayOfMonth = input.dayOfMonth;
    if (input.until?.trim()) body.until = input.until.trim();
    if (input.maxOccurrences && input.maxOccurrences > 0) body.maxOccurrences = input.maxOccurrences;
  }
  return body;
}

export function clampCheckNumbers(numbers: string[], max = CONTACT_CHECK_MAX): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of numbers) {
    const n = raw.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

export type ForwardDestResult = { chatId?: string; status: string; error?: string; messageId?: string };

export function mapForwardMany(httpStatus: number, results: ForwardDestResult[]) {
  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status !== 'sent').length;
  return { httpStatus, sent, failed, results };
}

export function parseNumberList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}