/**
 * Compatibility layer: existing gateway UI types + helpers, implemented on OpenWA.
 */

import * as openwa from "./openwa-api";
import {
  OpenWAError,
  type BatchStatusResponse,
  type EngineHistoryMessage,
  type OpenWAChat,
  type OpenWAMessage,
  type OpenWASession,
} from "./openwa-api";
import { getOpenWAApiKey } from "./openwa-config";
import { extractScrapePhone, isDialablePhone, isScrapableMemberJid } from "./wa-phone";
import { formatScraperContactsCsv } from "./openwa/scraperCsv";

export const API_BASE = "/api";

export type SessionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "qr_ready"
  | "qr_expired"
  | "logged_out"
  | "failed";

export type SyncState = {
  active: boolean;
  progress: number;
  isLatest: boolean;
  chats: number;
  contacts: number;
  messages: number;
  startedAt: number | null;
  updatedAt: number | null;
};

export type GatewaySession = {
  sessionId: string;
  name?: string;
  /** WhatsApp profile name (pushName) once the session has authenticated. */
  pushName?: string;
  phoneNumber?: string;
  status: SessionStatus;
  webhooks?: Array<{ url: string; events?: string[] }>;
  proxy?: string | null;
  proxyInfo?: ProxyInfo | null;
  sync?: SyncState | null;
};

export type ProxyInfo = {
  active: string | null;
  connected: boolean;
  source: "session" | "pool" | "none";
  required: boolean;
  poolSize: number;
  index: number | null;
  rotations: number;
  rotatedAt: number | null;
  lastReason: string | null;
};

export type GatewayEvent = {
  id: string;
  time: string;
  type: "message" | "connection" | "qr" | "error";
  content: string;
};

export type EndpointDef = { value: string; label: string; group: string };

export const API_ENDPOINTS: EndpointDef[] = [
  { group: "Sessions", value: "GET|/api/sessions", label: "GET /sessions" },
  { group: "Sessions", value: "POST|/api/sessions", label: "POST /sessions" },
  { group: "Sessions", value: "POST|/api/sessions/{id}/start", label: "POST /sessions/:id/start" },
  { group: "Sessions", value: "POST|/api/sessions/{id}/stop", label: "POST /sessions/:id/stop" },
  { group: "Sessions", value: "GET|/api/sessions/{id}/qr", label: "GET /sessions/:id/qr" },
  { group: "Messaging", value: "POST|/api/sessions/{id}/messages/send-text", label: "POST /sessions/:id/messages/send-text" },
  { group: "Messaging", value: "POST|/api/sessions/{id}/messages/send-bulk", label: "POST /sessions/:id/messages/send-bulk" },
  { group: "History", value: "GET|/api/sessions/{id}/chats", label: "GET /sessions/:id/chats" },
  { group: "History", value: "GET|/api/sessions/{id}/messages", label: "GET /sessions/:id/messages" },
];

export function sampleBodyFor(path: string, method: string): { body: unknown | null; help: string } {
  if (method === "GET") return { body: null, help: "GET request — no body required." };
  if (path.includes("/send-text")) {
    return { body: { chatId: "628123456789@c.us", text: "Hello from OpenWA" }, help: "chatId: WhatsApp JID." };
  }
  if (path.includes("/send-bulk")) {
    return {
      body: {
        messages: [{ chatId: "628123456789@c.us", type: "text", content: { text: "Hello" } }],
        options: { delayBetweenMessages: 3000, randomizeDelay: true },
      },
      help: "Async batch — poll GET /messages/batch/:batchId.",
    };
  }
  if (path.includes("/sessions") && method === "POST" && !path.includes("/start")) {
    return { body: { name: "my-bot" }, help: "Alphanumeric and hyphens only." };
  }
  return { body: {}, help: "See OpenWA API docs." };
}

export function mapSessionStatus(status: string): SessionStatus {
  if (status === "ready") return "connected";
  if (status === "qr_ready") return "qr_ready";
  if (status === "initializing" || status === "authenticating" || status === "created") return "connecting";
  if (status === "logged_out") return "logged_out";
  if (status === "failed") return "failed";
  return "disconnected";
}

/** Linked session that should be brought back without showing QR (phone on file, not logged out). */
export function sessionNeedsAutoReconnect(session: GatewaySession): boolean {
  if (!session.phoneNumber) return false;
  if (session.status === "logged_out") return false;
  if (session.status === "connected" || session.status === "connecting" || session.status === "qr_ready") return false;
  return session.status === "disconnected" || session.status === "failed";
}

export function toGatewaySession(s: OpenWASession): GatewaySession {
  return {
    sessionId: s.id,
    name: s.name,
    pushName: s.pushName ?? undefined,
    phoneNumber: s.phone ?? undefined,
    status: mapSessionStatus(s.status),
  };
}

function ok<T>(data: T, message?: string) {
  return { success: true as const, message, data };
}
function fail(message: string): { success: false; message: string; data: undefined } {
  return { success: false, message, data: undefined };
}

export function getApiHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) headers["Content-Type"] = "application/json";
  const key = getOpenWAApiKey();
  if (key) headers["X-API-Key"] = key;
  return headers;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...options, headers: { ...getApiHeaders(true), ...(options.headers as Record<string, string>) } });
}

export async function loginDashboard(_username: string, _password: string) {
  const key = getOpenWAApiKey();
  if (!key) return { success: false, message: "API key required" };
  try {
    await openwa.validateApiKey(key);
    return { success: true };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Login failed" };
  }
}

export async function listSessions() {
  try {
    const rows = await openwa.listSessions();
    return ok(rows.map(toGatewaySession));
  } catch (err) {
    if (err instanceof OpenWAError && err.status === 401) throw err;
    return fail(err instanceof Error ? err.message : "Could not list sessions");
  }
}

export async function disconnectSession(sessionId: string) {
  try {
    const stopped = await openwa.disconnectSession(sessionId);
    return ok(toGatewaySession(stopped), "Session stopped");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not stop session");
  }
}

export async function createSessionRecord(sessionId: string, body: unknown = {}) {
  try {
    const payload = (body ?? {}) as { name?: string; proxy?: string };
    const name = payload.name || sessionId;
    try {
      const created = await openwa.createSession(name, { proxyUrl: payload.proxy });
      return ok(toGatewaySession(created), "Session created");
    } catch (err) {
      if (err instanceof OpenWAError && err.status === 409) {
        const existing = await openwa.listSessions().catch(() => [] as OpenWASession[]);
        const found = existing.find((s) => s.name === name || s.id === sessionId);
        if (found) return ok(toGatewaySession(found), "Session exists");
      }
      throw err;
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not create session");
  }
}

export async function startExistingSession(sessionId: string) {
  try {
    const started = await openwa.connectSession(sessionId);
    return ok(toGatewaySession(started), "Session starting");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not start session");
  }
}

export async function connectSession(sessionId: string, body: unknown = {}) {
  try {
    const payload = (body ?? {}) as { name?: string; proxy?: string; webhooks?: Array<{ url: string }> };
    let id = sessionId;
    const existing = await openwa.listSessions().catch(() => [] as OpenWASession[]);
    const found = existing.find((s) => s.id === sessionId || s.name === sessionId);
    if (!found) {
      const created = await openwa.createSession(payload.name || sessionId, { proxyUrl: payload.proxy });
      id = created.id;
    } else {
      id = found.id;
    }
    const started = await openwa.connectSession(id);
    return ok(toGatewaySession(started), "Session starting");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not start session");
  }
}

export async function deleteSession(sessionId: string) {
  try {
    await openwa.deleteSession(sessionId);
    return ok(undefined, "Deleted");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not delete session");
  }
}

function asDataUrl(qrCode: string): string {
  if (!qrCode) return "";
  if (qrCode.startsWith("data:")) return qrCode;
  if (qrCode.startsWith("http")) return qrCode;
  return `data:image/png;base64,${qrCode}`;
}

export async function getQr(sessionId: string) {
  try {
    const data = await openwa.getSessionQr(sessionId);
    return ok({
      qrCode: asDataUrl(data.qrCode),
      qrExpiresAt: data.qrExpiresAt ?? null,
      pairingCode: data.pairingCode ?? null,
      pairingPhone: data.pairingPhone ?? null,
      pairingExpiresAt: data.pairingExpiresAt ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "QR unavailable";
    return fail(message);
  }
}

export async function requestPairingCode(sessionId: string, phoneNumber: string) {
  try {
    const data = await openwa.requestPairingCode(sessionId, phoneNumber);
    return ok({
      pairingCode: data.pairingCode,
      pairingPhone: phoneNumber,
      pairingExpiresAt: data.pairingExpiresAt ?? null,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not get pairing code");
  }
}

export async function sendText(payload: { sessionId: string; chatId: string; message: string }) {
  try {
    const data = await openwa.sendText(payload.sessionId, payload.chatId, payload.message);
    return ok({
      messageId: data.messageId,
      chatId: payload.chatId,
      timestamp: String(data.timestamp ?? Date.now()),
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Send failed");
  }
}

export type BulkJobType = "text" | "image" | "document";
export type BulkJobStatus = "processing" | "completed" | "cancelled" | "interrupted";
/** Inline bytes from a local file upload (kept with the campaign so bulk send does not rely on a fragile in-memory URL). */
export type BulkUploadedMedia = { base64: string; mimetype: string; filename: string };
export type BulkPayload =
  | { message: string }
  | { imageUrl: string; caption?: string; uploaded?: BulkUploadedMedia }
  | { documentUrl: string; filename: string; mimetype?: string; caption?: string; uploaded?: BulkUploadedMedia };
export type BulkOptions = { delayBetweenMessages: number; delayJitter: number; typingTime: number };
export type BulkJobDetail = {
  recipient: string;
  via?: string | null;
  status: "sent" | "failed" | "skipped";
  messageId?: string;
  error?: string;
  timestamp: string;
};
export type BulkPerSession = Record<string, { name: string | null; phoneNumber: string | null; sent: number; failed: number }>;
export type BulkJobSummary = {
  jobId: string;
  sessionId: string;
  sessionIds: string[];
  rotation: "single" | "round-robin";
  perSession: BulkPerSession;
  type: BulkJobType;
  name: string | null;
  status: BulkJobStatus;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  progress: number;
  cancelRequested: boolean;
  payload: BulkPayload;
  options: BulkOptions;
  createdAt: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
};
export type BulkJob = BulkJobSummary & { recipients: string[]; details: BulkJobDetail[] };
export type StartBulkInput = {
  sessionIds: string[];
  type: BulkJobType;
  recipients: string[];
  payload: BulkPayload;
  name?: string;
  options?: Partial<BulkOptions>;
};

const mediaCache = new Map<string, { base64: string; mimetype: string; filename: string }>();
const bulkIndex = new Map<string, string[]>();
const bulkMeta = new Map<string, { type: BulkJobType; payload: BulkPayload; options: BulkOptions; name: string | null }>();

function isWhatsAppCdnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith("whatsapp.net") || host.endsWith("whatsapp.com");
  } catch {
    return false;
  }
}

/** Resolve a bulk image/document reference to base64 or a public http(s) URL. */
function resolveBulkMediaRef(
  ref: string,
  inline?: BulkUploadedMedia,
  fallbackFilename?: string,
  fallbackMimetype?: string,
): { base64: string; mimetype: string; filename: string } | { url: string; mimetype?: string; filename?: string } {
  const fromInline = inline?.base64 ? inline : undefined;
  const fromCache = ref.startsWith("openwa-media:") ? mediaCache.get(ref) : undefined;
  const bytes = fromInline ?? fromCache;
  if (bytes) {
    return {
      base64: bytes.base64,
      mimetype: bytes.mimetype || fallbackMimetype || "application/octet-stream",
      filename: bytes.filename || fallbackFilename || "file",
    };
  }
  if (ref.startsWith("openwa-media:")) {
    throw new Error("Uploaded file is no longer available — attach the image again before sending.");
  }
  if (isWhatsAppCdnUrl(ref)) {
    throw new Error("WhatsApp chat media links cannot be used here — upload the image file instead.");
  }
  return { url: ref, mimetype: fallbackMimetype, filename: fallbackFilename };
}

function rememberBatch(sessionId: string, batchId: string) {
  const list = bulkIndex.get(sessionId) ?? [];
  if (!list.includes(batchId)) list.unshift(batchId);
  bulkIndex.set(sessionId, list.slice(0, 40));
}

function mapBatchStatus(status: BatchStatusResponse["status"]): BulkJobStatus {
  if (status === "processing" || status === "pending") return "processing";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "interrupted";
  return "completed";
}

function toSummary(sessionId: string, batch: BatchStatusResponse): BulkJobSummary {
  const meta = bulkMeta.get(batch.batchId);
  const total = batch.progress.total || 0;
  const sent = batch.progress.sent || 0;
  return {
    jobId: batch.batchId,
    sessionId,
    sessionIds: [sessionId],
    rotation: "single",
    perSession: { [sessionId]: { name: null, phoneNumber: null, sent, failed: batch.progress.failed } },
    type: meta?.type ?? "text",
    name: meta?.name ?? null,
    status: mapBatchStatus(batch.status),
    total,
    sent,
    failed: batch.progress.failed,
    skipped: batch.progress.cancelled,
    progress: total ? Math.round(((sent + batch.progress.failed) / total) * 100) : 0,
    cancelRequested: batch.status === "cancelled",
    payload: meta?.payload ?? { message: "" },
    options: meta?.options ?? { delayBetweenMessages: 3000, delayJitter: 0, typingTime: 0 },
    createdAt: batch.startedAt ?? new Date().toISOString(),
    startedAt: batch.startedAt ?? new Date().toISOString(),
    completedAt: batch.completedAt ?? null,
    error: null,
  };
}

function recipientJid(raw: string): string {
  if (raw.includes("@")) return raw;
  return `${raw.replace(/\D/g, "")}@c.us`;
}

export async function startBulkJob(input: StartBulkInput) {
  const sessionId = input.sessionIds[0];
  if (!sessionId) return fail("No session selected");
  const delay = input.options?.delayBetweenMessages ?? 3000;
  let messages: openwa.BulkMessageItem[];
  try {
    messages = input.recipients.map((recipient) => {
      const chatId = recipientJid(recipient);
      if (input.type === "image") {
        const p = input.payload as { imageUrl: string; caption?: string; uploaded?: BulkUploadedMedia };
        const media = resolveBulkMediaRef(p.imageUrl.trim(), p.uploaded);
        return {
          chatId,
          type: "image" as const,
          content: {
            caption: p.caption,
            image:
              "base64" in media
                ? { base64: media.base64, mimetype: media.mimetype, filename: media.filename }
                : { url: media.url, mimetype: media.mimetype, filename: media.filename },
          },
        };
      }
      if (input.type === "document") {
        const p = input.payload as {
          documentUrl: string;
          filename: string;
          mimetype?: string;
          caption?: string;
          uploaded?: BulkUploadedMedia;
        };
        const media = resolveBulkMediaRef(p.documentUrl.trim(), p.uploaded, p.filename, p.mimetype);
        return {
          chatId,
          type: "document" as const,
          content: {
            caption: p.caption,
            document:
              "base64" in media
                ? { base64: media.base64, mimetype: media.mimetype, filename: media.filename }
                : { url: media.url, filename: media.filename ?? p.filename, mimetype: media.mimetype ?? p.mimetype },
          },
        };
      }
      const p = input.payload as { message: string };
      return { chatId, type: "text" as const, content: { text: p.message } };
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Invalid media for campaign");
  }
  try {
    const result = await openwa.sendBulk(sessionId, {
      messages,
      options: { delayBetweenMessages: delay, randomizeDelay: (input.options?.delayJitter ?? 0) > 0 },
    });
    rememberBatch(sessionId, result.batchId);
    bulkMeta.set(result.batchId, {
      type: input.type,
      payload: input.payload,
      options: { delayBetweenMessages: delay, delayJitter: input.options?.delayJitter ?? 0, typingTime: 0 },
      name: input.name ?? null,
    });
    return ok({
      jobId: result.batchId,
      total: result.totalMessages,
      sessionIds: [sessionId],
      rotation: "single",
      skippedSessions: [] as string[],
      statusUrl: result.statusUrl,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not start campaign");
  }
}

export async function getBulkJob(jobId: string) {
  for (const [sessionId, ids] of bulkIndex) {
    if (!ids.includes(jobId)) continue;
    try {
      const batch = await openwa.getBatchStatus(sessionId, jobId);
      const summary = toSummary(sessionId, batch);
      return ok({
        ...summary,
        recipients: batch.results.map((r) => r.chatId),
        details: batch.results.map((r) => ({
          recipient: r.chatId,
          status: r.status === "failed" ? ("failed" as const) : r.status === "cancelled" ? ("skipped" as const) : ("sent" as const),
          messageId: r.messageId,
          error: r.error?.message,
          timestamp: r.sentAt ?? "",
        })),
      } satisfies BulkJob);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Batch not found");
    }
  }
  return fail("Unknown campaign");
}

export async function listBulkJobs(sessionId: string) {
  const ids = bulkIndex.get(sessionId) ?? [];
  const jobs: BulkJobSummary[] = [];
  for (const id of ids) {
    try {
      jobs.push(toSummary(sessionId, await openwa.getBatchStatus(sessionId, id)));
    } catch {
      /* drop stale ids */
    }
  }
  return ok(jobs);
}

export async function cancelBulkJob(jobId: string) {
  for (const [sessionId, ids] of bulkIndex) {
    if (!ids.includes(jobId)) continue;
    try {
      const batch = await openwa.cancelBatch(sessionId, jobId);
      return ok(toSummary(sessionId, batch));
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Could not cancel");
    }
  }
  return fail("Unknown campaign");
}

export async function retryBulkJob(_sessionId: string, _jobId: string) {
  return fail("OpenWA has no retry-batch route — start a new campaign for the failed recipients.");
}

export type SessionConfigPatch = {
  metadata?: Record<string, unknown>;
  webhooks?: GatewaySession["webhooks"];
  proxy?: string | null;
  reconnect?: boolean;
};

export async function updateSessionConfig(sessionId: string, patch: SessionConfigPatch) {
  try {
    if (patch.proxy !== undefined) {
      const saved = await openwa.updateSessionProxy(sessionId, patch.proxy);
      return ok({
        sessionId,
        proxy: saved.proxyHost,
        proxyApplied: true,
        webhooks: [] as GatewaySession["webhooks"],
      });
    }
    return ok({ sessionId, proxy: null, proxyApplied: false, webhooks: [] as GatewaySession["webhooks"] });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not save proxy");
  }
}

export type ProxyCheck = { ok: boolean; ip?: string; latencyMs?: number; error?: string; proxy: string | null };

export async function testProxy(_body: { proxy?: string; sessionId?: string }) {
  return ok({ ok: false, ip: undefined, latencyMs: undefined, error: "Proxy test is not exposed by OpenWA — save the proxy on the session instead.", proxy: null } as ProxyCheck);
}

export async function addWebhook(sessionId: string, url: string, events?: string[]) {
  try {
    const hook = await openwa.createWebhook({ sessionId, url, events: events?.length ? events : ["*"] });
    return ok({ webhooks: [{ url: hook.url, events: hook.events }] });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not add webhook");
  }
}

export async function removeWebhook(sessionId: string, url: string) {
  try {
    const hooks = await openwa.listWebhooksBySession(sessionId);
    const match = hooks.find((h) => h.url === url);
    if (match) await openwa.deleteWebhook(match.id, sessionId);
    return ok({ webhooks: hooks.filter((h) => h.url !== url).map((h) => ({ url: h.url, events: h.events })) });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not remove webhook");
  }
}

export async function loadWsStats() {
  return ok({ totalConnections: 1 });
}

export async function sendRawApi(method: string, path: string, bodyText: string) {
  return openwa.sendRaw(method, path, bodyText);
}

export type GatewayChat = {
  id: string;
  name: string | null;
  phone: string | null;
  isGroup: boolean;
  profilePicture: string | null;
  lastMessage: string | null;
  lastMessageTimestamp: number;
  unreadCount: number;
};

export type GatewayMessage = {
  id: string;
  chatId: string;
  fromMe: boolean;
  sender?: string;
  senderPhone?: string;
  timestamp: number;
  type: string;
  content: string | { emoji?: string; targetMessageId?: string; [k: string]: unknown } | null;
  caption: string | null;
  mimetype?: string | null;
  filename?: string | null;
  mediaUrl?: string | null;
  senderName: string | null;
  isGroup?: boolean;
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  waMessageId?: string;
};

function toGatewayChat(c: OpenWAChat): GatewayChat {
  return {
    id: c.id,
    name: c.name,
    phone: c.isGroup ? null : (() => {
      const phone = extractScrapePhone(c.id, null);
      return isDialablePhone(phone) ? phone : null;
    })(),
    isGroup: c.isGroup,
    profilePicture: null,
    lastMessage: c.lastMessage ?? null,
    lastMessageTimestamp: c.timestamp,
    unreadCount: c.unreadCount,
  };
}

function toGatewayMessage(m: OpenWAMessage): GatewayMessage {
  const media = m.metadata?.media;
  return {
    id: m.waMessageId ?? m.id,
    chatId: m.chatId,
    fromMe: m.direction === "outgoing",
    sender: m.from,
    senderPhone: m.from ? (() => {
      const phone = extractScrapePhone(m.from, null);
      return isDialablePhone(phone) ? phone : undefined;
    })() : undefined,
    timestamp: m.timestamp ?? Date.parse(m.createdAt) / 1000,
    type: m.type === "voice" ? "ptt" : m.type,
    content: m.body || null,
    caption: m.type !== "text" ? m.body || null : null,
    mimetype: media?.mimetype ?? null,
    filename: media?.filename ?? null,
    mediaUrl: media?.data ? `data:${media.mimetype};base64,${media.data}` : null,
    senderName: m.chatName ?? m.author ?? null,
    isGroup: m.kind === "group" || m.chatId.includes("@g.us"),
    status: m.status,
    waMessageId: m.waMessageId ?? m.id,
  };
}

const HISTORY_MEDIA_TYPES = new Set(["image", "video", "audio", "voice", "sticker", "document"]);

function mapHistoryToOpenWA(h: EngineHistoryMessage): OpenWAMessage {
  const media = h.media
    ? h.media
    : HISTORY_MEDIA_TYPES.has(h.type)
      ? { mimetype: "", omitted: true as const }
      : undefined;
  return {
    id: h.id,
    waMessageId: h.id,
    chatId: h.chatId,
    kind: h.kind ?? (h.isGroup ? "group" : "individual"),
    chatName: h.contact?.pushName ?? h.contact?.name,
    author: h.author,
    from: h.from,
    to: h.to,
    body: h.body ?? "",
    type: h.type,
    direction: h.fromMe ? "outgoing" : "incoming",
    status: "read",
    timestamp: h.timestamp,
    createdAt: new Date((h.timestamp ?? 0) * 1000).toISOString(),
    metadata: media ? { media } : undefined,
  };
}

function messageKey(m: OpenWAMessage): string {
  return m.waMessageId ?? m.id;
}

function messageTime(m: OpenWAMessage): number {
  if (typeof m.timestamp === "number" && Number.isFinite(m.timestamp)) return m.timestamp;
  return Math.floor(Date.parse(m.createdAt) / 1000) || 0;
}

/** DB rows win on conflict; engine history backfills a thread the gateway never captured. Oldest first. */
function mergeChatMessages(db: OpenWAMessage[], history: OpenWAMessage[]): OpenWAMessage[] {
  const byId = new Map<string, OpenWAMessage>();
  for (const m of history) byId.set(messageKey(m), m);
  for (const m of db) {
    const key = messageKey(m);
    const hist = byId.get(key);
    byId.set(key, hist?.author && !m.author ? { ...m, author: hist.author } : m);
  }
  return [...byId.values()].sort((a, b) => messageTime(a) - messageTime(b) || a.createdAt.localeCompare(b.createdAt));
}

export async function listChats(sessionId: string, _limit = 50, _offset = 0) {
  try {
    const chats = await openwa.listChats(sessionId);
    const mapped = chats.map(toGatewayChat);
    return ok({ total: mapped.length, hasMore: false, chats: mapped });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not load chats");
  }
}

export async function listMessages(sessionId: string, chatId: string, limit = 40, cursor: string | null = null) {
  try {
    const offset = cursor ? Number(cursor) || 0 : 0;
    const wantsHistory = offset === 0;
    const [dbRes, historyRes] = await Promise.allSettled([
      openwa.getChatMessages(sessionId, chatId, limit, offset),
      wantsHistory ? openwa.getChatHistory(sessionId, chatId, 100, true) : Promise.resolve([] as EngineHistoryMessage[]),
    ]);
    if (dbRes.status === "rejected" && (!wantsHistory || historyRes.status === "rejected")) {
      throw dbRes.reason;
    }
    const db = dbRes.status === "fulfilled" ? dbRes.value : { messages: [] as OpenWAMessage[], total: 0 };
    const history =
      historyRes.status === "fulfilled" && Array.isArray(historyRes.value)
        ? historyRes.value.map(mapHistoryToOpenWA)
        : [];
    // Merge is oldest-first; reverse so the store's `.reverse()` still yields oldest at the top.
    const newestFirst = mergeChatMessages(db.messages, wantsHistory ? history : []).slice().reverse();
    const dbCount = db.messages.length;
    const next = offset + dbCount;
    const total = db.total || next;
    return ok({
      chatId,
      messages: newestFirst.map(toGatewayMessage),
      cursor: next < total ? String(next) : null,
      hasMore: next < total,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not load messages");
  }
}

export type ScrapedContact = {
  phone: string;
  jid: string;
  name: string | null;
  admin?: string | null;
  groupName?: string;
  sessionId?: string;
  accountName?: string;
  sources?: string[];
  groups?: string[];
};
export type ScrapeAccountStat = { sessionId: string; accountName?: string; total?: number; groups?: number; members?: number; error?: string };
export type GroupRow = { id: string; name: string; participantsCount?: number; sessionId?: string; desc?: string | null };

function scrapeDedupeKey(c: Pick<ScrapedContact, "phone" | "jid">): string {
  if (c.phone && isDialablePhone(c.phone)) return `p:${c.phone}`;
  return `j:${c.jid}`;
}

function mergeScrapedContact(into: ScrapedContact, row: ScrapedContact): void {
  if (!into.name && row.name) into.name = row.name;
  if (isDialablePhone(row.phone) && !isDialablePhone(into.phone)) {
    into.phone = row.phone;
    into.jid = row.jid;
  }
  const incomingGroups = [...(row.groups ?? []), ...(row.groupName ? [row.groupName] : [])];
  if (incomingGroups.length) {
    const groups = new Set(into.groups ?? (into.groupName ? [into.groupName] : []));
    for (const name of incomingGroups) groups.add(name);
    into.groups = [...groups];
    into.groupName = into.groups[0];
  }
  if (row.sessionId) {
    const sources = new Set(into.sources ?? (into.sessionId ? [into.sessionId] : []));
    sources.add(row.sessionId);
    into.sources = [...sources];
  }
  if (row.admin && !into.admin) into.admin = row.admin;
}

type ContactIndex = {
  byId: Map<string, openwa.OpenWAContact>;
};

function indexContacts(rows: openwa.OpenWAContact[]): ContactIndex {
  const byId = new Map<string, openwa.OpenWAContact>();
  for (const c of rows) {
    byId.set(c.id, c);
    if (c.lid) byId.set(`${c.lid}@lid`, c);
  }
  return { byId };
}

function resolveMember(
  participant: openwa.OpenWAGroupParticipant,
  sessionId: string,
  groupName: string,
  contacts: ContactIndex,
): ScrapedContact | null {
  if (!isScrapableMemberJid(participant.id)) return null;
  const lidKey = participant.id.toLowerCase().endsWith("@lid") ? participant.id.toLowerCase() : "";
  const contact = contacts.byId.get(participant.id) ?? (lidKey ? contacts.byId.get(lidKey) : undefined);

  let phone = extractScrapePhone(participant.id, participant.number);
  if (!isDialablePhone(phone) && contact) {
    const fromBook = extractScrapePhone(contact.id, contact.number);
    if (isDialablePhone(fromBook)) phone = fromBook;
  }
  if (!phone) return null;

  return {
    phone,
    jid: participant.id,
    name: participant.name || contact?.name || contact?.pushName || null,
    admin: participant.isAdmin || participant.isSuperAdmin ? "admin" : null,
    groupName,
    groups: [groupName],
    sessionId,
    sources: [sessionId],
  };
}

async function loadContactIndex(sessionId: string): Promise<ContactIndex> {
  try {
    return indexContacts(await openwa.listContacts(sessionId));
  } catch {
    return indexContacts([]);
  }
}

export async function scrapeContacts(sessionIds: string[], opts: { dedupe?: boolean } = {}) {
  const contacts: ScrapedContact[] = [];
  const accounts: ScrapeAccountStat[] = [];
  const merged = new Map<string, ScrapedContact>();

  for (const sessionId of sessionIds) {
    try {
      const rows = await openwa.listContacts(sessionId);
      accounts.push({ sessionId, total: rows.length });
      for (const c of rows) {
        if (!isScrapableMemberJid(c.id)) continue;
        const phone = extractScrapePhone(c.id, c.number);
        if (!phone) continue;
        const row: ScrapedContact = {
          phone,
          jid: c.id,
          name: c.name || c.pushName || null,
          sessionId,
          sources: [sessionId],
        };
        if (opts.dedupe ?? true) {
          const key = scrapeDedupeKey(row);
          const prev = merged.get(key);
          if (prev) mergeScrapedContact(prev, row);
          else merged.set(key, row);
        } else {
          contacts.push(row);
        }
      }
    } catch (err) {
      accounts.push({ sessionId, error: err instanceof Error ? err.message : "failed" });
    }
  }

  const out = opts.dedupe ?? true ? [...merged.values()] : contacts;
  return ok({ total: out.length, contacts: out, accounts, deduped: opts.dedupe ?? true });
}

export async function listGroups(sessionId: string) {
  try {
    const groups = (await openwa.listGroups(sessionId)).map((g) => ({
      id: g.id,
      name: g.name,
      sessionId,
      participantsCount: g.participantsCount,
    }));
    return ok({ groups, totalGroups: groups.length });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not list groups");
  }
}

export async function scrapeGroups(sessionIds: string[], groupIds: string[] | null, opts: { dedupe?: boolean } = {}) {
  const groups: GroupRow[] = [];
  const accounts: ScrapeAccountStat[] = [];
  const merged = new Map<string, ScrapedContact>();
  const flat: ScrapedContact[] = [];
  const dedupe = opts.dedupe ?? true;

  for (const sessionId of sessionIds) {
    let membersScraped = 0;
    const groupErrors: string[] = [];
    try {
      const rows = await openwa.listGroups(sessionId);
      const pick = new Set(groupIds?.length ? groupIds : rows.map((g) => g.id));
      const selected = rows.filter((g) => pick.has(g.id));
      const contacts = await loadContactIndex(sessionId);

      for (const g of selected) {
        groups.push({
          id: g.id,
          name: g.name,
          sessionId,
          participantsCount: g.participantsCount,
        });
      }

      for (const g of selected) {
        try {
          const info = await openwa.getGroup(sessionId, g.id);
          const groupName = info.name || g.name || g.id;
          for (const p of info.participants ?? []) {
            const row = resolveMember(p, sessionId, groupName, contacts);
            if (!row) continue;
            membersScraped++;
            if (dedupe) {
              const key = scrapeDedupeKey(row);
              const prev = merged.get(key);
              if (prev) mergeScrapedContact(prev, row);
              else merged.set(key, row);
            } else {
              flat.push(row);
            }
          }
        } catch (err) {
          groupErrors.push(`Group ${g.name || g.id}: ${err instanceof Error ? err.message : "failed"}`);
        }
      }

      accounts.push({
        sessionId,
        groups: selected.length,
        members: membersScraped,
        error: groupErrors.length ? groupErrors.join("; ") : undefined,
      });
    } catch (err) {
      accounts.push({ sessionId, error: err instanceof Error ? err.message : "failed" });
    }
  }

  const contacts = dedupe ? [...merged.values()] : flat;
  return ok({ total: contacts.length, contacts, groups, accounts, deduped: dedupe });
}

export async function saveContact(_sessionId: string, phone: string, name?: string) {
  return ok({ jid: `${phone}@c.us`, phone, name: name ?? phone }, "OpenWA has no save-contact route — number kept locally.");
}

export type AddToGroupResult = {
  phone: string;
  success: boolean;
  message?: string;
  data?: { addStatus?: string; contactSaved?: boolean; contactSaveError?: string };
};

export async function addContactsToGroup(input: { sessionId: string; groupId: string; phones: string[]; name?: string }) {
  try {
    const participants = input.phones.map(recipientJid);
    await openwa.addGroupParticipants(input.sessionId, input.groupId, participants);
    return ok({
      groupId: input.groupId,
      added: participants.length,
      failed: 0,
        results: input.phones.map((phone) => ({ phone, success: true, message: undefined as string | undefined })),
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not add to group");
  }
}

export function downloadContactsCsv(rows: ScrapedContact[], filename: string) {
  const csv = formatScraperContactsCsv(
    rows.map((r) => ({
      phone: isDialablePhone(r.phone) ? r.phone : "",
      name: r.name,
      jid: r.jid,
      groups: r.groups ?? (r.groupName ? [r.groupName] : []),
      sources: r.sources ?? (r.sessionId ? [r.sessionId] : []),
    })),
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type UploadedFile = {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  uploaded: BulkUploadedMedia;
};

export async function uploadMedia(_sessionId: string, file: File) {
  const media = await openwa.fileToBase64(file);
  const url = `openwa-media:${crypto.randomUUID()}`;
  mediaCache.set(url, media);
  return ok({
    url,
    filename: file.name,
    mimetype: file.type,
    size: file.size,
    uploaded: media,
  });
}

export async function sendMediaFile(input: {
  sessionId: string;
  chatId: string;
  file: File;
  caption?: string;
  asDocument?: boolean;
}) {
  try {
    const data = await openwa.sendMedia(input.sessionId, input.chatId, input.file, input.caption, input.asDocument);
    const mime = input.file.type.toLowerCase();
    const type = input.asDocument
      ? "document"
      : mime.startsWith("image/")
        ? "image"
        : mime.startsWith("video/")
          ? "video"
          : mime.startsWith("audio/")
            ? "audio"
            : "document";
    return ok({
      messageId: data.messageId,
      chatId: input.chatId,
      type,
      mediaUrl: URL.createObjectURL(input.file),
      mimetype: input.file.type,
      filename: input.file.name,
      caption: input.caption ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Send failed");
  }
}

export async function fetchMessageMedia(sessionId: string, chatId: string, messageId: string) {
  try {
    const blob = await openwa.getMessageMediaBlob(sessionId, chatId, messageId);
    const url = URL.createObjectURL(blob);
    return ok({
      messageId,
      chatId,
      url,
      mimetype: blob.type || "application/octet-stream",
      filename: "media",
      size: blob.size,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Media unavailable");
  }
}

export async function markChatRead(sessionId: string, chatId: string) {
  try {
    return ok(await openwa.markChatRead(sessionId, chatId));
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not mark read");
  }
}

export { OpenWAError };
export { getContact, listContacts } from "./openwa-api";
