/**
 * API bindings for routes not yet in the core openwa-api surface (audit sections A–K).
 */
import { getOpenWAApiBase, openWAAuthHeaders } from "../openwa-config";
import { OpenWAError, type MessageResponse } from "../openwa-api";

async function extRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...openWAAuthHeaders(!(options.body instanceof FormData)),
    ...(options.headers as Record<string, string> | undefined),
  };
  const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new OpenWAError(error.message || `HTTP ${response.status}`, response.status, error.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function extBlob(endpoint: string): Promise<Blob> {
  const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { headers: openWAAuthHeaders(false) });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new OpenWAError(error.message || `HTTP ${response.status}`, response.status, error.code);
  }
  return response.blob();
}

async function extText(endpoint: string): Promise<string> {
  const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { headers: openWAAuthHeaders(false) });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
    throw new OpenWAError(error.message || `HTTP ${response.status}`, response.status, error.code);
  }
  return response.text();
}

export type Channel = {
  id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  subscriberCount?: number;
  picture?: string;
  verified?: boolean;
  createdAt?: number;
};

export type ChannelMessage = {
  id: string;
  body: string;
  timestamp: number;
  hasMedia: boolean;
  mediaUrl?: string;
};

export type StatusUpdate = {
  id: string;
  contact: { id: string; name?: string; pushName?: string };
  type: "text" | "image" | "video" | "voice";
  caption?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  font?: number;
  timestamp: string;
  expiresAt: string;
};

export function listChannels(sessionId: string) {
  return extRequest<Channel[]>(`/sessions/${sessionId}/channels`);
}

export function listChannelMessages(sessionId: string, channelId: string, limit = 50) {
  return extRequest<ChannelMessage[]>(
    `/sessions/${sessionId}/channels/${encodeURIComponent(channelId)}/messages?limit=${limit}`,
  );
}

export function listContactStatuses(sessionId: string) {
  return extRequest<{ statuses: StatusUpdate[] }>(`/sessions/${sessionId}/status`);
}

export function getStatusMediaBlob(sessionId: string, statusId: string) {
  return extBlob(`/sessions/${sessionId}/status/${encodeURIComponent(statusId)}/media`);
}

export function postTextStatus(
  sessionId: string,
  text: string,
  recipients?: string[],
  extra?: { backgroundColor?: string; font?: number },
) {
  return extRequest(`/sessions/${sessionId}/status/send-text`, {
    method: "POST",
    body: JSON.stringify({ text, recipients, ...extra }),
  });
}

export function postImageStatus(
  sessionId: string,
  image: { url?: string; base64?: string; mimetype?: string },
  recipients?: string[],
  caption?: string,
) {
  return extRequest(`/sessions/${sessionId}/status/send-image`, {
    method: "POST",
    body: JSON.stringify({ image, recipients, caption }),
  });
}

export function postVoiceStatus(sessionId: string, body: Record<string, unknown>) {
  return extRequest(`/sessions/${sessionId}/status/send-voice`, { method: "POST", body: JSON.stringify(body) });
}

export function deleteStatus(sessionId: string, statusId: string) {
  return extRequest<void>(`/sessions/${sessionId}/status/${encodeURIComponent(statusId)}`, { method: "DELETE" });
}

export function replyToMessage(sessionId: string, data: { chatId: string; quotedMessageId: string; text: string }) {
  return extRequest<MessageResponse>(`/sessions/${sessionId}/messages/reply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function clickMessageButton(
  sessionId: string,
  data: { chatId: string; messageId: string; buttonId: string; text?: string },
) {
  return extRequest<MessageResponse>(`/sessions/${sessionId}/messages/click-button`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function sendTemplateMessage(
  sessionId: string,
  data: { chatId: string; templateId: string; variables?: Record<string, string> },
) {
  return extRequest<MessageResponse>(`/sessions/${sessionId}/messages/send-template`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function votePoll(sessionId: string, data: { chatId: string; messageId: string; selectedOptions: string[] }) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/messages/vote-poll`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function pinMessage(sessionId: string, data: { chatId: string; messageId: string; duration?: number }) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/messages/pin`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function unpinMessage(sessionId: string, data: { chatId: string; messageId: string }) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/messages/unpin`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function markChatUnread(sessionId: string, chatId: string) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/chats/unread`, {
    method: "POST",
    body: JSON.stringify({ chatId }),
  });
}

export function deleteChat(sessionId: string, chatId: string) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/chats/delete`, {
    method: "POST",
    body: JSON.stringify({ chatId }),
  });
}

export function clearChatMessages(sessionId: string, chatId: string) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "DELETE",
  });
}

export function sendChatTyping(sessionId: string, chatId: string, typing: boolean) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/chats/typing`, {
    method: "POST",
    body: JSON.stringify({ chatId, typing }),
  });
}

export function subscribePresence(sessionId: string, chatIds: string[]) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/presence/subscribe`, {
    method: "POST",
    body: JSON.stringify({ chatIds }),
  });
}

export function setOwnPresence(sessionId: string, presence: "available" | "unavailable" | "composing" | "recording" | "paused") {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/presence`, {
    method: "PUT",
    body: JSON.stringify({ presence }),
  });
}

export function getChatPresence(sessionId: string, chatId: string) {
  return extRequest<{
    chatId: string;
    participants: Array<{ id: string; state: string; lastSeen?: number }>;
    groupOnlineCount?: number;
    observedAt: string;
  }>(`/sessions/${sessionId}/presence/${encodeURIComponent(chatId)}`);
}

export function resolveContactPhone(sessionId: string, contactId: string) {
  return extRequest<{ contactId: string; phone: string | null }>(
    `/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}/phone`,
  );
}

export function listBlockedContacts(sessionId: string) {
  return extRequest<unknown[]>(`/sessions/${sessionId}/contacts/blocked`);
}

export function updateContact(sessionId: string, contactId: string, body: Record<string, unknown>) {
  return extRequest<unknown>(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteContact(sessionId: string, contactId: string) {
  return extRequest<void>(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}`, { method: "DELETE" });
}

export function getGroupJoinInfo(sessionId: string, code: string) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/join-info?code=${encodeURIComponent(code)}`);
}

export function joinGroup(sessionId: string, inviteCode: string) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/join`, {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
}

export function createGroup(sessionId: string, body: { subject: string; participants: string[] }) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups`, { method: "POST", body: JSON.stringify(body) });
}

export function getGroupSettings(sessionId: string, groupId: string) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/settings`);
}

export function updateGroupSettings(sessionId: string, groupId: string, body: Record<string, unknown>) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/settings`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function removeGroupParticipants(sessionId: string, groupId: string, participants: string[]) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/participants`, {
    method: "DELETE",
    body: JSON.stringify({ participants }),
  });
}

export function promoteGroupParticipants(sessionId: string, groupId: string, participants: string[]) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/participants/promote`, {
    method: "POST",
    body: JSON.stringify({ participants }),
  });
}

export function demoteGroupParticipants(sessionId: string, groupId: string, participants: string[]) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/participants/demote`, {
    method: "POST",
    body: JSON.stringify({ participants }),
  });
}

export function listGroupMembershipRequests(sessionId: string, groupId: string) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/membership-requests`);
}

export function approveGroupMembershipRequests(sessionId: string, groupId: string, participantIds: string[]) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/membership-requests/approve`, {
    method: "POST",
    body: JSON.stringify({ participantIds }),
  });
}

export function rejectGroupMembershipRequests(sessionId: string, groupId: string, participantIds: string[]) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/membership-requests/reject`, {
    method: "POST",
    body: JSON.stringify({ participantIds }),
  });
}

export function setGroupDescription(sessionId: string, groupId: string, description: string) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/description`, {
    method: "PUT",
    body: JSON.stringify({ description }),
  });
}

export function getGroupPicture(sessionId: string, groupId: string) {
  return extRequest<{ url: string | null }>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/picture`);
}

export function setGroupPicture(sessionId: string, groupId: string, image: { url?: string; base64?: string; mimetype?: string }) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/picture`, {
    method: "PUT",
    body: JSON.stringify({ image }),
  });
}

export function deleteGroupPicture(sessionId: string, groupId: string) {
  return extRequest<void>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/picture`, { method: "DELETE" });
}

export function revokeGroupInvite(sessionId: string, groupId: string) {
  return extRequest<unknown>(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/invite-code/revoke`, {
    method: "POST",
  });
}

export function updateLabel(sessionId: string, labelId: string, body: Record<string, unknown>) {
  return extRequest<unknown>(`/sessions/${sessionId}/labels/${encodeURIComponent(labelId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteLabel(sessionId: string, labelId: string) {
  return extRequest<void>(`/sessions/${sessionId}/labels/${encodeURIComponent(labelId)}`, { method: "DELETE" });
}

export function getChatLabels(sessionId: string, chatId: string) {
  return extRequest<unknown[]>(`/sessions/${sessionId}/labels/chat/${encodeURIComponent(chatId)}`);
}

export function removeLabelFromChat(sessionId: string, chatId: string, labelId: string) {
  return extRequest<void>(`/sessions/${sessionId}/labels/chat/${encodeURIComponent(chatId)}/${encodeURIComponent(labelId)}`, {
    method: "DELETE",
  });
}

export function setProfilePicture(sessionId: string, image: { url?: string; base64?: string; mimetype?: string }) {
  return extRequest<{ success: boolean }>(`/sessions/${sessionId}/profile/picture`, {
    method: "PUT",
    body: JSON.stringify({ image }),
  });
}

export function deleteProfilePicture(sessionId: string) {
  return extRequest<void>(`/sessions/${sessionId}/profile/picture`, { method: "DELETE" });
}

export type WebhookDeliveryFailure = {
  id: string;
  webhookId: string;
  sessionId: string;
  url: string;
  lastError: string | null;
  failedAt: string;
};

export function listWebhookDeliveryFailures(params?: { sessionId?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.sessionId) q.set("sessionId", params.sessionId);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return extRequest<WebhookDeliveryFailure[]>(`/webhooks/delivery-failures${qs ? `?${qs}` : ""}`);
}

export function exportStorageArchive() {
  return extBlob("/infra/storage/export");
}

export function importStorageArchive(file: File) {
  const form = new FormData();
  form.append("file", file);
  return extRequest<{ imported: boolean; message?: string }>("/infra/storage/import", { method: "POST", body: form });
}

export function redrivePluginInstance(pluginId: string, instanceId: string) {
  return extRequest<{ success: boolean; message?: string }>(
    `/integration/instances/${encodeURIComponent(pluginId)}/${encodeURIComponent(instanceId)}/redrive`,
    { method: "POST" },
  );
}

export function getAppSettings() {
  return extRequest<Record<string, unknown>>("/settings");
}

export async function getMetricsText() {
  return extText("/metrics");
}

export function listCatalogProducts(sessionId: string) {
  return extRequest<unknown[]>(`/sessions/${sessionId}/catalog/products`);
}

export function getCatalogProduct(sessionId: string, productId: string) {
  return extRequest<unknown>(`/sessions/${sessionId}/catalog/products/${encodeURIComponent(productId)}`);
}

export function sendCatalogProduct(sessionId: string, body: Record<string, unknown>) {
  return extRequest<MessageResponse>(`/sessions/${sessionId}/messages/send-product`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listCalls(sessionId: string) {
  return extRequest<unknown[]>(`/sessions/${sessionId}/calls`);
}
