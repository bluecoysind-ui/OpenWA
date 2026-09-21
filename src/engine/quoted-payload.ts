import type { MessageType } from './interfaces/whatsapp-engine.interface';

const MEDIA_TYPES = new Set<MessageType>(['image', 'video', 'audio', 'voice', 'document', 'sticker']);

export interface QuotedPayload {
  id: string;
  body: string;
  type?: MessageType;
  caption?: string;
  hasMedia?: boolean;
  fileUrl?: string;
}

/** Additive quoted fields. Existing `{ id, body }` stay; extras are omitted when unknown or false. */
export function buildQuotedMessage(opts: QuotedPayload): QuotedPayload {
  const quoted: QuotedPayload = { id: opts.id, body: opts.body };
  if (opts.type && opts.type !== 'unknown') quoted.type = opts.type;
  if (opts.caption) quoted.caption = opts.caption;
  if (opts.hasMedia === true) quoted.hasMedia = true;
  else if (opts.hasMedia === undefined && opts.type && MEDIA_TYPES.has(opts.type)) quoted.hasMedia = true;
  if (opts.fileUrl) quoted.fileUrl = opts.fileUrl;
  return quoted;
}

export function quotedHasMedia(type: MessageType | undefined): boolean {
  return !!type && MEDIA_TYPES.has(type);
}

export function quotedCaption(quoted: object): string | undefined {
  const cap = (quoted as { caption?: unknown }).caption;
  return typeof cap === 'string' && cap ? cap : undefined;
}
