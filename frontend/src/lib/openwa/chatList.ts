/** Sidebar chat-list reducers (ported from dashboard). */

export interface ChatListEntry {
  id: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount?: number;
}

interface IncomingMessageLike {
  chatId?: string;
  body?: string;
  type?: string;
  timestamp?: number;
  fromMe?: boolean;
}

export interface ChatListUpdate<T> {
  chats: T[];
  needsSidebarRefetch: boolean;
}

export function applyIncomingToChatList<T extends ChatListEntry>(
  chats: T[],
  msg: IncomingMessageLike,
  opts: { activeChatId?: string; locationLabel: string },
): ChatListUpdate<T> {
  const index = chats.findIndex((c) => c.id === msg.chatId);
  if (index === -1) {
    const isMigratedEcho = (msg.fromMe ?? false) && (msg.chatId?.endsWith("@lid") ?? false);
    return { chats, needsSidebarRefetch: !isMigratedEcho };
  }
  const updated = [...chats];
  const target = { ...updated[index] };
  target.lastMessage = msg.type === "location" ? opts.locationLabel : msg.body;
  target.timestamp = msg.timestamp;
  if (!msg.fromMe && opts.activeChatId !== target.id) {
    target.unreadCount = (target.unreadCount || 0) + 1;
  }
  updated.splice(index, 1);
  updated.unshift(target);
  return { chats: updated, needsSidebarRefetch: false };
}

export function promoteChatWithSnippet<T extends ChatListEntry>(
  chats: T[],
  chatId: string,
  snippet: string,
  timestamp: number,
): T[] {
  const index = chats.findIndex((c) => c.id === chatId);
  if (index === -1) return chats;
  const updated = [...chats];
  const target = { ...updated[index], lastMessage: snippet, timestamp };
  updated.splice(index, 1);
  updated.unshift(target);
  return updated;
}
