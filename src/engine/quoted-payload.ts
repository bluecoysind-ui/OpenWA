const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'voice', 'document', 'sticker']);

export interface QuotedPayload {
  id: string;
  body: string;
  type?: string;
  caption?: string;
  hasMedia?: boolean;
  fileUrl?: string;
}

/** Additive quoted fields. Existing `{ id, body }` stay; extras are omitted when unknown. */
export function buildQuotedMessage(opts: QuotedPayload): QuotedPayload {
  const quoted: QuotedPayload = { id: opts.id, body: opts.body };
  if (opts.type) quoted.type = opts.type;
  if (opts.caption) quoted.caption = opts.caption;
  if (opts.hasMedia !== undefined) quoted.hasMedia = opts.hasMedia;
  else if (opts.type) quoted.hasMedia = MEDIA_TYPES.has(opts.type);
  if (opts.fileUrl) quoted.fileUrl = opts.fileUrl;
  return quoted;
}

export function quotedHasMedia(type: string | undefined): boolean {
  return !!type && MEDIA_TYPES.has(type);
}

export function quotedCaption(quoted: object): string | undefined {
  const cap = (quoted as { caption?: unknown }).caption;
  return typeof cap === 'string' && cap ? cap : undefined;
}
