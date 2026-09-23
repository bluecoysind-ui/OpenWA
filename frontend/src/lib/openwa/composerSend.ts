/** Chat composer payload helpers (ported from dashboard). */

export interface QuotableMessage {
  id: string;
  waMessageId?: string | null;
  type?: string;
  body?: string;
}

export interface ComposerAttachment {
  base64: string;
  mimetype: string;
  filename?: string;
}

export function quotedIdOf(replyingTo: QuotableMessage | null | undefined): string | undefined {
  if (!replyingTo) return undefined;
  return replyingTo.waMessageId || replyingTo.id;
}

export function buildMediaSendPayload(
  attachment: ComposerAttachment,
  caption: string | undefined,
  replyingTo: QuotableMessage | null | undefined,
): { base64: string; mimetype: string; filename?: string; caption?: string; quotedMessageId?: string } {
  const quotedMessageId = quotedIdOf(replyingTo);
  return {
    base64: attachment.base64,
    mimetype: attachment.mimetype,
    filename: attachment.filename,
    caption,
    ...(quotedMessageId ? { quotedMessageId } : {}),
  };
}
