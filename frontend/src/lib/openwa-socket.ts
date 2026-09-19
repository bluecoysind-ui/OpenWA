import { io, type Socket } from "socket.io-client";
import { getOpenWAApiKey, getOpenWASocketOrigin } from "./openwa-config";

export type SessionStatusEvent = { sessionId: string; status: string; timestamp: string };
export type QRCodeEvent = { sessionId: string; qrCode: string; timestamp: string };
export type MessageUpsertEvent = { sessionId: string; message: Record<string, unknown>; timestamp: string };
export type ChatUpsertEvent = { sessionId: string; chat: Record<string, unknown> };
export type ContactUpsertEvent = { sessionId: string; contact: Record<string, unknown> };

export type OpenWASocketHandlers = {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onSessionStatus?: (event: SessionStatusEvent) => void;
  onQRCode?: (event: QRCodeEvent) => void;
  onMessageUpsert?: (event: MessageUpsertEvent) => void;
  onChatUpsert?: (event: ChatUpsertEvent) => void;
  onContactUpsert?: (event: ContactUpsertEvent) => void;
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
