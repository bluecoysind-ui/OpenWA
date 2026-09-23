import { io, type Socket } from "socket.io-client";
import { getOpenWAApiKey, getOpenWASocketOrigin } from "./openwa-config";

export type SessionStatusEvent = { sessionId: string; status: string; timestamp: string };
export type QRCodeEvent = { sessionId: string; qrCode: string; timestamp: string };
export type MessageUpsertEvent = { sessionId: string; message: Record<string, unknown>; timestamp: string };
export type ChatUpsertEvent = { sessionId: string; chat: Record<string, unknown> };
export type ContactUpsertEvent = { sessionId: string; contact: Record<string, unknown> };
export type MessageAckEvent = {
  sessionId: string;
  id: string;
  messageId: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  ack?: number;
  timestamp: string;
};
export type MessageReactionEvent = {
  sessionId: string;
  messageId: string;
  chatId: string;
  reaction: string;
  senderId: string;
  reactions?: Record<string, string>;
  timestamp: string;
};
export type MessageRevokedEvent = {
  sessionId: string;
  id: string;
  revokedId?: string;
  chatId: string;
  timestamp: number;
};
export type MessageEditedEvent = {
  sessionId: string;
  messageId: string;
  chatId: string;
  body: string;
  timestamp: number;
};

export type OpenWASocketHandlers = {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onSessionStatus?: (event: SessionStatusEvent) => void;
  onQRCode?: (event: QRCodeEvent) => void;
  onMessageUpsert?: (event: MessageUpsertEvent) => void;
  onChatUpsert?: (event: ChatUpsertEvent) => void;
  onContactUpsert?: (event: ContactUpsertEvent) => void;
  onMessageAck?: (event: MessageAckEvent) => void;
  onMessageReaction?: (event: MessageReactionEvent) => void;
  onMessageRevoked?: (event: MessageRevokedEvent) => void;
  onMessageEdited?: (event: MessageEditedEvent) => void;
  onSessionRestriction?: (event: { sessionId: string; timestamp: string }) => void;
  onServerError?: (event: { code: string; message: string }) => void;
};

type EventEnvelope = {
  type: "event";
  timestamp: string;
  payload?: { event: string; sessionId: string; data: Record<string, unknown> };
};

type AckFrame = { type: "subscribed" | "unsubscribed" | "pong"; sessionId?: string; events?: string[] };
type ErrorFrame = { type: "error"; code?: string; message?: string };

const DEFAULT_EVENTS = [
  "session.status",
  "session.qr",
  "session.restriction",
  "message.received",
  "message.sent",
  "message.ack",
  "message.reaction",
  "message.revoked",
  "message.edited",
  "message.upsert",
  "chat.upsert",
  "contact.upsert",
];

let socket: Socket | null = null;
let handlers: OpenWASocketHandlers = {};

function fanOut(msg: EventEnvelope | AckFrame | ErrorFrame) {
  if (!msg || typeof msg.type !== "string") return;
  if (msg.type === "error") {
    handlers.onServerError?.({ code: String(msg.code ?? ""), message: String(msg.message ?? "") });
    return;
  }
  if (msg.type !== "event" || !msg.payload) return;
  const { event, sessionId, data } = msg.payload;
  switch (event) {
    case "session.status":
      handlers.onSessionStatus?.({ sessionId, status: String(data.status), timestamp: msg.timestamp });
      break;
    case "session.qr":
      handlers.onQRCode?.({ sessionId, qrCode: String(data.qrCode ?? data.qr ?? ""), timestamp: msg.timestamp });
      break;
    case "message.received":
    case "message.sent":
    case "message.upsert":
      handlers.onMessageUpsert?.({ sessionId, message: data, timestamp: msg.timestamp });
      break;
    case "chat.upsert":
      handlers.onChatUpsert?.({ sessionId, chat: data });
      break;
    case "contact.upsert":
      handlers.onContactUpsert?.({ sessionId, contact: data });
      break;
    case "message.ack":
      handlers.onMessageAck?.({
        sessionId,
        id: String(data.id),
        messageId: String(data.messageId ?? data.id),
        status: String(data.status ?? "sent") as MessageAckEvent["status"],
        ack: typeof data.ack === "number" ? data.ack : undefined,
        timestamp: msg.timestamp,
      });
      break;
    case "message.reaction":
      handlers.onMessageReaction?.({
        sessionId,
        messageId: String(data.messageId),
        chatId: String(data.chatId),
        reaction: String(data.reaction ?? ""),
        senderId: String(data.senderId ?? ""),
        reactions: data.reactions as Record<string, string> | undefined,
        timestamp: msg.timestamp,
      });
      break;
    case "message.revoked":
      handlers.onMessageRevoked?.({
        sessionId,
        id: String(data.id),
        revokedId: typeof data.revokedId === "string" ? data.revokedId : undefined,
        chatId: String(data.chatId),
        timestamp: Number(data.timestamp ?? 0),
      });
      break;
    case "message.edited":
      if (typeof data.messageId === "string" && typeof data.chatId === "string" && typeof data.body === "string") {
        handlers.onMessageEdited?.({
          sessionId,
          messageId: data.messageId,
          chatId: data.chatId,
          body: data.body,
          timestamp: Number(data.timestamp ?? 0),
        });
      }
      break;
    case "session.restriction":
      handlers.onSessionRestriction?.({ sessionId, timestamp: msg.timestamp });
      break;
    default:
      break;
  }
}

export function setSocketHandlers(next: OpenWASocketHandlers) {
  handlers = next;
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket | null {
  const apiKey = getOpenWAApiKey();
  if (!apiKey) return null;
  if (socket?.connected) return socket;

  disconnectSocket();
  socket = io(`${getOpenWASocketOrigin()}/events`, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    auth: { apiKey },
    extraHeaders: { "X-API-Key": apiKey },
  });
  socket.on("connect", () => handlers.onConnect?.());
  socket.on("disconnect", (reason) => handlers.onDisconnect?.(String(reason)));
  socket.on("message", fanOut);
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function subscribeSession(sessionId: string, events: string[] = DEFAULT_EVENTS) {
  if (!socket?.connected) return;
  socket.emit("message", { type: "subscribe", sessionId, events });
}

export function unsubscribeSession(sessionId: string) {
  if (!socket?.connected) return;
  socket.emit("message", { type: "unsubscribe", sessionId });
}

export function subscribeAllSessions(sessionIds: string[]) {
  subscribeSession("*");
  for (const id of sessionIds) subscribeSession(id);
}
