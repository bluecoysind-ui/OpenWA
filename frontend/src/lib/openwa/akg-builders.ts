import { localDateTimeToIsoInstant } from './akg-datetime.ts';

export const CONTACT_CHECK_MAX = 50;
export const MEDIA_UPLOAD_MAX_BYTES = 18 * 1024 * 1024;

export type ScheduledCreateInput = {
  chatId: string;
  localDateTime: string;
  timeZone: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
};

export function buildScheduledCreateBody(input: ScheduledCreateInput) {
  const body: Record<string, string> = {
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
