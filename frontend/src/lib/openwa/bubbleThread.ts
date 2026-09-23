import type { Bubble } from "@/lib/gateway-types";

export type DeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed";

const DELIVERY_RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 };

export function mergeDeliveryStatus(current?: DeliveryStatus, incoming?: DeliveryStatus): DeliveryStatus | undefined {
  if (!incoming) return current;
  if (!current) return incoming;
  if (current === "failed") return "failed";
  if (incoming === "failed") return current === "pending" || current === "sent" ? "failed" : current;
  if (!(incoming in DELIVERY_RANK)) return current;
  if (!(current in DELIVERY_RANK)) return incoming;
  return DELIVERY_RANK[incoming] >= DELIVERY_RANK[current] ? incoming : current;
}

export function bubbleKey(b: Bubble): string {
  if (b.kind !== "text") return b.id;
  return b.waMessageId ?? b.id;
}

export function findBubbleIndex(list: Bubble[], messageId: string): number {
  return list.findIndex(
    (b) => b.kind === "text" && (b.id === messageId || b.waMessageId === messageId),
  );
}

export function mergeIncomingBubble(list: Bubble[], incoming: Bubble): Bubble[] {
  if (incoming.kind !== "text") return [...list, incoming];
  const idx = findBubbleIndex(list, bubbleKey(incoming));
  if (idx === -1) return [...list, incoming];
  const existing = list[idx];
  if (existing.kind !== "text") return list;
  const next = list.slice();
  next[idx] = {
    ...incoming,
    waMessageId: incoming.waMessageId ?? existing.waMessageId,
    deliveryStatus: mergeDeliveryStatus(existing.deliveryStatus, incoming.deliveryStatus),
    reactions: incoming.reactions ?? existing.reactions,
    quotedPreview: incoming.quotedPreview ?? existing.quotedPreview,
    pending: incoming.pending ?? existing.pending,
    media: incoming.media?.url ? incoming.media : existing.media?.url ? existing.media : incoming.media,
  };
  return next;
}

export function applyMessageAck(
  list: Bubble[],
  ids: { id: string; messageId?: string },
  status: DeliveryStatus,
): Bubble[] {
  const keys = [ids.id, ids.messageId].filter(Boolean) as string[];
  let changed = false;
  const next = list.map((b) => {
    if (b.kind !== "text") return b;
    if (!keys.some((k) => b.id === k || b.waMessageId === k)) return b;
    changed = true;
    return { ...b, deliveryStatus: mergeDeliveryStatus(b.deliveryStatus, status) ?? status };
  });
  return changed ? next : list;
}

export function applyMessageRevoked(
  list: Bubble[],
  event: { id: string; revokedId?: string },
): Bubble[] {
  const match = (b: Bubble) => {
    if (b.kind !== "text") return false;
    if (b.id === event.id || b.waMessageId === event.id) return true;
    if (event.revokedId && (b.id === event.revokedId || b.waMessageId === event.revokedId)) return true;
    return false;
  };
  if (!list.some(match)) return list;
  return list.map((b) =>
    match(b) && b.kind === "text"
      ? { ...b, revoked: true, text: "This message was deleted" }
      : b,
  );
}

export function applyMessageEdit(
  list: Bubble[],
  event: { messageId: string; body: string },
): Bubble[] {
  if (!event.messageId) return list;
  const idx = findBubbleIndex(list, event.messageId);
  if (idx === -1) return list;
  const row = list[idx];
  if (row.kind !== "text") return list;
  const next = list.slice();
  next[idx] = { ...row, text: event.body };
  return next;
}

export function applyMessageReaction(
  list: Bubble[],
  messageId: string,
  reactions: Record<string, string> | undefined,
): Bubble[] {
  const idx = findBubbleIndex(list, messageId);
  if (idx === -1) return list;
  const row = list[idx];
  if (row.kind !== "text") return list;
  const next = list.slice();
  next[idx] = { ...row, reactions: reactions ?? row.reactions };
  return next;
}
