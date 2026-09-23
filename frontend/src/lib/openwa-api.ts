/**
 * Typed OpenWA REST client. Auth uses X-API-Key (OpenWA) and apikey (compat).
 * Base URL: VITE_OPENWA_URL, then localStorage, then the page origin (Vite proxies /api in dev).
 */

import { getOpenWAApiBase, getOpenWAApiKey, openWAAuthHeaders } from "./openwa-config";

export class OpenWAError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "OpenWAError";
    this.status = status;
    this.code = code;
  }
}

export type SessionStatus =
  | "created"
  | "initializing"
  | "authenticating"
  | "qr_ready"
  | "ready"
  | "disconnected"
  | "action_required"
  | "failed";

export type OpenWASession = {
  id: string;
  name: string;
  status: SessionStatus;
  engineLoaded?: boolean;
  phone?: string | null;
  pushName?: string | null;
  connectedAt?: string | null;
  lastActive?: string | null;
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
  restriction?: AccountRestriction | null;
};

export type ChatKind = "individual" | "group" | "channel" | "status" | "broadcast" | "unknown";

export type OpenWAChat = {
  id: string;
  name: string;
  isGroup: boolean;
  kind: ChatKind;
  unreadCount: number;
  timestamp: number;
  lastMessage?: string;
  archived: boolean;
  pinned: boolean;
  muted: boolean;
};

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "document"
  | "sticker"
  | "location"
  | "contact"
  | "poll"
  | "call"
  | "revoked"
  | "order"
  | "product"
  | "masked"
  | "unknown";

export type OpenWAMessage = {
  id: string;
  waMessageId?: string;
  chatId: string;
  kind?: ChatKind;
  chatName?: string;
  author?: string;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  direction: "incoming" | "outgoing";
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  timestamp?: number;
  createdAt: string;
  metadata?: {
    media?: { mimetype: string; filename?: string; data?: string; omitted?: boolean; sizeBytes?: number };
  };
};

export type OpenWAContact = {
  id: string;
  name?: string;
  pushName?: string;
  number: string;
  isMyContact: boolean;
  isBlocked: boolean;
  profilePicUrl?: string;
  lid?: string;
};

export type OpenWAGroup = {
  id: string;
  name: string;
  linkedParentJID?: string | null;
  participantsCount?: number;
  isAdmin?: boolean;
};

export type OpenWAGroupParticipant = {
  id: string;
  number: string;
  name?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export type OpenWAGroupInfo = {
  id: string;
  name: string;
  participants: OpenWAGroupParticipant[];
  description?: string;
  linkedParentJID?: string | null;
};

export type WebhookFilterOperator = "is" | "isNot" | "contains" | "equals";
export type WebhookFilterCondition = {
  field: string;
  operator: WebhookFilterOperator;
  value: string | string[] | boolean;
  caseSensitive?: boolean;
};
export type WebhookFilters = { conditions: WebhookFilterCondition[] };

export type OpenWAWebhook = {
  id: string;
  sessionId: string;
  url: string;
  events: string[];
  filters?: WebhookFilters | null;
  active: boolean;
  retryCount: number;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageTemplate = {
  id: string;
  sessionId: string;
  name: string;
  body: string;
  header?: string | null;
  footer?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplatePayload = {
  name: string;
  body: string;
  header?: string | null;
  footer?: string | null;
};

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  role: "admin" | "operator" | "viewer";
  allowedIps?: string[];
  allowedSessions?: string[];
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
};

export type CreatedApiKey = ApiKey & { apiKey: string };

export type AuditLog = {
  id: string;
  action: string;
  severity: "info" | "warn" | "error";
  apiKeyId: string | null;
  apiKeyName: string | null;
  sessionId: string | null;
  sessionName: string | null;
  ipAddress: string | null;
  userAgent?: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  errorMessage: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type BulkMediaPayload = {
  url?: string;
  base64?: string;
  mimetype?: string;
  filename?: string;
  ptt?: boolean;
};

export type BulkMessageItem = {
  chatId: string;
  type: "text" | "image" | "video" | "audio" | "document";
  content: {
    text?: string;
    image?: BulkMediaPayload;
    video?: BulkMediaPayload;
    audio?: BulkMediaPayload;
    document?: BulkMediaPayload;
    caption?: string;
  };
  variables?: Record<string, string>;
};

export type BulkMessageDto = {
  batchId?: string;
  messages: BulkMessageItem[];
  options?: {
    delayBetweenMessages?: number;
    randomizeDelay?: boolean;
    stopOnError?: boolean;
  };
};

export type BulkBatchResponse = {
  batchId: string;
  status: string;
  totalMessages: number;
  estimatedCompletionTime?: string;
  statusUrl: string;
};

export type BatchStatus = "pending" | "processing" | "completed" | "cancelled" | "failed";

export type BatchStatusResponse = {
  batchId: string;
  status: BatchStatus;
  progress: { total: number; sent: number; failed: number; pending: number; cancelled: number };
  results: Array<{
    chatId: string;
    status: "pending" | "sent" | "failed" | "cancelled";
    messageId?: string;
    error?: { code: string; message: string };
    sentAt?: string;
  }>;
  startedAt?: string | null;
  completedAt?: string | null;
};

export const CHAT_KINDS: readonly ChatKind[] = ["individual", "group", "channel", "status", "broadcast", "unknown"];

export const MESSAGE_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "voice",
  "document",
  "sticker",
  "location",
  "contact",
  "poll",
  "call",
  "revoked",
  "order",
  "product",
  "masked",
  "unknown",
] as const;

export type SessionConfig = {
  autoRejectCalls: boolean;
  maxReconnectAttempts: number | null;
  reconnectBaseDelay: number;
};

export type SessionProxy = {
  enabled: boolean;
  proxyType: "http" | "https" | "socks4" | "socks5" | null;
  proxyHost: string | null;
  hasCredentials: boolean;
};

export type SessionStats = {
  total: number;
  active: number;
  ready: number;
  disconnected: number;
  byStatus: Record<string, number>;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
};

export type AccountRestriction = {
  kind: "reachout_timelock" | "tos_block" | "proxy_block";
  code: string;
  expiresAt?: string | null;
};

export type SendMediaPayload = {
  base64?: string;
  url?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
  quotedMessageId?: string;
};

export type SendLocationPayload = {
  chatId: string;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
};

export type SendContactPayload = {
  chatId: string;
  contactName: string;
  contactNumber: string;
};

export type SendPollPayload = {
  chatId: string;
  name: string;
  options: string[];
  allowMultipleAnswers?: boolean;
};

export type ForwardMessagePayload = {
  fromChatId: string;
  toChatId: string;
  messageId: string;
};

export type CheckNumberResponse = {
  number: string;
  exists: boolean;
  whatsappId: string | null;
};

export type PluginConfigField = {
  type: "string" | "number" | "boolean" | "array" | "object" | "textarea";
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  required?: boolean;
  secret?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  items?: PluginConfigField;
  properties?: Record<string, PluginConfigField>;
};

export type PluginConfigSchema = {
  type: "object";
  properties: Record<string, PluginConfigField>;
};

export type PluginI18nText = { title?: string; description?: string };
export type PluginI18nLocale = {
  name?: string;
  description?: string;
  config?: Record<string, PluginI18nText>;
};
export type PluginI18n = Record<string, PluginI18nLocale>;

export type Plugin = {
  id: string;
  name: string;
  version: string;
  type: "engine" | "storage" | "queue" | "auth" | "extension" | string;
  description?: string;
  author?: string;
  status: "installed" | "enabled" | "disabled" | "error";
  config?: Record<string, unknown>;
  builtIn: boolean;
  provides?: string[];
  ingressCapable?: boolean;
  configSchema?: PluginConfigSchema;
  configUi?: { entry: string; height?: number };
  sessionScoped?: boolean;
  activeSessions?: string[];
  sessionConfig?: Record<string, Record<string, unknown>>;
  loadedAt?: string;
  enabledAt?: string;
  error?: string;
  i18n?: PluginI18n;
};

export type Engine = {
  id: string;
  name: string;
  enabled: boolean;
  features: string[];
  library?: { name: string; version: string };
};

export type CatalogPlugin = {
  id: string;
  name: string;
  version: string;
  type?: string;
  status?: string;
  description?: string;
  author?: string;
  license?: string;
  keywords?: string[];
  homepage?: string;
  download?: string;
  installed: boolean;
  installedVersion: string | null;
  updateAvailable: boolean;
};

export type IngressUrl = { route: string; url: string };

export type InstanceView = {
  id: string;
  pluginId: string;
  instanceId: string;
  sessionScope: string | null;
  secret: string;
  verifyToken: string | null;
  config: Record<string, unknown> | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  ingressUrls: IngressUrl[];
};

export type CreateInstanceInput = {
  instanceId: string;
  sessionScope?: string;
  verifyToken?: string;
  secret?: string;
  config?: Record<string, unknown>;
};

export type UpdateInstanceInput = {
  enabled?: boolean;
  sessionScope?: string;
  config?: Record<string, unknown>;
};

export type InfraStatus = {
  database: { connected: boolean; type: string; host: string; builtIn: boolean };
  redis: { enabled: boolean; connected: boolean; host: string; port: number; builtIn: boolean };
  queue: { enabled: boolean; webhooks: { pending: number; completed: number; failed: number } };
  storage: { type: "local" | "s3"; path?: string; bucket?: string; builtIn: boolean; s3Available?: boolean };
  engine: {
    type: string;
    headless: boolean;
    webVersion?: string | null;
    webVersionSource?: "pinned" | "auto" | "native";
  };
  envPinned?: string[];
};

export type SavedConfig = {
  database: {
    type: "sqlite" | "postgres";
    builtIn: boolean;
    host: string;
    port: string;
    username: string;
    database: string;
    schema: string;
    poolSize: number;
    sslEnabled: boolean;
    sslRejectUnauthorized: boolean;
    passwordSet: boolean;
  };
  redis: { enabled: boolean; builtIn: boolean; host: string; port: string; passwordSet: boolean };
  queue: { enabled: boolean };
  storage: {
    type: "local" | "s3";
    builtIn: boolean;
    localPath: string;
    s3Bucket: string;
    s3Region: string;
    s3Endpoint: string;
    s3CredentialsSet: boolean;
  };
  engine: { type: string; headless: boolean; sessionDataPath: string; browserArgs: string };
};

export type SaveConfigPayload = {
  database?: {
    type: "sqlite" | "postgres";
    builtIn?: boolean;
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    schema?: string;
    poolSize?: number;
    sslEnabled?: boolean;
    sslRejectUnauthorized?: boolean;
  };
  redis?: { enabled?: boolean; builtIn?: boolean; host?: string; port?: string; password?: string };
  queue?: { enabled?: boolean };
  storage?: {
    type: "local" | "s3";
    builtIn?: boolean;
    localPath?: string;
    s3Bucket?: string;
    s3Region?: string;
    s3AccessKey?: string;
    s3SecretKey?: string;
    s3Endpoint?: string;
  };
  engine?: {
    type?: string;
    headless?: boolean;
    sessionDataPath?: string;
    browserArgs?: string;
  };
};

export type StatsPeriod = "24h" | "7d" | "30d";

export type OverviewStats = {
  sessions: { active: number; total: number; byStatus: Record<string, number> };
  messages: { sent: number; received: number; failed: number; today: { sent: number; received: number } };
};

export type MessageStats = {
  timeSeries: Array<{ timestamp: string; sent: number; received: number }>;
  byType: Record<string, number>;
  bySession: Array<{ sessionId: string; name: string; sent: number; received: number }>;
  topChats: Array<{ chatId: string; chatName?: string | null; messageCount: number }>;
};

export type SearchParams = {
  q: string;
  sessionId?: string;
  chatId?: string;
  direction?: string;
  type?: string;
  from?: string;
  dateFrom?: number;
  dateTo?: number;
  limit?: number;
  offset?: number;
};

export type SearchHit = {
  messageId: string;
  waMessageId: string;
  sessionId: string;
  chatId: string;
  body: string;
  snippet: string;
  timestamp: number;
  type: string;
  direction: "incoming" | "outgoing";
  from: string;
  score?: number;
};

export type SearchResults = { hits: SearchHit[]; total: number; tookMs: number; provider: string };

export type HealthStatus = {
  status: "ok" | "error";
  timestamp?: string;
  version?: string;
  details?: { database?: { status: string }; redis?: { status: string }; queue?: { status: string } };
};

export type DataExport = {
  exportedAt: string;
  dataDbType: string;
  tables: Record<string, unknown[]>;
  counts: Record<string, number>;
  skippedTables: string[];
  omittedInlineMedia: { messages: number; messageBatches: number };
};

export type DataImportResult = {
  imported: boolean;
  counts?: Record<string, number>;
  message?: string;
  warnings?: string[];
  notices?: string[];
  restartRequired?: boolean;
  orphanedEngines?: string[];
  stoppedOrphanEngines?: string[];
  failedOrphanEngines?: string[];
};

export type MessageResponse = { messageId: string; timestamp: number };

async function handleError(response: Response): Promise<never> {
  const error = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
  throw new OpenWAError(error.message || `HTTP ${response.status}`, response.status, error.code);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...openWAAuthHeaders(!isFormData),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (isFormData) delete headers["Content-Type"];

  const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { ...options, headers });
  if (!response.ok) await handleError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function requestBlob(endpoint: string): Promise<Blob> {
  const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { headers: openWAAuthHeaders(false) });
  if (!response.ok) await handleError(response);
  return response.blob();
}

async function requestText(endpoint: string): Promise<string> {
  const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { headers: openWAAuthHeaders(false) });
  if (!response.ok) await handleError(response);
  return response.text();
}

function authValidateUrl(url?: string): string {
  const origin = (url ?? getOpenWAApiBase().replace(/\/api$/, "")).replace(/\/+$/, "");
  // In the browser, hit this app's Nitro proxy (WA_GATEWAY_URL) so login works when the UI is on
  // a different Railway domain than the API. The stored `origin` is still used for later REST/WS.
  return typeof window !== "undefined"
    ? `${window.location.origin.replace(/\/+$/, "")}/api/auth/validate`
    : `${origin}/api/auth/validate`;
}

/** Non-throwing validate probe for startup re-auth (mirrors dashboard App.tsx). */
export async function probeApiKeyValidation(
  apiKey: string,
  url?: string,
): Promise<{ status: number; body: { valid?: boolean; role?: string } | null }> {
  try {
    const response = await fetch(authValidateUrl(url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
    });
    const body = (await response.json().catch(() => null)) as { valid?: boolean; role?: string } | null;
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function validateApiKey(apiKey: string, url?: string): Promise<{ role?: string }> {
  const response = await fetch(authValidateUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new OpenWAError(error.message || "Invalid API key", response.status);
  }
  return response.json() as Promise<{ role?: string }>;
}

export function hasConfiguredApiKey(): boolean {
  return Boolean(getOpenWAApiKey());
}

// ── Sessions ──────────────────────────────────────────────────────────

export function listSessions() {
  return request<OpenWASession[]>("/sessions");
}

export function getSessionStatus(id: string) {
  return request<OpenWASession>(`/sessions/${id}`);
}

export function createSession(name: string, options?: { proxyUrl?: string }) {
  return request<OpenWASession>("/sessions", {
    method: "POST",
    body: JSON.stringify({ name, ...(options?.proxyUrl ? { proxyUrl: options.proxyUrl } : {}) }),
  });
}

export function connectSession(id: string) {
  return request<OpenWASession>(`/sessions/${id}/start`, { method: "POST" });
}

export function disconnectSession(id: string) {
  return request<OpenWASession>(`/sessions/${id}/stop`, { method: "POST" });
}

export function deleteSession(id: string) {
  return request<void>(`/sessions/${id}`, { method: "DELETE" });
}

export function logoutSession(id: string) {
  return request<OpenWASession>(`/sessions/${id}/logout`, { method: "POST" });
}

export function getSessionQr(id: string) {
  return request<{
    qrCode: string;
    status: string;
    qrExpiresAt?: number;
    pairingCode?: string;
    pairingPhone?: string;
    pairingExpiresAt?: number;
  }>(`/sessions/${id}/qr`);
}

export function requestPairingCode(id: string, phoneNumber: string) {
  return request<{ pairingCode: string; status: string; pairingExpiresAt?: number }>(`/sessions/${id}/pairing-code`, {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export function updateSessionProxy(id: string, proxyUrl: string | null) {
  return request<SessionProxy>(`/sessions/${id}/proxy`, {
    method: "PATCH",
    body: JSON.stringify({ proxyUrl }),
  });
}

export function getSessionProxy(id: string) {
  return request<SessionProxy>(`/sessions/${id}/proxy`);
}

export function getSessionConfig(id: string) {
  return request<SessionConfig>(`/sessions/${id}/config`);
}

export function updateSessionConfig(id: string, patch: Partial<Record<keyof SessionConfig, boolean | number | null>>) {
  return request<SessionConfig>(`/sessions/${id}/config`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function forceKillSession(id: string) {
  return request<OpenWASession>(`/sessions/${id}/force-kill`, { method: "POST" });
}

export function getSessionStats() {
  return request<SessionStats>("/sessions/stats/overview");
}

// ── Messages ──────────────────────────────────────────────────────────

export function sendText(sessionId: string, chatId: string, text: string) {
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-text`, {
    method: "POST",
    body: JSON.stringify({ chatId, text }),
  });
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimetype: string; filename: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { base64: btoa(binary), mimetype: file.type || "application/octet-stream", filename: file.name };
}

export async function sendImage(sessionId: string, chatId: string, image: File, caption?: string) {
  const media = await fileToBase64(image);
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-image`, {
    method: "POST",
    body: JSON.stringify({ chatId, caption, ...media }),
  });
}

export async function sendDocument(sessionId: string, chatId: string, file: File, caption?: string) {
  const media = await fileToBase64(file);
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-document`, {
    method: "POST",
    body: JSON.stringify({ chatId, caption, ...media }),
  });
}

export async function sendMedia(
  sessionId: string,
  chatId: string,
  file: File,
  caption?: string,
  asDocument = false,
) {
  const mime = file.type.toLowerCase();
  if (asDocument) return sendDocument(sessionId, chatId, file, caption);
  if (mime.startsWith("image/") && mime !== "image/webp") return sendImage(sessionId, chatId, file, caption);
  if (mime.startsWith("video/")) {
    const media = await fileToBase64(file);
    return request<MessageResponse>(`/sessions/${sessionId}/messages/send-video`, {
      method: "POST",
      body: JSON.stringify({ chatId, caption, ...media }),
    });
  }
  if (mime.startsWith("audio/")) {
    const media = await fileToBase64(file);
    return request<MessageResponse>(`/sessions/${sessionId}/messages/send-audio`, {
      method: "POST",
      body: JSON.stringify({ chatId, caption, ...media }),
    });
  }
  return sendDocument(sessionId, chatId, file, caption);
}

export function sendTypedMedia(
  sessionId: string,
  chatId: string,
  mediaType: "image" | "video" | "audio" | "document",
  payload: SendMediaPayload,
) {
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-${mediaType}`, {
    method: "POST",
    body: JSON.stringify({ chatId, ...payload }),
  });
}

export function sendLocation(sessionId: string, data: SendLocationPayload) {
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-location`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function sendContact(sessionId: string, data: SendContactPayload) {
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-contact`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function sendSticker(sessionId: string, chatId: string, payload: SendMediaPayload) {
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-sticker`, {
    method: "POST",
    body: JSON.stringify({ chatId, ...payload }),
  });
}

export function sendPoll(sessionId: string, data: SendPollPayload) {
  return request<MessageResponse>(`/sessions/${sessionId}/messages/send-poll`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function forwardMessage(sessionId: string, data: ForwardMessagePayload) {
  return request<MessageResponse>(`/sessions/${sessionId}/messages/forward`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function sendBulk(sessionId: string, dto: BulkMessageDto) {
  return request<BulkBatchResponse>(`/sessions/${sessionId}/messages/send-bulk`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function getBatchStatus(sessionId: string, batchId: string) {
  return request<BatchStatusResponse>(`/sessions/${sessionId}/messages/batch/${encodeURIComponent(batchId)}`);
}

export function cancelBatch(sessionId: string, batchId: string) {
  return request<BatchStatusResponse>(`/sessions/${sessionId}/messages/batch/${encodeURIComponent(batchId)}/cancel`, {
    method: "POST",
  });
}

export function getChatMessages(sessionId: string, chatId: string, limit = 40, offset = 0) {
  const q = new URLSearchParams({
    chatId,
    limit: String(limit),
    offset: String(offset),
  });
  return request<{ messages: OpenWAMessage[]; total: number }>(`/sessions/${sessionId}/messages?${q}`);
}

export type EngineHistoryMessage = {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  timestamp: number;
  fromMe: boolean;
  isGroup: boolean;
  kind?: ChatKind;
  author?: string;
  contact?: { name?: string; pushName?: string };
  media?: { mimetype: string; filename?: string; data?: string; omitted?: boolean; sizeBytes?: number };
};

export function getChatHistory(sessionId: string, chatId: string, limit = 100, includeMedia = false) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (includeMedia) q.set("includeMedia", "true");
  return request<EngineHistoryMessage[]>(
    `/sessions/${sessionId}/messages/${encodeURIComponent(chatId)}/history?${q}`,
  );
}

export function getMessageMediaBlob(sessionId: string, chatId: string, messageId: string) {
  return requestBlob(
    `/sessions/${sessionId}/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}/media`,
  );
}

// ── Chats ─────────────────────────────────────────────────────────────

export function listChats(sessionId: string) {
  return request<OpenWAChat[]>(`/sessions/${sessionId}/chats`);
}

export function markChatRead(sessionId: string, chatId: string) {
  return request<{ success: boolean }>(`/sessions/${sessionId}/chats/read`, {
    method: "POST",
    body: JSON.stringify({ chatId }),
  });
}

// ── Contacts / Groups ─────────────────────────────────────────────────

export function listContacts(sessionId: string) {
  return request<OpenWAContact[]>(`/sessions/${sessionId}/contacts`);
}

export function getContact(sessionId: string, contactId: string) {
  return request<OpenWAContact>(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}`);
}

export function checkNumber(sessionId: string, number: string) {
  return request<CheckNumberResponse>(`/sessions/${sessionId}/contacts/check/${encodeURIComponent(number)}`);
}

export function getProfilePicture(sessionId: string, contactId: string) {
  return request<{ url: string | null }>(
    `/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}/profile-picture`,
  );
}

export function getProfilePictures(sessionId: string, contactIds: string[]) {
  const ids = contactIds.slice(0, 50).map(encodeURIComponent).join(",");
  return request<{ pictures: Record<string, string | null> }>(
    `/sessions/${sessionId}/contacts/profile-pictures?ids=${ids}`,
  );
}

export function listGroups(sessionId: string) {
  return request<OpenWAGroup[]>(`/sessions/${sessionId}/groups`);
}

export function getGroup(sessionId: string, groupId: string) {
  return request<OpenWAGroupInfo>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}`);
}

export type ParticipantOpResult = { id: string; success: boolean; status?: number; message?: string };

export function addGroupParticipants(sessionId: string, groupId: string, participants: string[]) {
  return request<{ success: boolean; message: string; results?: ParticipantOpResult[] }>(
    `/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/participants`,
    {
      method: "POST",
      body: JSON.stringify({ participants }),
    },
  );
}

// ── Webhooks ──────────────────────────────────────────────────────────

export function listWebhooks() {
  return request<OpenWAWebhook[]>("/webhooks");
}

export function listWebhooksBySession(sessionId: string) {
  return request<OpenWAWebhook[]>(`/sessions/${sessionId}/webhooks`);
}

export function createWebhook(dto: { sessionId: string; url: string; events: string[]; filters?: WebhookFilters | null }) {
  return request<OpenWAWebhook>(`/sessions/${dto.sessionId}/webhooks`, {
    method: "POST",
    body: JSON.stringify({ url: dto.url, events: dto.events, filters: dto.filters }),
  });
}

export function updateWebhook(id: string, dto: { sessionId: string } & Partial<OpenWAWebhook>) {
  return request<OpenWAWebhook>(`/sessions/${dto.sessionId}/webhooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

export function deleteWebhook(id: string, sessionId: string) {
  return request<void>(`/sessions/${sessionId}/webhooks/${id}`, { method: "DELETE" });
}

export function testWebhook(sessionId: string, id: string) {
  return request<{ success: boolean; statusCode?: number; error?: string }>(
    `/sessions/${sessionId}/webhooks/${id}/test`,
    { method: "POST" },
  );
}

// ── Templates ─────────────────────────────────────────────────────────

export function listTemplates(sessionId: string) {
  return request<MessageTemplate[]>(`/sessions/${sessionId}/templates`);
}

export function createTemplate(sessionId: string, dto: TemplatePayload) {
  return request<MessageTemplate>(`/sessions/${sessionId}/templates`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function deleteTemplate(sessionId: string, id: string) {
  return request<void>(`/sessions/${sessionId}/templates/${id}`, { method: "DELETE" });
}

export function updateTemplate(sessionId: string, id: string, dto: Partial<TemplatePayload>) {
  return request<MessageTemplate>(`/sessions/${sessionId}/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}

// ── API keys ──────────────────────────────────────────────────────────

export function listApiKeys() {
  return request<ApiKey[]>("/auth/api-keys");
}

export function createApiKey(dto: {
  name: string;
  role: string;
  allowedIps?: string[];
  allowedSessions?: string[];
  expiresAt?: string;
}) {
  return request<CreatedApiKey>("/auth/api-keys", { method: "POST", body: JSON.stringify(dto) });
}

export function deleteApiKey(id: string) {
  return request<void>(`/auth/api-keys/${id}`, { method: "DELETE" });
}

export function revokeApiKey(id: string) {
  return request<ApiKey>(`/auth/api-keys/${id}/revoke`, { method: "POST" });
}

export function updateApiKey(
  id: string,
  data: { name?: string; role?: string; allowedIps?: string[]; allowedSessions?: string[]; expiresAt?: string },
) {
  return request<ApiKey>(`/auth/api-keys/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

// ── Logs / Infra / Plugins ────────────────────────────────────────────

export function listAuditLogs(params?: { action?: string; severity?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params?.action) query.set("action", params.action);
  if (params?.severity) query.set("severity", params.severity);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<{ data: AuditLog[]; total: number }>(`/audit${qs ? `?${qs}` : ""}`);
}

export function getInfraStatus() {
  return request<InfraStatus>("/infra/status");
}

export function getHealth() {
  return request<HealthStatus>("/health");
}

export function getInfraConfig() {
  return request<SavedConfig>("/infra/config");
}

export function saveInfraConfig(config: SaveConfigPayload) {
  return request<{ message: string; saved: boolean; envPath: string; profiles: string[] }>("/infra/config", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export function restartInfra(profiles?: string[], profilesToRemove?: string[]) {
  return request<{
    message: string;
    restarting: boolean;
    profiles: string[];
    profilesToRemove: string[];
    estimatedTime: number;
  }>("/infra/restart", {
    method: "POST",
    body: JSON.stringify({ profiles: profiles || [], profilesToRemove: profilesToRemove || [] }),
  });
}

export function getReadyHealth() {
  return request<{ status: "ok" | "error"; details: Record<string, { status: string }> }>("/health/ready");
}

export function exportInfraData() {
  return request<DataExport>("/infra/export-data");
}

export function importInfraData(tables: Record<string, unknown[]>, options?: { stopOrphans?: boolean }) {
  return request<DataImportResult>("/infra/import-data", {
    method: "POST",
    body: JSON.stringify({ tables, ...options }),
  });
}

export function listEngines() {
  return request<Engine[]>("/infra/engines");
}

export function getCurrentEngine() {
  return request<{ engineType: string }>("/infra/engines/current");
}

export function getStatsOverview() {
  return request<OverviewStats>("/stats/overview");
}

export function getMessageStats(period: StatsPeriod) {
  return request<MessageStats>(`/stats/messages?period=${period}`);
}

export function searchMessages(params: SearchParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return request<SearchResults>(`/search?${query.toString()}`);
}

export function listPlugins() {
  return request<Plugin[]>("/plugins");
}

export function enablePlugin(id: string) {
  return request<{ success: boolean; message: string }>(`/plugins/${id}/enable`, { method: "POST" });
}

export function disablePlugin(id: string) {
  return request<{ success: boolean; message: string }>(`/plugins/${id}/disable`, { method: "POST" });
}

export function installPluginFromUrl(url: string) {
  return request<Plugin>("/plugins/install-url", { method: "POST", body: JSON.stringify({ url }) });
}

export function uninstallPlugin(id: string) {
  return request<{ success: boolean; message: string }>(`/plugins/${id}`, { method: "DELETE" });
}

export function getPlugin(id: string) {
  return request<Plugin>(`/plugins/${id}`);
}

export function updatePluginConfig(id: string, config: Record<string, unknown>) {
  return request<{ success: boolean; message: string }>(`/plugins/${id}/config`, {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
}

export function setPluginSessions(id: string, sessions: string[]) {
  return request<Plugin>(`/plugins/${id}/sessions`, { method: "PUT", body: JSON.stringify({ sessions }) });
}

export function updatePluginSessionConfig(id: string, sessionId: string, config: Record<string, unknown>) {
  return request<{ success: boolean; message: string }>(
    `/plugins/${id}/config/${encodeURIComponent(sessionId)}`,
    { method: "PUT", body: JSON.stringify({ config }) },
  );
}

export function pluginHealthCheck(id: string) {
  return request<{ healthy: boolean; message?: string }>(`/plugins/${id}/health`);
}

export function installPlugin(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<Plugin>("/plugins/install", { method: "POST", body: form });
}

export function updatePluginFromUrl(id: string, url: string) {
  return request<Plugin>(`/plugins/${id}/update`, { method: "POST", body: JSON.stringify({ url }) });
}

export function listPluginCatalog() {
  return request<CatalogPlugin[]>("/plugins/catalog");
}

export function getPluginConfigUi(id: string) {
  return requestText(`/plugins/${id}/config-ui`);
}

export function listPluginInstances(pluginId: string) {
  return request<InstanceView[]>(`/integration/plugins/${pluginId}/instances`);
}

export function createPluginInstance(pluginId: string, body: CreateInstanceInput) {
  return request<InstanceView>(`/integration/plugins/${pluginId}/instances`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function regenerateInstanceSecret(pluginId: string, instanceId: string) {
  return request<InstanceView>(`/integration/plugins/${pluginId}/instances/${instanceId}/regenerate-secret`, {
    method: "POST",
  });
}

export function updatePluginInstance(pluginId: string, instanceId: string, body: UpdateInstanceInput) {
  return request<InstanceView>(`/integration/plugins/${pluginId}/instances/${instanceId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deletePluginInstance(pluginId: string, instanceId: string) {
  return request<void>(`/integration/plugins/${pluginId}/instances/${instanceId}`, { method: "DELETE" });
}

export function sendRaw(method: string, path: string, bodyText: string) {
  const options: RequestInit = { method, headers: openWAAuthHeaders(true) };
  if (method !== "GET" && method !== "DELETE" && bodyText) options.body = bodyText;
  const url = path.startsWith("http") ? path : `${getOpenWAApiBase()}${path.startsWith("/api") ? path.slice(4) : path}`;
  return fetch(url, options).then(async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { status: response.status, body: text };
    }
  });
}

export * from "./openwa/extended-api";
export * from "./openwa/akg-api";

