import { getOpenWAApiBase, openWAAuthHeaders } from '../openwa-config';
import { OpenWAError, fileToBase64, type MessageResponse } from '../openwa-api';
import { MEDIA_UPLOAD_MAX_BYTES } from './akg-builders';

export { fileToBase64, MEDIA_UPLOAD_MAX_BYTES };

export type AkgFeatures = {
  scheduler: boolean;
  botCommands: boolean;
  mediaPersist: boolean;
  removeBgConfigured: boolean;
  regexRules: boolean;
  pollVoteEvents: boolean;
};

export const AKG_FEATURES_OFF: AkgFeatures = {
  scheduler: false,
  botCommands: false,
  mediaPersist: false,
  removeBgConfigured: false,
  regexRules: false,
  pollVoteEvents: false,
};

async function handleError(response: Response): Promise<never> {
  const error = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
  throw new OpenWAError(error.message || `HTTP ${response.status}`, response.status, error.code);
}

async function akgRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...openWAAuthHeaders(!(options.body instanceof FormData)),
    ...(options.headers as Record<string, string> | undefined),
  };
  const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { ...options, headers });
  if (!response.ok) await handleError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getAkgFeatures() {
  return akgRequest<AkgFeatures>('/features');
}

export type ScheduledMessage = {
  id: string;
  sessionId: string;
  chatId: string;
  sendAt: string;
  timezone: string;
  text: string | null;
  mediaUrl: string | null;
  mediaType: string;
  caption: string | null;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  attemptCount: number;
  lastError: string | null;
  sentMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export function listScheduledMessages(sessionId: string) {
  return akgRequest<ScheduledMessage[]>(`/sessions/${sessionId}/scheduled-messages`);
}
export function createScheduledMessage(sessionId: string, body: Record<string, unknown>) {
  return akgRequest<ScheduledMessage>(`/sessions/${sessionId}/scheduled-messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export function updateScheduledMessage(sessionId: string, jobId: string, body: Record<string, unknown>) {
  return akgRequest<ScheduledMessage>(`/sessions/${sessionId}/scheduled-messages/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
export function cancelScheduledMessage(sessionId: string, jobId: string) {
  return akgRequest<void>(`/sessions/${sessionId}/scheduled-messages/${jobId}`, { method: 'DELETE' });
}

export type AutomationRule = {
  id: string;
  sessionId: string;
  name: string;
  replyText: string;
  replyMediaUrl?: string | null;
  matchMode: string;
  matchPattern?: string | null;
  chatContext: string;
  cooldownSeconds: number;
  enabled: boolean;
  conditions?: unknown;
};

export function listAutomationRules(sessionId: string) {
  return akgRequest<AutomationRule[]>(`/sessions/${sessionId}/automation-rules`);
}
export function createAutomationRule(sessionId: string, body: Record<string, unknown>) {
  return akgRequest<AutomationRule>(`/sessions/${sessionId}/automation-rules`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export function updateAutomationRule(sessionId: string, ruleId: string, body: Record<string, unknown>) {
  return akgRequest<AutomationRule>(`/sessions/${sessionId}/automation-rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
export function deleteAutomationRule(sessionId: string, ruleId: string) {
  return akgRequest<void>(`/sessions/${sessionId}/automation-rules/${ruleId}`, { method: 'DELETE' });
}

export type BotConfig = {
  sessionId: string;
  accessMode: 'all' | 'allow' | 'block';
  allowList: string[];
  blockList: string[];
  prefix: string;
  commandsEnabled: boolean;
  autoRead: boolean;
  alwaysOnline: boolean;
  welcomeMessage: string | null;
};

export function getBotConfig(sessionId: string) {
  return akgRequest<BotConfig>(`/sessions/${sessionId}/bot-config`);
}
export function putBotConfig(sessionId: string, body: Partial<BotConfig>) {
  return akgRequest<BotConfig>(`/sessions/${sessionId}/bot-config`, { method: 'PUT', body: JSON.stringify(body) });
}

export function sendPollAkg(
  sessionId: string,
  data: { chatId: string; name: string; options: string[]; selectableCount?: number; allowMultipleAnswers?: boolean },
) {
  return akgRequest<MessageResponse>(`/sessions/${sessionId}/messages/send-poll`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function sendStickerAkg(
  sessionId: string,
  chatId: string,
  payload: { base64?: string; url?: string; mimetype?: string; packName?: string; author?: string },
) {
  return akgRequest<MessageResponse>(`/sessions/${sessionId}/messages/send-sticker`, {
    method: 'POST',
    body: JSON.stringify({ chatId, ...payload }),
  });
}

export function sendTextList(
  sessionId: string,
  body: { chatId: string; title?: string; description?: string; options: string[] },
) {
  return akgRequest<MessageResponse>(`/sessions/${sessionId}/messages/send-text-list`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type ForwardManyResponse = {
  results: Array<{ chatId: string; status: string; error?: string; messageId?: string }>;
};

export async function forwardMany(
  sessionId: string,
  body: { fromChatId: string; messageId: string; toChatId?: string; toChatIds?: string[] },
): Promise<{ status: number } & ForwardManyResponse> {
  const response = await fetch(`${getOpenWAApiBase()}/sessions/${sessionId}/messages/forward`, {
    method: 'POST',
    headers: openWAAuthHeaders(true),
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as ForwardManyResponse & { message?: string; code?: string };
  if (!response.ok && response.status !== 207 && response.status !== 502) {
    throw new OpenWAError(json.message || `HTTP ${response.status}`, response.status, json.code);
  }
  return { status: response.status, results: json.results ?? [] };
}

export function reactToMessage(sessionId: string, body: { chatId: string; messageId: string; emoji: string }) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/messages/react`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export function editMessage(sessionId: string, body: { chatId: string; messageId: string; body: string }) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/messages/edit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export function deleteMessage(sessionId: string, body: { chatId: string; messageId: string; forEveryone?: boolean }) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/messages/delete`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export function starMessage(sessionId: string, body: { chatId: string; messageId: string; star: boolean }) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/messages/star`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function archiveChat(sessionId: string, chatId: string, archive: boolean) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/chats/archive`, {
    method: 'POST',
    body: JSON.stringify({ chatId, archive }),
  });
}
export function muteChat(sessionId: string, chatId: string, durationSec: number | null) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/chats/mute`, {
    method: 'POST',
    body: JSON.stringify(durationSec === null ? { chatId, muteUntil: null } : { chatId, durationSec }),
  });
}
export function pinChat(sessionId: string, chatId: string, pin: boolean) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/chats/pin`, {
    method: 'POST',
    body: JSON.stringify({ chatId, pin }),
  });
}

export function checkNumbers(sessionId: string, numbers: string[]) {
  return akgRequest<{ results: Array<{ input: string; exists: boolean; chatId: string | null; error?: string }> }>(
    `/sessions/${sessionId}/contacts/check`,
    { method: 'POST', body: JSON.stringify({ numbers }) },
  );
}
export function blockContact(sessionId: string, contactId: string) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}/block`, {
    method: 'POST',
  });
}
export function unblockContact(sessionId: string, contactId: string) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}/block`, {
    method: 'DELETE',
  });
}

export function listLabels(sessionId: string) {
  return akgRequest<Array<{ id: string; name: string; color?: string }>>(`/sessions/${sessionId}/labels`);
}
export function addLabelToChat(sessionId: string, chatId: string, labelId: string) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/labels/chat/${encodeURIComponent(chatId)}`, {
    method: 'POST',
    body: JSON.stringify({ labelId }),
  });
}
export function getOwnProfile(sessionId: string) {
  return akgRequest<{ phone?: string; pushName?: string; status?: string; pictureUrl?: string | null }>(
    `/sessions/${sessionId}/profile`,
  );
}
export function setProfileName(sessionId: string, name: string) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/profile/name`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}
export function setProfileStatus(sessionId: string, status: string) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/profile/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function listGroupInvite(sessionId: string, groupId: string) {
  return akgRequest<{ inviteCode: string }>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/invite-code`);
}
export function setGroupSubject(sessionId: string, groupId: string, subject: string) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/subject`, {
    method: 'PUT',
    body: JSON.stringify({ subject }),
  });
}
export function leaveGroup(sessionId: string, groupId: string) {
  return akgRequest<{ success: boolean }>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/leave`, {
    method: 'POST',
  });
}

export type WebhookDelivery = {
  id: string;
  status: string;
  httpCode: number | null;
  durationMs: number;
  attempt: number;
  errorSnippet: string | null;
  createdAt: string;
};
export function listWebhookDeliveries(sessionId: string, webhookId: string) {
  return akgRequest<WebhookDelivery[]>(`/sessions/${sessionId}/webhooks/${webhookId}/deliveries`);
}

export type ConvertedSticker = { base64: string; mimetype: string; bytes: number };
export async function convertSticker(
  sessionId: string,
  file: File,
  opts: { packName?: string; author?: string; removeBg?: boolean },
) {
  if (file.size > MEDIA_UPLOAD_MAX_BYTES) throw new OpenWAError('File exceeds the media size cap.', 413);
  const media = await fileToBase64(file);
  return akgRequest<ConvertedSticker>(`/sessions/${sessionId}/media/convert/sticker`, {
    method: 'POST',
    body: JSON.stringify({
      base64: media.base64,
      packName: opts.packName,
      author: opts.author,
      removeBg: opts.removeBg,
    }),
  });
}

export type StoredMediaFile = { messageId: string | null; createdAt: string; url: string };
export function listStoredMedia(sessionId: string) {
  return akgRequest<StoredMediaFile[]>(`/sessions/${sessionId}/media/files`);
}
export function deleteStoredMedia(sessionId: string, messageId: string) {
  return akgRequest<void>(`/sessions/${sessionId}/media/files/${encodeURIComponent(messageId)}`, { method: 'DELETE' });
}
export function storedMediaUrl(sessionId: string, messageId: string) {
  return `${getOpenWAApiBase()}/sessions/${sessionId}/media/files/${encodeURIComponent(messageId)}`;
}

export const AKG_WEBHOOK_EVENTS = ['scheduled.message.sent', 'scheduled.message.failed', 'message.poll_vote'] as const;
