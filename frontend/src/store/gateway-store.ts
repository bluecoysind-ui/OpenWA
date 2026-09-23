import { create } from "zustand";
import type { Bubble, BubbleMedia, BubbleMediaType, ChatPreview } from "@/lib/gateway-types";
import {
  addWebhook as apiAddWebhook,
  cancelBulkJob,
  connectSession,
  createSessionRecord,
  startExistingSession,
  disconnectSession,
  deleteSession as apiDeleteSession,
  fetchMessageMedia,
  getQr,
  listBulkJobs,
  requestPairingCode as apiRequestPairingCode,
  listChats,
  listMessages,
  listSessions,
  loadWsStats,
  markChatRead,
  mapSessionStatus,
  sessionNeedsAutoReconnect,
  removeWebhook as apiRemoveWebhook,
  retryBulkJob,
  sendMediaFile,
  sendRawApi,
  sendText,
  startBulkJob,
  testProxy as apiTestProxy,
  updateSessionConfig,
  type BulkJobSummary,
  type GatewayChat,
  type GatewayEvent,
  type GatewayMessage,
  type GatewaySession,
  type StartBulkInput,
} from "@/lib/gateway-client";
import { OpenWAError, probeApiKeyValidation, replyToMessage, validateApiKey } from "@/lib/openwa-api";
import { clearAppQueryCache } from "@/lib/auth/provider";
import { resolveStartupValidation } from "@/lib/openwa/authLifecycle";
import { nextReconnectState } from "@/lib/openwa/reconnectState";
import { applyIncomingToChatList, promoteChatWithSnippet } from "@/lib/openwa/chatList";
import {
  applyMessageAck,
  applyMessageEdit,
  applyMessageReaction,
  applyMessageRevoked,
  mergeIncomingBubble,
  type DeliveryStatus,
} from "@/lib/openwa/bubbleThread";
import { createTrailingCoalescer } from "@/lib/openwa/trailingCoalescer";
export type ChatFeedTab = "chats" | "channels" | "status";
import { clearOpenWACredentials, getOpenWAApiKey, getOpenWAUrl, setOpenWACredentials } from "@/lib/openwa-config";
import {
  connectSocket,
  disconnectSocket,
  setSocketHandlers,
  subscribeAllSessions,
  subscribeSession,
  type MessageUpsertEvent,
} from "@/lib/openwa-socket";

/** Page sizes for the chat list and a conversation. */
const CHATS_PAGE = 30;
const MESSAGES_PAGE = 40;
/** How often the dashboard re-reads session status (there is no push channel). */
const SESSION_REFRESH_MS = 10_000;
/** Min gap between silent auto-starts for the same linked session (avoids start storms). */
const AUTO_RESTART_COOLDOWN_MS = 5_000;

const markReadCoalescer = createTrailingCoalescer<{ sessionId: string; chatId: string }>(
  ({ sessionId, chatId }) => void markChatRead(sessionId, chatId),
  600,
);

const autoRestartInFlight = new Set<string>();
const autoRestartLastAttempt = new Map<string, number>();
/** Faster poll while a history sync is in progress, so the progress bar moves. */
const SYNC_REFRESH_MS = 2_000;
/** How often the open conversation / chat list are refreshed while the inbox is on screen. */
const INBOX_REFRESH_MS = 8_000;

/** WhatsApp timestamps are seconds; the UI wants a short local clock. */
function clockFrom(ts: number | undefined): string {
  // The backend normalizes to Unix seconds, but guard anyway: coerce, reject
  // non-finite/≤0, and never let an invalid Date render as "Invalid Date".
  const n = typeof ts === "number" ? ts : Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "";
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Backend /chats/overview row -> the ChatPreview the UI already renders. */
function toChatPreview(c: GatewayChat): ChatPreview {
  const name = c.name || c.phone || c.id.split("@")[0];
  return {
    id: c.id,
    name,
    preview: c.lastMessage ?? "",
    time: clockFrom(c.lastMessageTimestamp),
    lastAt: c.lastMessageTimestamp,
    unread: c.unreadCount ?? 0,
    kind: c.isGroup ? "group" : "dm",
    avatar: c.profilePicture ? "photo" : "initials",
    photo: c.profilePicture ?? undefined,
    initials: initialsFrom(name),
    phone: c.phone ?? undefined,
  };
}

const MEDIA_TYPES = new Set<string>(["image", "video", "audio", "ptt", "document", "sticker"]);

/** Short chat-list line for a message, mirroring the backend's preview labels. */
function previewOf(m: GatewayMessage): string {
  if (typeof m.content === "string" && m.content) return m.content;
  switch (m.type) {
    case "image":
      return m.caption || "📷 Photo";
    case "video":
      return m.caption || "🎥 Video";
    case "ptt":
      return "🎤 Voice message";
    case "audio":
      return "🎵 Audio";
    case "document":
      return `📄 ${m.filename || "Document"}`;
    case "sticker":
      return "🏷️ Sticker";
    default:
      return `[${m.type}]`;
  }
}

/**
 * Backend message -> chat bubble. Media keeps its type/url so the conversation
 * can render it (or offer to fetch it); structured content (location, contact,
 * poll, reaction) is summarised — never rendered raw.
 */
function toBubble(m: GatewayMessage): Bubble {
  const content = m.content;
  const isMedia = MEDIA_TYPES.has(m.type);
  let text: string;
  if (typeof content === "string" && content) text = content;
  else if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (m.type === "reaction") text = `${(c.emoji as string) ?? "👍"} reacted to a message`;
    else if (m.type === "location") text = `📍 ${(c.name as string) || (c.address as string) || `${c.latitude}, ${c.longitude}`}`;
    else if (m.type === "contact") text = `👤 ${(c.displayName as string) || "Contact"}`;
    else if (m.type === "poll") text = `📊 ${(c.question as string) || "Poll"}`;
    else text = `[${m.type}]`;
  } else if (isMedia) text = m.caption ?? "";
  else text = m.caption ?? `[${m.type}]`;

  const media: BubbleMedia | undefined = isMedia
    ? {
        type: m.type as BubbleMediaType,
        url: m.mediaUrl ?? null,
        mimetype: m.mimetype ?? null,
        filename: m.filename ?? null,
      }
    : undefined;

  const omitted = Boolean(media && !media.url && isMedia);
  return {
    id: m.id,
    kind: "text",
    from: m.fromMe ? "me" : "them",
    text: omitted ? "📎 Media" : text,
    time: clockFrom(m.timestamp),
    sender: m.isGroup && !m.fromMe ? m.senderName || m.senderPhone || null : null,
    media: omitted ? { ...media!, url: null } : media,
    waMessageId: m.waMessageId ?? m.id,
    deliveryStatus: m.status,
    mediaOmitted: omitted,
  };
}

/** Which WhatsApp message kind a local file becomes (mirrors the backend's mimetype rule). */
export function mediaTypeForFile(file: File, asDocument = false): BubbleMediaType {
  const mime = file.type.toLowerCase();
  if (asDocument) return "document";
  if (mime.startsWith("image/") && mime !== "image/webp") return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

type NavId = "chats" | "contacts" | "groups" | "broadcast" | "scrapers" | "tools" | "settings";
type Filter = "all" | "unread" | "groups";
type Overlay = null | "qr" | "create-session" | "webhooks" | "proxy" | "bulk" | "templates" | "search";
export type SettingsPanel =
  | "home"
  | "overview"
  | "sessions"
  | "webhooks"
  | "api-keys"
  | "templates"
  | "plugins"
  | "infra"
  | "logs"
  | "message-tester"
  | "scheduler"
  | "automation"
  | "media-files"
  | "profile"
  | "catalog"
  | "calls"
  | "system";

/** Paging state of one loaded conversation. */
type ThreadMeta = { cursor: string | null; hasMore: boolean; loading: boolean };

type State = {
  live: boolean;
  authNeeded: boolean;
  user: string;
  apiKey: string;
  serverUrl: string;
  wsConnected: boolean;
  wsClients: number;
  sessions: GatewaySession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  events: GatewayEvent[];
  chats: ChatPreview[];
  chatsHasMore: boolean;
  chatsLoading: boolean;
  chatsError: string | null;
  threads: Record<string, Bubble[]>;
  threadMeta: Record<string, ThreadMeta>;
  activeChatId: string;
  /** Account the inbox shows. Every chat/message call goes through this session. */
  activeAccountId: string;
  nav: NavId;
  filter: Filter;
  query: string;
  overlay: Overlay;
  qrSession: string;
  qrSrc: string;
  qrExpiresAt: number | null;
  pairingCode: string;
  pairingPhone: string;
  pairingExpiresAt: number | null;
  pairingLoading: boolean;
  webhookSessionId: string;
  /** Session the proxy modal edits. */
  proxySessionId: string;
  composer: string;
  /** Session whose campaigns the Broadcast panel shows. */
  bulkSessionId: string;
  bulkJobs: BulkJobSummary[];
  bulkLoading: boolean;
  toasts: Array<{ id: string; type: "success" | "error" | "info"; message: string }>;
  contactTab: "info" | "media" | "files" | "links";
  mobilePane: "list" | "chat" | "profile";
  settingsPanel: SettingsPanel;
  chatFeedTab: ChatFeedTab;
  replyingTo: { messageId: string; preview: string } | null;
  init: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  loadChats: (opts?: { silent?: boolean }) => Promise<void>;
  loadMoreChats: () => Promise<void>;
  loadMessages: (chatId: string, opts?: { force?: boolean; silent?: boolean }) => Promise<void>;
  loadOlderMessages: (chatId: string) => Promise<void>;
  /** Ask the gateway for a message's attachment (downloads from WhatsApp if needed). */
  loadMedia: (chatId: string, messageId: string) => Promise<string | null>;
  setNav: (id: NavId) => void;
  setSettingsPanel: (p: SettingsPanel) => void;
  setFilter: (f: Filter) => void;
  setQuery: (q: string) => void;
  selectChat: (id: string) => void;
  selectAccount: (id: string) => void;
  setComposer: (v: string) => void;
  sendComposer: () => Promise<void>;
  sendAttachment: (file: File, caption: string, asDocument?: boolean) => Promise<boolean>;
  openOverlay: (o: Overlay, extra?: string) => void;
  closeOverlay: () => void;
  createSession: (id: string, webhook?: string, proxy?: string) => Promise<void>;
  /** Save (or clear, with null) the proxy a session connects through. Resolves true on success. */
  setProxy: (sessionId: string, proxy: string | null) => Promise<boolean>;
  /** Fetch the egress IP through a proxy URL without saving it. */
  testProxy: (proxy: string) => Promise<{ ok: boolean; message: string; ip?: string; latencyMs?: number }>;
  reconnect: (id: string) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
  refreshQr: (id: string, opts?: { maxAttempts?: number }) => Promise<void>;
  watchQrSession: (id: string) => void;
  requestPairingCode: (phoneNumber: string) => Promise<boolean>;
  addHook: (url: string, events: string[]) => Promise<void>;
  removeHook: (url: string) => Promise<void>;
  setBulkSession: (id: string) => void;
  loadBulkJobs: () => Promise<void>;
  startBulk: (input: Omit<StartBulkInput, "sessionIds"> & { sessionIds?: string[] }) => Promise<string | null>;
  cancelBulk: (jobId: string) => Promise<void>;
  retryBulk: (jobId: string) => Promise<void>;
  applyTemplate: (body: string) => void;
  pushToast: (type: "success" | "error" | "info", message: string) => void;
  dismissToast: (id: string) => void;
  pushEvent: (type: GatewayEvent["type"], content: string) => void;
  clearEvents: () => void;
  runApi: (method: string, path: string, body: string) => Promise<unknown>;
  login: (
    user: string,
    pass: string,
    key?: string,
    url?: string,
    opts?: { quiet?: boolean },
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  setApiKey: (k: string) => void;
  setContactTab: (t: State["contactTab"]) => void;
  setMobilePane: (p: State["mobilePane"]) => void;
  setChatFeedTab: (tab: ChatFeedTab) => void;
  setReplyingTo: (reply: State["replyingTo"]) => void;
};

function nid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Poll interval that watches a pairing session while the QR modal is open. */
let qrWatchTimer: ReturnType<typeof setInterval> | null = null;
let qrWatchInFlight = false;
let lastCompletedLink: { id: string; at: number } | null = null;
let createInFlight = false;

/** Poll interval that refreshes campaign progress while any job is still sending. */
let bulkWatchTimer: ReturnType<typeof setInterval> | null = null;

/** Background timers: session status, and the open inbox. Started once by init(). */
let sessionRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let inboxRefreshTimer: ReturnType<typeof setInterval> | null = null;
let bootRetryTimer: ReturnType<typeof setTimeout> | null = null;
let bootInFlight = false;
let chatsLoadInFlight = false;
const messageLoadInFlight = new Set<string>();

let wsReconnectState = { isConnected: false, hadConnected: false, wasDisconnected: false, connectionFailed: false };

/**
 * Which session a campaign should go out from: the account picked in the rail
 * if it can send, else the first connected one, else whatever exists.
 */
export function pickBulkSession(sessions: GatewaySession[], preferred: string): GatewaySession | undefined {
  const chosen = sessions.find((s) => s.sessionId === preferred);
  if (chosen?.status === "connected") return chosen;
  return sessions.find((s) => s.status === "connected") ?? chosen ?? sessions[0];
}

/** The account the inbox is showing — the one picked in the rail, else the first connected one. */
export function activeSession(s: Pick<State, "sessions" | "activeAccountId">): GatewaySession | undefined {
  return s.sessions.find((x) => x.sessionId === s.activeAccountId) ?? s.sessions.find((x) => x.status === "connected");
}

/** Replace an optimistic bubble (or apply a patch) inside one thread. */
function patchBubble(threads: Record<string, Bubble[]>, chatId: string, id: string, patch: (b: Bubble) => Bubble | null) {
  const thread = threads[chatId] ?? [];
  const next: Bubble[] = [];
  for (const b of thread) {
    if (b.id !== id) {
      next.push(b);
      continue;
    }
    const replaced = patch(b);
    if (replaced) next.push(replaced);
  }
  return { ...threads, [chatId]: next };
}

/** Human line for the explicit lifecycle events the gateway emits. */
/** Linked before (phone on file) but the engine is down — start it without opening the QR modal. */
async function autoRestartLinkedSession(
  sessionId: string,
  reason: string,
  options?: { skipCooldown?: boolean },
): Promise<void> {
  const st = useGateway.getState();
  if (!st.live) return;
  if (autoRestartInFlight.has(sessionId)) return;
  const session = st.sessions.find((s) => s.sessionId === sessionId);
  if (!session || !sessionNeedsAutoReconnect(session)) return;

  const last = autoRestartLastAttempt.get(sessionId) ?? 0;
  if (!options?.skipCooldown && Date.now() - last < AUTO_RESTART_COOLDOWN_MS) return;

  autoRestartInFlight.add(sessionId);
  autoRestartLastAttempt.set(sessionId, Date.now());
  try {
    let result = await connectSession(sessionId, {});
    if (!result.success && /already started/i.test(result.message ?? "")) {
      await disconnectSession(sessionId);
      await new Promise((resolve) => setTimeout(resolve, 400));
      result = await connectSession(sessionId, {});
    }
    if (result.success) {
      st.pushEvent("connection", `Auto-restarting ${session.name || sessionId} (${reason})`);
      await useGateway.getState().refreshSessions();
    }
  } finally {
    autoRestartInFlight.delete(sessionId);
  }
}

function openQrIfRelinkNeeded(sessionId: string): void {
  const st = useGateway.getState();
  const session = st.sessions.find((s) => s.sessionId === sessionId);
  if (!session?.phoneNumber) return;
  if (st.overlay === "qr" && st.qrSession === sessionId) return;
  st.pushToast("info", "WhatsApp needs a fresh link — scan the QR");
  st.openOverlay("qr", sessionId);
  void st.refreshQr(sessionId, { maxAttempts: 90 });
}

function pairingStillValid(st: { pairingCode: string; pairingExpiresAt: number | null; pairingLoading: boolean }): boolean {
  if (st.pairingLoading) return true;
  if (!st.pairingCode) return false;
  if (st.pairingExpiresAt === null) return false;
  return Date.now() < st.pairingExpiresAt;
}

function completeQrLink(sessionId: string, toast = "WhatsApp linked successfully"): void {
  const now = Date.now();
  if (lastCompletedLink && lastCompletedLink.id === sessionId && now - lastCompletedLink.at < 4_000) return;
  lastCompletedLink = { id: sessionId, at: now };
  const st = useGateway.getState();
  if (st.overlay === "qr" && st.qrSession === sessionId) {
    st.closeOverlay();
  }
  st.pushToast("success", toast);
  st.pushEvent("connection", `Session ${sessionId} connected`);
  useGateway.setState({ nav: "chats" });
  const next = useGateway.getState();
  if (next.activeAccountId !== sessionId) next.selectAccount(sessionId);
  else void next.loadChats();
}

function describeStatusChange(before: GatewaySession | undefined, after: GatewaySession): string | null {
  if (!before || before.status === after.status) return null;
  const who = after.name || after.phoneNumber || after.sessionId;
  if (after.status === "connected") return `${who} connected`;
  if (before.status === "connected") {
    return after.status === "logged_out" ? `${who} logged out` : `${who} disconnected (${after.status})`;
  }
  return `${after.sessionId}: ${before.status} → ${after.status}`;
}

function ingestSocketMessage(sessionId: string, raw: Record<string, unknown>) {
  const chatId = String(raw.chatId ?? raw.to ?? "");
  if (!chatId) return;
  const fromMe = raw.direction === "outgoing" || raw.fromMe === true;
  const body = typeof raw.body === "string" ? raw.body : typeof raw.content === "string" ? raw.content : "";
  const ts = Number(raw.timestamp ?? Date.now() / 1000);
  const id = String(raw.id ?? raw.messageId ?? `${Date.now()}`);
  const type = String(raw.type ?? "text");
  const gw: GatewayMessage = {
    id,
    chatId,
    fromMe,
    timestamp: ts,
    type,
    content: body,
    caption: type !== "text" ? body : null,
    senderName: typeof raw.chatName === "string" ? raw.chatName : null,
    isGroup: raw.kind === "group" || chatId.includes("@g.us"),
    status: typeof raw.status === "string" ? (raw.status as DeliveryStatus) : undefined,
    waMessageId: id,
  };
  const bubble = toBubble(gw);
  const preview = previewOf(gw);
  const time = clockFrom(ts);
  let needsSidebarRefetch = false;
  useGateway.setState((s) => {
    if (s.activeAccountId && s.activeAccountId !== sessionId) return s;
    const thread = mergeIncomingBubble(s.threads[chatId] ?? [], bubble);
    const list = applyIncomingToChatList(
      s.chats.map((c) => ({
        id: c.id,
        lastMessage: c.preview,
        timestamp: c.lastAt,
        unreadCount: c.unread,
      })),
      { chatId, body: preview, type, timestamp: ts, fromMe },
      { activeChatId: s.activeChatId, locationLabel: "📍 Location" },
    );
    needsSidebarRefetch = list.needsSidebarRefetch;
    if (list.needsSidebarRefetch) {
      return { threads: { ...s.threads, [chatId]: thread } };
    }
    const chats: ChatPreview[] = list.chats.map((c) => {
      const prev = s.chats.find((x) => x.id === c.id)!;
      const snippet = c.lastMessage ?? prev.preview;
      const lastAt = c.timestamp ?? prev.lastAt;
      return {
        ...prev,
        preview: snippet,
        time: lastAt ? clockFrom(lastAt) : prev.time,
        lastAt,
        unread: c.unreadCount ?? prev.unread,
      };
    });
    if (!chats.some((c) => c.id === chatId)) {
      chats.unshift({
        id: chatId,
        name: gw.senderName || chatId.split("@")[0],
        preview,
        time,
        lastAt: ts,
        unread: fromMe ? 0 : 1,
        kind: gw.isGroup ? "group" : "dm",
        avatar: "initials",
        initials: initialsFrom(gw.senderName || chatId),
      });
    }
    return { threads: { ...s.threads, [chatId]: thread }, chats };
  });
  if (needsSidebarRefetch) void useGateway.getState().loadChats({ silent: true });
}

function wireRealtime() {
  setSocketHandlers({
    onConnect: () => {
      const decision = nextReconnectState({ ...wsReconnectState, isConnected: true });
      wsReconnectState = { ...wsReconnectState, isConnected: true, hadConnected: decision.hadConnected, wasDisconnected: decision.wasDisconnected };
      useGateway.setState({ wsConnected: true });
      subscribeAllSessions(useGateway.getState().sessions.map((s) => s.sessionId));
      if (decision.invalidate) {
        const { activeChatId } = useGateway.getState();
        if (activeChatId) void useGateway.getState().loadMessages(activeChatId, { force: true, silent: true });
      }
    },
    onDisconnect: () => {
      const decision = nextReconnectState({ ...wsReconnectState, isConnected: false });
      wsReconnectState = { ...wsReconnectState, isConnected: false, hadConnected: decision.hadConnected, wasDisconnected: decision.wasDisconnected };
      useGateway.setState({ wsConnected: false });
    },
    onSessionStatus: ({ sessionId, status }) => {
      const mapped = mapSessionStatus(status);
      const before = useGateway.getState().sessions.find((s) => s.sessionId === sessionId);
      useGateway.setState((s) => ({
        sessions: s.sessions.map((sess) => (sess.sessionId === sessionId ? { ...sess, status: mapped } : sess)),
      }));
      if (mapped === "connected") {
        const st = useGateway.getState();
        if (st.overlay === "qr" && st.qrSession === sessionId) {
          completeQrLink(sessionId);
        }
      } else if (
        (mapped === "disconnected" || mapped === "failed") &&
        before?.status === "connected" &&
        before.phoneNumber
      ) {
        void autoRestartLinkedSession(sessionId, "drop detected");
      } else if (mapped === "qr_ready") {
        openQrIfRelinkNeeded(sessionId);
      }
    },
    onQRCode: ({ sessionId, qrCode }) => {
      if (!qrCode) return;
      const src = qrCode.startsWith("data:") || qrCode.startsWith("http") ? qrCode : `data:image/png;base64,${qrCode}`;
      const st = useGateway.getState();
      const refreshPairing =
        st.overlay === "qr" &&
        st.qrSession === sessionId &&
        Boolean(st.pairingPhone.replace(/\D/g, "")) &&
        !pairingStillValid(st);
      if (st.overlay === "qr" && st.qrSession === sessionId) {
        useGateway.setState({
          qrSrc: src,
          qrExpiresAt: Date.now() + 20_000,
          pairingCode: refreshPairing ? "" : st.pairingCode,
          pairingExpiresAt: refreshPairing ? null : st.pairingExpiresAt,
        });
        if (refreshPairing) void useGateway.getState().requestPairingCode(st.pairingPhone);
        return;
      }
      const linked = st.sessions.find((s) => s.sessionId === sessionId)?.phoneNumber;
      if (linked) {
        useGateway.setState({ qrSrc: src, qrExpiresAt: Date.now() + 20_000 });
        openQrIfRelinkNeeded(sessionId);
      }
    },
    onMessageUpsert: (event: MessageUpsertEvent) => ingestSocketMessage(event.sessionId, event.message),
    onMessageAck: (event) => {
      useGateway.setState((s) => {
        if (s.activeAccountId !== event.sessionId) return s;
        let changed = false;
        const threads = { ...s.threads };
        for (const [chatId, list] of Object.entries(s.threads)) {
          const next = applyMessageAck(list, { id: event.id, messageId: event.messageId }, event.status);
          if (next !== list) {
            threads[chatId] = next;
            changed = true;
          }
        }
        return changed ? { threads } : s;
      });
    },
    onMessageReaction: (event) => {
      useGateway.setState((s) => {
        if (s.activeAccountId !== event.sessionId) return s;
        const thread = applyMessageReaction(s.threads[event.chatId] ?? [], event.messageId, event.reactions);
        return { threads: { ...s.threads, [event.chatId]: thread } };
      });
    },
    onMessageRevoked: (event) => {
      useGateway.setState((s) => {
        if (s.activeAccountId !== event.sessionId) return s;
        const thread = applyMessageRevoked(s.threads[event.chatId] ?? [], { id: event.id, revokedId: event.revokedId });
        return { threads: { ...s.threads, [event.chatId]: thread } };
      });
    },
    onMessageEdited: (event) => {
      useGateway.setState((s) => {
        if (s.activeAccountId !== event.sessionId) return s;
        const current = s.threads[event.chatId];
        if (!current) return s;
        const thread = applyMessageEdit(current, event);
        if (thread === current) return s;
        const last = thread[thread.length - 1];
        const editedLast =
          last?.kind === "text" && (last.id === event.messageId || last.waMessageId === event.messageId);
        return {
          threads: { ...s.threads, [event.chatId]: thread },
          chats: editedLast
            ? s.chats.map((c) => (c.id === event.chatId ? { ...c, preview: event.body } : c))
            : s.chats,
        };
      });
    },
    onSessionRestriction: ({ sessionId }) => {
      void useGateway.getState().refreshSessions();
      useGateway.getState().pushToast("info", `Session restriction (${sessionId})`);
    },
    onChatUpsert: ({ sessionId }) => {
      const st = useGateway.getState();
      if (st.activeAccountId === sessionId) void st.loadChats({ silent: true });
    },
    onServerError: ({ code }) => {
      if (code === "FORBIDDEN_SESSION") {
        subscribeAllSessions(useGateway.getState().sessions.map((s) => s.sessionId));
      }
    },
  });
  connectSocket();
}

function scheduleGatewayBootRetry(): void {
  if (bootRetryTimer) return;
  bootRetryTimer = setTimeout(() => {
    bootRetryTimer = null;
    void useGateway.getState().init();
  }, 750);
}

export const useGateway = create<State>((set, get) => ({
  live: false,
  authNeeded: typeof window !== "undefined" ? !getOpenWAApiKey() : true,
  user: typeof sessionStorage !== "undefined" ? (sessionStorage.getItem("dashboard_user") ?? "") : "",
  apiKey: typeof window !== "undefined" ? getOpenWAApiKey() : "",
  serverUrl: typeof window !== "undefined" ? getOpenWAUrl() : "http://localhost:2785",
  wsConnected: false,
  wsClients: 0,
  sessions: [],
  sessionsLoading: false,
  sessionsError: null,
  events: [],
  chats: [],
  chatsHasMore: false,
  chatsLoading: false,
  chatsError: null,
  threads: {},
  threadMeta: {},
  activeChatId: "",
  activeAccountId: "",
  nav: "chats",
  filter: "all",
  query: "",
  overlay: null,
  qrSession: "",
  qrSrc: "",
  qrExpiresAt: null,
  pairingCode: "",
  pairingPhone: "",
  pairingExpiresAt: null,
  pairingLoading: false,
  webhookSessionId: "",
  proxySessionId: "",
  composer: "",
  bulkSessionId: "",
  bulkJobs: [],
  bulkLoading: false,
  toasts: [],
  contactTab: "info",
  mobilePane: "list",
  settingsPanel: "home",
  chatFeedTab: "chats",
  replyingTo: null,

  init: async () => {
    const storedKey = getOpenWAApiKey();
    if (!storedKey) {
      set({ authNeeded: true, live: false });
      return;
    }
    if (bootInFlight) return;
    bootInFlight = true;
    if (bootRetryTimer) {
      clearTimeout(bootRetryTimer);
      bootRetryTimer = null;
    }
    const { status, body } = await probeApiKeyValidation(storedKey, getOpenWAUrl());
    const startup = resolveStartupValidation(status, body);
    if (startup.action === "logout") {
      bootInFlight = false;
      get().logout();
      return;
    }
    if (startup.action === "role") {
      sessionStorage.setItem("dashboard_user", startup.role);
      set({ user: startup.role });
    }
    set({ authNeeded: false, sessionsLoading: true, sessionsError: null });
    try {
      const result = await listSessions();
      if (result.success && Array.isArray(result.data)) {
        const sessions = result.data.filter((s) => s.status !== "qr_expired");
        const current = get().activeAccountId;
        const active =
          sessions.find((s) => s.sessionId === current && s.status === "connected") ??
          sessions.find((s) => s.status === "connected") ??
          sessions.find((s) => s.sessionId === current && (s.status === "connecting" || s.status === "qr_ready")) ??
          sessions.find((s) => s.status === "connecting" || s.status === "qr_ready") ??
          sessions.find((s) => s.sessionId === current && Boolean(s.phoneNumber)) ??
          sessions.find((s) => Boolean(s.phoneNumber)) ??
          sessions.find((s) => s.sessionId === current) ??
          sessions[0];
        set({
          live: true,
          authNeeded: false,
          sessions,
          sessionsLoading: false,
          sessionsError: null,
          activeAccountId: active?.sessionId ?? "",
        });
        get().pushEvent("connection", "Connected to OpenWA");
        wireRealtime();
        for (const s of sessions) {
          if (sessionNeedsAutoReconnect(s)) {
            void autoRestartLinkedSession(s.sessionId, "dashboard opened", { skipCooldown: true });
          }
        }
        await get().loadChats();
      } else {
        set({ live: false, wsConnected: false, sessionsLoading: false, sessionsError: result.message ?? "No sessions" });
        get().pushEvent("error", result.message ?? "Gateway returned no sessions");
        scheduleGatewayBootRetry();
      }
    } catch (err) {
      const errStatus = err instanceof OpenWAError ? err.status : 0;
      set({
        live: false,
        wsConnected: false,
        sessionsLoading: false,
        authNeeded: errStatus === 401,
        sessionsError: err instanceof Error ? err.message : "Gateway not reachable",
      });
      get().pushEvent("error", "Gateway not reachable");
      if (errStatus !== 401) scheduleGatewayBootRetry();
    } finally {
      bootInFlight = false;
    }
    try {
      const stats = await loadWsStats();
      if (stats.success) set({ wsClients: stats.data?.totalConnections ?? 0 });
    } catch {
      set({ wsClients: 1 });
    }

    // Plain polling keeps the rail and the open inbox current — no push channel needed.
    // Self-rescheduling poll: 2s while any account is syncing history, else 10s.
    if (!sessionRefreshTimer) {
      const tick = async () => {
        await get().refreshSessions();
        const syncing = get().sessions.some((s) => s.sync?.active);
        sessionRefreshTimer = setTimeout(tick, syncing ? SYNC_REFRESH_MS : SESSION_REFRESH_MS);
      };
      sessionRefreshTimer = setTimeout(tick, SESSION_REFRESH_MS);
    }
    if (!inboxRefreshTimer) {
      inboxRefreshTimer = setInterval(() => {
        const { nav, live, activeChatId, overlay } = get();
        if (!live || nav !== "chats" || overlay) return;
        void get().loadChats({ silent: true });
        if (activeChatId) void get().loadMessages(activeChatId, { force: true, silent: true });
      }, INBOX_REFRESH_MS);
    }
  },

  /**
   * Re-read the session list. Status changes are announced in the event log
   * (that is where "X disconnected" shows up), and an account that just came
   * online while selected gets its chats loaded without a page refresh.
   */
  refreshSessions: async () => {
    if (!get().live) return;
    let result: Awaited<ReturnType<typeof listSessions>>;
    try {
      result = await listSessions();
    } catch {
      return; // transient; the next tick retries
    }
    if (!result.success || !Array.isArray(result.data)) return;
    const before = get().sessions;
    const sessions = result.data.filter((s) => s.status !== "qr_expired");
    for (const s of sessions) {
      const line = describeStatusChange(
        before.find((b) => b.sessionId === s.sessionId),
        s,
      );
      if (line) get().pushEvent("connection", line);
      const b = before.find((x) => x.sessionId === s.sessionId);
      if (b && b.status === "connected" && sessionNeedsAutoReconnect(s)) {
        void autoRestartLinkedSession(s.sessionId, "status poll");
      }
      if (!b && sessionNeedsAutoReconnect(s)) {
        void autoRestartLinkedSession(s.sessionId, "status poll", { skipCooldown: true });
      }
      // Announce when a history sync finishes so the chat list reloads.
      if (b?.sync?.active && s.sync && !s.sync.active) {
        get().pushEvent("connection", `${s.name || s.sessionId}: history synced (${s.sync.chats} chats, ${s.sync.messages} messages)`);
        if (s.sessionId === get().activeAccountId) void get().loadChats({ silent: true });
      }
    }
    const activeId = get().activeAccountId;
    const activeBefore = before.find((s) => s.sessionId === activeId);
    const activeAfter = sessions.find((s) => s.sessionId === activeId);
    const connected = sessions.find((s) => s.status === "connected");
    const fallback =
      connected ??
      sessions.find((s) => s.status === "connecting" || s.status === "qr_ready") ??
      sessions.find((s) => Boolean(s.phoneNumber)) ??
      sessions[0];
    const nextActive =
      (activeAfter?.status === "connected" ? activeId : undefined) ??
      connected?.sessionId ??
      (activeAfter && (activeAfter.status === "connecting" || activeAfter.status === "qr_ready")
        ? activeId
        : undefined) ??
      (activeAfter?.phoneNumber ? activeId : undefined) ??
      fallback?.sessionId ??
      "";
    set({ sessions, activeAccountId: nextActive });
    if (nextActive !== activeId) {
      await get().loadChats();
    } else if (activeAfter?.status === "connected" && activeBefore?.status !== "connected") {
      await get().loadChats();
    }
  },

  /**
   * Load the active account's conversations (first page). Only a *connected*
   * session has history, so anything else leaves the list empty and states
   * the reason — the panes render an explicit empty state rather than
   * pretending to hold data.
   */
  loadChats: async (opts = {}) => {
    const silent = Boolean(opts.silent);
    const session = activeSession(get());
    if (!session || session.status !== "connected") {
      if (silent) return;
      set({ chats: [], chatsHasMore: false, threads: {}, threadMeta: {}, activeChatId: "" });
      if (session) get().pushEvent("connection", `${session.name || session.sessionId} is ${session.status} — no chats to show.`);
      else get().pushEvent("connection", "No connected session — scan the QR to load chats.");
      return;
    }
    if (chatsLoadInFlight && silent) return;
    chatsLoadInFlight = true;
    if (!silent) set({ chatsLoading: true, chatsError: null });
    try {
      const result = await listChats(session.sessionId, CHATS_PAGE, 0);
      // The account changed while we were waiting — drop this response.
      if (get().activeAccountId !== session.sessionId) return;
      if (!result.success || !result.data) {
        if (!silent) {
          set({ chatsError: result.message ?? "Could not load chats" });
          get().pushEvent("error", result.message ?? "Could not load chats");
        }
        return;
      }
      const fresh = result.data.chats.map(toChatPreview);
      set((s) => {
        // Keep pages the user already scrolled to; refresh the first page in place.
        const firstIds = new Set(fresh.map((c) => c.id));
        const tail = s.chats.slice(CHATS_PAGE).filter((c) => !firstIds.has(c.id));
        const chats = [...fresh, ...tail];
        const keepSelection = Boolean(s.activeChatId && (chats.some((c) => c.id === s.activeChatId) || silent));
        const activeChatId = keepSelection ? s.activeChatId : (chats[0]?.id ?? "");
        return { chats, chatsHasMore: result.data!.hasMore, activeChatId };
      });
      if (fresh.length === 0) {
        if (!silent) get().pushEvent("connection", `Connected — no chat history on ${session.name || session.sessionId} yet.`);
        return;
      }
      const { activeChatId, threads } = get();
      if (activeChatId && !threads[activeChatId]) await get().loadMessages(activeChatId);
    } catch {
      if (!silent) get().pushEvent("error", "Could not load chats");
    } finally {
      chatsLoadInFlight = false;
      if (!silent) set({ chatsLoading: false });
    }
  },

  loadMoreChats: async () => {
    const session = activeSession(get());
    const { chats, chatsHasMore, chatsLoading } = get();
    if (!session || session.status !== "connected" || !chatsHasMore || chatsLoading) return;
    set({ chatsLoading: true });
    try {
      const result = await listChats(session.sessionId, CHATS_PAGE, chats.length);
      if (get().activeAccountId !== session.sessionId) return;
      if (!result.success || !result.data) return;
      const more = result.data.chats.map(toChatPreview);
      set((s) => {
        const known = new Set(s.chats.map((c) => c.id));
        return { chats: [...s.chats, ...more.filter((c) => !known.has(c.id))], chatsHasMore: result.data!.hasMore };
      });
    } catch {
      get().pushToast("error", "Could not load more chats");
    } finally {
      set({ chatsLoading: false });
    }
  },

  /**
   * Load the newest page of one conversation. Already-loaded threads are left
   * alone unless `force` (the inbox poll) — then the newest page is merged in
   * without losing older pages the user scrolled to.
   */
  loadMessages: async (chatId, opts = {}) => {
    const silent = Boolean(opts.silent);
    const session = activeSession(get());
    if (!chatId || !session || session.status !== "connected") return;
    const existing = get().threadMeta[chatId];
    if (existing && !opts.force) return;
    if (existing?.loading) return;
    if (messageLoadInFlight.has(chatId)) return;
    messageLoadInFlight.add(chatId);
    if (!silent) {
      set((s) => ({ threadMeta: { ...s.threadMeta, [chatId]: { ...(existing ?? { cursor: null, hasMore: false }), loading: true } } }));
    }
    try {
      const result = await listMessages(session.sessionId, chatId, MESSAGES_PAGE, null);
      if (get().activeAccountId !== session.sessionId) return;
      if (!result.success || !result.data) return;
      // Backend returns newest-first; the bubble list renders oldest at top.
      const page = result.data.messages.map(toBubble).reverse();
      set((s) => {
        const current = s.threads[chatId] ?? [];
        const pageIds = new Set(page.map((b) => b.id));
        // Older pages (before the newest page) + pending optimistic bubbles survive the merge.
        const older = current.filter((b) => !pageIds.has(b.id) && !(b.kind === "text" && b.pending));
        const pending = current.filter((b) => b.kind === "text" && b.pending && !pageIds.has(b.id));
        const merged = existing ? [...older.filter((b) => !isNewerThanPage(b, current, page)), ...page, ...pending] : page;
        const meta = existing
          ? { cursor: existing.cursor ?? result.data!.cursor, hasMore: existing.cursor ? existing.hasMore : result.data!.hasMore, loading: false }
          : { cursor: result.data!.cursor, hasMore: result.data!.hasMore, loading: false };
        return { threads: { ...s.threads, [chatId]: merged }, threadMeta: { ...s.threadMeta, [chatId]: meta } };
      });
    } catch {
      if (!silent) {
        set((s) => ({ threadMeta: { ...s.threadMeta, [chatId]: { ...(s.threadMeta[chatId] ?? { cursor: null, hasMore: false }), loading: false } } }));
      }
    } finally {
      messageLoadInFlight.delete(chatId);
    }
  },

  /** Prepend the page before the oldest loaded message. */
  loadOlderMessages: async (chatId) => {
    const session = activeSession(get());
    const meta = get().threadMeta[chatId];
    if (!session || session.status !== "connected" || !meta || !meta.hasMore || meta.loading || !meta.cursor) return;
    set((s) => ({ threadMeta: { ...s.threadMeta, [chatId]: { ...meta, loading: true } } }));
    try {
      const result = await listMessages(session.sessionId, chatId, MESSAGES_PAGE, meta.cursor);
      if (!result.success || !result.data) throw new Error(result.message);
      const older = result.data.messages.map(toBubble).reverse();
      set((s) => {
        const known = new Set((s.threads[chatId] ?? []).map((b) => b.id));
        return {
          threads: { ...s.threads, [chatId]: [...older.filter((b) => !known.has(b.id)), ...(s.threads[chatId] ?? [])] },
          threadMeta: {
            ...s.threadMeta,
            [chatId]: { cursor: result.data!.cursor ?? meta.cursor, hasMore: result.data!.hasMore && older.length > 0, loading: false },
          },
        };
      });
    } catch {
      set((s) => ({ threadMeta: { ...s.threadMeta, [chatId]: { ...meta, loading: false } } }));
      get().pushToast("error", "Could not load older messages");
    }
  },

  loadMedia: async (chatId, messageId) => {
    const session = activeSession(get());
    if (!session) return null;
    const mark = (patch: Partial<BubbleMedia>) =>
      set((s) => ({
        threads: patchBubble(s.threads, chatId, messageId, (b) =>
          b.kind === "text" && b.media ? { ...b, media: { ...b.media, ...patch } } : b,
        ),
      }));
    mark({ loading: true });
    try {
      const result = await fetchMessageMedia(session.sessionId, chatId, messageId);
      if (!result.success || !result.data) {
        mark({ loading: false });
        get().pushToast("error", result.message || "Media unavailable");
        return null;
      }
      mark({ loading: false, url: result.data.url, mimetype: result.data.mimetype, filename: result.data.filename });
      return result.data.url;
    } catch {
      mark({ loading: false });
      get().pushToast("error", "Gateway unreachable — media not loaded");
      return null;
    }
  },

  setNav: (nav) => set({ nav, settingsPanel: nav === "settings" ? get().settingsPanel : "home" }),
  setSettingsPanel: (settingsPanel) => set({ settingsPanel, nav: "settings" }),
  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  selectChat: (id) => {
    set((s) => ({
      activeChatId: id,
      mobilePane: "chat",
      chats: s.chats.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    }));
    void get().loadMessages(id);
    const session = activeSession(get());
    if (session?.status === "connected") markReadCoalescer.call({ sessionId: session.sessionId, chatId: id });
  },

  /** Switch the inbox (and the Broadcast panel) to another account. */
  selectAccount: (id) => {
    if (id === get().activeAccountId) return;
    set({
      activeAccountId: id,
      bulkSessionId: id,
      bulkJobs: [],
      chats: [],
      chatsHasMore: false,
      threads: {},
      threadMeta: {},
      activeChatId: "",
      composer: "",
    });
    void get().loadChats();
  },
  setComposer: (composer) => set({ composer }),
  setContactTab: (contactTab) => set({ contactTab }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
  setChatFeedTab: (chatFeedTab) => set({ chatFeedTab }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),

  sendComposer: async () => {
    const { composer, activeChatId, live, pushToast, pushEvent } = get();
    const session = activeSession(get());
    const text = composer.trim();
    if (!text || !activeChatId) return;
    if (!live || !session || session.status !== "connected") {
      pushToast("error", live ? "This account is not connected" : "Not connected to the gateway");
      return;
    }
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const tempId = nid();
    const bubble: Bubble = { id: tempId, kind: "text", from: "me", text, time, pending: true };
    set((s) => ({
      composer: "",
      threads: { ...s.threads, [activeChatId]: [...(s.threads[activeChatId] ?? []), bubble] },
      chats: promoteChatWithSnippet(
        s.chats.map((c) => ({ ...c, lastMessage: c.preview, timestamp: c.lastAt, unreadCount: c.unread })),
        activeChatId,
        text,
        Math.floor(Date.now() / 1000),
      ).map((row) => {
        const orig = s.chats.find((c) => c.id === row.id)!;
        return { ...orig, preview: row.lastMessage ?? text, time, lastAt: row.timestamp ?? orig.lastAt };
      }),
    }));
    const reply = get().replyingTo;
    try {
      let realId: string | undefined;
      if (reply) {
        const data = await replyToMessage(session.sessionId, {
          chatId: activeChatId,
          quotedMessageId: reply.messageId,
          text,
        });
        realId = data.messageId;
        set({ replyingTo: null });
      } else {
        const result = await sendText({ sessionId: session.sessionId, chatId: activeChatId, message: text });
        if (!result.success) throw new Error(result.message || "Send failed");
        realId = result.data?.messageId;
      }
      const settledId = realId ?? tempId;
      set((s) => ({
        threads: patchBubble(s.threads, activeChatId, tempId, (b) => ({ ...b, id: settledId, pending: false })),
      }));
      pushEvent("message", `Sent: ${text.slice(0, 60)}`);
    } catch (err) {
      // Roll the optimistic bubble back — nothing was delivered.
      set((s) => ({ threads: patchBubble(s.threads, activeChatId, tempId, () => null) }));
      pushToast("error", `Send failed — ${err instanceof Error ? err.message : "message not delivered"}`);
      pushEvent("error", `Send failed: ${text.slice(0, 60)}`);
    }
  },

  /** Upload + send a file to the open chat. Resolves true when WhatsApp accepted it. */
  sendAttachment: async (file, caption, asDocument = false) => {
    const { activeChatId, live, pushToast, pushEvent } = get();
    const session = activeSession(get());
    if (!activeChatId) return false;
    if (!live || !session || session.status !== "connected") {
      pushToast("error", live ? "This account is not connected" : "Not connected to the gateway");
      return false;
    }
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const tempId = nid();
    const localUrl = URL.createObjectURL(file);
    const type = mediaTypeForFile(file, asDocument);
    const bubble: Bubble = {
      id: tempId,
      kind: "text",
      from: "me",
      text: caption,
      time,
      pending: true,
      media: { type, url: localUrl, mimetype: file.type || null, filename: file.name },
    };
    set((s) => ({
      composer: "",
      threads: { ...s.threads, [activeChatId]: [...(s.threads[activeChatId] ?? []), bubble] },
      chats: s.chats.map((c) => (c.id === activeChatId ? { ...c, preview: caption || `📎 ${file.name}`, time } : c)),
    }));
    try {
      const result = await sendMediaFile({ sessionId: session.sessionId, chatId: activeChatId, file, caption, asDocument });
      if (!result.success || !result.data) throw new Error(result.message || "Send failed");
      const data = result.data;
      set((s) => ({
        threads: patchBubble(s.threads, activeChatId, tempId, (b) =>
          b.kind === "text"
            ? { ...b, id: data.messageId, pending: false, media: { type: data.type as BubbleMediaType, url: data.mediaUrl, mimetype: data.mimetype, filename: data.filename } }
            : b,
        ),
      }));
      URL.revokeObjectURL(localUrl);
      pushEvent("message", `Sent ${data.type}: ${file.name}`);
      return true;
    } catch (err) {
      set((s) => ({ threads: patchBubble(s.threads, activeChatId, tempId, () => null) }));
      URL.revokeObjectURL(localUrl);
      pushToast("error", `Send failed — ${err instanceof Error ? err.message : "file not delivered"}`);
      pushEvent("error", `Send failed: ${file.name}`);
      return false;
    }
  },

  openOverlay: (overlay, extra) => {
    if (overlay === "qr") {
      set({ overlay, qrSession: extra ?? "" });
      if (extra) get().watchQrSession(extra);
    } else if (overlay === "webhooks") set({ overlay, webhookSessionId: extra ?? "" });
    else if (overlay === "proxy") set({ overlay, proxySessionId: extra ?? "" });
    else set({ overlay });
  },
  closeOverlay: () => {
    if (qrWatchTimer) {
      clearInterval(qrWatchTimer);
      qrWatchTimer = null;
    }
    set({ overlay: null, qrSrc: "", qrExpiresAt: null, pairingCode: "", pairingPhone: "", pairingExpiresAt: null, pairingLoading: false });
  },

  createSession: async (id, webhook, proxy) => {
    if (createInFlight) return;
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      get().pushToast("error", "Session name: letters, numbers, and hyphens only");
      return;
    }
    if (!get().live) {
      get().pushToast("error", "Not connected to the gateway");
      return;
    }
    const body: Record<string, unknown> = { name: id };
    if (webhook) body.webhooks = [{ url: webhook }];
    if (proxy) body.proxy = proxy;
    createInFlight = true;
    let created: Awaited<ReturnType<typeof createSessionRecord>>;
    try {
      created = await createSessionRecord(id, body);
    } catch {
      createInFlight = false;
      get().pushToast("error", "Gateway unreachable — session not created");
      return;
    }
    if (!created.success) {
      createInFlight = false;
      get().pushToast("error", created.message || "Failed to create session");
      return;
    }
    const sessionId = created.data?.sessionId ?? id;
    set((s) => ({
      sessions: [
        ...s.sessions.filter((x) => x.sessionId !== sessionId && x.sessionId !== id),
        {
          sessionId,
          name: created.data?.name ?? id,
          status: created.data?.status ?? "connecting",
          webhooks: webhook ? [{ url: webhook }] : [],
          proxy: proxy ? proxy.replace(/:([^:@/]+)@/, ":***@") : null,
        },
      ],
      overlay: "qr",
      qrSession: sessionId,
      qrSrc: "",
      qrExpiresAt: null,
      pairingCode: "",
      pairingPhone: "",
      pairingExpiresAt: null,
    }));
    subscribeSession(sessionId);
    get().pushEvent("connection", `Session ${id} created`);
    get().pushToast("success", "Scan QR to connect");
    get().watchQrSession(sessionId);
    void get().refreshQr(sessionId, { maxAttempts: 90 });
    void startExistingSession(sessionId).then((result) => {
      if (!result.success) {
        get().pushToast("error", result.message || "Failed to start session");
      }
    }).finally(() => {
      createInFlight = false;
    });
  },

  setProxy: async (sessionId, proxy) => {
    if (!get().live) {
      get().pushToast("error", "Not connected to the gateway");
      return false;
    }
    try {
      const result = await updateSessionConfig(sessionId, { proxy });
      if (!result.success || !result.data) {
        get().pushToast("error", result.message || "Could not save proxy");
        return false;
      }
      const saved = result.data.proxy;
      set((s) => ({
        sessions: s.sessions.map((sess) => (sess.sessionId === sessionId ? { ...sess, proxy: saved } : sess)),
      }));
      get().pushToast(result.data.proxyApplied ? "success" : "info", result.message || "Proxy saved");
      get().pushEvent("connection", `Session ${sessionId} proxy ${saved ? `set to ${saved}` : "removed"}`);
      // A live session restarts through the new proxy — pick up its status changes.
      if (result.data.proxyApplied) setTimeout(() => void get().refreshSessions(), 6000);
      return true;
    } catch {
      get().pushToast("error", "Gateway unreachable — proxy not saved");
      return false;
    }
  },

  testProxy: async (proxy) => {
    if (!get().live) return { ok: false, message: "Not connected to the gateway" };
    try {
      const result = await apiTestProxy({ proxy });
      const data = result.data;
      return {
        ok: Boolean(result.success && data?.ok),
        message: result.message || (data?.ok ? `Egress IP ${data.ip}` : data?.error || "Proxy check failed"),
        ip: data?.ip,
        latencyMs: data?.latencyMs,
      };
    } catch {
      return { ok: false, message: "Gateway unreachable" };
    }
  },

  reconnect: async (id) => {
    if (!get().live) {
      get().pushToast("error", "Not connected to the gateway");
      return;
    }
    const existing = get().sessions.find((s) => s.sessionId === id);
    const needsStop =
      existing &&
      (existing.status === "disconnected" ||
        existing.status === "failed" ||
        existing.status === "logged_out" ||
        existing.status === "qr_expired");

    try {
      if (needsStop) {
        await disconnectSession(id);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      let result = await connectSession(id, {});
      if (!result.success && /already started/i.test(result.message ?? "")) {
        await disconnectSession(id);
        await new Promise((resolve) => setTimeout(resolve, 400));
        result = await connectSession(id, {});
      }
      if (!result.success) {
        get().pushToast("error", result.message || "Failed to reconnect");
        return;
      }
      set((s) => ({
        sessions: s.sessions.map((sess) =>
          sess.sessionId === id ? { ...sess, status: mapSessionStatus(result.data?.status ?? "connecting") } : sess,
        ),
      }));
      get().pushToast("success", "Reconnecting…");
      set({
        qrSession: id,
        qrSrc: "",
        qrExpiresAt: null,
        pairingCode: "",
        pairingPhone: "",
        pairingExpiresAt: null,
      });
      get().openOverlay("qr", id);
      await get().refreshQr(id, { maxAttempts: 90 });
    } catch {
      get().pushToast("error", "Failed to reconnect");
    }
  },

  removeSession: async (id) => {
    try {
      if (get().live) await apiDeleteSession(id);
    } catch {
      /* already reported to the user via a toast */
    }
    set((s) => ({ sessions: s.sessions.filter((x) => x.sessionId !== id) }));
    get().pushToast("success", "Session deleted");
    get().pushEvent("connection", `Session ${id} deleted`);
    if (get().activeAccountId === id) {
      const next = get().sessions.find((s) => s.status === "connected") ?? get().sessions[0];
      set({ activeAccountId: next?.sessionId ?? "", chats: [], threads: {}, threadMeta: {}, activeChatId: "" });
      if (next) await get().loadChats();
    }
  },

  refreshQr: async (id, opts?: { maxAttempts?: number }) => {
    const maxAttempts = opts?.maxAttempts ?? 30;
    if (get().qrSession !== id) {
      set({ qrSession: id, qrSrc: "", qrExpiresAt: null });
    }
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await getQr(id);
      if (result.success && result.data?.qrCode) {
        set({
          qrSrc: result.data.qrCode,
          qrSession: id,
          qrExpiresAt: result.data.qrExpiresAt ?? Date.now() + 20_000,
          pairingCode: result.data.pairingCode ?? get().pairingCode,
          pairingPhone: result.data.pairingPhone ?? get().pairingPhone,
          pairingExpiresAt: result.data.pairingExpiresAt ?? get().pairingExpiresAt,
        });
        return;
      }
      const msg = result.message ?? "";
      if (/already authenticated/i.test(msg)) {
        completeQrLink(id);
        void get().refreshSessions();
        return;
      }
      if (!/not ready|wait/i.test(msg) && !result.success && attempt > 4) {
        get().pushToast("error", msg || "QR unavailable");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!get().qrSrc) {
      get().pushToast("error", "QR not ready — wait a moment and try Reconnect again");
    }
  },

  /**
   * While the QR modal is open, poll the gateway: keep the QR image fresh as
   * the backend rotates it, and close the modal the moment pairing finishes
   * (connected) or is revoked (qr_expired). The newly linked account becomes
   * the active one and its chats load — no page refresh needed.
   */
  watchQrSession: (id) => {
    if (qrWatchTimer) clearInterval(qrWatchTimer);
    let lastListAt = 0;
    const tick = async () => {
      if (qrWatchInFlight) return;
      const { overlay, qrSession } = get();
      if (overlay !== "qr" || !qrSession || qrSession !== id) return;
      qrWatchInFlight = true;
      try {
        const before = get();
        const qrExpired = before.qrExpiresAt !== null && Date.now() >= before.qrExpiresAt;
        const qr = await getQr(qrSession);
        if (qr.success && qr.data) {
          const nextQr = qr.data.qrCode;
          const qrRotated = Boolean(nextQr && (nextQr !== before.qrSrc || qrExpired));
          const patch: Partial<typeof before> = {};
          if (nextQr && qrRotated) patch.qrSrc = nextQr;
          if (qr.data.qrExpiresAt != null) patch.qrExpiresAt = qr.data.qrExpiresAt;
          if (qr.data.pairingCode) {
            patch.pairingCode = qr.data.pairingCode;
            patch.pairingPhone = qr.data.pairingPhone ?? before.pairingPhone;
            patch.pairingExpiresAt = qr.data.pairingExpiresAt ?? before.pairingExpiresAt;
          } else if (qrRotated && before.pairingCode && !pairingStillValid(before)) {
            patch.pairingCode = "";
            patch.pairingExpiresAt = null;
          }
          if (Object.keys(patch).length > 0) set(patch);
          if (qrRotated && before.pairingPhone.replace(/\D/g, "") && !pairingStillValid(before)) {
            void get().requestPairingCode(before.pairingPhone);
          }
        } else if (/already authenticated/i.test(qr.message ?? "")) {
          completeQrLink(qrSession);
          void get().refreshSessions();
          return;
        }
        const now = Date.now();
        if (now - lastListAt < 2000) return;
        lastListAt = now;
        const list = await listSessions();
        const sessions = list.success && Array.isArray(list.data) ? list.data : undefined;
        const status = sessions?.find((s) => s.sessionId === qrSession)?.status;
        if (status === "connected") {
          set((s) => ({ sessions: sessions ?? s.sessions }));
          completeQrLink(qrSession);
        } else if (status === "qr_expired") {
          set((s) => ({
            sessions: (sessions ?? s.sessions).filter((x) => x.sessionId !== qrSession && x.status !== "qr_expired"),
          }));
          get().closeOverlay();
          get().pushToast("error", "QR expired — session removed. Create a new session to link again.");
          get().pushEvent("error", `Session ${qrSession} QR expired and was removed`);
        } else if (sessions) {
          set({ sessions: sessions.filter((x) => x.status !== "qr_expired") });
        }
      } catch {
        /* gateway hiccup — retry on the next tick */
      } finally {
        qrWatchInFlight = false;
      }
    };
    void tick();
    qrWatchTimer = setInterval(() => void tick(), 500);
  },

  requestPairingCode: async (phoneNumber) => {
    const id = get().qrSession;
    if (!id) {
      get().pushToast("error", "No pairing session is open");
      return false;
    }
    if (!get().live) {
      get().pushToast("error", "Not connected to the gateway");
      return false;
    }
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length < 11 || digits.length > 15) {
      get().pushToast("error", "Enter the full number with country code (e.g. 919876543210)");
      return false;
    }
    set({ pairingLoading: true });
    try {
      const result = await apiRequestPairingCode(id, digits);
      if (!result.success || !result.data?.pairingCode) {
        get().pushToast("error", result.message || "Could not get a pairing code");
        return false;
      }
      set({
        pairingCode: result.data.pairingCode,
        pairingPhone: result.data.pairingPhone || digits,
        pairingExpiresAt: result.data.pairingExpiresAt ?? Date.now() + 180_000,
      });
      get().pushToast("success", "Enter this code in WhatsApp");
      get().pushEvent("qr", `Pairing code generated for ${digits}`);
      return true;
    } catch {
      get().pushToast("error", "Gateway unreachable — pairing code not requested");
      return false;
    } finally {
      set({ pairingLoading: false });
    }
  },

  addHook: async (url, events) => {
    const sid = get().webhookSessionId;
    try {
      if (get().live) await apiAddWebhook(sid, url, events);
    } catch {
      /* already reported to the user via a toast */
    }
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.sessionId === sid
          ? { ...sess, webhooks: [...(sess.webhooks ?? []), { url, events }] }
          : sess,
      ),
    }));
    get().pushToast("success", "Webhook added");
  },

  removeHook: async (url) => {
    const sid = get().webhookSessionId;
    try {
      if (get().live) await apiRemoveWebhook(sid, url);
    } catch {
      /* already reported to the user via a toast */
    }
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.sessionId === sid
          ? { ...sess, webhooks: (sess.webhooks ?? []).filter((w) => w.url !== url) }
          : sess,
      ),
    }));
    get().pushToast("success", "Webhook removed");
  },

  setBulkSession: (id) => {
    if (id === get().bulkSessionId) return;
    set({ bulkSessionId: id, bulkJobs: [] });
    void get().loadBulkJobs();
  },

  /**
   * Refresh the campaign list for `bulkSessionId` (falling back to the best
   * available session) and keep polling every 2s while any job is sending.
   */
  loadBulkJobs: async () => {
    const { live, sessions, bulkSessionId, activeAccountId } = get();
    if (!live) return;
    const session =
      sessions.find((s) => s.sessionId === bulkSessionId) ?? pickBulkSession(sessions, activeAccountId);
    if (!session) {
      set({ bulkJobs: [], bulkSessionId: "" });
      return;
    }
    if (session.sessionId !== bulkSessionId) set({ bulkSessionId: session.sessionId });
    set({ bulkLoading: true });
    try {
      const result = await listBulkJobs(session.sessionId);
      if (result.success && Array.isArray(result.data)) {
        const previous = get().bulkJobs;
        set({ bulkJobs: result.data });
        // Announce jobs that finished since the last poll.
        for (const job of result.data) {
          const before = previous.find((j) => j.jobId === job.jobId);
          if (before && before.status === "processing" && job.status !== "processing") {
            const label = job.name || `${job.type} campaign`;
            if (job.status === "completed") {
              get().pushToast(job.failed ? "info" : "success", `${label}: ${job.sent} sent, ${job.failed} failed`);
            } else {
              get().pushToast("error", `${label} ${job.status} — ${job.sent}/${job.total} sent`);
            }
            get().pushEvent("message", `Campaign ${job.jobId} ${job.status}: ${job.sent} sent, ${job.failed} failed`);
          }
        }
      } else if (!result.success) {
        get().pushEvent("error", result.message ?? "Could not load campaigns");
      }
    } catch {
      get().pushEvent("error", "Could not load campaigns");
    } finally {
      set({ bulkLoading: false });
    }

    const running = get().bulkJobs.some((j) => j.status === "processing");
    if (running && !bulkWatchTimer) {
      bulkWatchTimer = setInterval(() => void get().loadBulkJobs(), 2000);
    } else if (!running && bulkWatchTimer) {
      clearInterval(bulkWatchTimer);
      bulkWatchTimer = null;
    }
  },

  /** Start a campaign. Resolves with the jobId, or null when nothing was queued. */
  startBulk: async (input) => {
    const { live, sessions, activeAccountId, pushToast, pushEvent } = get();
    if (!live) {
      pushToast("error", "Not connected to the gateway");
      return null;
    }
    // Use the requested accounts (keeping their order = rotation order), but
    // only the connected ones; fall back to the best single account.
    const requested = input.sessionIds && input.sessionIds.length ? input.sessionIds : undefined;
    const lanes = requested
      ? requested.filter((id) => sessions.find((s) => s.sessionId === id)?.status === "connected")
      : [pickBulkSession(sessions, activeAccountId)?.sessionId].filter((x): x is string => Boolean(x));
    const connectedLanes = lanes.filter((id) => sessions.find((s) => s.sessionId === id)?.status === "connected");
    if (connectedLanes.length === 0) {
      pushToast("error", "Pick at least one connected account to send from");
      return null;
    }
    try {
      const result = await startBulkJob({ ...input, sessionIds: connectedLanes });
      if (!result.success || !result.data) {
        pushToast("error", result.message || "Could not start campaign");
        return null;
      }
      const owner = result.data.sessionIds?.[0] ?? connectedLanes[0];
      const laneCount = result.data.sessionIds?.length ?? connectedLanes.length;
      pushEvent("message", `Campaign ${result.data.jobId} started: ${result.data.total} recipients across ${laneCount} account(s)`);
      pushToast("success", `Sending to ${result.data.total} recipients from ${laneCount} account(s)`);
      if (result.data.skippedSessions?.length) {
        pushToast("info", `Skipped (not connected): ${result.data.skippedSessions.join(", ")}`);
      }
      set({ overlay: null, nav: "broadcast", bulkSessionId: owner });
      await get().loadBulkJobs();
      return result.data.jobId;
    } catch {
      pushToast("error", "Gateway unreachable — campaign not started");
      return null;
    }
  },

  cancelBulk: async (jobId) => {
    try {
      const result = await cancelBulkJob(jobId);
      if (!result.success) {
        get().pushToast("error", result.message || "Could not cancel");
      } else {
        get().pushToast("info", "Stopping after the current message…");
        get().pushEvent("message", `Campaign ${jobId} cancel requested`);
      }
    } catch {
      get().pushToast("error", "Gateway unreachable — could not cancel");
    }
    await get().loadBulkJobs();
  },

  retryBulk: async (jobId) => {
    const sid = get().bulkSessionId;
    const session = get().sessions.find((s) => s.sessionId === sid);
    if (!session || session.status !== "connected") {
      get().pushToast("error", "Session must be connected to retry");
      return;
    }
    try {
      const result = await retryBulkJob(sid, jobId);
      get().pushToast("error", result.message || "Could not retry");
    } catch {
      get().pushToast("error", "Gateway unreachable — could not retry");
    }
    await get().loadBulkJobs();
  },

  applyTemplate: (body) => set({ composer: body, overlay: null }),

  pushToast: (type, message) => {
    const id = nid();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().dismissToast(id), 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  pushEvent: (type, content) =>
    set((s) => ({
      events: [{ id: nid(), time: new Date().toLocaleTimeString(), type, content }, ...s.events].slice(0, 100),
    })),
  clearEvents: () => set({ events: [] }),

  runApi: async (method, path, body) => {
    try {
      const result = await sendRawApi(method, path, body);
      get().pushEvent("connection", `${method} ${path}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().pushEvent("error", `${method} ${path} failed: ${message}`);
      return { success: false, method, path, message };
    }
  },

  login: async (user, _pass, key, url, opts) => {
    const apiKey = (key || get().apiKey).trim();
    const origin = (url || get().serverUrl || "http://localhost:2785").replace(/\/+$/, "");
    if (!apiKey) {
      if (!opts?.quiet) get().pushToast("error", "API key required");
      return { ok: false as const, message: "API key required" };
    }
    try {
      const data = await validateApiKey(apiKey, origin);
      setOpenWACredentials(origin, apiKey);
      sessionStorage.setItem("dashboard_auth", "authenticated");
      sessionStorage.setItem("dashboard_user", user || data.role || "operator");
      set({ user: user || data.role || "operator", apiKey, serverUrl: origin, authNeeded: false, live: true });
      get().pushToast("success", "Connected to OpenWA");
      await get().init();
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid API key";
      if (!opts?.quiet) get().pushToast("error", message);
      return { ok: false as const, message };
    }
  },

  logout: () => {
    if (bootRetryTimer) {
      clearTimeout(bootRetryTimer);
      bootRetryTimer = null;
    }
    disconnectSocket();
    clearOpenWACredentials();
    clearAppQueryCache();
    sessionStorage.removeItem("dashboard_auth");
    sessionStorage.removeItem("dashboard_user");
    set({ apiKey: "", user: "", live: false, authNeeded: true, sessions: [], chats: [], threads: {}, wsConnected: false });
    get().pushToast("success", "Logged out");
  },

  setApiKey: (k) => {
    setOpenWACredentials(get().serverUrl, k);
    set({ apiKey: k });
  },
}));

/**
 * During a forced refresh the newest page replaces whatever was at the tail of
 * the thread. A bubble that is not in the page but sits *after* the oldest
 * page message (e.g. a message deleted meanwhile) must not be kept at the end.
 */
function isNewerThanPage(b: Bubble, current: Bubble[], page: Bubble[]): boolean {
  if (page.length === 0) return false;
  const firstPageIdx = current.findIndex((x) => x.id === page[0].id);
  if (firstPageIdx === -1) return false;
  return current.indexOf(b) > firstPageIdx;
}
