/** OpenAPI wire types for the UI client (contract-shapes gate). */
export interface SessionConfig {
  autoRejectCalls: boolean;
  maxReconnectAttempts: number | null;
  reconnectBaseDelay: number;
}

export type SessionProxyType = 'http' | 'https' | 'socks4' | 'socks5';

export interface SessionProxy {
  enabled: boolean;
  proxyType: SessionProxyType | null;
  proxyHost: string | null;
  hasCredentials: boolean;
}

export interface CreateSessionOptions {
  proxyUrl?: string;
  proxyType?: SessionProxyType;
}

export interface Session {
  id: string;
  name: string;
  status:
    | 'created'
    | 'initializing'
    | 'authenticating'
    | 'qr_ready'
    | 'ready'
    | 'disconnected'
    | 'action_required'
    | 'failed';
  /**
   * Whether the gateway holds a live engine for this session right now. The precondition the
   * lifecycle routes enforce, and not derivable from `status`: `disconnected` covers both a session
   * mid automatic-reconnect (engine present, start 400s) and one stopped through stop() (no engine).
   * Optional BY DESIGN, not drift: the wire always carries it, but this client's state model
   * clears it to "unknown" after a websocket status event until the row refreshes, so the action
   * helpers fall back to the historical status set instead of trusting a stale value.
   */
  engineLoaded?: boolean;
  phone?: string | null;
  pushName?: string | null;
  connectedAt?: string | null;
  lastActive?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Human-readable reason carried while the status is 'failed' (terminal failure) or
   * 'action_required' (operator must intervene, e.g. acknowledge an onboarding modal). */
  lastError?: string | null;
  /**
   * A limit WhatsApp itself has placed on the account, or null when there is none. Distinct from
   * `lastError`, which describes a fault on the gateway's side of the link. Optional only because a
   * dashboard can be served by a gateway that predates the field.
   */
  restriction?: AccountRestriction | null;
}

/** One participant's presence within a chat. */
export interface ParticipantPresence {
  id: string;
  /** `composing`/`recording` mean actively typing or recording; `paused` means they stopped. */
  state: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused';
  /** Unix SECONDS. Absent whenever the contact's privacy settings hide last-seen. */
  lastSeen?: number;
}

/** The last presence reported for a chat since it was subscribed. */
export interface ChatPresence {
  chatId: string;
  participants: ParticipantPresence[];
  groupOnlineCount?: number;
  /** When the gateway received the report — NOT a WhatsApp timestamp. */
  observedAt: string;
}

/**
 * A restriction WhatsApp has in force on a session's account.
 *
 * `reachout_timelock` leaves the session connected and existing chats working — only starting new
 * conversations is blocked — which is why it can appear on a perfectly `ready` session. `tos_block`
 * and `proxy_block` refuse the connection itself and so cannot.
 */
export interface AccountRestriction {
  kind: 'reachout_timelock' | 'tos_block' | 'proxy_block';
  /** The engine's own token for the cause, verbatim (`TOS_BLOCK`, `BIZ_QUALITY`, …). */
  code: string;
  /** ISO timestamp when enforcement ends, when WhatsApp states one. */
  expiresAt?: string | null;
}

export interface SessionStats {
  total: number;
  active: number;
  ready: number;
  disconnected: number;
  byStatus: Record<string, number>;
  memoryUsage: { heapUsed: number; heapTotal: number; rss: number };
}

export type WebhookFilterOperator = 'is' | 'isNot' | 'contains' | 'equals';

export interface WebhookFilterCondition {
  field: string;
  operator: WebhookFilterOperator;
  value: string | string[] | boolean;
  caseSensitive?: boolean;
}

export interface WebhookFilters {
  conditions: WebhookFilterCondition[];
}

export interface Webhook {
  id: string;
  sessionId: string;
  url: string;
  events: string[];
  filters?: WebhookFilters | null;
  active: boolean;
  retryCount: number;
  /** Null until the first delivery attempt. */
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  sessionId: string;
  name: string;
  body: string;
  header?: string | null;
  footer?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePayload {
  name: string;
  body: string;
  header?: string | null;
  footer?: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  role: 'admin' | 'operator' | 'viewer';
  allowedIps?: string[];
  allowedSessions?: string[];
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
}

/** The creation response: every list/detail field plus the plaintext key, shown exactly once. */
export interface CreatedApiKey extends ApiKey {
  apiKey: string;
}

export interface AuditLog {
  id: string;
  action: string;
  severity: 'info' | 'warn' | 'error';
  apiKeyId: string | null;
  apiKeyName: string | null;
  sessionId: string | null;
  sessionName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  /** Null when the action succeeded. */
  errorMessage: string | null;
  /** Free-form context whose shape varies per action. */
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MessageResponse {
  messageId: string;
  timestamp: number;
}

// Mirrors the backend engine ChatKind (dashboard cannot import wa-id.ts).
export type ChatKind = 'individual' | 'group' | 'channel' | 'status' | 'broadcast' | 'unknown';
// Mirrors CHAT_KINDS in the backend webhook filter registry (src/modules/webhook/filters/filter-types.ts).
export const CHAT_KINDS: readonly ChatKind[] = ['individual', 'group', 'channel', 'status', 'broadcast', 'unknown'];

// Chat summary returned by GET /sessions/:id/chats (mirrors the backend ChatSummary).
export interface Chat {
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
  muteExpiration?: number;
}

// Engine-neutral message types (mirrors the backend's IWhatsAppEngine MessageType). The backend
// normalizes raw engine tokens at the adapter boundary (#265/#270), so persisted rows, the
// message.received/sent payloads, and the websocket all use these values.
export const MESSAGE_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'voice',
  'document',
  'sticker',
  'location',
  'contact',
  'poll',
  'call',
  'revoked',
  'order',
  'product',
  'masked',
  'unknown',
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

/** Coerce an arbitrary string (e.g. a raw websocket payload field) to a known MessageType. */
export function asMessageType(value: string | undefined): MessageType {
  return (MESSAGE_TYPES as readonly string[]).includes(value ?? '') ? (value as MessageType) : 'unknown';
}

export interface ChatMessage {
  id: string;
  waMessageId?: string;
  chatId: string;
  /** Chat kind of the source conversation (present on live engine/WS payloads). */
  kind?: ChatKind;
  /**
   * Human-readable name of the message's sender. For a group this is the participant who posted
   * (their pushName/contact name); the chat view uses it to label who said what, like WhatsApp. Null
   * on legacy rows or when the engine could not resolve a name.
   */
  chatName?: string;
  /**
   * Stable sender identity for a group message: the participant JID who actually posted (`from` is
   * the group JID). Present on live/engine payloads and on rows persisted after the column was
   * added; absent on 1:1 messages, outgoing echoes, and legacy rows.
   */
  author?: string;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: number;
  createdAt: string;
  metadata?: {
    media?: { mimetype: string; filename?: string; data?: string; omitted?: boolean; sizeBytes?: number };
    quotedMessage?: { id: string; body: string };
    reactions?: Record<string, string>;
    call?: { video: boolean; missed: boolean };
    /** Business prompt choices (Baileys). Present on inbound prompts that offer buttons. */
    buttons?: Array<{ id: string; text: string }>;
  };
}

// Live WhatsApp message from the engine history endpoint (not a persisted DB row): it carries `fromMe`
// instead of `direction`/`status`. Used to backfill a chat thread the gateway never captured live.
export interface EngineHistoryMessage {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  /** Unix timestamp in seconds. */
  timestamp: number;
  fromMe: boolean;
  isGroup: boolean;
  isStatusBroadcast?: boolean;
  kind: ChatKind;
  /** Disappearing-messages timer on the chat, in seconds. Absent when the chat has none set. */
  ephemeralDuration?: number;
  /** Sender in a group: `from` is the group JID, so this participant WID is the real poster. */
  author?: string;
  mentionedIds?: string[];
  /** Present on `call` messages only. */
  call?: { video: boolean; missed: boolean };
  isLidSender?: boolean;
  senderPhone?: string | null;
  /**
   * Sender contact info, best-effort from the engine's cache. History carries `pushName` only;
   * the richer fields arrive on `message.received` when `WEBHOOK_CONTACT_DETAILS=true`.
   */
  contact?: {
    id?: string;
    number?: string;
    name?: string;
    pushName?: string;
    shortName?: string;
    type?: string;
    isMyContact?: boolean;
    isWAContact?: boolean;
    isBusiness?: boolean;
    isEnterprise?: boolean;
    verifiedName?: string;
    verifiedLevel?: number;
    isBlocked?: boolean;
    labels?: string[];
  };
  /** Status/story styling. Declared by the engine payload; this route never sets either. */
  backgroundColor?: string;
  font?: number;
  media?: {
    mimetype: string;
    filename?: string;
    data?: string;
    omitted?: boolean;
    sizeBytes?: number;
  };
  quotedMessage?: { id: string; body: string };
  location?: { latitude: number; longitude: number; description?: string; address?: string; url?: string };
  /** Present on `order` messages only: the placed cart, plus the single-order token for its items. */
  order?: { orderId: string; token?: string };
  /** Present on `product` messages only: the catalog product shared into the chat. */
  product?: { productId: string; title?: string; description?: string; businessOwnerJid?: string };
}

// Mirrors the backend engine Channel / ChannelMessage (GET /sessions/:id/channels[/:id/messages]).
export interface Channel {
  id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  subscriberCount?: number;
  picture?: string;
  verified?: boolean;
  createdAt?: number;
}

export interface ChannelMessage {
  id: string;
  body: string;
  timestamp: number;
  hasMedia: boolean;
  mediaUrl?: string;
}

// Mirrors the backend engine Status / IWhatsAppEngine status methods (GET /sessions/:id/status).
export interface StatusUpdate {
  id: string;
  contact: { id: string; name?: string; pushName?: string };
  type: 'text' | 'image' | 'video' | 'voice';
  caption?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  font?: number;
  timestamp: string;
  expiresAt: string;
}

export interface ContactStatusGroup {
  contact: { id: string; name?: string; pushName?: string };
  items: StatusUpdate[];
  latest: string;
}

// Minimal contact type for the recipient picker; the backend GET /sessions/:id/contacts
// returns a Contact array; fields beyond id are optional.
export interface Contact {
  id: string;
  name?: string;
  pushName?: string;
  /** MSISDN digits without separators — always present in the response. */
  number: string;
  isMyContact: boolean;
  isBlocked: boolean;
  /** Absent when the contact has none or privacy hides it. */
  profilePicUrl?: string;
  lid?: string;
  isBusiness?: boolean;
  verifiedName?: string;
}

export interface SendMediaPayload {
  base64?: string;
  url?: string;
  mimetype?: string;
  filename?: string;
  caption?: string;
  /** Quote an earlier message, making the media send a reply. Omit for an ordinary send. */
  quotedMessageId?: string;
}

// Payloads below mirror the backend DTOs in src/modules/message/dto (raw bodies, no envelope).
export interface SendLocationPayload {
  chatId: string;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
}

export interface SendContactPayload {
  chatId: string;
  contactName: string;
  contactNumber: string;
}

export interface SendPollPayload {
  chatId: string;
  name: string;
  options: string[];
  allowMultipleAnswers?: boolean;
}

export interface ForwardMessagePayload {
  fromChatId: string;
  toChatId: string;
  messageId: string;
}

// Media block of a single bulk message (BulkMediaDto — no caption; caption sits next to it).
export interface BulkMediaPayload {
  url?: string;
  base64?: string;
  mimetype?: string;
  filename?: string;
  ptt?: boolean;
}

export interface BulkMessageItem {
  chatId: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  content: {
    text?: string;
    image?: BulkMediaPayload;
    video?: BulkMediaPayload;
    audio?: BulkMediaPayload;
    document?: BulkMediaPayload;
    caption?: string;
  };
  variables?: Record<string, string>;
}

export interface SendBulkPayload {
  batchId?: string;
  messages: BulkMessageItem[];
  options?: {
    delayBetweenMessages?: number;
    randomizeDelay?: boolean;
    stopOnError?: boolean;
  };
}

/** 202 response of POST send-bulk — the batch is processing asynchronously; poll getBatchStatus. */
export interface BulkBatchResponse {
  batchId: string;
  status: string;
  totalMessages: number;
  estimatedCompletionTime?: string;
  statusUrl: string;
}

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';

export interface BatchProgress {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
}

export interface BatchMessageResult {
  chatId: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  messageId?: string;
  error?: { code: string; message: string };
  sentAt?: string;
}

/** GET batch/:batchId shape; the cancel endpoint returns the same minus results/timestamps. */
export interface BatchStatusResponse {
  batchId: string;
  status: BatchStatus;
  progress: BatchProgress;
  /** One entry per recipient already attempted — empty until the first send resolves. */
  results: BatchMessageResult[];
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp?: string;
  /** Running backend version (from package.json) — read live so the sidebar never shows a stale build. */
  version?: string;
  details?: {
    database?: { status: string };
    redis?: { status: string };
    queue?: { status: string };
  };
}

export interface InfraStatus {
  // `builtIn` = OpenWA's own bundled container is actually running and backing this service (live),
  // not just the saved intent — falls back to the saved flag when Docker is unavailable. (#488)
  database: { connected: boolean; type: string; host: string; builtIn: boolean };
  redis: { enabled: boolean; connected: boolean; host: string; port: number; builtIn: boolean };
  queue: {
    enabled: boolean;
    webhooks: { pending: number; completed: number; failed: number };
  };
  storage: { type: 'local' | 's3'; path?: string; bucket?: string; builtIn: boolean; s3Available?: boolean };
  engine: {
    type: string;
    headless: boolean;
    // whatsapp-web.js only: the actual WhatsApp Web build in use (distinct from the library version)
    // and how it was chosen. (#488)
    webVersion?: string | null;
    webVersionSource?: 'pinned' | 'auto' | 'native';
  };
  /**
   * Editable settings supplied by a layer above `data/.env.generated` (the container environment or a
   * project `.env`), which therefore cannot be changed from this page until that layer is. Reported by
   * the gateway rather than inferred from a running-vs-saved mismatch, because that mismatch is also
   * what an unrestarted save looks like and the two need opposite advice (#1082).
   *
   * Optional only because a dashboard can be served by a gateway that predates the field.
   */
  envPinned?: string[];
}

// Saved infrastructure config (from data/.env.generated) used to hydrate the form.
// Secrets are never returned — `*Set` flags indicate whether a value is stored.
export interface SavedConfig {
  database: {
    type: 'sqlite' | 'postgres';
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
    type: 'local' | 's3';
    builtIn: boolean;
    localPath: string;
    s3Bucket: string;
    s3Region: string;
    s3Endpoint: string;
    s3CredentialsSet: boolean;
  };
  engine: { type: string; headless: boolean; sessionDataPath: string; browserArgs: string };
}

export interface SaveConfigPayload {
  database?: {
    type: 'sqlite' | 'postgres';
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
  redis?: {
    enabled?: boolean;
    builtIn?: boolean;
    host?: string;
    port?: string;
    password?: string;
  };
  queue?: {
    enabled?: boolean;
  };
  storage?: {
    type: 'local' | 's3';
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
}

// Global message search (mirrors the backend GET /search contract from #664).
// `timestamp` is epoch-seconds (the messages column is seconds, not ms); `dateFrom`/`dateTo`
// are epoch-ms on the wire — see `dateFrom`/`dateTo` JSDoc below.
export interface SearchParams {
  q: string;
  sessionId?: string;
  chatId?: string;
  direction?: string;
  type?: string;
  from?: string;
  /** Epoch-ms lower bound (inclusive) — the backend binds against messages.timestamp (/1000). */
  dateFrom?: number;
  /** Epoch-ms upper bound (inclusive). */
  dateTo?: number;
  limit?: number;
  offset?: number;
}

export interface SearchHit {
  messageId: string;
  waMessageId: string;
  sessionId: string;
  chatId: string;
  body: string;
  /** Provider-generated excerpt with `<mark>` highlight markers — render as text, never as HTML. */
  snippet: string;
  /** Epoch-seconds (mirrors the persisted messages.timestamp column). */
  timestamp: number;
  type: string;
  direction: 'incoming' | 'outgoing';
  from: string;
  score?: number;
}

export interface SearchResults {
  hits: SearchHit[];
  total: number;
  tookMs: number;
  provider: string;
}

export interface CheckNumberResponse {
  number: string;
  exists: boolean;
  /** Engine-canonical WhatsApp id for the number (e.g. `…@c.us` or `…@lid`), or null if unregistered. */
  whatsappId: string | null;
}

export interface ProfilePictureResponse {
  /** Signed CDN URL for the contact/group picture, or null when hidden / unavailable. */
  url: string | null;
}

