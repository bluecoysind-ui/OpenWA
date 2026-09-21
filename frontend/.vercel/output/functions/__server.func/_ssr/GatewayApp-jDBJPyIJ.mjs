import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { A as Download, C as MessageSquare, D as FolderOpen, E as Globe, F as CircleCheckBig, I as CalendarClock, L as Bot, M as Cpu, N as Copy, O as FileText, P as CircleUser, R as Activity, S as Play, T as KeyRound, _ as RefreshCw, a as Unlink, b as Power, c as Square, d as Shield, f as Server, g as Save, h as ScrollText, i as Upload, j as Database, k as ExternalLink, l as Smartphone, m as Search, n as X, o as TriangleAlert, p as Send, r as Webhook, s as Trash2, t as Zap, u as Skull, v as QrCode, w as LoaderCircle, x as Plus, y as Puzzle } from "../_libs/lucide-react.mjs";
import { I as require_react_dom } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { t as lookup } from "../_libs/socket.io-client+[...].mjs";
import { a as XAxis, c as Bar, d as ResponsiveContainer, f as Tooltip, i as YAxis, l as Pie, n as PieChart, o as Area, p as Legend, r as BarChart, s as CartesianGrid, t as AreaChart, u as Cell } from "../_libs/recharts+[...].mjs";
import { a as Program, i as Renderer, n as Color, r as Mesh, t as Triangle } from "../_libs/ogl.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/GatewayApp-jDBJPyIJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom());
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var URL_KEY = "openwa_url";
var API_KEY_KEY = "openwa_api_key";
var DEFAULT_URL = "http://localhost:2785";
function envUrl() {
	return "".replace(/\/+$/, "");
}
function envApiKey() {
	return "";
}
function getOpenWAUrl() {
	if (typeof window !== "undefined") {
		const stored = window.localStorage.getItem(URL_KEY);
		if (stored) return stored.replace(/\/+$/, "");
	}
	return envUrl() || DEFAULT_URL;
}
function getOpenWAApiKey() {
	if (typeof window !== "undefined") {
		const stored = window.localStorage.getItem(API_KEY_KEY) || window.sessionStorage.getItem(API_KEY_KEY);
		if (stored) return stored;
	}
	return envApiKey();
}
function setOpenWACredentials(url, apiKey) {
	const origin = url.replace(/\/+$/, "") || DEFAULT_URL;
	window.localStorage.setItem(URL_KEY, origin);
	window.localStorage.setItem(API_KEY_KEY, apiKey);
	window.sessionStorage.setItem(API_KEY_KEY, apiKey);
}
function clearOpenWACredentials() {
	window.localStorage.removeItem(URL_KEY);
	window.localStorage.removeItem(API_KEY_KEY);
	window.sessionStorage.removeItem(API_KEY_KEY);
}
function getOpenWAApiBase() {
	return `${getOpenWAUrl()}/api`;
}
function getOpenWASocketOrigin() {
	return getOpenWAUrl();
}
function openWAAuthHeaders(includeJson = true) {
	const headers = {};
	if (includeJson) headers["Content-Type"] = "application/json";
	const key = getOpenWAApiKey();
	if (key) headers["X-API-Key"] = key;
	return headers;
}
/**
* Convert a local wall-clock datetime + IANA timezone into an ISO-8601 instant WITH offset.
* DST-correct: the offset is read from Intl at the resolved instant (two-pass).
*/
function listTimeZones() {
	try {
		const intl = Intl;
		if (typeof intl.supportedValuesOf === "function") return intl.supportedValuesOf("timeZone");
	} catch {}
	return [
		"UTC",
		"Asia/Kolkata",
		"Asia/Jakarta",
		"Asia/Singapore",
		"Europe/London",
		"America/New_York",
		"America/Los_Angeles",
		"Australia/Sydney"
	];
}
function pad(n) {
	return String(n).padStart(2, "0");
}
/** Offset of `timeZone` from UTC, in minutes, at the given UTC instant (east of UTC is positive). */
function timeZoneOffsetMinutes(utcMs, timeZone) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hourCycle: "h23",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}).formatToParts(new Date(utcMs));
	const num = (type) => Number(parts.find((p) => p.type === type)?.value);
	return (Date.UTC(num("year"), num("month") - 1, num("day"), num("hour"), num("minute"), num("second")) - utcMs) / 6e4;
}
function formatOffset(offsetMin) {
	if (offsetMin === 0) return "Z";
	const sign = offsetMin >= 0 ? "+" : "-";
	const abs = Math.abs(offsetMin);
	return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
/**
* @param local `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss` (no offset)
* @param timeZone IANA name, e.g. `Asia/Kolkata`
*/
function localDateTimeToIsoInstant(local, timeZone) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(local)) throw new Error("local datetime must be YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss");
	if (!timeZone.trim()) throw new Error("timezone is required");
	const [date, time] = local.split("T");
	const [year, month, day] = date.split("-").map(Number);
	const [hour, minute, second = 0] = time.split(":").map(Number);
	const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
	let utc = desiredAsUtc;
	utc = desiredAsUtc - timeZoneOffsetMinutes(utc, timeZone) * 6e4;
	utc = desiredAsUtc - timeZoneOffsetMinutes(utc, timeZone) * 6e4;
	const offsetMin = timeZoneOffsetMinutes(utc, timeZone);
	return `${date}T${pad(hour)}:${pad(minute)}:${pad(second)}${formatOffset(offsetMin)}`;
}
/** Format an ISO instant as `YYYY-MM-DDTHH:mm` wall-clock in `timeZone` (for datetime-local). */
function isoInstantToLocalDateTime(iso, timeZone) {
	const utcMs = Date.parse(iso);
	if (!Number.isFinite(utcMs)) throw new Error("invalid instant");
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hourCycle: "h23",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	}).formatToParts(new Date(utcMs));
	const num = (type) => parts.find((p) => p.type === type)?.value ?? "00";
	return `${num("year")}-${num("month")}-${num("day")}T${num("hour")}:${num("minute")}`;
}
function buildScheduledCreateBody(input) {
	const body = {
		chatId: input.chatId,
		sendAt: localDateTimeToIsoInstant(input.localDateTime, input.timeZone),
		timezone: input.timeZone
	};
	if (input.text?.trim()) body.text = input.text.trim();
	if (input.mediaUrl?.trim()) {
		body.mediaUrl = input.mediaUrl.trim();
		body.mediaType = input.mediaType || "image";
	}
	if (input.caption?.trim()) body.caption = input.caption.trim();
	const recurrence = input.recurrence ?? "none";
	if (recurrence !== "none") {
		body.recurrence = recurrence;
		body.interval = input.interval && input.interval > 0 ? input.interval : 1;
		if (recurrence === "weekly" && input.daysOfWeek?.length) body.daysOfWeek = input.daysOfWeek;
		if (recurrence === "monthly" && input.dayOfMonth) body.dayOfMonth = input.dayOfMonth;
		if (input.until?.trim()) body.until = input.until.trim();
		if (input.maxOccurrences && input.maxOccurrences > 0) body.maxOccurrences = input.maxOccurrences;
	}
	return body;
}
function clampCheckNumbers(numbers, max = 50) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const raw of numbers) {
		const n = raw.trim();
		if (!n || seen.has(n)) continue;
		seen.add(n);
		out.push(n);
		if (out.length >= max) break;
	}
	return out;
}
function mapForwardMany(httpStatus, results) {
	return {
		httpStatus,
		sent: results.filter((r) => r.status === "sent").length,
		failed: results.filter((r) => r.status !== "sent").length,
		results
	};
}
function parseNumberList(text) {
	return text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
}
var AKG_FEATURES_OFF = {
	scheduler: false,
	botCommands: false,
	mediaPersist: false,
	removeBgConfigured: false,
	regexRules: false,
	pollVoteEvents: false
};
async function handleError$1(response) {
	const error = await response.json().catch(() => ({}));
	throw new OpenWAError(error.message || `HTTP ${response.status}`, response.status, error.code);
}
async function akgRequest(endpoint, options = {}) {
	const headers = {
		...openWAAuthHeaders(!(options.body instanceof FormData)),
		...options.headers
	};
	const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, {
		...options,
		headers
	});
	if (!response.ok) await handleError$1(response);
	if (response.status === 204) return void 0;
	return response.json();
}
function getAkgFeatures() {
	return akgRequest("/features");
}
function listScheduledMessages(sessionId) {
	return akgRequest(`/sessions/${sessionId}/scheduled-messages`);
}
function createScheduledMessage(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/scheduled-messages`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function updateScheduledMessage(sessionId, jobId, body) {
	return akgRequest(`/sessions/${sessionId}/scheduled-messages/${jobId}`, {
		method: "PATCH",
		body: JSON.stringify(body)
	});
}
function cancelScheduledMessage(sessionId, jobId) {
	return akgRequest(`/sessions/${sessionId}/scheduled-messages/${jobId}`, { method: "DELETE" });
}
function listAutomationRules(sessionId) {
	return akgRequest(`/sessions/${sessionId}/automation-rules`);
}
function createAutomationRule(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/automation-rules`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function updateAutomationRule(sessionId, ruleId, body) {
	return akgRequest(`/sessions/${sessionId}/automation-rules/${ruleId}`, {
		method: "PUT",
		body: JSON.stringify(body)
	});
}
function deleteAutomationRule(sessionId, ruleId) {
	return akgRequest(`/sessions/${sessionId}/automation-rules/${ruleId}`, { method: "DELETE" });
}
function getBotConfig(sessionId) {
	return akgRequest(`/sessions/${sessionId}/bot-config`);
}
function putBotConfig(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/bot-config`, {
		method: "PUT",
		body: JSON.stringify(body)
	});
}
function sendPollAkg(sessionId, data) {
	return akgRequest(`/sessions/${sessionId}/messages/send-poll`, {
		method: "POST",
		body: JSON.stringify(data)
	});
}
function sendStickerAkg(sessionId, chatId, payload) {
	return akgRequest(`/sessions/${sessionId}/messages/send-sticker`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			...payload
		})
	});
}
function sendTextList(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/messages/send-text-list`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
async function forwardMany(sessionId, body) {
	const response = await fetch(`${getOpenWAApiBase()}/sessions/${sessionId}/messages/forward`, {
		method: "POST",
		headers: openWAAuthHeaders(true),
		body: JSON.stringify(body)
	});
	const json = await response.json().catch(() => ({}));
	if (!response.ok && response.status !== 207 && response.status !== 502) throw new OpenWAError(json.message || `HTTP ${response.status}`, response.status, json.code);
	return {
		status: response.status,
		results: json.results ?? []
	};
}
function reactToMessage(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/messages/react`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function editMessage(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/messages/edit`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function deleteMessage(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/messages/delete`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function starMessage(sessionId, body) {
	return akgRequest(`/sessions/${sessionId}/messages/star`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function archiveChat(sessionId, chatId, archive) {
	return akgRequest(`/sessions/${sessionId}/chats/archive`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			archive
		})
	});
}
function muteChat(sessionId, chatId, durationSec) {
	return akgRequest(`/sessions/${sessionId}/chats/mute`, {
		method: "POST",
		body: JSON.stringify(durationSec === null ? {
			chatId,
			muteUntil: null
		} : {
			chatId,
			durationSec
		})
	});
}
function pinChat(sessionId, chatId, pin) {
	return akgRequest(`/sessions/${sessionId}/chats/pin`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			pin
		})
	});
}
function checkNumbers(sessionId, numbers) {
	return akgRequest(`/sessions/${sessionId}/contacts/check`, {
		method: "POST",
		body: JSON.stringify({ numbers })
	});
}
function blockContact(sessionId, contactId) {
	return akgRequest(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}/block`, { method: "POST" });
}
function unblockContact(sessionId, contactId) {
	return akgRequest(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}/block`, { method: "DELETE" });
}
function listLabels(sessionId) {
	return akgRequest(`/sessions/${sessionId}/labels`);
}
function addLabelToChat(sessionId, chatId, labelId) {
	return akgRequest(`/sessions/${sessionId}/labels/chat/${encodeURIComponent(chatId)}`, {
		method: "POST",
		body: JSON.stringify({ labelId })
	});
}
function getOwnProfile(sessionId) {
	return akgRequest(`/sessions/${sessionId}/profile`);
}
function setProfileName(sessionId, name) {
	return akgRequest(`/sessions/${sessionId}/profile/name`, {
		method: "PUT",
		body: JSON.stringify({ name })
	});
}
function setProfileStatus(sessionId, status) {
	return akgRequest(`/sessions/${sessionId}/profile/status`, {
		method: "PUT",
		body: JSON.stringify({ status })
	});
}
function listGroupInvite(sessionId, groupId) {
	return akgRequest(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/invite-code`);
}
function setGroupSubject(sessionId, groupId, subject) {
	return akgRequest(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/subject`, {
		method: "PUT",
		body: JSON.stringify({ subject })
	});
}
function leaveGroup(sessionId, groupId) {
	return akgRequest(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/leave`, { method: "POST" });
}
function listWebhookDeliveries(sessionId, webhookId) {
	return akgRequest(`/sessions/${sessionId}/webhooks/${webhookId}/deliveries`);
}
async function convertSticker(sessionId, file, opts) {
	if (file.size > 18874368) throw new OpenWAError("File exceeds the media size cap.", 413);
	const media = await fileToBase64(file);
	return akgRequest(`/sessions/${sessionId}/media/convert/sticker`, {
		method: "POST",
		body: JSON.stringify({
			base64: media.base64,
			packName: opts.packName,
			author: opts.author,
			removeBg: opts.removeBg
		})
	});
}
function listStoredMedia(sessionId) {
	return akgRequest(`/sessions/${sessionId}/media/files`);
}
function deleteStoredMedia(sessionId, messageId) {
	return akgRequest(`/sessions/${sessionId}/media/files/${encodeURIComponent(messageId)}`, { method: "DELETE" });
}
function storedMediaUrl(sessionId, messageId) {
	return `${getOpenWAApiBase()}/sessions/${sessionId}/media/files/${encodeURIComponent(messageId)}`;
}
var AKG_WEBHOOK_EVENTS = [
	"scheduled.message.sent",
	"scheduled.message.failed",
	"message.poll_vote"
];
/**
* Typed OpenWA REST client. Auth uses X-API-Key (OpenWA) and apikey (compat).
* Base URL: VITE_OPENWA_URL or localStorage, default http://localhost:2785
*/
var OpenWAError = class extends Error {
	status;
	code;
	constructor(message, status, code) {
		super(message);
		this.name = "OpenWAError";
		this.status = status;
		this.code = code;
	}
};
var CHAT_KINDS = [
	"individual",
	"group",
	"channel",
	"status",
	"broadcast",
	"unknown"
];
var MESSAGE_TYPES = [
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
	"unknown"
];
async function handleError(response) {
	const error = await response.json().catch(() => ({}));
	throw new OpenWAError(error.message || `HTTP ${response.status}`, response.status, error.code);
}
async function request(endpoint, options = {}) {
	const isFormData = options.body instanceof FormData;
	const headers = {
		...openWAAuthHeaders(!isFormData),
		...options.headers
	};
	if (isFormData) delete headers["Content-Type"];
	const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, {
		...options,
		headers
	});
	if (!response.ok) await handleError(response);
	if (response.status === 204) return void 0;
	return response.json();
}
async function requestBlob(endpoint) {
	const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { headers: openWAAuthHeaders(false) });
	if (!response.ok) await handleError(response);
	return response.blob();
}
async function requestText(endpoint) {
	const response = await fetch(`${getOpenWAApiBase()}${endpoint}`, { headers: openWAAuthHeaders(false) });
	if (!response.ok) await handleError(response);
	return response.text();
}
async function validateApiKey(apiKey, url) {
	const origin = (url ?? getOpenWAApiBase().replace(/\/api$/, "")).replace(/\/+$/, "");
	const response = await fetch(`${origin}/api/auth/validate`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": apiKey
		}
	});
	if (!response.ok) throw new OpenWAError((await response.json().catch(() => ({}))).message || "Invalid API key", response.status);
	return response.json();
}
function listSessions$1() {
	return request("/sessions");
}
function createSession(name, options) {
	return request("/sessions", {
		method: "POST",
		body: JSON.stringify({
			name,
			...options?.proxyUrl ? { proxyUrl: options.proxyUrl } : {}
		})
	});
}
function connectSession$1(id) {
	return request(`/sessions/${id}/start`, { method: "POST" });
}
function disconnectSession$1(id) {
	return request(`/sessions/${id}/stop`, { method: "POST" });
}
function deleteSession$1(id) {
	return request(`/sessions/${id}`, { method: "DELETE" });
}
function logoutSession(id) {
	return request(`/sessions/${id}/logout`, { method: "POST" });
}
function getSessionQr(id) {
	return request(`/sessions/${id}/qr`);
}
function requestPairingCode$1(id, phoneNumber) {
	return request(`/sessions/${id}/pairing-code`, {
		method: "POST",
		body: JSON.stringify({ phoneNumber })
	});
}
function updateSessionProxy(id, proxyUrl) {
	return request(`/sessions/${id}/proxy`, {
		method: "PATCH",
		body: JSON.stringify({ proxyUrl })
	});
}
function getSessionProxy(id) {
	return request(`/sessions/${id}/proxy`);
}
function getSessionConfig(id) {
	return request(`/sessions/${id}/config`);
}
function updateSessionConfig$1(id, patch) {
	return request(`/sessions/${id}/config`, {
		method: "PATCH",
		body: JSON.stringify(patch)
	});
}
function forceKillSession(id) {
	return request(`/sessions/${id}/force-kill`, { method: "POST" });
}
function getSessionStats() {
	return request("/sessions/stats/overview");
}
function sendText$1(sessionId, chatId, text) {
	return request(`/sessions/${sessionId}/messages/send-text`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			text
		})
	});
}
async function fileToBase64(file) {
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return {
		base64: btoa(binary),
		mimetype: file.type || "application/octet-stream",
		filename: file.name
	};
}
async function sendImage(sessionId, chatId, image, caption) {
	const media = await fileToBase64(image);
	return request(`/sessions/${sessionId}/messages/send-image`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			caption,
			...media
		})
	});
}
async function sendDocument(sessionId, chatId, file, caption) {
	const media = await fileToBase64(file);
	return request(`/sessions/${sessionId}/messages/send-document`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			caption,
			...media
		})
	});
}
async function sendMedia(sessionId, chatId, file, caption, asDocument = false) {
	const mime = file.type.toLowerCase();
	if (asDocument) return sendDocument(sessionId, chatId, file, caption);
	if (mime.startsWith("image/") && mime !== "image/webp") return sendImage(sessionId, chatId, file, caption);
	if (mime.startsWith("video/")) {
		const media = await fileToBase64(file);
		return request(`/sessions/${sessionId}/messages/send-video`, {
			method: "POST",
			body: JSON.stringify({
				chatId,
				caption,
				...media
			})
		});
	}
	if (mime.startsWith("audio/")) {
		const media = await fileToBase64(file);
		return request(`/sessions/${sessionId}/messages/send-audio`, {
			method: "POST",
			body: JSON.stringify({
				chatId,
				caption,
				...media
			})
		});
	}
	return sendDocument(sessionId, chatId, file, caption);
}
function sendTypedMedia(sessionId, chatId, mediaType, payload) {
	return request(`/sessions/${sessionId}/messages/send-${mediaType}`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			...payload
		})
	});
}
function sendLocation(sessionId, data) {
	return request(`/sessions/${sessionId}/messages/send-location`, {
		method: "POST",
		body: JSON.stringify(data)
	});
}
function sendContact(sessionId, data) {
	return request(`/sessions/${sessionId}/messages/send-contact`, {
		method: "POST",
		body: JSON.stringify(data)
	});
}
function sendSticker(sessionId, chatId, payload) {
	return request(`/sessions/${sessionId}/messages/send-sticker`, {
		method: "POST",
		body: JSON.stringify({
			chatId,
			...payload
		})
	});
}
function sendPoll(sessionId, data) {
	return request(`/sessions/${sessionId}/messages/send-poll`, {
		method: "POST",
		body: JSON.stringify(data)
	});
}
function forwardMessage(sessionId, data) {
	return request(`/sessions/${sessionId}/messages/forward`, {
		method: "POST",
		body: JSON.stringify(data)
	});
}
function sendBulk(sessionId, dto) {
	return request(`/sessions/${sessionId}/messages/send-bulk`, {
		method: "POST",
		body: JSON.stringify(dto)
	});
}
function getBatchStatus(sessionId, batchId) {
	return request(`/sessions/${sessionId}/messages/batch/${encodeURIComponent(batchId)}`);
}
function cancelBatch(sessionId, batchId) {
	return request(`/sessions/${sessionId}/messages/batch/${encodeURIComponent(batchId)}/cancel`, { method: "POST" });
}
function getChatMessages(sessionId, chatId, limit = 40, offset = 0) {
	return request(`/sessions/${sessionId}/messages?${new URLSearchParams({
		chatId,
		limit: String(limit),
		offset: String(offset)
	})}`);
}
function getChatHistory(sessionId, chatId, limit = 100, includeMedia = false) {
	const q = new URLSearchParams({ limit: String(limit) });
	if (includeMedia) q.set("includeMedia", "true");
	return request(`/sessions/${sessionId}/messages/${encodeURIComponent(chatId)}/history?${q}`);
}
function getMessageMediaBlob(sessionId, chatId, messageId) {
	return requestBlob(`/sessions/${sessionId}/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}/media`);
}
function listChats$1(sessionId) {
	return request(`/sessions/${sessionId}/chats`);
}
function markChatRead$1(sessionId, chatId) {
	return request(`/sessions/${sessionId}/chats/read`, {
		method: "POST",
		body: JSON.stringify({ chatId })
	});
}
function listContacts(sessionId) {
	return request(`/sessions/${sessionId}/contacts`);
}
function checkNumber(sessionId, number) {
	return request(`/sessions/${sessionId}/contacts/check/${encodeURIComponent(number)}`);
}
function getProfilePicture(sessionId, contactId) {
	return request(`/sessions/${sessionId}/contacts/${encodeURIComponent(contactId)}/profile-picture`);
}
function getProfilePictures(sessionId, contactIds) {
	return request(`/sessions/${sessionId}/contacts/profile-pictures?ids=${contactIds.slice(0, 50).map(encodeURIComponent).join(",")}`);
}
function listGroups$1(sessionId) {
	return request(`/sessions/${sessionId}/groups`);
}
function addGroupParticipants(sessionId, groupId, participants) {
	return request(`/sessions/${sessionId}/groups/${encodeURIComponent(groupId)}/participants`, {
		method: "POST",
		body: JSON.stringify({ participants })
	});
}
function listWebhooks() {
	return request("/webhooks");
}
function listWebhooksBySession(sessionId) {
	return request(`/sessions/${sessionId}/webhooks`);
}
function createWebhook(dto) {
	return request(`/sessions/${dto.sessionId}/webhooks`, {
		method: "POST",
		body: JSON.stringify({
			url: dto.url,
			events: dto.events,
			filters: dto.filters
		})
	});
}
function updateWebhook(id, dto) {
	return request(`/sessions/${dto.sessionId}/webhooks/${id}`, {
		method: "PUT",
		body: JSON.stringify(dto)
	});
}
function deleteWebhook(id, sessionId) {
	return request(`/sessions/${sessionId}/webhooks/${id}`, { method: "DELETE" });
}
function testWebhook(sessionId, id) {
	return request(`/sessions/${sessionId}/webhooks/${id}/test`, { method: "POST" });
}
function listTemplates(sessionId) {
	return request(`/sessions/${sessionId}/templates`);
}
function createTemplate(sessionId, dto) {
	return request(`/sessions/${sessionId}/templates`, {
		method: "POST",
		body: JSON.stringify(dto)
	});
}
function deleteTemplate(sessionId, id) {
	return request(`/sessions/${sessionId}/templates/${id}`, { method: "DELETE" });
}
function updateTemplate(sessionId, id, dto) {
	return request(`/sessions/${sessionId}/templates/${id}`, {
		method: "PUT",
		body: JSON.stringify(dto)
	});
}
function listApiKeys() {
	return request("/auth/api-keys");
}
function createApiKey(dto) {
	return request("/auth/api-keys", {
		method: "POST",
		body: JSON.stringify(dto)
	});
}
function deleteApiKey(id) {
	return request(`/auth/api-keys/${id}`, { method: "DELETE" });
}
function revokeApiKey(id) {
	return request(`/auth/api-keys/${id}/revoke`, { method: "POST" });
}
function updateApiKey(id, data) {
	return request(`/auth/api-keys/${id}`, {
		method: "PUT",
		body: JSON.stringify(data)
	});
}
function listAuditLogs(params) {
	const query = new URLSearchParams();
	if (params?.action) query.set("action", params.action);
	if (params?.severity) query.set("severity", params.severity);
	if (params?.limit) query.set("limit", String(params.limit));
	if (params?.offset) query.set("offset", String(params.offset));
	const qs = query.toString();
	return request(`/audit${qs ? `?${qs}` : ""}`);
}
function getInfraStatus() {
	return request("/infra/status");
}
function getInfraConfig() {
	return request("/infra/config");
}
function saveInfraConfig(config) {
	return request("/infra/config", {
		method: "PUT",
		body: JSON.stringify(config)
	});
}
function restartInfra(profiles, profilesToRemove) {
	return request("/infra/restart", {
		method: "POST",
		body: JSON.stringify({
			profiles: profiles || [],
			profilesToRemove: profilesToRemove || []
		})
	});
}
function getReadyHealth() {
	return request("/health/ready");
}
function exportInfraData() {
	return request("/infra/export-data");
}
function importInfraData(tables, options) {
	return request("/infra/import-data", {
		method: "POST",
		body: JSON.stringify({
			tables,
			...options
		})
	});
}
function listEngines() {
	return request("/infra/engines");
}
function getCurrentEngine() {
	return request("/infra/engines/current");
}
function getStatsOverview() {
	return request("/stats/overview");
}
function getMessageStats(period) {
	return request(`/stats/messages?period=${period}`);
}
function listPlugins() {
	return request("/plugins");
}
function enablePlugin(id) {
	return request(`/plugins/${id}/enable`, { method: "POST" });
}
function disablePlugin(id) {
	return request(`/plugins/${id}/disable`, { method: "POST" });
}
function installPluginFromUrl(url) {
	return request("/plugins/install-url", {
		method: "POST",
		body: JSON.stringify({ url })
	});
}
function uninstallPlugin(id) {
	return request(`/plugins/${id}`, { method: "DELETE" });
}
function updatePluginConfig(id, config) {
	return request(`/plugins/${id}/config`, {
		method: "PUT",
		body: JSON.stringify({ config })
	});
}
function setPluginSessions(id, sessions) {
	return request(`/plugins/${id}/sessions`, {
		method: "PUT",
		body: JSON.stringify({ sessions })
	});
}
function updatePluginSessionConfig(id, sessionId, config) {
	return request(`/plugins/${id}/config/${encodeURIComponent(sessionId)}`, {
		method: "PUT",
		body: JSON.stringify({ config })
	});
}
function pluginHealthCheck(id) {
	return request(`/plugins/${id}/health`);
}
function installPlugin(file) {
	const form = new FormData();
	form.append("file", file);
	return request("/plugins/install", {
		method: "POST",
		body: form
	});
}
function listPluginCatalog() {
	return request("/plugins/catalog");
}
function getPluginConfigUi(id) {
	return requestText(`/plugins/${id}/config-ui`);
}
function listPluginInstances(pluginId) {
	return request(`/integration/plugins/${pluginId}/instances`);
}
function createPluginInstance(pluginId, body) {
	return request(`/integration/plugins/${pluginId}/instances`, {
		method: "POST",
		body: JSON.stringify(body)
	});
}
function regenerateInstanceSecret(pluginId, instanceId) {
	return request(`/integration/plugins/${pluginId}/instances/${instanceId}/regenerate-secret`, { method: "POST" });
}
function updatePluginInstance(pluginId, instanceId, body) {
	return request(`/integration/plugins/${pluginId}/instances/${instanceId}`, {
		method: "PATCH",
		body: JSON.stringify(body)
	});
}
function deletePluginInstance(pluginId, instanceId) {
	return request(`/integration/plugins/${pluginId}/instances/${instanceId}`, { method: "DELETE" });
}
function sendRaw(method, path, bodyText) {
	const options = {
		method,
		headers: openWAAuthHeaders(true)
	};
	if (method !== "GET" && method !== "DELETE" && bodyText) options.body = bodyText;
	const url = path.startsWith("http") ? path : `${getOpenWAApiBase()}${path.startsWith("/api") ? path.slice(4) : path}`;
	return fetch(url, options).then(async (response) => {
		const text = await response.text();
		try {
			return JSON.parse(text);
		} catch {
			return {
				status: response.status,
				body: text
			};
		}
	});
}
/**
* Compatibility layer: existing gateway UI types + helpers, implemented on OpenWA.
*/
var API_ENDPOINTS = [
	{
		group: "Sessions",
		value: "GET|/api/sessions",
		label: "GET /sessions"
	},
	{
		group: "Sessions",
		value: "POST|/api/sessions",
		label: "POST /sessions"
	},
	{
		group: "Sessions",
		value: "POST|/api/sessions/{id}/start",
		label: "POST /sessions/:id/start"
	},
	{
		group: "Sessions",
		value: "POST|/api/sessions/{id}/stop",
		label: "POST /sessions/:id/stop"
	},
	{
		group: "Sessions",
		value: "GET|/api/sessions/{id}/qr",
		label: "GET /sessions/:id/qr"
	},
	{
		group: "Messaging",
		value: "POST|/api/sessions/{id}/messages/send-text",
		label: "POST /sessions/:id/messages/send-text"
	},
	{
		group: "Messaging",
		value: "POST|/api/sessions/{id}/messages/send-bulk",
		label: "POST /sessions/:id/messages/send-bulk"
	},
	{
		group: "History",
		value: "GET|/api/sessions/{id}/chats",
		label: "GET /sessions/:id/chats"
	},
	{
		group: "History",
		value: "GET|/api/sessions/{id}/messages",
		label: "GET /sessions/:id/messages"
	}
];
function sampleBodyFor(path, method) {
	if (method === "GET") return {
		body: null,
		help: "GET request — no body required."
	};
	if (path.includes("/send-text")) return {
		body: {
			chatId: "628123456789@c.us",
			text: "Hello from OpenWA"
		},
		help: "chatId: WhatsApp JID."
	};
	if (path.includes("/send-bulk")) return {
		body: {
			messages: [{
				chatId: "628123456789@c.us",
				type: "text",
				content: { text: "Hello" }
			}],
			options: {
				delayBetweenMessages: 3e3,
				randomizeDelay: true
			}
		},
		help: "Async batch — poll GET /messages/batch/:batchId."
	};
	if (path.includes("/sessions") && method === "POST" && !path.includes("/start")) return {
		body: { name: "my-bot" },
		help: "Alphanumeric and hyphens only."
	};
	return {
		body: {},
		help: "See OpenWA API docs."
	};
}
function mapSessionStatus(status) {
	if (status === "ready") return "connected";
	if (status === "qr_ready") return "qr_ready";
	if (status === "initializing" || status === "authenticating" || status === "created") return "connecting";
	if (status === "logged_out") return "logged_out";
	return "disconnected";
}
function toGatewaySession(s) {
	return {
		sessionId: s.id,
		name: s.name,
		phoneNumber: s.phone ?? void 0,
		status: mapSessionStatus(s.status)
	};
}
function ok(data, message) {
	return {
		success: true,
		message,
		data
	};
}
function fail(message) {
	return {
		success: false,
		message,
		data: void 0
	};
}
async function listSessions() {
	try {
		return ok((await listSessions$1()).map(toGatewaySession));
	} catch (err) {
		if (err instanceof OpenWAError && err.status === 401) throw err;
		return fail(err instanceof Error ? err.message : "Could not list sessions");
	}
}
async function disconnectSession(sessionId) {
	try {
		return ok(toGatewaySession(await disconnectSession$1(sessionId)), "Session stopped");
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not stop session");
	}
}
async function connectSession(sessionId, body = {}) {
	try {
		const payload = body ?? {};
		let id = sessionId;
		const found = (await listSessions$1().catch(() => [])).find((s) => s.id === sessionId || s.name === sessionId);
		if (!found) id = (await createSession(payload.name || sessionId, { proxyUrl: payload.proxy })).id;
		else id = found.id;
		return ok(toGatewaySession(await connectSession$1(id)), "Session starting");
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not start session");
	}
}
async function deleteSession(sessionId) {
	try {
		await deleteSession$1(sessionId);
		return ok(void 0, "Deleted");
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not delete session");
	}
}
function asDataUrl(qrCode) {
	if (!qrCode) return "";
	if (qrCode.startsWith("data:")) return qrCode;
	if (qrCode.startsWith("http")) return qrCode;
	return `data:image/png;base64,${qrCode}`;
}
async function getQr(sessionId) {
	try {
		const data = await getSessionQr(sessionId);
		return ok({
			qrCode: asDataUrl(data.qrCode),
			qrExpiresAt: data.qrExpiresAt ?? null,
			pairingCode: null,
			pairingPhone: null,
			pairingExpiresAt: null
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "QR unavailable");
	}
}
async function requestPairingCode(sessionId, phoneNumber) {
	try {
		return ok({
			pairingCode: (await requestPairingCode$1(sessionId, phoneNumber)).pairingCode,
			pairingPhone: phoneNumber,
			pairingExpiresAt: null
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not get pairing code");
	}
}
async function sendText(payload) {
	try {
		const data = await sendText$1(payload.sessionId, payload.chatId, payload.message);
		return ok({
			messageId: data.messageId,
			chatId: payload.chatId,
			timestamp: String(data.timestamp ?? Date.now())
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Send failed");
	}
}
var mediaCache = /* @__PURE__ */ new Map();
var bulkIndex = /* @__PURE__ */ new Map();
var bulkMeta = /* @__PURE__ */ new Map();
function rememberBatch(sessionId, batchId) {
	const list = bulkIndex.get(sessionId) ?? [];
	if (!list.includes(batchId)) list.unshift(batchId);
	bulkIndex.set(sessionId, list.slice(0, 40));
}
function mapBatchStatus(status) {
	if (status === "processing" || status === "pending") return "processing";
	if (status === "cancelled") return "cancelled";
	if (status === "failed") return "interrupted";
	return "completed";
}
function toSummary(sessionId, batch) {
	const meta = bulkMeta.get(batch.batchId);
	const total = batch.progress.total || 0;
	const sent = batch.progress.sent || 0;
	return {
		jobId: batch.batchId,
		sessionId,
		sessionIds: [sessionId],
		rotation: "single",
		perSession: { [sessionId]: {
			name: null,
			phoneNumber: null,
			sent,
			failed: batch.progress.failed
		} },
		type: meta?.type ?? "text",
		name: meta?.name ?? null,
		status: mapBatchStatus(batch.status),
		total,
		sent,
		failed: batch.progress.failed,
		skipped: batch.progress.cancelled,
		progress: total ? Math.round((sent + batch.progress.failed) / total * 100) : 0,
		cancelRequested: batch.status === "cancelled",
		payload: meta?.payload ?? { message: "" },
		options: meta?.options ?? {
			delayBetweenMessages: 3e3,
			delayJitter: 0,
			typingTime: 0
		},
		createdAt: batch.startedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
		startedAt: batch.startedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
		completedAt: batch.completedAt ?? null,
		error: null
	};
}
function recipientJid(raw) {
	if (raw.includes("@")) return raw;
	return `${raw.replace(/\D/g, "")}@c.us`;
}
async function startBulkJob(input) {
	const sessionId = input.sessionIds[0];
	if (!sessionId) return fail("No session selected");
	const delay = input.options?.delayBetweenMessages ?? 3e3;
	const messages = input.recipients.map((recipient) => {
		const chatId = recipientJid(recipient);
		if (input.type === "image") {
			const p = input.payload;
			const cached = p.imageUrl.startsWith("openwa-media:") ? mediaCache.get(p.imageUrl) : void 0;
			return {
				chatId,
				type: "image",
				content: {
					caption: p.caption,
					image: cached ? {
						base64: cached.base64,
						mimetype: cached.mimetype,
						filename: cached.filename
					} : { url: p.imageUrl }
				}
			};
		}
		if (input.type === "document") {
			const p = input.payload;
			const cached = p.documentUrl.startsWith("openwa-media:") ? mediaCache.get(p.documentUrl) : void 0;
			return {
				chatId,
				type: "document",
				content: {
					caption: p.caption,
					document: cached ? {
						base64: cached.base64,
						mimetype: cached.mimetype,
						filename: cached.filename
					} : {
						url: p.documentUrl,
						filename: p.filename,
						mimetype: p.mimetype
					}
				}
			};
		}
		return {
			chatId,
			type: "text",
			content: { text: input.payload.message }
		};
	});
	try {
		const result = await sendBulk(sessionId, {
			messages,
			options: {
				delayBetweenMessages: delay,
				randomizeDelay: (input.options?.delayJitter ?? 0) > 0
			}
		});
		rememberBatch(sessionId, result.batchId);
		bulkMeta.set(result.batchId, {
			type: input.type,
			payload: input.payload,
			options: {
				delayBetweenMessages: delay,
				delayJitter: input.options?.delayJitter ?? 0,
				typingTime: 0
			},
			name: input.name ?? null
		});
		return ok({
			jobId: result.batchId,
			total: result.totalMessages,
			sessionIds: [sessionId],
			rotation: "single",
			skippedSessions: [],
			statusUrl: result.statusUrl
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not start campaign");
	}
}
async function getBulkJob(jobId) {
	for (const [sessionId, ids] of bulkIndex) {
		if (!ids.includes(jobId)) continue;
		try {
			const batch = await getBatchStatus(sessionId, jobId);
			return ok({
				...toSummary(sessionId, batch),
				recipients: batch.results.map((r) => r.chatId),
				details: batch.results.map((r) => ({
					recipient: r.chatId,
					status: r.status === "failed" ? "failed" : r.status === "cancelled" ? "skipped" : "sent",
					messageId: r.messageId,
					error: r.error?.message,
					timestamp: r.sentAt ?? ""
				}))
			});
		} catch (err) {
			return fail(err instanceof Error ? err.message : "Batch not found");
		}
	}
	return fail("Unknown campaign");
}
async function listBulkJobs(sessionId) {
	const ids = bulkIndex.get(sessionId) ?? [];
	const jobs = [];
	for (const id of ids) try {
		jobs.push(toSummary(sessionId, await getBatchStatus(sessionId, id)));
	} catch {}
	return ok(jobs);
}
async function cancelBulkJob(jobId) {
	for (const [sessionId, ids] of bulkIndex) {
		if (!ids.includes(jobId)) continue;
		try {
			return ok(toSummary(sessionId, await cancelBatch(sessionId, jobId)));
		} catch (err) {
			return fail(err instanceof Error ? err.message : "Could not cancel");
		}
	}
	return fail("Unknown campaign");
}
async function retryBulkJob(_sessionId, _jobId) {
	return fail("OpenWA has no retry-batch route — start a new campaign for the failed recipients.");
}
async function updateSessionConfig(sessionId, patch) {
	try {
		if (patch.proxy !== void 0) return ok({
			sessionId,
			proxy: (await updateSessionProxy(sessionId, patch.proxy)).proxyHost,
			proxyApplied: true,
			webhooks: []
		});
		return ok({
			sessionId,
			proxy: null,
			proxyApplied: false,
			webhooks: []
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not save proxy");
	}
}
async function testProxy(_body) {
	return ok({
		ok: false,
		ip: void 0,
		latencyMs: void 0,
		error: "Proxy test is not exposed by OpenWA — save the proxy on the session instead.",
		proxy: null
	});
}
async function addWebhook(sessionId, url, events) {
	try {
		const hook = await createWebhook({
			sessionId,
			url,
			events: events?.length ? events : ["*"]
		});
		return ok({ webhooks: [{
			url: hook.url,
			events: hook.events
		}] });
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not add webhook");
	}
}
async function removeWebhook(sessionId, url) {
	try {
		const hooks = await listWebhooksBySession(sessionId);
		const match = hooks.find((h) => h.url === url);
		if (match) await deleteWebhook(match.id, sessionId);
		return ok({ webhooks: hooks.filter((h) => h.url !== url).map((h) => ({
			url: h.url,
			events: h.events
		})) });
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not remove webhook");
	}
}
async function loadWsStats() {
	return ok({ totalConnections: 1 });
}
async function sendRawApi(method, path, bodyText) {
	return sendRaw(method, path, bodyText);
}
function toGatewayChat(c) {
	return {
		id: c.id,
		name: c.name,
		phone: c.isGroup ? null : c.id.split("@")[0] ?? null,
		isGroup: c.isGroup,
		profilePicture: null,
		lastMessage: c.lastMessage ?? null,
		lastMessageTimestamp: c.timestamp,
		unreadCount: c.unreadCount
	};
}
function toGatewayMessage(m) {
	const media = m.metadata?.media;
	return {
		id: m.waMessageId ?? m.id,
		chatId: m.chatId,
		fromMe: m.direction === "outgoing",
		sender: m.from,
		senderPhone: m.from?.includes("@") ? m.from.split("@")[0] : m.from,
		timestamp: m.timestamp ?? Date.parse(m.createdAt) / 1e3,
		type: m.type === "voice" ? "ptt" : m.type,
		content: m.body || null,
		caption: m.type !== "text" ? m.body || null : null,
		mimetype: media?.mimetype ?? null,
		filename: media?.filename ?? null,
		mediaUrl: media?.data ? `data:${media.mimetype};base64,${media.data}` : null,
		senderName: m.chatName ?? m.author ?? null,
		isGroup: m.kind === "group" || m.chatId.includes("@g.us")
	};
}
var HISTORY_MEDIA_TYPES = /* @__PURE__ */ new Set([
	"image",
	"video",
	"audio",
	"voice",
	"sticker",
	"document"
]);
function mapHistoryToOpenWA(h) {
	const media = h.media ? h.media : HISTORY_MEDIA_TYPES.has(h.type) ? {
		mimetype: "",
		omitted: true
	} : void 0;
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
		createdAt: (/* @__PURE__ */ new Date((h.timestamp ?? 0) * 1e3)).toISOString(),
		metadata: media ? { media } : void 0
	};
}
function messageKey(m) {
	return m.waMessageId ?? m.id;
}
function messageTime(m) {
	if (typeof m.timestamp === "number" && Number.isFinite(m.timestamp)) return m.timestamp;
	return Math.floor(Date.parse(m.createdAt) / 1e3) || 0;
}
/** DB rows win on conflict; engine history backfills a thread the gateway never captured. Oldest first. */
function mergeChatMessages(db, history) {
	const byId = /* @__PURE__ */ new Map();
	for (const m of history) byId.set(messageKey(m), m);
	for (const m of db) {
		const key = messageKey(m);
		const hist = byId.get(key);
		byId.set(key, hist?.author && !m.author ? {
			...m,
			author: hist.author
		} : m);
	}
	return [...byId.values()].sort((a, b) => messageTime(a) - messageTime(b) || a.createdAt.localeCompare(b.createdAt));
}
async function listChats(sessionId, _limit = 50, _offset = 0) {
	try {
		const mapped = (await listChats$1(sessionId)).map(toGatewayChat);
		return ok({
			total: mapped.length,
			hasMore: false,
			chats: mapped
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not load chats");
	}
}
async function listMessages(sessionId, chatId, limit = 40, cursor = null) {
	try {
		const offset = cursor ? Number(cursor) || 0 : 0;
		const wantsHistory = offset === 0;
		const [dbRes, historyRes] = await Promise.allSettled([getChatMessages(sessionId, chatId, limit, offset), wantsHistory ? getChatHistory(sessionId, chatId, 100, false) : Promise.resolve([])]);
		if (dbRes.status === "rejected" && (!wantsHistory || historyRes.status === "rejected")) throw dbRes.reason;
		const db = dbRes.status === "fulfilled" ? dbRes.value : {
			messages: [],
			total: 0
		};
		const history = historyRes.status === "fulfilled" && Array.isArray(historyRes.value) ? historyRes.value.map(mapHistoryToOpenWA) : [];
		const newestFirst = mergeChatMessages(db.messages, wantsHistory ? history : []).slice().reverse();
		const next = offset + db.messages.length;
		const total = db.total || next;
		return ok({
			chatId,
			messages: newestFirst.map(toGatewayMessage),
			cursor: next < total ? String(next) : null,
			hasMore: next < total
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not load messages");
	}
}
async function scrapeContacts(sessionIds, opts = {}) {
	const contacts = [];
	const accounts = [];
	for (const sessionId of sessionIds) try {
		const rows = await listContacts(sessionId);
		accounts.push({
			sessionId,
			total: rows.length
		});
		for (const c of rows) contacts.push({
			phone: c.number,
			jid: c.id,
			name: c.name || c.pushName || null,
			sessionId,
			sources: [sessionId]
		});
	} catch (err) {
		accounts.push({
			sessionId,
			error: err instanceof Error ? err.message : "failed"
		});
	}
	let out = contacts;
	if (opts.dedupe ?? true) {
		const seen = /* @__PURE__ */ new Set();
		out = contacts.filter((c) => {
			if (seen.has(c.phone)) return false;
			seen.add(c.phone);
			return true;
		});
	}
	return ok({
		total: out.length,
		contacts: out,
		accounts,
		deduped: opts.dedupe ?? true
	});
}
async function listGroups(sessionId) {
	try {
		const groups = (await listGroups$1(sessionId)).map((g) => ({
			id: g.id,
			name: g.name,
			sessionId
		}));
		return ok({
			groups,
			totalGroups: groups.length
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not list groups");
	}
}
async function scrapeGroups(sessionIds, _groupIds, opts = {}) {
	const contacts = [];
	const groups = [];
	const accounts = [];
	for (const sessionId of sessionIds) try {
		const rows = await listGroups$1(sessionId);
		accounts.push({
			sessionId,
			groups: rows.length
		});
		for (const g of rows) groups.push({
			id: g.id,
			name: g.name,
			sessionId
		});
	} catch (err) {
		accounts.push({
			sessionId,
			error: err instanceof Error ? err.message : "failed"
		});
	}
	return ok({
		total: contacts.length,
		contacts,
		groups,
		accounts,
		deduped: opts.dedupe ?? true
	});
}
async function addContactsToGroup(input) {
	try {
		const participants = input.phones.map(recipientJid);
		await addGroupParticipants(input.sessionId, input.groupId, participants);
		return ok({
			groupId: input.groupId,
			added: participants.length,
			failed: 0,
			results: input.phones.map((phone) => ({
				phone,
				success: true,
				message: void 0
			}))
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not add to group");
	}
}
function downloadContactsCsv(rows, filename) {
	const header = [
		"phone",
		"name",
		"jid",
		"groups",
		"sources"
	];
	const escape = (v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, "\"\"")}"` : v;
	const lines = [header.join(",")];
	for (const r of rows) lines.push([
		r.phone ?? "",
		r.name ?? "",
		r.jid ?? "",
		(r.groups ?? (r.groupName ? [r.groupName] : [])).join(" | "),
		(r.sources ?? (r.sessionId ? [r.sessionId] : [])).join(" | ")
	].map((v) => escape(String(v))).join(","));
	const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
async function uploadMedia(_sessionId, file) {
	const media = await fileToBase64(file);
	const url = `openwa-media:${crypto.randomUUID()}`;
	mediaCache.set(url, media);
	return ok({
		url,
		filename: file.name,
		mimetype: file.type,
		size: file.size
	});
}
async function sendMediaFile(input) {
	try {
		const data = await sendMedia(input.sessionId, input.chatId, input.file, input.caption, input.asDocument);
		const mime = input.file.type.toLowerCase();
		const type = input.asDocument ? "document" : mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "document";
		return ok({
			messageId: data.messageId,
			chatId: input.chatId,
			type,
			mediaUrl: URL.createObjectURL(input.file),
			mimetype: input.file.type,
			filename: input.file.name,
			caption: input.caption ?? null,
			timestamp: (/* @__PURE__ */ new Date()).toISOString()
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Send failed");
	}
}
async function fetchMessageMedia(sessionId, chatId, messageId) {
	try {
		const blob = await getMessageMediaBlob(sessionId, chatId, messageId);
		return ok({
			messageId,
			chatId,
			url: URL.createObjectURL(blob),
			mimetype: blob.type || "application/octet-stream",
			filename: "media",
			size: blob.size
		});
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Media unavailable");
	}
}
async function markChatRead(sessionId, chatId) {
	try {
		return ok(await markChatRead$1(sessionId, chatId));
	} catch (err) {
		return fail(err instanceof Error ? err.message : "Could not mark read");
	}
}
var DEFAULT_EVENTS = [
	"session.status",
	"session.qr",
	"session.restriction",
	"message.received",
	"message.sent",
	"message.ack",
	"message.upsert",
	"chat.upsert",
	"contact.upsert"
];
var socket = null;
var handlers = {};
function fanOut(msg) {
	if (!msg || typeof msg.type !== "string") return;
	if (msg.type === "error") {
		handlers.onServerError?.({
			code: String(msg.code ?? ""),
			message: String(msg.message ?? "")
		});
		return;
	}
	if (msg.type !== "event" || !msg.payload) return;
	const { event, sessionId, data } = msg.payload;
	switch (event) {
		case "session.status":
			handlers.onSessionStatus?.({
				sessionId,
				status: String(data.status),
				timestamp: msg.timestamp
			});
			break;
		case "session.qr":
			handlers.onQRCode?.({
				sessionId,
				qrCode: String(data.qrCode ?? data.qr ?? ""),
				timestamp: msg.timestamp
			});
			break;
		case "message.received":
		case "message.sent":
		case "message.upsert":
			handlers.onMessageUpsert?.({
				sessionId,
				message: data,
				timestamp: msg.timestamp
			});
			break;
		case "chat.upsert":
			handlers.onChatUpsert?.({
				sessionId,
				chat: data
			});
			break;
		case "contact.upsert": handlers.onContactUpsert?.({
			sessionId,
			contact: data
		});
	}
}
function setSocketHandlers(next) {
	handlers = next;
}
function connectSocket() {
	const apiKey = getOpenWAApiKey();
	if (!apiKey) return null;
	if (socket?.connected) return socket;
	disconnectSocket();
	socket = lookup(`${getOpenWASocketOrigin()}/events`, {
		autoConnect: true,
		reconnection: true,
		reconnectionAttempts: 8,
		reconnectionDelay: 1e3,
		auth: { apiKey },
		extraHeaders: { "X-API-Key": apiKey }
	});
	socket.on("connect", () => handlers.onConnect?.());
	socket.on("disconnect", (reason) => handlers.onDisconnect?.(String(reason)));
	socket.on("message", fanOut);
	return socket;
}
function disconnectSocket() {
	if (!socket) return;
	socket.removeAllListeners();
	socket.disconnect();
	socket = null;
}
function subscribeSession(sessionId, events = DEFAULT_EVENTS) {
	if (!socket?.connected) return;
	socket.emit("message", {
		type: "subscribe",
		sessionId,
		events
	});
}
function subscribeAllSessions(sessionIds) {
	subscribeSession("*");
	for (const id of sessionIds) subscribeSession(id);
}
/** Page sizes for the chat list and a conversation. */
var CHATS_PAGE = 30;
var MESSAGES_PAGE = 40;
/** How often the dashboard re-reads session status (there is no push channel). */
var SESSION_REFRESH_MS = 1e4;
/** Faster poll while a history sync is in progress, so the progress bar moves. */
var SYNC_REFRESH_MS = 2e3;
/** How often the open conversation / chat list are refreshed while the inbox is on screen. */
var INBOX_REFRESH_MS = 8e3;
/** WhatsApp timestamps are seconds; the UI wants a short local clock. */
function clockFrom(ts) {
	const n = typeof ts === "number" ? ts : Number(ts);
	if (!Number.isFinite(n) || n <= 0) return "";
	const ms = n > 0xe8d4a51000 ? n : n * 1e3;
	const d = new Date(ms);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit"
	});
}
function initialsFrom(name) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
/** Backend /chats/overview row -> the ChatPreview the UI already renders. */
function toChatPreview(c) {
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
		photo: c.profilePicture ?? void 0,
		initials: initialsFrom(name),
		phone: c.phone ?? void 0
	};
}
var MEDIA_TYPES = /* @__PURE__ */ new Set([
	"image",
	"video",
	"audio",
	"ptt",
	"document",
	"sticker"
]);
/** Short chat-list line for a message, mirroring the backend's preview labels. */
function previewOf(m) {
	if (typeof m.content === "string" && m.content) return m.content;
	switch (m.type) {
		case "image": return m.caption || "📷 Photo";
		case "video": return m.caption || "🎥 Video";
		case "ptt": return "🎤 Voice message";
		case "audio": return "🎵 Audio";
		case "document": return `📄 ${m.filename || "Document"}`;
		case "sticker": return "🏷️ Sticker";
		default: return `[${m.type}]`;
	}
}
/**
* Backend message -> chat bubble. Media keeps its type/url so the conversation
* can render it (or offer to fetch it); structured content (location, contact,
* poll, reaction) is summarised — never rendered raw.
*/
function toBubble(m) {
	const content = m.content;
	const isMedia = MEDIA_TYPES.has(m.type);
	let text;
	if (typeof content === "string" && content) text = content;
	else if (content && typeof content === "object") {
		const c = content;
		if (m.type === "reaction") text = `${c.emoji ?? "👍"} reacted to a message`;
		else if (m.type === "location") text = `📍 ${c.name || c.address || `${c.latitude}, ${c.longitude}`}`;
		else if (m.type === "contact") text = `👤 ${c.displayName || "Contact"}`;
		else if (m.type === "poll") text = `📊 ${c.question || "Poll"}`;
		else text = `[${m.type}]`;
	} else if (isMedia) text = m.caption ?? "";
	else text = m.caption ?? `[${m.type}]`;
	const media = isMedia ? {
		type: m.type,
		url: m.mediaUrl ?? null,
		mimetype: m.mimetype ?? null,
		filename: m.filename ?? null
	} : void 0;
	return {
		id: m.id,
		kind: "text",
		from: m.fromMe ? "me" : "them",
		text,
		time: clockFrom(m.timestamp),
		sender: m.isGroup && !m.fromMe ? m.senderName || m.senderPhone || null : null,
		media
	};
}
/** Which WhatsApp message kind a local file becomes (mirrors the backend's mimetype rule). */
function mediaTypeForFile(file, asDocument = false) {
	const mime = file.type.toLowerCase();
	if (asDocument) return "document";
	if (mime.startsWith("image/") && mime !== "image/webp") return "image";
	if (mime.startsWith("video/")) return "video";
	if (mime.startsWith("audio/")) return "audio";
	return "document";
}
function nid() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
/** Poll interval that watches a pairing session while the QR modal is open. */
var qrWatchTimer = null;
/** Poll interval that refreshes campaign progress while any job is still sending. */
var bulkWatchTimer = null;
/** Background timers: session status, and the open inbox. Started once by init(). */
var sessionRefreshTimer = null;
var inboxRefreshTimer = null;
/**
* Which session a campaign should go out from: the account picked in the rail
* if it can send, else the first connected one, else whatever exists.
*/
function pickBulkSession(sessions, preferred) {
	const chosen = sessions.find((s) => s.sessionId === preferred);
	if (chosen?.status === "connected") return chosen;
	return sessions.find((s) => s.status === "connected") ?? chosen ?? sessions[0];
}
/** The account the inbox is showing — the one picked in the rail, else the first connected one. */
function activeSession(s) {
	return s.sessions.find((x) => x.sessionId === s.activeAccountId) ?? s.sessions.find((x) => x.status === "connected");
}
/** Replace an optimistic bubble (or apply a patch) inside one thread. */
function patchBubble(threads, chatId, id, patch) {
	const thread = threads[chatId] ?? [];
	const next = [];
	for (const b of thread) {
		if (b.id !== id) {
			next.push(b);
			continue;
		}
		const replaced = patch(b);
		if (replaced) next.push(replaced);
	}
	return {
		...threads,
		[chatId]: next
	};
}
/** Human line for the explicit lifecycle events the gateway emits. */
function describeStatusChange(before, after) {
	if (!before || before.status === after.status) return null;
	const who = after.name || after.phoneNumber || after.sessionId;
	if (after.status === "connected") return `${who} connected`;
	if (before.status === "connected") return after.status === "logged_out" ? `${who} logged out` : `${who} disconnected (${after.status})`;
	return `${after.sessionId}: ${before.status} → ${after.status}`;
}
function ingestSocketMessage(sessionId, raw) {
	const chatId = String(raw.chatId ?? raw.to ?? "");
	if (!chatId) return;
	const fromMe = raw.direction === "outgoing" || raw.fromMe === true;
	const body = typeof raw.body === "string" ? raw.body : typeof raw.content === "string" ? raw.content : "";
	const ts = Number(raw.timestamp ?? Date.now() / 1e3);
	const id = String(raw.id ?? raw.messageId ?? `${Date.now()}`);
	const type = String(raw.type ?? "text");
	const gw = {
		id,
		chatId,
		fromMe,
		timestamp: ts,
		type,
		content: body,
		caption: type !== "text" ? body : null,
		senderName: typeof raw.chatName === "string" ? raw.chatName : null,
		isGroup: raw.kind === "group"
	};
	const bubble = toBubble(gw);
	useGateway.setState((s) => {
		if (s.activeAccountId && s.activeAccountId !== sessionId) return s;
		const thread = s.threads[chatId] ?? [];
		if (thread.some((b) => b.id === bubble.id)) return s;
		const preview = previewOf(gw);
		const time = clockFrom(ts);
		return {
			threads: {
				...s.threads,
				[chatId]: [...thread, bubble]
			},
			chats: s.chats.some((c) => c.id === chatId) ? s.chats.map((c) => c.id === chatId ? {
				...c,
				preview,
				time,
				lastAt: ts,
				unread: s.activeChatId === chatId ? 0 : c.unread + (fromMe ? 0 : 1)
			} : c) : [{
				id: chatId,
				name: gw.senderName || chatId.split("@")[0],
				preview,
				time,
				lastAt: ts,
				unread: fromMe ? 0 : 1,
				kind: gw.isGroup ? "group" : "dm",
				avatar: "initials",
				initials: initialsFrom(gw.senderName || chatId)
			}, ...s.chats]
		};
	});
}
function wireRealtime() {
	setSocketHandlers({
		onConnect: () => {
			useGateway.setState({ wsConnected: true });
			subscribeAllSessions(useGateway.getState().sessions.map((s) => s.sessionId));
		},
		onDisconnect: () => useGateway.setState({ wsConnected: false }),
		onSessionStatus: ({ sessionId, status }) => {
			const mapped = mapSessionStatus(status);
			useGateway.setState((s) => ({ sessions: s.sessions.map((sess) => sess.sessionId === sessionId ? {
				...sess,
				status: mapped
			} : sess) }));
			if (mapped === "connected") {
				const st = useGateway.getState();
				if (st.overlay === "qr" && st.qrSession === sessionId) {
					st.closeOverlay();
					st.pushToast("success", "WhatsApp linked successfully");
					if (st.activeAccountId !== sessionId) st.selectAccount(sessionId);
					else st.loadChats();
				}
			}
		},
		onQRCode: ({ sessionId, qrCode }) => {
			const st = useGateway.getState();
			if (st.overlay === "qr" && st.qrSession === sessionId && qrCode) {
				const src = qrCode.startsWith("data:") || qrCode.startsWith("http") ? qrCode : `data:image/png;base64,${qrCode}`;
				useGateway.setState({
					qrSrc: src,
					qrExpiresAt: Date.now() + 2e4
				});
			}
		},
		onMessageUpsert: (event) => ingestSocketMessage(event.sessionId, event.message),
		onChatUpsert: ({ sessionId }) => {
			const st = useGateway.getState();
			if (st.activeAccountId === sessionId) st.loadChats();
		},
		onServerError: ({ code }) => {
			if (code === "FORBIDDEN_SESSION") subscribeAllSessions(useGateway.getState().sessions.map((s) => s.sessionId));
		}
	});
	connectSocket();
}
var useGateway = create((set, get) => ({
	live: false,
	authNeeded: typeof window !== "undefined" ? !getOpenWAApiKey() : true,
	user: typeof sessionStorage !== "undefined" ? sessionStorage.getItem("dashboard_user") ?? "" : "",
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
	init: async () => {
		if (!getOpenWAApiKey()) {
			set({
				authNeeded: true,
				live: false
			});
			return;
		}
		set({
			sessionsLoading: true,
			sessionsError: null
		});
		try {
			const result = await listSessions();
			if (result.success && Array.isArray(result.data)) {
				const sessions = result.data.filter((s) => s.status !== "qr_expired");
				const current = get().activeAccountId;
				set({
					live: true,
					authNeeded: false,
					sessions,
					sessionsLoading: false,
					sessionsError: null,
					activeAccountId: (sessions.find((s) => s.sessionId === current && s.status === "connected") ?? sessions.find((s) => s.status === "connected") ?? sessions.find((s) => s.sessionId === current) ?? sessions[0])?.sessionId ?? ""
				});
				get().pushEvent("connection", "Connected to OpenWA");
				wireRealtime();
				await get().loadChats();
			} else {
				set({
					live: false,
					wsConnected: false,
					sessionsLoading: false,
					sessionsError: result.message ?? "No sessions"
				});
				get().pushEvent("error", result.message ?? "Gateway returned no sessions");
			}
		} catch (err) {
			set({
				live: false,
				wsConnected: false,
				sessionsLoading: false,
				authNeeded: (err instanceof OpenWAError ? err.status : 0) === 401,
				sessionsError: err instanceof Error ? err.message : "Gateway not reachable"
			});
			get().pushEvent("error", "Gateway not reachable");
		}
		try {
			const stats = await loadWsStats();
			if (stats.success) set({ wsClients: stats.data?.totalConnections ?? 0 });
		} catch {
			set({ wsClients: 1 });
		}
		if (!sessionRefreshTimer) {
			const tick = async () => {
				await get().refreshSessions();
				const syncing = get().sessions.some((s) => s.sync?.active);
				sessionRefreshTimer = setTimeout(tick, syncing ? SYNC_REFRESH_MS : SESSION_REFRESH_MS);
			};
			sessionRefreshTimer = setTimeout(tick, SESSION_REFRESH_MS);
		}
		if (!inboxRefreshTimer) inboxRefreshTimer = setInterval(() => {
			const { nav, live, activeChatId, overlay } = get();
			if (!live || nav !== "chats" || overlay) return;
			get().loadChats();
			if (activeChatId) get().loadMessages(activeChatId, { force: true });
		}, INBOX_REFRESH_MS);
	},
	/**
	* Re-read the session list. Status changes are announced in the event log
	* (that is where "X disconnected" shows up), and an account that just came
	* online while selected gets its chats loaded without a page refresh.
	*/
	refreshSessions: async () => {
		if (!get().live) return;
		let result;
		try {
			result = await listSessions();
		} catch {
			return;
		}
		if (!result.success || !Array.isArray(result.data)) return;
		const before = get().sessions;
		const sessions = result.data.filter((s) => s.status !== "qr_expired");
		for (const s of sessions) {
			const line = describeStatusChange(before.find((b) => b.sessionId === s.sessionId), s);
			if (line) get().pushEvent("connection", line);
			if (before.find((x) => x.sessionId === s.sessionId)?.sync?.active && s.sync && !s.sync.active) {
				get().pushEvent("connection", `${s.name || s.sessionId}: history synced (${s.sync.chats} chats, ${s.sync.messages} messages)`);
				if (s.sessionId === get().activeAccountId) get().loadChats();
			}
		}
		const activeId = get().activeAccountId;
		const activeBefore = before.find((s) => s.sessionId === activeId);
		const activeAfter = sessions.find((s) => s.sessionId === activeId);
		const fallback = sessions.find((s) => s.status === "connected") ?? sessions[0];
		const nextActive = activeAfter ? activeId : fallback?.sessionId ?? "";
		set({
			sessions,
			activeAccountId: nextActive
		});
		if (nextActive !== activeId) await get().loadChats();
		else if (activeAfter?.status === "connected" && activeBefore?.status !== "connected") await get().loadChats();
	},
	/**
	* Load the active account's conversations (first page). Only a *connected*
	* session has history, so anything else leaves the list empty and states
	* the reason — the panes render an explicit empty state rather than
	* pretending to hold data.
	*/
	loadChats: async () => {
		const session = activeSession(get());
		if (!session || session.status !== "connected") {
			set({
				chats: [],
				chatsHasMore: false,
				threads: {},
				threadMeta: {},
				activeChatId: ""
			});
			if (session) get().pushEvent("connection", `${session.name || session.sessionId} is ${session.status} — no chats to show.`);
			else get().pushEvent("connection", "No connected session — scan the QR to load chats.");
			return;
		}
		set({
			chatsLoading: true,
			chatsError: null
		});
		try {
			const result = await listChats(session.sessionId, CHATS_PAGE, 0);
			if (get().activeAccountId !== session.sessionId) return;
			if (!result.success || !result.data) {
				set({ chatsError: result.message ?? "Could not load chats" });
				get().pushEvent("error", result.message ?? "Could not load chats");
				return;
			}
			const fresh = result.data.chats.map(toChatPreview);
			set((s) => {
				const firstIds = new Set(fresh.map((c) => c.id));
				const tail = s.chats.slice(CHATS_PAGE).filter((c) => !firstIds.has(c.id));
				const chats = [...fresh, ...tail];
				const activeChatId = chats.some((c) => c.id === s.activeChatId) ? s.activeChatId : chats[0]?.id ?? "";
				return {
					chats,
					chatsHasMore: result.data.hasMore,
					activeChatId
				};
			});
			if (fresh.length === 0) {
				get().pushEvent("connection", `Connected — no chat history on ${session.name || session.sessionId} yet.`);
				return;
			}
			const { activeChatId, threads } = get();
			if (activeChatId && !threads[activeChatId]) await get().loadMessages(activeChatId);
		} catch {
			get().pushEvent("error", "Could not load chats");
		} finally {
			set({ chatsLoading: false });
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
				return {
					chats: [...s.chats, ...more.filter((c) => !known.has(c.id))],
					chatsHasMore: result.data.hasMore
				};
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
		const session = activeSession(get());
		if (!chatId || !session || session.status !== "connected") return;
		const existing = get().threadMeta[chatId];
		if (existing && !opts.force) return;
		if (existing?.loading) return;
		set((s) => ({ threadMeta: {
			...s.threadMeta,
			[chatId]: {
				...existing ?? {
					cursor: null,
					hasMore: false
				},
				loading: true
			}
		} }));
		try {
			const result = await listMessages(session.sessionId, chatId, MESSAGES_PAGE, null);
			if (get().activeAccountId !== session.sessionId) return;
			if (!result.success || !result.data) return;
			const page = result.data.messages.map(toBubble).reverse();
			set((s) => {
				const current = s.threads[chatId] ?? [];
				const pageIds = new Set(page.map((b) => b.id));
				const older = current.filter((b) => !pageIds.has(b.id) && !(b.kind === "text" && b.pending));
				const pending = current.filter((b) => b.kind === "text" && b.pending && !pageIds.has(b.id));
				const merged = existing ? [
					...older.filter((b) => !isNewerThanPage(b, current, page)),
					...page,
					...pending
				] : page;
				const meta = existing ? {
					cursor: existing.cursor ?? result.data.cursor,
					hasMore: existing.cursor ? existing.hasMore : result.data.hasMore,
					loading: false
				} : {
					cursor: result.data.cursor,
					hasMore: result.data.hasMore,
					loading: false
				};
				return {
					threads: {
						...s.threads,
						[chatId]: merged
					},
					threadMeta: {
						...s.threadMeta,
						[chatId]: meta
					}
				};
			});
		} catch {
			set((s) => ({ threadMeta: {
				...s.threadMeta,
				[chatId]: {
					...s.threadMeta[chatId] ?? {
						cursor: null,
						hasMore: false
					},
					loading: false
				}
			} }));
		}
	},
	/** Prepend the page before the oldest loaded message. */
	loadOlderMessages: async (chatId) => {
		const session = activeSession(get());
		const meta = get().threadMeta[chatId];
		if (!session || session.status !== "connected" || !meta || !meta.hasMore || meta.loading || !meta.cursor) return;
		set((s) => ({ threadMeta: {
			...s.threadMeta,
			[chatId]: {
				...meta,
				loading: true
			}
		} }));
		try {
			const result = await listMessages(session.sessionId, chatId, MESSAGES_PAGE, meta.cursor);
			if (!result.success || !result.data) throw new Error(result.message);
			const older = result.data.messages.map(toBubble).reverse();
			set((s) => {
				const known = new Set((s.threads[chatId] ?? []).map((b) => b.id));
				return {
					threads: {
						...s.threads,
						[chatId]: [...older.filter((b) => !known.has(b.id)), ...s.threads[chatId] ?? []]
					},
					threadMeta: {
						...s.threadMeta,
						[chatId]: {
							cursor: result.data.cursor ?? meta.cursor,
							hasMore: result.data.hasMore && older.length > 0,
							loading: false
						}
					}
				};
			});
		} catch {
			set((s) => ({ threadMeta: {
				...s.threadMeta,
				[chatId]: {
					...meta,
					loading: false
				}
			} }));
			get().pushToast("error", "Could not load older messages");
		}
	},
	loadMedia: async (chatId, messageId) => {
		const session = activeSession(get());
		if (!session) return null;
		const mark = (patch) => set((s) => ({ threads: patchBubble(s.threads, chatId, messageId, (b) => b.kind === "text" && b.media ? {
			...b,
			media: {
				...b.media,
				...patch
			}
		} : b) }));
		mark({ loading: true });
		try {
			const result = await fetchMessageMedia(session.sessionId, chatId, messageId);
			if (!result.success || !result.data) {
				mark({ loading: false });
				get().pushToast("error", result.message || "Media unavailable");
				return null;
			}
			mark({
				loading: false,
				url: result.data.url,
				mimetype: result.data.mimetype,
				filename: result.data.filename
			});
			return result.data.url;
		} catch {
			mark({ loading: false });
			get().pushToast("error", "Gateway unreachable — media not loaded");
			return null;
		}
	},
	setNav: (nav) => set({
		nav,
		settingsPanel: nav === "settings" ? get().settingsPanel : "home"
	}),
	setSettingsPanel: (settingsPanel) => set({
		settingsPanel,
		nav: "settings"
	}),
	setFilter: (filter) => set({ filter }),
	setQuery: (query) => set({ query }),
	selectChat: (id) => {
		set((s) => ({
			activeChatId: id,
			mobilePane: "chat",
			chats: s.chats.map((c) => c.id === id ? {
				...c,
				unread: 0
			} : c)
		}));
		get().loadMessages(id);
		const session = activeSession(get());
		if (session?.status === "connected") markChatRead(session.sessionId, id);
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
			composer: ""
		});
		get().loadChats();
	},
	setComposer: (composer) => set({ composer }),
	setContactTab: (contactTab) => set({ contactTab }),
	setMobilePane: (mobilePane) => set({ mobilePane }),
	sendComposer: async () => {
		const { composer, activeChatId, live, pushToast, pushEvent } = get();
		const session = activeSession(get());
		const text = composer.trim();
		if (!text || !activeChatId) return;
		if (!live || !session || session.status !== "connected") {
			pushToast("error", live ? "This account is not connected" : "Not connected to the gateway");
			return;
		}
		const time = (/* @__PURE__ */ new Date()).toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit"
		});
		const tempId = nid();
		const bubble = {
			id: tempId,
			kind: "text",
			from: "me",
			text,
			time,
			pending: true
		};
		set((s) => ({
			composer: "",
			threads: {
				...s.threads,
				[activeChatId]: [...s.threads[activeChatId] ?? [], bubble]
			},
			chats: s.chats.map((c) => c.id === activeChatId ? {
				...c,
				preview: text,
				time
			} : c)
		}));
		try {
			const result = await sendText({
				sessionId: session.sessionId,
				chatId: activeChatId,
				message: text
			});
			if (!result.success) throw new Error(result.message || "Send failed");
			const realId = result.data?.messageId ?? tempId;
			set((s) => ({ threads: patchBubble(s.threads, activeChatId, tempId, (b) => ({
				...b,
				id: realId,
				pending: false
			})) }));
			pushEvent("message", `Sent: ${text.slice(0, 60)}`);
		} catch (err) {
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
		const time = (/* @__PURE__ */ new Date()).toLocaleTimeString([], {
			hour: "numeric",
			minute: "2-digit"
		});
		const tempId = nid();
		const localUrl = URL.createObjectURL(file);
		const bubble = {
			id: tempId,
			kind: "text",
			from: "me",
			text: caption,
			time,
			pending: true,
			media: {
				type: mediaTypeForFile(file, asDocument),
				url: localUrl,
				mimetype: file.type || null,
				filename: file.name
			}
		};
		set((s) => ({
			composer: "",
			threads: {
				...s.threads,
				[activeChatId]: [...s.threads[activeChatId] ?? [], bubble]
			},
			chats: s.chats.map((c) => c.id === activeChatId ? {
				...c,
				preview: caption || `📎 ${file.name}`,
				time
			} : c)
		}));
		try {
			const result = await sendMediaFile({
				sessionId: session.sessionId,
				chatId: activeChatId,
				file,
				caption,
				asDocument
			});
			if (!result.success || !result.data) throw new Error(result.message || "Send failed");
			const data = result.data;
			set((s) => ({ threads: patchBubble(s.threads, activeChatId, tempId, (b) => b.kind === "text" ? {
				...b,
				id: data.messageId,
				pending: false,
				media: {
					type: data.type,
					url: data.mediaUrl,
					mimetype: data.mimetype,
					filename: data.filename
				}
			} : b) }));
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
			set({
				overlay,
				qrSession: extra ?? ""
			});
			if (extra) get().watchQrSession(extra);
		} else if (overlay === "webhooks") set({
			overlay,
			webhookSessionId: extra ?? ""
		});
		else if (overlay === "proxy") set({
			overlay,
			proxySessionId: extra ?? ""
		});
		else set({ overlay });
	},
	closeOverlay: () => {
		if (qrWatchTimer) {
			clearInterval(qrWatchTimer);
			qrWatchTimer = null;
		}
		set({
			overlay: null,
			qrSrc: "",
			qrExpiresAt: null,
			pairingCode: "",
			pairingPhone: "",
			pairingExpiresAt: null,
			pairingLoading: false
		});
	},
	createSession: async (id, webhook, proxy) => {
		if (!/^[a-zA-Z0-9-]+$/.test(id)) {
			get().pushToast("error", "Session name: letters, numbers, and hyphens only");
			return;
		}
		if (!get().live) {
			get().pushToast("error", "Not connected to the gateway");
			return;
		}
		const body = { name: id };
		if (webhook) body.webhooks = [{ url: webhook }];
		if (proxy) body.proxy = proxy;
		let result;
		try {
			result = await connectSession(id, body);
		} catch {
			get().pushToast("error", "Gateway unreachable — session not created");
			return;
		}
		if (!result.success) {
			get().pushToast("error", result.message || "Failed to create session");
			return;
		}
		const sessionId = result.data?.sessionId ?? id;
		set((s) => ({
			sessions: [...s.sessions.filter((x) => x.sessionId !== sessionId && x.sessionId !== id), {
				sessionId,
				name: result.data?.name ?? id,
				status: result.data?.status ?? "qr_ready",
				webhooks: webhook ? [{ url: webhook }] : [],
				proxy: proxy ? proxy.replace(/:([^:@/]+)@/, ":***@") : null
			}],
			overlay: "qr",
			qrSession: sessionId,
			qrSrc: "",
			pairingCode: "",
			pairingPhone: "",
			pairingExpiresAt: null
		}));
		get().pushEvent("connection", `Session ${id} created`);
		get().pushToast("success", "Scan QR to connect");
		await get().refreshQr(sessionId);
		get().watchQrSession(sessionId);
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
			set((s) => ({ sessions: s.sessions.map((sess) => sess.sessionId === sessionId ? {
				...sess,
				proxy: saved
			} : sess) }));
			get().pushToast(result.data.proxyApplied ? "success" : "info", result.message || "Proxy saved");
			get().pushEvent("connection", `Session ${sessionId} proxy ${saved ? `set to ${saved}` : "removed"}`);
			if (result.data.proxyApplied) setTimeout(() => void get().refreshSessions(), 6e3);
			return true;
		} catch {
			get().pushToast("error", "Gateway unreachable — proxy not saved");
			return false;
		}
	},
	testProxy: async (proxy) => {
		if (!get().live) return {
			ok: false,
			message: "Not connected to the gateway"
		};
		try {
			const result = await testProxy({ proxy });
			const data = result.data;
			return {
				ok: Boolean(result.success && data?.ok),
				message: result.message || (data?.ok ? `Egress IP ${data.ip}` : data?.error || "Proxy check failed"),
				ip: data?.ip,
				latencyMs: data?.latencyMs
			};
		} catch {
			return {
				ok: false,
				message: "Gateway unreachable"
			};
		}
	},
	reconnect: async (id) => {
		if (!get().live) {
			get().pushToast("error", "Not connected to the gateway");
			return;
		}
		const existing = get().sessions.find((s) => s.sessionId === id);
		const needsStop = existing && (existing.status === "disconnected" || existing.status === "failed" || existing.status === "logged_out" || existing.status === "qr_expired");
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
			set((s) => ({ sessions: s.sessions.map((sess) => sess.sessionId === id ? {
				...sess,
				status: mapSessionStatus(result.data?.status ?? "connecting")
			} : sess) }));
			get().pushToast("success", "Reconnecting…");
			set({
				qrSession: id,
				qrSrc: "",
				qrExpiresAt: null,
				pairingCode: "",
				pairingPhone: "",
				pairingExpiresAt: null
			});
			get().openOverlay("qr", id);
			await get().refreshQr(id, { maxAttempts: 90 });
		} catch {
			get().pushToast("error", "Failed to reconnect");
		}
	},
	removeSession: async (id) => {
		try {
			if (get().live) await deleteSession(id);
		} catch {}
		set((s) => ({ sessions: s.sessions.filter((x) => x.sessionId !== id) }));
		get().pushToast("success", "Session deleted");
		get().pushEvent("connection", `Session ${id} deleted`);
		if (get().activeAccountId === id) {
			const next = get().sessions.find((s) => s.status === "connected") ?? get().sessions[0];
			set({
				activeAccountId: next?.sessionId ?? "",
				chats: [],
				threads: {},
				threadMeta: {},
				activeChatId: ""
			});
			if (next) await get().loadChats();
		}
	},
	refreshQr: async (id, opts) => {
		const maxAttempts = opts?.maxAttempts ?? 30;
		set({
			qrSession: id,
			qrSrc: "",
			qrExpiresAt: null
		});
		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			const result = await getQr(id);
			if (result.success && result.data?.qrCode) {
				set({
					qrSrc: result.data.qrCode,
					qrSession: id,
					qrExpiresAt: result.data.qrExpiresAt ?? Date.now() + 2e4,
					pairingCode: result.data.pairingCode ?? get().pairingCode,
					pairingPhone: result.data.pairingPhone ?? get().pairingPhone,
					pairingExpiresAt: result.data.pairingExpiresAt ?? get().pairingExpiresAt
				});
				return;
			}
			const msg = result.message ?? "";
			if (/already authenticated/i.test(msg)) {
				get().closeOverlay();
				get().pushToast("success", "Session is already linked");
				get().refreshSessions();
				return;
			}
			if (!/not ready|wait/i.test(msg) && !result.success && attempt > 4) {
				get().pushToast("error", msg || "QR unavailable");
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		get().pushToast("error", "QR not ready — wait a moment and try Reconnect again");
	},
	/**
	* While the QR modal is open, poll the gateway: keep the QR image fresh as
	* the backend rotates it, and close the modal the moment pairing finishes
	* (connected) or is revoked (qr_expired). The newly linked account becomes
	* the active one and its chats load — no page refresh needed.
	*/
	watchQrSession: (id) => {
		if (qrWatchTimer) clearInterval(qrWatchTimer);
		qrWatchTimer = setInterval(async () => {
			const { overlay, qrSession } = get();
			if (overlay !== "qr" || !qrSession || qrSession !== id) return;
			try {
				const [qr, list] = await Promise.all([getQr(qrSession), listSessions()]);
				if (qr.success && qr.data?.qrCode && qr.data.qrCode !== get().qrSrc) set({ qrSrc: qr.data.qrCode });
				if (qr.success && qr.data?.qrExpiresAt && qr.data.qrExpiresAt !== get().qrExpiresAt) set({ qrExpiresAt: qr.data.qrExpiresAt });
				if (qr.success && qr.data?.pairingCode && qr.data.pairingCode !== get().pairingCode) set({
					pairingCode: qr.data.pairingCode,
					pairingPhone: qr.data.pairingPhone ?? get().pairingPhone,
					pairingExpiresAt: qr.data.pairingExpiresAt ?? get().pairingExpiresAt
				});
				const sessions = list.success && Array.isArray(list.data) ? list.data : void 0;
				const status = sessions?.find((s) => s.sessionId === qrSession)?.status;
				if (status === "connected") {
					set((s) => ({ sessions: sessions ?? s.sessions }));
					get().closeOverlay();
					get().pushToast("success", "WhatsApp linked successfully");
					get().pushEvent("connection", `Session ${qrSession} connected`);
					if (get().activeAccountId !== qrSession) get().selectAccount(qrSession);
					else await get().loadChats();
				} else if (status === "qr_expired") {
					set((s) => ({ sessions: (sessions ?? s.sessions).filter((x) => x.sessionId !== qrSession && x.status !== "qr_expired") }));
					get().closeOverlay();
					get().pushToast("error", "QR expired — session removed. Create a new session to link again.");
					get().pushEvent("error", `Session ${qrSession} QR expired and was removed`);
				} else if (sessions) set({ sessions: sessions.filter((x) => x.status !== "qr_expired") });
			} catch {}
		}, 2e3);
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
			const result = await requestPairingCode(id, digits);
			if (!result.success || !result.data?.pairingCode) {
				get().pushToast("error", result.message || "Could not get a pairing code");
				return false;
			}
			set({
				pairingCode: result.data.pairingCode,
				pairingPhone: result.data.pairingPhone || digits,
				pairingExpiresAt: result.data.pairingExpiresAt ?? null
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
			if (get().live) await addWebhook(sid, url, events);
		} catch {}
		set((s) => ({ sessions: s.sessions.map((sess) => sess.sessionId === sid ? {
			...sess,
			webhooks: [...sess.webhooks ?? [], {
				url,
				events
			}]
		} : sess) }));
		get().pushToast("success", "Webhook added");
	},
	removeHook: async (url) => {
		const sid = get().webhookSessionId;
		try {
			if (get().live) await removeWebhook(sid, url);
		} catch {}
		set((s) => ({ sessions: s.sessions.map((sess) => sess.sessionId === sid ? {
			...sess,
			webhooks: (sess.webhooks ?? []).filter((w) => w.url !== url)
		} : sess) }));
		get().pushToast("success", "Webhook removed");
	},
	setBulkSession: (id) => {
		if (id === get().bulkSessionId) return;
		set({
			bulkSessionId: id,
			bulkJobs: []
		});
		get().loadBulkJobs();
	},
	/**
	* Refresh the campaign list for `bulkSessionId` (falling back to the best
	* available session) and keep polling every 2s while any job is sending.
	*/
	loadBulkJobs: async () => {
		const { live, sessions, bulkSessionId, activeAccountId } = get();
		if (!live) return;
		const session = sessions.find((s) => s.sessionId === bulkSessionId) ?? pickBulkSession(sessions, activeAccountId);
		if (!session) {
			set({
				bulkJobs: [],
				bulkSessionId: ""
			});
			return;
		}
		if (session.sessionId !== bulkSessionId) set({ bulkSessionId: session.sessionId });
		set({ bulkLoading: true });
		try {
			const result = await listBulkJobs(session.sessionId);
			if (result.success && Array.isArray(result.data)) {
				const previous = get().bulkJobs;
				set({ bulkJobs: result.data });
				for (const job of result.data) {
					const before = previous.find((j) => j.jobId === job.jobId);
					if (before && before.status === "processing" && job.status !== "processing") {
						const label = job.name || `${job.type} campaign`;
						if (job.status === "completed") get().pushToast(job.failed ? "info" : "success", `${label}: ${job.sent} sent, ${job.failed} failed`);
						else get().pushToast("error", `${label} ${job.status} — ${job.sent}/${job.total} sent`);
						get().pushEvent("message", `Campaign ${job.jobId} ${job.status}: ${job.sent} sent, ${job.failed} failed`);
					}
				}
			} else if (!result.success) get().pushEvent("error", result.message ?? "Could not load campaigns");
		} catch {
			get().pushEvent("error", "Could not load campaigns");
		} finally {
			set({ bulkLoading: false });
		}
		const running = get().bulkJobs.some((j) => j.status === "processing");
		if (running && !bulkWatchTimer) bulkWatchTimer = setInterval(() => void get().loadBulkJobs(), 2e3);
		else if (!running && bulkWatchTimer) {
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
		const requested = input.sessionIds && input.sessionIds.length ? input.sessionIds : void 0;
		const connectedLanes = (requested ? requested.filter((id) => sessions.find((s) => s.sessionId === id)?.status === "connected") : [pickBulkSession(sessions, activeAccountId)?.sessionId].filter((x) => Boolean(x))).filter((id) => sessions.find((s) => s.sessionId === id)?.status === "connected");
		if (connectedLanes.length === 0) {
			pushToast("error", "Pick at least one connected account to send from");
			return null;
		}
		try {
			const result = await startBulkJob({
				...input,
				sessionIds: connectedLanes
			});
			if (!result.success || !result.data) {
				pushToast("error", result.message || "Could not start campaign");
				return null;
			}
			const owner = result.data.sessionIds?.[0] ?? connectedLanes[0];
			const laneCount = result.data.sessionIds?.length ?? connectedLanes.length;
			pushEvent("message", `Campaign ${result.data.jobId} started: ${result.data.total} recipients across ${laneCount} account(s)`);
			pushToast("success", `Sending to ${result.data.total} recipients from ${laneCount} account(s)`);
			if (result.data.skippedSessions?.length) pushToast("info", `Skipped (not connected): ${result.data.skippedSessions.join(", ")}`);
			set({
				overlay: null,
				nav: "broadcast",
				bulkSessionId: owner
			});
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
			if (!result.success) get().pushToast("error", result.message || "Could not cancel");
			else {
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
	applyTemplate: (body) => set({
		composer: body,
		overlay: null
	}),
	pushToast: (type, message) => {
		const id = nid();
		set((s) => ({ toasts: [...s.toasts, {
			id,
			type,
			message
		}] }));
		setTimeout(() => get().dismissToast(id), 3800);
	},
	dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
	pushEvent: (type, content) => set((s) => ({ events: [{
		id: nid(),
		time: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
		type,
		content
	}, ...s.events].slice(0, 100) })),
	clearEvents: () => set({ events: [] }),
	runApi: async (method, path, body) => {
		try {
			const result = await sendRawApi(method, path, body);
			get().pushEvent("connection", `${method} ${path}`);
			return result;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			get().pushEvent("error", `${method} ${path} failed: ${message}`);
			return {
				success: false,
				method,
				path,
				message
			};
		}
	},
	login: async (user, _pass, key, url) => {
		const apiKey = (key || get().apiKey).trim();
		const origin = (url || get().serverUrl || "http://localhost:2785").replace(/\/+$/, "");
		if (!apiKey) {
			get().pushToast("error", "API key required");
			return false;
		}
		try {
			const data = await validateApiKey(apiKey, origin);
			setOpenWACredentials(origin, apiKey);
			sessionStorage.setItem("dashboard_auth", "authenticated");
			sessionStorage.setItem("dashboard_user", user || data.role || "operator");
			set({
				user: user || data.role || "operator",
				apiKey,
				serverUrl: origin,
				authNeeded: false,
				live: true
			});
			get().pushToast("success", "Connected to OpenWA");
			await get().init();
			return true;
		} catch (err) {
			get().pushToast("error", err instanceof Error ? err.message : "Invalid API key");
			return false;
		}
	},
	logout: () => {
		disconnectSocket();
		clearOpenWACredentials();
		sessionStorage.removeItem("dashboard_auth");
		sessionStorage.removeItem("dashboard_user");
		set({
			apiKey: "",
			user: "",
			live: false,
			authNeeded: true,
			sessions: [],
			chats: [],
			threads: {},
			wsConnected: false
		});
		get().pushToast("success", "Logged out");
	},
	setApiKey: (k) => {
		setOpenWACredentials(get().serverUrl, k);
		set({ apiKey: k });
	}
}));
/**
* During a forced refresh the newest page replaces whatever was at the tail of
* the thread. A bubble that is not in the page but sits *after* the oldest
* page message (e.g. a message deleted meanwhile) must not be kept at the end.
*/
function isNewerThanPage(b, current, page) {
	if (page.length === 0) return false;
	const firstPageIdx = current.findIndex((x) => x.id === page[0].id);
	if (firstPageIdx === -1) return false;
	return current.indexOf(b) > firstPageIdx;
}
/** Starter message templates offered by the Templates overlay. Editable. */
var TEMPLATES = [
	{
		id: "t1",
		title: "Campaign launch",
		body: "Hey! The campaign is ready for launch. Please review and confirm."
	},
	{
		id: "t2",
		title: "Follow up",
		body: "Just checking in — did you get a chance to review the last update?"
	},
	{
		id: "t3",
		title: "Support reply",
		body: "Thanks for reaching out. Withdrawals are processed instantly during business hours."
	}
];
var queryKeys = {
	sessions: ["openwa", "sessions"],
	sessionStats: ["openwa", "session-stats"],
	sessionConfig: (id) => [
		"openwa",
		"session-config",
		id
	],
	sessionProxy: (id) => [
		"openwa",
		"session-proxy",
		id
	],
	chats: (sessionId) => [
		"openwa",
		"chats",
		sessionId
	],
	messages: (sessionId, chatId) => [
		"openwa",
		"messages",
		sessionId,
		chatId
	],
	contacts: (sessionId) => [
		"openwa",
		"contacts",
		sessionId
	],
	groups: (sessionId) => [
		"openwa",
		"groups",
		sessionId
	],
	webhooks: ["openwa", "webhooks"],
	templates: (sessionId) => [
		"openwa",
		"templates",
		sessionId
	],
	apiKeys: ["openwa", "api-keys"],
	logs: (params) => [
		"openwa",
		"logs",
		params
	],
	infra: ["openwa", "infra"],
	infraConfig: ["openwa", "infra-config"],
	health: ["openwa", "health"],
	plugins: ["openwa", "plugins"],
	pluginCatalog: ["openwa", "plugin-catalog"],
	pluginInstances: (pluginId) => [
		"openwa",
		"plugin-instances",
		pluginId
	],
	pluginConfigUi: (id) => [
		"openwa",
		"plugin-config-ui",
		id
	],
	engines: ["openwa", "engines"],
	currentEngine: ["openwa", "current-engine"],
	statsOverview: ["openwa", "stats-overview"],
	statsMessages: (period) => [
		"openwa",
		"stats-messages",
		period
	],
	batch: (sessionId, batchId) => [
		"openwa",
		"batch",
		sessionId,
		batchId
	],
	profilePicture: (sessionId, contactId) => [
		"openwa",
		"profile-picture",
		sessionId,
		contactId
	],
	profilePictures: (sessionId, idsKey) => [
		"openwa",
		"profile-pictures",
		sessionId,
		idsKey
	]
};
function useSessionsQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.sessions,
		queryFn: listSessions$1,
		enabled,
		staleTime: 15e3
	});
}
function useSessionStatsQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.sessionStats,
		queryFn: getSessionStats,
		enabled,
		staleTime: 15e3,
		retry: false
	});
}
function useSessionConfigQuery(sessionId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.sessionConfig(sessionId),
		queryFn: () => getSessionConfig(sessionId),
		enabled: enabled && Boolean(sessionId)
	});
}
function useSessionProxyQuery(sessionId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.sessionProxy(sessionId),
		queryFn: () => getSessionProxy(sessionId),
		enabled: enabled && Boolean(sessionId)
	});
}
function useProfilePicture(sessionId, contactId) {
	return useQuery({
		queryKey: queryKeys.profilePicture(sessionId ?? "", contactId ?? ""),
		queryFn: () => getProfilePicture(sessionId, contactId).then((r) => r.url),
		enabled: Boolean(sessionId && contactId),
		staleTime: 36e5,
		gcTime: 18e5,
		retry: false
	});
}
function useProfilePictures(sessionId, contactIds) {
	const requestIds = contactIds.slice(0, 50);
	const sortedKey = [...requestIds].sort().join(",");
	return useQuery({
		queryKey: queryKeys.profilePictures(sessionId ?? "", sortedKey),
		queryFn: () => getProfilePictures(sessionId, requestIds).then((r) => r.pictures),
		enabled: Boolean(sessionId && requestIds.length > 0),
		staleTime: 36e5,
		gcTime: 18e5,
		retry: false
	});
}
function useChatsQuery(sessionId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.chats(sessionId),
		queryFn: () => listChats$1(sessionId),
		enabled: enabled && Boolean(sessionId),
		staleTime: 1e4
	});
}
function useGroupsQuery(sessionId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.groups(sessionId),
		queryFn: () => listGroups$1(sessionId),
		enabled: enabled && Boolean(sessionId)
	});
}
function useWebhooksQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.webhooks,
		queryFn: listWebhooks,
		enabled,
		select: (rows) => rows.map((w) => ({
			...w,
			events: Array.isArray(w.events) ? w.events : []
		}))
	});
}
function useTemplatesQuery(sessionId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.templates(sessionId),
		queryFn: () => listTemplates(sessionId),
		enabled: enabled && Boolean(sessionId)
	});
}
function useApiKeysQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.apiKeys,
		queryFn: listApiKeys,
		enabled
	});
}
function useLogsQuery(params, enabled = true) {
	const limit = params.limit ?? 50;
	return useQuery({
		queryKey: queryKeys.logs({
			severity: params.severity,
			page: params.page
		}),
		queryFn: () => listAuditLogs({
			severity: params.severity,
			limit,
			offset: params.page * limit
		}),
		enabled
	});
}
function useInfraQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.infra,
		queryFn: getInfraStatus,
		enabled,
		refetchInterval: 15e3
	});
}
function useInfraConfigQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.infraConfig,
		queryFn: getInfraConfig,
		enabled,
		staleTime: 3e4
	});
}
function usePluginsQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.plugins,
		queryFn: listPlugins,
		enabled,
		select: (rows) => rows.map((p) => ({
			...p,
			config: p.config ?? {},
			activeSessions: p.activeSessions ?? [],
			sessionConfig: p.sessionConfig ?? {}
		}))
	});
}
function usePluginCatalogQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.pluginCatalog,
		queryFn: listPluginCatalog,
		enabled
	});
}
function usePluginInstancesQuery(pluginId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.pluginInstances(pluginId),
		queryFn: () => listPluginInstances(pluginId),
		enabled: enabled && Boolean(pluginId)
	});
}
function usePluginConfigUiQuery(pluginId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.pluginConfigUi(pluginId),
		queryFn: () => getPluginConfigUi(pluginId),
		enabled: enabled && Boolean(pluginId),
		staleTime: Infinity
	});
}
function useEnginesQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.engines,
		queryFn: listEngines,
		enabled,
		staleTime: 6e4
	});
}
function useCurrentEngineQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.currentEngine,
		queryFn: getCurrentEngine,
		enabled,
		staleTime: 6e4
	});
}
function useStatsOverviewQuery(enabled = true) {
	return useQuery({
		queryKey: queryKeys.statsOverview,
		queryFn: getStatsOverview,
		enabled,
		staleTime: 3e4,
		retry: false
	});
}
function useStatsMessagesQuery(period, enabled = true) {
	return useQuery({
		queryKey: queryKeys.statsMessages(period),
		queryFn: () => getMessageStats(period),
		enabled,
		staleTime: 3e4,
		retry: false
	});
}
function useBatchStatusQuery(sessionId, batchId, enabled = true) {
	return useQuery({
		queryKey: queryKeys.batch(sessionId, batchId),
		queryFn: () => getBatchStatus(sessionId, batchId),
		enabled: enabled && Boolean(sessionId) && Boolean(batchId),
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			if (status === "completed" || status === "cancelled" || status === "failed") return false;
			return 2e3;
		}
	});
}
function useCreateWebhookMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createWebhook,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.webhooks })
	});
}
function useUpdateWebhookMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, dto }) => updateWebhook(id, dto),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.webhooks })
	});
}
function useDeleteWebhookMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, sessionId }) => deleteWebhook(id, sessionId),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.webhooks })
	});
}
function useCreateTemplateMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ sessionId, dto }) => createTemplate(sessionId, dto),
		onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.templates(vars.sessionId) })
	});
}
function useUpdateTemplateMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ sessionId, id, dto }) => updateTemplate(sessionId, id, dto),
		onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.templates(vars.sessionId) })
	});
}
function useDeleteTemplateMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ sessionId, id }) => deleteTemplate(sessionId, id),
		onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.templates(vars.sessionId) })
	});
}
function useCreateApiKeyMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: createApiKey,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys })
	});
}
function useUpdateApiKeyMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }) => updateApiKey(id, data),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys })
	});
}
function useDeleteApiKeyMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteApiKey,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys })
	});
}
function useRevokeApiKeyMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: revokeApiKey,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.apiKeys })
	});
}
function usePluginToggleMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, enable }) => enable ? enablePlugin(id) : disablePlugin(id),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins })
	});
}
function useInstallPluginUrlMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: installPluginFromUrl,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.plugins });
			qc.invalidateQueries({ queryKey: queryKeys.pluginCatalog });
		}
	});
}
function useInstallPluginFileMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: installPlugin,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.plugins });
			qc.invalidateQueries({ queryKey: queryKeys.pluginCatalog });
		}
	});
}
function useUninstallPluginMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: uninstallPlugin,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins })
	});
}
function useUpdatePluginConfigMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, config }) => updatePluginConfig(id, config),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins })
	});
}
function useSetPluginSessionsMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, sessions }) => setPluginSessions(id, sessions),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins })
	});
}
function useUpdatePluginSessionConfigMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, sessionId, config }) => updatePluginSessionConfig(id, sessionId, config),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.plugins })
	});
}
function useCreateInstanceMutation(pluginId) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body) => createPluginInstance(pluginId, body),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) })
	});
}
function useRegenerateInstanceSecretMutation(pluginId) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (instanceId) => regenerateInstanceSecret(pluginId, instanceId),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) })
	});
}
function useUpdateInstanceMutation(pluginId) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (params) => updatePluginInstance(pluginId, params.instanceId, params.body),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) })
	});
}
function useDeleteInstanceMutation(pluginId) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (instanceId) => deletePluginInstance(pluginId, instanceId),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.pluginInstances(pluginId) })
	});
}
function useStartSessionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: connectSession$1,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions })
	});
}
function useStopSessionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: disconnectSession$1,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions })
	});
}
function useLogoutSessionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: logoutSession,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions })
	});
}
function useForceKillSessionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: forceKillSession,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions })
	});
}
function useDeleteSessionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deleteSession$1,
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions })
	});
}
function useCreateSessionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ name, proxyUrl }) => createSession(name, { proxyUrl }),
		onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.sessions })
	});
}
function useUpdateSessionConfigMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, patch }) => updateSessionConfig$1(id, patch),
		onSuccess: (_d, vars) => void qc.invalidateQueries({ queryKey: queryKeys.sessionConfig(vars.id) })
	});
}
function useUpdateSessionProxyMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, proxyUrl }) => updateSessionProxy(id, proxyUrl),
		onSuccess: (_d, vars) => {
			qc.invalidateQueries({ queryKey: queryKeys.sessionProxy(vars.id) });
			qc.invalidateQueries({ queryKey: queryKeys.sessions });
		}
	});
}
var field$2 = "w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm text-ink outline-none placeholder:text-dim";
var btn = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-wa px-3 py-2 text-xs font-semibold text-night disabled:opacity-50";
var ghost = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs text-muted hover:bg-white/5 disabled:opacity-50";
var danger = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/40 px-3 py-2 text-xs text-danger hover:bg-danger/10 disabled:opacity-50";
function Card$1({ title, sub, children, actions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "glass rounded-2xl p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3 flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold",
				children: title
			}), sub ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-[11.5px] text-muted",
				children: sub
			}) : null] }), actions]
		}), children]
	});
}
function ErrorLine({ error }) {
	if (!error) return null;
	const message = error instanceof Error ? error.message : "Request failed";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger",
		children: message
	});
}
function Toggle({ checked, onChange, labelledBy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		role: "switch",
		"aria-checked": checked,
		"aria-labelledby": labelledBy,
		onClick: () => onChange(!checked),
		className: cn("relative h-6 w-11 shrink-0 rounded-full border transition", checked ? "border-wa/40 bg-wa" : "border-line bg-white/10"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute top-0.5 size-5 rounded-full bg-white transition", checked ? "left-5" : "left-0.5") })
	});
}
function Modal({ open, title, onClose, children, wide }) {
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-[60] flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("glass max-h-[90vh] overflow-y-auto rounded-3xl p-6 text-left", wide ? "w-full max-w-3xl" : "w-full max-w-lg"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: ghost,
					onClick: onClose,
					children: "Close"
				})]
			}), children]
		})
	});
}
function AkgBulkNote() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
		title: "Pacing / ban-risk",
		sub: "Bulk and broadcast reuse the existing batch API (delay + jitter + cancel).",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[12.5px] text-muted",
			children: "Steady, varied pacing is what keeps a number from being flagged. Cancel stops further sends; already-sent messages are not pulled back. Poll batch status while a job runs. History is the completed/cancelled/interrupted jobs already listed in this pane."
		})
	});
}
/** Mirrors BULK_MAX_RECIPIENTS on the backend. */
var MAX_RECIPIENTS = 100;
var TYPE_LABEL = {
	text: "Text",
	image: "Image",
	document: "Document"
};
var STATUS_STYLE = {
	processing: "bg-indigo/20 text-indigo",
	completed: "bg-wa/15 text-wa",
	cancelled: "bg-white/10 text-muted",
	interrupted: "bg-danger/15 text-danger"
};
var field$1 = "w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-left text-sm text-ink outline-none placeholder:text-dim";
var label$1 = "block text-left text-[11px] font-medium uppercase tracking-wide text-muted";
function fmtWhen(iso) {
	if (!iso) return "";
	const d = new Date(iso);
	return (/* @__PURE__ */ new Date()).toDateString() === d.toDateString() ? d.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit"
	}) : d.toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit"
	});
}
function fmtDuration(ms) {
	if (ms < 6e4) return `${Math.max(1, Math.round(ms / 1e3))}s`;
	const min = Math.round(ms / 6e4);
	return min < 60 ? `~${min} min` : `~${Math.round(min / 6) / 10} h`;
}
/** One line of what a job is sending, for cards and the composer summary. */
function payloadPreview(job) {
	const p = job.payload;
	if (job.type === "text") return p.message ?? "";
	if (job.type === "image") return p.caption ? `${p.imageUrl} — ${p.caption}` : p.imageUrl ?? "";
	return p.filename ? `${p.filename} (${p.mimetype ?? "file"})` : p.documentUrl ?? "";
}
/**
* Turn a pasted blob into recipients: one per line/comma/semicolon. Anything
* with an "@" is taken as a JID verbatim; otherwise it must have 7+ digits.
*/
function parseRecipients(text) {
	const valid = [];
	const invalid = [];
	const seen = /* @__PURE__ */ new Set();
	for (const raw of text.split(/[\n,;]+/)) {
		const token = raw.trim();
		if (!token) continue;
		let value;
		if (token.includes("@")) value = token;
		else {
			const digits = token.replace(/\D/g, "");
			if (digits.length < 7 || digits.length > 15) {
				invalid.push(token);
				continue;
			}
			value = digits;
		}
		if (!seen.has(value)) {
			seen.add(value);
			valid.push(value);
		}
	}
	return {
		valid,
		invalid
	};
}
function BulkComposer() {
	const sessions = useGateway((s) => s.sessions);
	const activeAccountId = useGateway((s) => s.activeAccountId);
	const bulkSessionId = useGateway((s) => s.bulkSessionId);
	const startBulk = useGateway((s) => s.startBulk);
	const closeOverlay = useGateway((s) => s.closeOverlay);
	const live = useGateway((s) => s.live);
	const connected = (0, import_react.useMemo)(() => sessions.filter((s) => s.status === "connected"), [sessions]);
	const [laneIds, setLaneIds] = (0, import_react.useState)(() => {
		const preferred = pickBulkSession(sessions, bulkSessionId || activeAccountId);
		return preferred && preferred.status === "connected" ? [preferred.sessionId] : connected.map((s) => s.sessionId);
	});
	const primaryId = laneIds[0] ?? pickBulkSession(sessions, bulkSessionId || activeAccountId)?.sessionId ?? "";
	const session = sessions.find((s) => s.sessionId === primaryId);
	const toggleLane = (id) => setLaneIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
	const allSelected = connected.length > 0 && connected.every((s) => laneIds.includes(s.sessionId));
	const [source, setSource] = (0, import_react.useState)("chats");
	const [chats, setChats] = (0, import_react.useState)([]);
	const [chatsLoading, setChatsLoading] = (0, import_react.useState)(false);
	const [selected, setSelected] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
	const [search, setSearch] = (0, import_react.useState)("");
	const [kind, setKind] = (0, import_react.useState)("all");
	const [pasted, setPasted] = (0, import_react.useState)("");
	const [type, setType] = (0, import_react.useState)("text");
	const [name, setName] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)("");
	const [imageUrl, setImageUrl] = (0, import_react.useState)("");
	const [documentUrl, setDocumentUrl] = (0, import_react.useState)("");
	const [filename, setFilename] = (0, import_react.useState)("");
	const [mimetype, setMimetype] = (0, import_react.useState)("application/pdf");
	const [caption, setCaption] = (0, import_react.useState)("");
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const [uploadedName, setUploadedName] = (0, import_react.useState)({});
	const uploadInput = (0, import_react.useRef)(null);
	const pushToast = useGateway((s) => s.pushToast);
	const pickFile = async (file) => {
		if (!session) return;
		setUploading(true);
		try {
			const r = await uploadMedia(session.sessionId, file);
			if (!r.success || !r.data) {
				pushToast("error", r.message || "Upload failed");
				return;
			}
			if (type === "image") {
				setImageUrl(r.data.url);
				setUploadedName((u) => ({
					...u,
					image: r.data.filename
				}));
			} else {
				setDocumentUrl(r.data.url);
				setFilename(r.data.filename);
				setMimetype(r.data.mimetype || "application/octet-stream");
				setUploadedName((u) => ({
					...u,
					document: r.data.filename
				}));
			}
			pushToast("success", `Uploaded ${r.data.filename}`);
		} catch {
			pushToast("error", "Gateway unreachable — upload failed");
		} finally {
			setUploading(false);
		}
	};
	const [delay, setDelay] = (0, import_react.useState)(3e3);
	const [jitter, setJitter] = (0, import_react.useState)(2e3);
	const [typing, setTyping] = (0, import_react.useState)(0);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!live || !session || session.status !== "connected") {
			setChats([]);
			return;
		}
		let cancelled = false;
		setChatsLoading(true);
		listChats(session.sessionId, 500).then((r) => {
			if (!cancelled) setChats(r.success && r.data ? r.data.chats : []);
		}).catch(() => {
			if (!cancelled) setChats([]);
		}).finally(() => {
			if (!cancelled) setChatsLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [
		live,
		session?.sessionId,
		session?.status
	]);
	(0, import_react.useEffect)(() => {
		setSelected(/* @__PURE__ */ new Set());
	}, [primaryId]);
	const visibleChats = (0, import_react.useMemo)(() => {
		const q = search.trim().toLowerCase();
		return chats.filter((c) => {
			if (kind === "dm" && c.isGroup) return false;
			if (kind === "group" && !c.isGroup) return false;
			if (!q) return true;
			return (c.name ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q) || c.id.includes(q);
		});
	}, [
		chats,
		kind,
		search
	]);
	const chatIds = (0, import_react.useMemo)(() => chats.map((c) => c.id), [chats]);
	const pics = useProfilePictures(session?.status === "connected" ? session.sessionId : void 0, chatIds);
	const chatsBusy = chatsLoading || pics.isFetching;
	const parsed = (0, import_react.useMemo)(() => parseRecipients(pasted), [pasted]);
	const recipients = (0, import_react.useMemo)(() => {
		const out = new Set(selected);
		for (const r of parsed.valid) out.add(r);
		return [...out];
	}, [selected, parsed.valid]);
	const toggle = (id) => setSelected((prev) => {
		const next = new Set(prev);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		return next;
	});
	const selectVisible = (on) => setSelected((prev) => {
		const next = new Set(prev);
		for (const c of visibleChats) if (on) next.add(c.id);
		else next.delete(c.id);
		return next;
	});
	const activeLanes = laneIds.filter((id) => sessions.find((s) => s.sessionId === id)?.status === "connected");
	const problem = (() => {
		if (!live) return "Gateway offline";
		if (activeLanes.length === 0) return "Pick at least one connected account";
		if (recipients.length === 0) return "Add at least one recipient";
		if (recipients.length > MAX_RECIPIENTS) return `Max ${MAX_RECIPIENTS} recipients per campaign`;
		if (type === "text" && !message.trim()) return "Write a message";
		if (type === "image" && !imageUrl.trim()) return "Image URL is required";
		if (type === "document" && (!documentUrl.trim() || !filename.trim())) return "Document URL and filename are required";
		return null;
	})();
	const estimate = recipients.length > 1 ? (recipients.length - 1) * (delay + jitter / 2) + recipients.length * typing : 0;
	const submit = async () => {
		if (problem || submitting) return;
		setSubmitting(true);
		const payload = type === "text" ? { message: message.trim() } : type === "image" ? {
			imageUrl: imageUrl.trim(),
			caption: caption.trim()
		} : {
			documentUrl: documentUrl.trim(),
			filename: filename.trim(),
			mimetype: mimetype.trim() || void 0,
			caption: caption.trim()
		};
		await startBulk({
			sessionIds: activeLanes,
			type,
			recipients,
			payload,
			name: name.trim() || void 0,
			options: {
				delayBetweenMessages: delay,
				delayJitter: jitter,
				typingTime: typing
			}
		});
		setSubmitting(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "text-left",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-5 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: label$1,
							children: ["Send from ", activeLanes.length > 1 ? `· ${activeLanes.length} accounts (rotating)` : ""]
						}), connected.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "text-[11px] text-indigo hover:underline",
							onClick: () => setLaneIds(allSelected ? [] : connected.map((s) => s.sessionId)),
							children: allSelected ? "Clear all" : "Select all"
						}) : null]
					}),
					connected.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 rounded-xl border border-line bg-night/30 px-3 py-2 text-[11px] text-danger",
						children: "No connected account — link a phone first."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "scroll-thin mt-1 max-h-36 space-y-0.5 overflow-auto rounded-xl border border-line bg-night/30 p-1",
						children: connected.map((s) => {
							const order = laneIds.indexOf(s.sessionId);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: order > -1,
										onChange: () => toggleLane(s.sessionId),
										className: "accent-wa"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 flex-1 truncate",
										children: [s.name || s.sessionId, s.phoneNumber ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-dim",
											children: [" · ", s.phoneNumber]
										}) : null]
									}),
									s.proxy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "shrink-0 rounded-full border border-indigo/40 px-1.5 text-[9px] text-indigo",
										title: s.proxy,
										children: "proxy"
									}) : null,
									order > -1 && activeLanes.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "shrink-0 text-[10px] text-dim",
										children: ["#", order + 1]
									}) : null
								]
							}, s.sessionId);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] text-muted",
						children: activeLanes.length > 1 ? "Recipients are split round-robin across these accounts — each sends through its own proxy/IP." : "Pick more than one account to spread the campaign across numbers."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: label$1,
							children: "Recipients"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-1 rounded-lg border border-line bg-night/30 p-0.5 text-[11px]",
							children: ["chats", "paste"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setSource(s),
								className: cn("rounded-md px-2 py-1", source === s ? "bg-indigo/30 text-indigo" : "text-muted"),
								children: s === "chats" ? "From chats" : "Paste numbers"
							}, s))
						})]
					}),
					source === "chats" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 rounded-xl border border-line bg-night/30",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 border-b border-line p-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: search,
									onChange: (e) => setSearch(e.target.value),
									placeholder: "Filter chats…",
									className: "min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-dim"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: kind,
									onChange: (e) => setKind(e.target.value),
									className: "rounded-md border border-line bg-night/40 px-1.5 py-1 text-[11px]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "all",
											children: "All"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "dm",
											children: "Contacts"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "group",
											children: "Groups"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "scroll-thin max-h-48 overflow-auto p-1",
								children: [chatsBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "wa-loadbar mx-2 my-1" }) : null, chatsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "p-4 text-center text-xs text-muted",
									children: "Loading chats…"
								}) : visibleChats.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "p-4 text-center text-xs text-muted",
									children: chats.length === 0 ? "No chats on this session yet." : "No chats match."
								}) : visibleChats.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: selected.has(c.id),
											onChange: () => toggle(c.id),
											className: "accent-wa"
										}),
										pics.data?.[c.id] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: pics.data[c.id],
											alt: "",
											className: "size-6 shrink-0 rounded-full object-cover"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[9px] font-semibold",
											children: (c.name || c.phone || "?")[0]?.toUpperCase()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "min-w-0 flex-1 truncate",
											children: c.name || c.phone || c.id.split("@")[0]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "shrink-0 text-[10px] text-dim",
											children: c.isGroup ? "group" : c.phone ?? ""
										})
									]
								}, c.id))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between border-t border-line px-2 py-1.5 text-[11px] text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [selected.size, " selected"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "hover:text-ink",
										onClick: () => selectVisible(true),
										children: "Select shown"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "hover:text-ink",
										onClick: () => selectVisible(false),
										children: "Clear shown"
									})]
								})]
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: pasted,
							onChange: (e) => setPasted(e.target.value),
							rows: 7,
							placeholder: "One number per line (or comma-separated)\n628123456789\n628987654321\n120363...@g.us",
							className: cn(field$1, "font-mono text-xs")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-[11px] text-muted",
							children: [
								parsed.valid.length,
								" valid",
								parsed.invalid.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-danger",
									children: [
										" · ",
										parsed.invalid.length,
										" ignored: ",
										parsed.invalid.slice(0, 3).join(", "),
										parsed.invalid.length > 3 ? "…" : ""
									]
								}) : null
							]
						})]
					}),
					selected.size > 0 && parsed.valid.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] text-muted",
						children: "Chats and pasted numbers are combined."
					}) : null
				] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: label$1,
						children: [
							"Campaign name ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "normal-case tracking-normal text-dim",
								children: "(optional)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "September promo",
								className: cn(field$1, "mt-1")
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: label$1,
						children: "Message type"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 flex gap-1 rounded-xl border border-line bg-night/30 p-1",
						children: [
							"text",
							"image",
							"document"
						].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setType(t),
							className: cn("flex-1 rounded-lg py-1.5 text-xs font-medium", type === t ? "bg-indigo/30 text-indigo" : "text-muted hover:text-ink"),
							children: TYPE_LABEL[t]
						}, t))
					})] }),
					type === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: label$1,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center justify-between",
							children: ["Message", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: "",
								onChange: (e) => {
									const t = TEMPLATES.find((x) => x.id === e.target.value);
									if (t) setMessage(t.body);
								},
								className: "rounded-md border border-line bg-night/40 px-1.5 py-0.5 text-[11px] normal-case tracking-normal",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Insert template…"
								}), TEMPLATES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: t.id,
									children: t.title
								}, t.id))]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: message,
							onChange: (e) => setMessage(e.target.value),
							rows: 5,
							placeholder: "Hello from WA Gateway!",
							className: cn(field$1, "mt-1")
						})]
					}) : null,
					type === "image" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: label$1,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center justify-between",
								children: ["Image", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UploadButton, {
									uploading,
									disabled: !session || session.status !== "connected",
									onPick: pickFile,
									inputRef: uploadInput,
									accept: "image/*"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: imageUrl,
								onChange: (e) => setImageUrl(e.target.value),
								placeholder: "https://example.com/image.jpg — or upload a file",
								className: cn(field$1, "mt-1")
							}),
							uploadedName.image && imageUrl.startsWith("/media/") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 block text-[11px] normal-case tracking-normal text-wa",
								children: ["Attached: ", uploadedName.image]
							}) : null
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: label$1,
						children: [
							"Caption ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "normal-case tracking-normal text-dim",
								children: "(optional)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: caption,
								onChange: (e) => setCaption(e.target.value),
								rows: 3,
								className: cn(field$1, "mt-1")
							})
						]
					})] }) : null,
					type === "document" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: label$1,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center justify-between",
									children: ["Document", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UploadButton, {
										uploading,
										disabled: !session || session.status !== "connected",
										onPick: pickFile,
										inputRef: uploadInput,
										accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,image/*,video/*,audio/*"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: documentUrl,
									onChange: (e) => setDocumentUrl(e.target.value),
									placeholder: "https://example.com/brochure.pdf — or upload a file",
									className: cn(field$1, "mt-1")
								}),
								uploadedName.document && documentUrl.startsWith("/media/") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mt-1 block text-[11px] normal-case tracking-normal text-wa",
									children: ["Attached: ", uploadedName.document]
								}) : null
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: label$1,
								children: ["Filename", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: filename,
									onChange: (e) => setFilename(e.target.value),
									placeholder: "brochure.pdf",
									className: cn(field$1, "mt-1")
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: label$1,
								children: ["MIME type", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: mimetype,
									onChange: (e) => setMimetype(e.target.value),
									placeholder: "application/pdf",
									className: cn(field$1, "mt-1")
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: label$1,
							children: [
								"Caption ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "normal-case tracking-normal text-dim",
									children: "(optional)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: caption,
									onChange: (e) => setCaption(e.target.value),
									className: cn(field$1, "mt-1")
								})
							]
						})
					] }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: label$1,
							children: "Pacing"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 grid grid-cols-3 gap-2",
							children: [
								[
									"Delay (ms)",
									delay,
									setDelay,
									0
								],
								[
									"Jitter (ms)",
									jitter,
									setJitter,
									0
								],
								[
									"Typing (ms)",
									typing,
									setTyping,
									0
								]
							].map(([lbl, val, setter, min]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-[10px] text-muted",
								children: [lbl, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min,
									step: 500,
									value: val,
									onChange: (e) => setter(Math.max(min, Number(e.target.value) || 0)),
									className: cn(field$1, "mt-0.5 px-2 py-1.5 text-xs")
								})]
							}, lbl))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-[11px] text-muted",
							children: "Waits delay + random 0–jitter between messages. Steady, varied pacing is what keeps a number from being flagged."
						})
					] })
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex flex-col items-center justify-between gap-3 border-t border-line pt-4 sm:flex-row",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[12px] text-muted",
				children: recipients.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("font-semibold", recipients.length > MAX_RECIPIENTS ? "text-danger" : "text-ink"),
						children: recipients.length
					}),
					" ",
					"recipient",
					recipients.length === 1 ? "" : "s",
					estimate > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" · about ", fmtDuration(estimate)] }) : null
				] }) : "No recipients yet"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "rounded-xl border border-line px-4 py-2 text-sm",
					onClick: closeOverlay,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: Boolean(problem) || submitting,
					title: problem ?? void 0,
					onClick: () => void submit(),
					className: "rounded-xl bg-wa px-4 py-2 text-sm font-semibold text-night disabled:cursor-not-allowed disabled:opacity-50",
					children: submitting ? "Starting…" : problem ?? `Start campaign`
				})]
			})]
		})]
	});
}
function UploadButton({ uploading, disabled, onPick, inputRef, accept }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		ref: inputRef,
		type: "file",
		hidden: true,
		accept,
		onChange: (e) => {
			const f = e.target.files?.[0];
			if (f) onPick(f);
			e.target.value = "";
		}
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		disabled: disabled || uploading,
		title: disabled ? "Pick a connected session first" : "Upload from your computer",
		onClick: () => inputRef.current?.click(),
		className: "rounded-md border border-line bg-night/40 px-2 py-0.5 text-[11px] normal-case tracking-normal text-ink hover:border-indigo/50 disabled:opacity-50",
		children: uploading ? "Uploading…" : "📎 Upload file"
	})] });
}
function BroadcastPanel() {
	const sessions = useGateway((s) => s.sessions);
	const live = useGateway((s) => s.live);
	const bulkSessionId = useGateway((s) => s.bulkSessionId);
	const bulkJobs = useGateway((s) => s.bulkJobs);
	const bulkLoading = useGateway((s) => s.bulkLoading);
	const loadBulkJobs = useGateway((s) => s.loadBulkJobs);
	const setBulkSession = useGateway((s) => s.setBulkSession);
	const openOverlay = useGateway((s) => s.openOverlay);
	const [expanded, setExpanded] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		loadBulkJobs();
	}, [
		loadBulkJobs,
		live,
		sessions.length
	]);
	const session = sessions.find((s) => s.sessionId === bulkSessionId);
	const running = bulkJobs.filter((j) => j.status === "processing").length;
	const totals = bulkJobs.reduce((acc, j) => ({
		sent: acc.sent + j.sent,
		failed: acc.failed + j.failed
	}), {
		sent: 0,
		failed: 0
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass scroll-thin flex min-w-0 flex-1 flex-col overflow-auto rounded-2xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-semibold",
							children: "Broadcast"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[12px] text-muted",
							children: "Campaigns go out one message at a time with a randomised gap, and keep running after you close this page."
						})]
					}),
					sessions.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: bulkSessionId,
						onChange: (e) => setBulkSession(e.target.value),
						className: "rounded-xl border border-line bg-night/40 px-3 py-2 text-sm",
						children: sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: s.sessionId,
							children: [s.name || s.sessionId, s.status !== "connected" ? ` (${s.status})` : ""]
						}, s.sessionId))
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => openOverlay("bulk"),
						className: "rounded-xl bg-wa px-4 py-2 text-sm font-semibold text-night",
						children: "+ New campaign"
					})
				]
			}),
			bulkLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-3 wa-loadbar" }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBulkNote, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 grid grid-cols-3 gap-2 sm:max-w-md",
				children: [
					[
						"Running",
						running,
						running ? "text-indigo" : ""
					],
					[
						"Delivered",
						totals.sent,
						"text-wa"
					],
					[
						"Failed",
						totals.failed,
						totals.failed ? "text-danger" : ""
					]
				].map(([lbl, val, color]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-line bg-night/30 px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] uppercase tracking-wide text-muted",
						children: lbl
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("text-lg font-semibold", color),
						children: val
					})]
				}, lbl))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 space-y-2",
				children: !live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 py-10 text-center text-[12.5px] text-muted",
					children: "Gateway offline — campaigns need the backend."
				}) : !session ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 py-10 text-center text-[12.5px] text-muted",
					children: "Create a session and link a phone to start a campaign."
				}) : bulkJobs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-4 py-10 text-center text-[12.5px] text-muted",
					children: bulkLoading ? "Loading campaigns…" : `No campaigns on ${session.name || session.sessionId} yet.`
				}) : bulkJobs.map((job) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobCard, {
					job,
					canRetry: session.status === "connected",
					expanded: expanded === job.jobId,
					onToggle: () => setExpanded((cur) => cur === job.jobId ? null : job.jobId)
				}, job.jobId))
			})
		]
	});
}
function JobCard({ job, canRetry, expanded, onToggle }) {
	const cancelBulk = useGateway((s) => s.cancelBulk);
	const retryBulk = useGateway((s) => s.retryBulk);
	const running = job.status === "processing";
	const unsent = job.failed + job.skipped;
	const done = job.sent + job.failed + job.skipped;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-line bg-night/30 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[job.status]),
						children: job.cancelRequested && running ? "stopping" : job.status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-full border border-line px-2 py-0.5 text-[11px] text-muted",
						children: TYPE_LABEL[job.type]
					}),
					job.sessionIds && job.sessionIds.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "rounded-full border border-indigo/40 px-2 py-0.5 text-[11px] text-indigo",
						title: job.sessionIds.join(", "),
						children: [
							"🔁 ",
							job.sessionIds.length,
							" accounts"
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "min-w-0 flex-1 truncate text-sm font-medium",
						children: job.name || payloadPreview(job) || job.jobId
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] text-dim",
						children: fmtWhen(job.createdAt)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 h-1.5 overflow-hidden rounded-full bg-white/10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("h-full rounded-full transition-[width]", job.status === "interrupted" ? "bg-danger" : "bg-wa"),
					style: { width: `${job.total ? Math.round(done / job.total * 100) : 0}%` }
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-ink",
							children: done
						}),
						"/",
						job.total
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-wa",
						children: [job.sent, " sent"]
					}),
					job.failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-danger",
						children: [job.failed, " failed"]
					}) : null,
					job.skipped ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [job.skipped, " skipped"] }) : null,
					job.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-danger",
						children: ["· ", job.error]
					}) : null,
					job.perSession && Object.keys(job.perSession).length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-full basis-full pt-1 text-[10.5px] text-dim",
						children: Object.values(job.perSession).map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mr-3 inline-block",
							children: [
								p.name || p.phoneNumber || "account",
								": ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-wa",
									children: p.sent
								}),
								p.failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-danger",
									children: [
										"/",
										p.failed,
										"✗"
									]
								}) : null
							]
						}, i))
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-auto flex gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "hover:text-ink",
							onClick: onToggle,
							children: expanded ? "Hide details" : "Details"
						}), running ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: job.cancelRequested,
							className: "text-danger hover:underline disabled:opacity-50",
							onClick: () => void cancelBulk(job.jobId),
							children: "Cancel"
						}) : unsent > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: !canRetry,
							title: canRetry ? void 0 : "Session must be connected",
							className: "text-indigo hover:underline disabled:opacity-50",
							onClick: () => void retryBulk(job.jobId),
							children: [
								"Retry ",
								unsent,
								" unsent"
							]
						}) : null]
					})
				]
			}),
			expanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobDetails, {
				jobId: job.jobId,
				running
			}) : null
		]
	});
}
/** Per-recipient outcomes; re-fetched every 2s while the job is still sending. */
function JobDetails({ jobId, running }) {
	const [job, setJob] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const r = await getBulkJob(jobId);
				if (cancelled) return;
				if (r.success && r.data) setJob(r.data);
				else setError(r.message || "Could not load details");
			} catch {
				if (!cancelled) setError("Could not load details");
			}
		};
		load();
		const timer = running ? setInterval(() => void load(), 2e3) : null;
		return () => {
			cancelled = true;
			if (timer) clearInterval(timer);
		};
	}, [jobId, running]);
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-3 text-[11px] text-danger",
		children: error
	});
	if (!job) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-3 text-[11px] text-muted",
		children: "Loading…"
	});
	const pending = job.recipients.slice(job.details.length);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 border-t border-line pt-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-2 truncate text-[11px] text-muted",
			title: payloadPreview(job),
			children: [
				payloadPreview(job),
				" · delay ",
				job.options.delayBetweenMessages,
				"ms + jitter ",
				job.options.delayJitter,
				"ms",
				job.options.typingTime ? ` · typing ${job.options.typingTime}ms` : ""
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "scroll-thin max-h-56 overflow-auto rounded-lg border border-line",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
				className: "w-full text-[11px]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [job.details.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-line last:border-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-1 font-mono",
							children: d.recipient
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: cn("px-2 py-1", d.status === "sent" ? "text-wa" : d.status === "failed" ? "text-danger" : "text-muted"),
							children: d.status
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "max-w-[260px] truncate px-2 py-1 text-muted",
							title: d.error,
							children: d.error ?? (d.messageId ? `id ${d.messageId}` : "")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-1 text-right text-dim",
							children: fmtWhen(d.timestamp)
						})
					]
				}, `${d.recipient}-${d.timestamp}`)), pending.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-line last:border-0 opacity-60",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-1 font-mono",
							children: r
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-2 py-1 text-dim",
							children: "queued"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "px-2 py-1" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { className: "px-2 py-1" })
					]
				}, `pending-${r}`))] })
			})
		})]
	});
}
function useAppToast() {
	const pushToast = useGateway((s) => s.pushToast);
	return {
		success: (title, desc) => pushToast("success", desc ? `${title} — ${desc}` : title),
		error: (title, desc) => pushToast("error", desc ? `${title} — ${desc}` : title),
		warning: (title, desc) => pushToast("info", desc ? `${title} — ${desc}` : title)
	};
}
function describeAkgError(error) {
	if (error instanceof OpenWAError) {
		if (error.status === 501) return {
			kind: "engine",
			message: error.message || "Not supported by this engine."
		};
		if (error.status === 404) return {
			kind: "missing",
			message: error.message || "This feature is turned off or the resource was not found."
		};
		if (error.status === 429) return {
			kind: "rate",
			message: error.message || "Rate limited. Wait and retry."
		};
		if (error.status === 403) return {
			kind: "forbidden",
			message: "This API key cannot perform that write. Use an operator or admin key."
		};
		return {
			kind: "generic",
			message: error.message || `HTTP ${error.status}`
		};
	}
	return {
		kind: "generic",
		message: error instanceof Error ? error.message : "Request failed"
	};
}
function isViewerRole(role) {
	return role.trim().toLowerCase() === "viewer";
}
function useAkgFeatures() {
	const [data, setData] = (0, import_react.useState)(AKG_FEATURES_OFF);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		getAkgFeatures().then((flags) => {
			if (!cancelled) setData(flags);
		}).catch((err) => {
			if (!cancelled) setError(err);
		}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, []);
	return {
		data,
		error,
		loading
	};
}
function useAkgSession() {
	const sessions = useSessionsQuery();
	const storeId = useGateway((s) => s.activeAccountId);
	const [sessionId, setSessionId] = (0, import_react.useState)("");
	return {
		sessions,
		sessionId: sessionId || storeId || sessions.data?.[0]?.id || "",
		setSessionId
	};
}
function useCanWrite() {
	return !isViewerRole(useGateway((s) => s.user));
}
function SessionSelect({ value, onChange, sessions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
		className: field$2,
		value,
		onChange: (e) => onChange(e.target.value),
		children: [sessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
			value: "",
			children: "No sessions"
		}) : null, sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
			value: s.id,
			children: s.name
		}, s.id))]
	});
}
function AkgBanner({ error }) {
	if (!error) return null;
	const { kind, message } = describeAkgError(error);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "mb-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "font-semibold",
				children: [{
					engine: "Not supported by this engine",
					missing: "Feature off or not found",
					rate: "Rate limited",
					forbidden: "Read-only key",
					generic: "Error"
				}[kind], "."]
			}),
			" ",
			message
		]
	});
}
function FlagOff({ name }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
		title: name,
		sub: "This capability is turned off for this deployment.",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Enable the matching env flag and restart, or hide this screen."
		})
	});
}
function EmptyHint({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-6 text-center text-[12.5px] text-muted",
		children
	});
}
function ConfirmBar({ prompt, onConfirm, onCancel, busy }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-2 rounded-xl border border-danger/30 bg-danger/10 p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-danger",
			children: prompt
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: danger,
				disabled: busy,
				onClick: onConfirm,
				children: "Confirm"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: ghost,
				onClick: onCancel,
				children: "Cancel"
			})]
		})]
	});
}
function StickerTool() {
	const toast = useAppToast();
	const flags = useAkgFeatures();
	const { sessionId } = useAkgSession();
	const canWrite = useCanWrite();
	const [chatId, setChatId] = (0, import_react.useState)("");
	const [pack, setPack] = (0, import_react.useState)("OpenWA");
	const [author, setAuthor] = (0, import_react.useState)("OpenWA");
	const [removeBg, setRemoveBg] = (0, import_react.useState)(false);
	const [preview, setPreview] = (0, import_react.useState)(null);
	const [converted, setConverted] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
		title: "Sticker convert",
		sub: "Upload → convert → preview → send. Reuses the existing base64 path and size cap.",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error: error ?? flags.error }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: field$2,
					value: chatId,
					onChange: (e) => setChatId(e.target.value),
					placeholder: "Destination chat JID"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: field$2,
					value: pack,
					onChange: (e) => setPack(e.target.value),
					placeholder: "Pack name"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: field$2,
					value: author,
					onChange: (e) => setAuthor(e.target.value),
					placeholder: "Author"
				}),
				flags.data.removeBgConfigured ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
						checked: removeBg,
						onChange: setRemoveBg
					}), "Remove background"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-muted",
					children: "remove.bg is not configured on this deployment."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "file",
					accept: "image/*,video/*",
					disabled: !canWrite || busy,
					onChange: (e) => {
						const file = e.target.files?.[0];
						e.target.value = "";
						if (!file || !sessionId) return;
						if (file.size > 18874368) {
							toast.error("File exceeds the media size cap.");
							return;
						}
						setBusy(true);
						setError(null);
						convertSticker(sessionId, file, {
							packName: pack,
							author,
							removeBg
						}).then((res) => {
							setConverted(res);
							setPreview(`data:${res.mimetype};base64,${res.base64}`);
							toast.success("Converted");
						}).catch(setError).finally(() => setBusy(false));
					}
				}),
				preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: preview,
					alt: "",
					className: "max-h-40 w-auto object-contain"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: btn,
					disabled: !canWrite || !converted || !chatId,
					onClick: () => {
						if (!converted) return;
						setError(null);
						sendStickerAkg(sessionId, chatId, {
							base64: converted.base64,
							mimetype: converted.mimetype,
							packName: pack,
							author
						}).then(() => toast.success("Sticker sent")).catch(setError);
					},
					children: "Send sticker"
				})
			]
		})]
	});
}
function Overlays() {
	const overlay = useGateway((s) => s.overlay);
	const close = useGateway((s) => s.closeOverlay);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (e.key === "Escape") close();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [close]);
	if (!overlay) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm",
		onClick: (e) => {
			if (e.target === e.currentTarget) close();
		},
		children: [
			overlay === "qr" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrModal, {}),
			overlay === "create-session" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateSessionModal, {}),
			overlay === "webhooks" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WebhooksModal, {}),
			overlay === "proxy" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProxyModal, {}),
			overlay === "bulk" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulkModal, {}),
			overlay === "templates" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TemplatesModal, {}),
			overlay === "search" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchModal, {})
		]
	});
}
function Card({ title, sub, children, wide, size }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("glass max-h-[90vh] overflow-y-auto rounded-3xl p-7 text-center", size === "xl" ? "w-full max-w-4xl" : wide ? "w-full max-w-xl" : "w-full max-w-md"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-semibold",
				children: title
			}),
			sub ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: sub
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5",
				children
			})
		]
	});
}
function QrModal() {
	const { qrSession, qrSrc, qrExpiresAt, pairingCode, pairingExpiresAt, pairingLoading, refreshQr, requestPairingCode, closeOverlay } = useGateway();
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	const [phone, setPhone] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const timer = setInterval(() => setNow(Date.now()), 1e3);
		return () => clearInterval(timer);
	}, []);
	(0, import_react.useEffect)(() => {
		if (qrSession) refreshQr(qrSession);
	}, [qrSession, refreshQr]);
	const secondsLeft = qrExpiresAt !== null ? Math.max(0, Math.ceil((qrExpiresAt - now) / 1e3)) : null;
	const countdown = secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : null;
	const timerLabel = !qrSrc ? "Generating QR…" : secondsLeft === null ? "Scan the QR code below" : secondsLeft > 0 ? `QR expires in ${countdown}` : "QR expired — waiting for a new code…";
	const pairingSecondsLeft = pairingExpiresAt !== null ? Math.max(0, Math.ceil((pairingExpiresAt - now) / 1e3)) : null;
	const formattedCode = (0, import_react.useMemo)(() => {
		const raw = pairingCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
		if (raw.length === 8) return `${raw.slice(0, 4)}-${raw.slice(4)}`;
		return pairingCode;
	}, [pairingCode]);
	const submitPhone = () => {
		requestPairingCode(phone);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Link WhatsApp",
		sub: `Session: ${qrSession || "—"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto inline-block rounded-xl bg-white p-3",
				children: qrSrc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: qrSrc,
					alt: "QR",
					width: 220,
					height: 220,
					className: "block size-[220px]"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-[220px] animate-pulse bg-zinc-200" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-3 text-center text-xs font-semibold tabular-nums", secondsLeft !== null && secondsLeft <= 20 ? "text-danger" : "text-muted"),
				children: timerLabel
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted",
				children: "Open WhatsApp → Linked Devices → Link a Device"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-line" }),
					"or link with phone number",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-line" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "block text-left text-xs text-muted",
				children: ["Phone number (with country code)", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "mt-1 flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: phone,
						onChange: (e) => setPhone(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter") submitPhone();
						},
						placeholder: "919876543210",
						inputMode: "tel",
						autoComplete: "tel",
						className: "min-w-0 flex-1 rounded-xl border border-line bg-night/40 px-3 py-2.5 text-sm text-ink outline-none"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: pairingLoading || !phone.replace(/\D/g, ""),
						className: "shrink-0 rounded-xl bg-wa px-3 py-2 text-sm font-semibold text-night disabled:opacity-50",
						onClick: submitPhone,
						children: pairingLoading ? "…" : "Get code"
					})]
				})]
			}),
			formattedCode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-2xl border border-line bg-night/30 px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] uppercase tracking-wide text-muted",
						children: "Pairing code"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-mono text-2xl font-semibold tracking-[0.2em] text-ink",
						children: formattedCode
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-muted",
						children: ["WhatsApp → Linked Devices → Link with phone number instead", pairingSecondsLeft !== null ? pairingSecondsLeft > 0 ? ` · expires in ${pairingSecondsLeft}s` : " · expired — request a new code" : ""]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-left text-xs text-muted",
				children: "Use the same number as the phone that will enter the code, including country code (India: 91…). No + or spaces."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "mt-5 rounded-xl border border-line px-4 py-2 text-sm",
				onClick: closeOverlay,
				children: "Close"
			})
		]
	});
}
function CreateSessionModal() {
	const { createSession, closeOverlay } = useGateway();
	const [id, setId] = (0, import_react.useState)("");
	const [hook, setHook] = (0, import_react.useState)("");
	const [proxy, setProxy] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Create New Session",
		sub: "Connect another WhatsApp number",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mb-3 block text-left text-xs text-muted",
				children: ["Session ID", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: id,
					onChange: (e) => setId(e.target.value),
					placeholder: "my-session-1",
					className: "mt-1 w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 text-sm text-ink outline-none"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mb-3 block text-left text-xs text-muted",
				children: ["Webhook URL (optional)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: hook,
					onChange: (e) => setHook(e.target.value),
					placeholder: "https://your-server.com/webhook",
					className: "mt-1 w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 text-sm text-ink outline-none"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProxyField, {
					value: proxy,
					onChange: setProxy
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "rounded-xl border border-line px-4 py-2 text-sm",
					onClick: closeOverlay,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "rounded-xl bg-wa px-4 py-2 text-sm font-semibold text-night",
					onClick: () => void createSession(id.trim(), hook.trim() || void 0, proxy.trim() || void 0),
					children: "Create & Connect"
				})]
			})
		]
	});
}
/**
* Proxy URL input with a "Test" button that fetches the egress IP through it.
* Shared by the create-session and proxy modals.
*/
function ProxyField({ value, onChange }) {
	const testProxy = useGateway((s) => s.testProxy);
	const [checking, setChecking] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	const run = async () => {
		if (!value.trim()) return;
		setChecking(true);
		setResult(await testProxy(value.trim()));
		setChecking(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-left text-xs text-muted",
		children: [
			"Proxy (optional)",
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "mt-1 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value,
					onChange: (e) => {
						onChange(e.target.value);
						setResult(null);
					},
					placeholder: "socks5://user:pass@host:1080",
					spellCheck: false,
					className: "min-w-0 flex-1 rounded-xl border border-line bg-night/40 px-3 py-2.5 font-mono text-[12px] text-ink outline-none"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: !value.trim() || checking,
					onClick: () => void run(),
					className: "shrink-0 rounded-xl border border-line px-3 py-2 text-xs disabled:opacity-50",
					children: checking ? "Testing…" : "Test"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 block text-[11px]",
				children: result ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: result.ok ? "text-wa" : "text-danger",
					children: [result.message, result.ok && result.latencyMs ? ` · ${result.latencyMs} ms` : ""]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-dim",
					children: "socks5:// or http(s)://. Every connection of this session — socket and media — goes through it."
				})
			})
		]
	});
}
function ProxyModal() {
	const { proxySessionId, sessions, setProxy, closeOverlay } = useGateway();
	const session = sessions.find((s) => s.sessionId === proxySessionId);
	const current = session?.proxy ?? null;
	const [value, setValue] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const live = session ? [
		"connecting",
		"qr_ready",
		"connected"
	].includes(session.status) : false;
	const save = async (proxy) => {
		setSaving(true);
		const ok = await setProxy(proxySessionId, proxy);
		setSaving(false);
		if (ok) closeOverlay();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Session Proxy",
		sub: `Session: ${proxySessionId}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 rounded-xl border border-line bg-night/30 px-3 py-2 text-left text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[10px] uppercase tracking-wide text-muted",
					children: "Current"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("mt-0.5 font-mono text-[12px] break-all", current ? "text-ink" : "text-dim"),
					children: current ?? "Direct connection (no proxy)"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProxyField, {
				value,
				onChange: setValue
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-left text-[11px] text-muted",
				children: live ? "Saving restarts the session through the new proxy (a few seconds offline; no new QR needed once paired)." : "The proxy is used the next time this session connects."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap justify-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rounded-xl border border-line px-4 py-2 text-sm",
						onClick: closeOverlay,
						children: "Cancel"
					}),
					current ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rounded-xl border border-danger/30 px-4 py-2 text-sm text-danger disabled:opacity-50",
						disabled: saving,
						onClick: () => void save(null),
						children: "Remove proxy"
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "rounded-xl bg-wa px-4 py-2 text-sm font-semibold text-night disabled:opacity-50",
						disabled: saving || !value.trim(),
						onClick: () => void save(value.trim()),
						children: saving ? "Saving…" : live ? "Save & reconnect" : "Save"
					})
				]
			})
		]
	});
}
function WebhooksModal() {
	const { webhookSessionId, sessions, addHook, removeHook, closeOverlay } = useGateway();
	const session = sessions.find((s) => s.sessionId === webhookSessionId);
	const [url, setUrl] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Manage Webhooks",
		sub: `Session: ${webhookSessionId}`,
		wide: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				value: url,
				onChange: (e) => setUrl(e.target.value),
				placeholder: "https://your-server.com/webhook",
				className: "mb-3 w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 text-left text-sm text-ink outline-none"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "mb-4 w-full rounded-xl bg-wa py-2.5 text-sm font-semibold text-night",
				onClick: () => {
					if (url) addHook(url, ["message"]);
					setUrl("");
				},
				children: "Add webhook"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2 text-left",
				children: (session?.webhooks ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No webhooks configured"
				}) : (session?.webhooks ?? []).map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-xl border border-line bg-night/30 px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "break-all text-sm",
						children: w.url
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[11px] text-muted",
						children: w.events?.join(", ") || "All events"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "text-danger text-xs",
						onClick: () => void removeHook(w.url),
						children: "Remove"
					})]
				}, w.url))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "mt-4 rounded-xl border border-line px-4 py-2 text-sm",
				onClick: closeOverlay,
				children: "Close"
			})
		]
	});
}
function BulkModal() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "New campaign",
		sub: "Send one message to many chats — runs in the background with progress tracking",
		size: "xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BulkComposer, {})
	});
}
function TemplatesModal() {
	const applyTemplate = useGateway((s) => s.applyTemplate);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Message Templates",
		sub: "Insert a saved reply",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2 text-left",
			children: TEMPLATES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "w-full rounded-xl border border-line bg-night/30 px-3 py-3 text-left hover:border-indigo/50",
				onClick: () => applyTemplate(t.body),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-medium",
					children: t.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted",
					children: t.body
				})]
			}, t.id))
		})
	});
}
function SearchModal() {
	const { chats, query, setQuery, selectChat, closeOverlay } = useGateway();
	const hits = chats.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.preview.toLowerCase().includes(query.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Search",
		sub: "Messages, contacts, groups",
		wide: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			autoFocus: true,
			value: query,
			onChange: (e) => setQuery(e.target.value),
			placeholder: "Type to search…",
			className: "mb-3 w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 text-left text-sm text-ink outline-none"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-h-64 space-y-1 overflow-auto text-left",
			children: hits.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-glass",
				onClick: () => {
					selectChat(c.id);
					closeOverlay();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-medium",
					children: c.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate text-xs text-muted",
					children: c.preview
				})]
			}, c.id))
		})]
	});
}
function ToolsPanel() {
	const { sessions, events, clearEvents, openOverlay, reconnect, removeSession, live, wsConnected, wsClients, runApi, apiKey, setApiKey, logout, login, setNav, serverUrl } = useGateway();
	const [endpoint, setEndpoint] = (0, import_react.useState)(API_ENDPOINTS[0].value);
	const [sessionId, setSessionId] = (0, import_react.useState)("");
	const [jobId, setJobId] = (0, import_react.useState)("");
	const [body, setBody] = (0, import_react.useState)("{}");
	const [help, setHelp] = (0, import_react.useState)("");
	const [response, setResponse] = (0, import_react.useState)("Response will appear here…");
	const [url, setUrl] = (0, import_react.useState)(serverUrl);
	(0, import_react.useEffect)(() => {
		const [method, path] = endpoint.split("|");
		const sample = sampleBodyFor(path, method);
		setBody(sample.body ? JSON.stringify(sample.body, null, 2) : "");
		setHelp(sample.help);
	}, [endpoint]);
	const groups = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const e of API_ENDPOINTS) {
			const list = map.get(e.group) ?? [];
			list.push(e);
			map.set(e.group, list);
		}
		return [...map.entries()];
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[1.2fr_0.8fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickerTool, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "glass rounded-2xl p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-3 text-sm font-semibold",
						children: "Sections"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							{
								id: "chats",
								label: "Chats"
							},
							{
								id: "contacts",
								label: "Contacts"
							},
							{
								id: "groups",
								label: "Groups"
							},
							{
								id: "broadcast",
								label: "Broadcast"
							},
							{
								id: "scrapers",
								label: "Scrapers"
							}
						].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setNav(s.id),
							className: "rounded-xl border border-line bg-night/30 px-3 py-1.5 text-xs font-medium hover:border-indigo/40 hover:text-indigo",
							children: s.label
						}, s.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "glass rounded-2xl p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-semibold",
								children: "Sessions"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "rounded-lg bg-wa px-3 py-1.5 text-xs font-semibold text-night",
								onClick: () => openOverlay("create-session"),
								children: "+ New Session"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mb-3 text-[11px] text-muted",
							children: [
								live ? "Live gateway" : "Gateway offline",
								" · WS ",
								wsConnected ? "connected" : "offline",
								" · ",
								wsClients,
								" clients"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 rounded-xl border border-line bg-night/30 p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid size-10 place-items-center rounded-full bg-gradient-to-br from-wa to-wa-deep text-sm font-bold text-night",
										children: (s.name || s.sessionId)[0].toUpperCase()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "truncate text-sm font-medium",
												children: s.name || s.sessionId
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "truncate text-xs text-muted",
												children: s.phoneNumber || s.sessionId
											}),
											s.proxyInfo?.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1 flex flex-wrap items-center gap-1.5 text-[10px]",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 shrink-0 rounded-full", s.proxyInfo.connected ? "bg-indigo-300 shadow-[0_0_6px_#818cf8]" : "bg-white/30") }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: cn("font-medium", s.proxyInfo.connected ? "text-indigo-200" : "text-muted"),
														children: s.proxyInfo.connected ? "via" : "idle"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate font-mono text-indigo-100",
														title: s.proxyInfo.active,
														children: s.proxyInfo.active
													}),
													s.proxyInfo.source === "pool" && s.proxyInfo.poolSize > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "rounded-full border border-indigo/40 px-1.5 py-px text-indigo",
														children: [
															"pool ",
															(s.proxyInfo.index ?? 0) + 1,
															"/",
															s.proxyInfo.poolSize
														]
													}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "rounded-full border border-indigo/40 px-1.5 py-px text-indigo",
														children: s.proxyInfo.source === "session" ? "session" : "single"
													}),
													s.proxyInfo.required ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "rounded-full bg-emerald-500/15 px-1.5 py-px text-emerald-300",
														children: "no direct"
													}) : null,
													s.proxyInfo.rotations > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-muted",
														children: [
															"· ",
															s.proxyInfo.rotations,
															"× rotated"
														]
													}) : null
												]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-1 text-[10px] text-white/40",
												children: "Direct connection (no proxy)"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: cn("rounded-full px-2 py-0.5 text-[11px]", s.status === "connected" ? "bg-wa/15 text-wa" : "bg-danger/15 text-danger"),
										children: s.status
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "text-xs text-muted",
										onClick: () => openOverlay("qr", s.sessionId),
										children: "QR"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "text-xs text-muted",
										onClick: () => void reconnect(s.sessionId),
										children: "Reconnect"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "text-xs text-muted",
										onClick: () => openOverlay("webhooks", s.sessionId),
										children: "Hooks"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: cn("text-xs", s.proxy ? "text-indigo" : "text-muted"),
										onClick: () => openOverlay("proxy", s.sessionId),
										children: "Proxy"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "text-xs text-danger",
										onClick: () => void removeSession(s.sessionId),
										children: "Delete"
									})
								]
							}, s.sessionId))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "glass rounded-2xl p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-3 text-sm font-semibold",
							children: "API Tester"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: endpoint,
							onChange: (e) => setEndpoint(e.target.value),
							className: "mb-3 w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm",
							children: groups.map(([g, items]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("optgroup", {
								label: g,
								children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: i.value,
									children: i.label
								}, i.value))
							}, g))
						}),
						endpoint.includes("{sessionId}") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: sessionId,
							onChange: (e) => setSessionId(e.target.value),
							placeholder: "Session ID",
							className: "mb-2 w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm"
						}),
						endpoint.includes("{jobId}") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: jobId,
							onChange: (e) => setJobId(e.target.value),
							placeholder: "Job ID",
							className: "mb-2 w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm"
						}),
						body !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: body,
							onChange: (e) => setBody(e.target.value),
							rows: 6,
							className: "mb-2 w-full rounded-xl border border-line bg-night/40 px-3 py-2 font-mono text-xs"
						}),
						help ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-[11px] text-muted",
							children: help
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "rounded-xl bg-indigo px-4 py-2 text-sm font-medium",
							onClick: async () => {
								const [method, rawPath] = endpoint.split("|");
								let path = rawPath;
								if (path.includes("{sessionId}")) path = path.replace("{sessionId}", sessionId);
								if (path.includes("{jobId}")) path = path.replace("{jobId}", jobId);
								const res = await runApi(method, path, body);
								setResponse(JSON.stringify(res, null, 2));
							},
							children: "Send Request"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-3 max-h-48 overflow-auto rounded-xl border border-line bg-night/40 p-3 text-left font-mono text-[11px] text-muted",
							children: response
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "glass rounded-2xl p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold",
						children: "Live Events"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "text-xs text-muted",
						onClick: clearEvents,
						children: "Clear"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "scroll-thin h-72 overflow-auto font-mono text-[11px]",
					children: [events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "p-6 text-center text-muted",
						children: "No events yet"
					}) : null, events.map((ev) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2 border-b border-line px-2 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-dim",
								children: ev.time
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-wa",
								children: ev.type
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: ev.content
							})
						]
					}, ev.id))]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "glass rounded-2xl p-4 text-left",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mb-3 text-sm font-semibold",
						children: "OpenWA credentials"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: url,
						onChange: (e) => setUrl(e.target.value),
						placeholder: "http://localhost:2785",
						className: "mb-2 w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: apiKey,
						onChange: (e) => setApiKey(e.target.value),
						placeholder: "API key",
						className: "mb-3 w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-sm"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "rounded-xl bg-wa px-3 py-2 text-xs font-semibold text-night",
							onClick: () => void login("operator", "", apiKey, url),
							children: "Connect backend"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "rounded-xl border border-line px-3 py-2 text-xs",
							onClick: logout,
							children: "Logout"
						})]
					})
				]
			})]
		})]
	});
}
function Toasts() {
	const toasts = useGateway((s) => s.toasts);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none fixed right-5 bottom-5 z-50 flex flex-col gap-2",
		children: toasts.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-auto glass rounded-xl px-4 py-3 text-sm shadow-lg",
			children: t.message
		}, t.id))
	});
}
var field = "w-full rounded-xl border border-line bg-night/40 px-3 py-2 text-left text-sm text-ink outline-none placeholder:text-dim";
var label = "block text-left text-[11px] font-medium uppercase tracking-wide text-muted";
function Section({ title, sub, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "glass rounded-2xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 text-[11.5px] text-muted",
				children: sub
			}),
			children
		]
	});
}
/** Checkbox list of connected accounts, with select-all. */
function AccountPicker({ selected, onToggle, onAll }) {
	const connected = useGateway((s) => s.sessions).filter((s) => s.status === "connected");
	const allOn = connected.length > 0 && connected.every((s) => selected.includes(s.sessionId));
	if (connected.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "rounded-xl border border-line bg-night/30 px-3 py-2 text-[11px] text-danger",
		children: "No connected account."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: label,
			children: "Accounts"
		}), connected.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "text-[11px] text-indigo hover:underline",
			onClick: () => onAll(!allOn),
			children: allOn ? "Clear all" : "Select all"
		}) : null]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "scroll-thin mt-1 max-h-32 space-y-0.5 overflow-auto rounded-xl border border-line bg-night/30 p-1",
		children: connected.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: selected.includes(s.sessionId),
					onChange: () => onToggle(s.sessionId),
					className: "accent-wa"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 flex-1 truncate",
					children: [s.name || s.sessionId, s.phoneNumber ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-dim",
						children: [" · ", s.phoneNumber]
					}) : null]
				}),
				s.proxy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "shrink-0 rounded-full border border-indigo/40 px-1.5 text-[9px] text-indigo",
					children: "proxy"
				}) : null
			]
		}, s.sessionId))
	})] });
}
/** A scraped-contacts result table with a CSV download. */
function ResultTable({ contacts, filename }) {
	const [q, setQ] = (0, import_react.useState)("");
	const shown = (0, import_react.useMemo)(() => {
		const s = q.trim().toLowerCase();
		if (!s) return contacts;
		return contacts.filter((c) => c.phone.includes(s) || (c.name ?? "").toLowerCase().includes(s));
	}, [contacts, q]);
	if (contacts.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: q,
					onChange: (e) => setQ(e.target.value),
					placeholder: `Filter ${contacts.length}…`,
					className: cn(field, "h-8 py-1")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => downloadContactsCsv(shown, filename),
					className: "shrink-0 rounded-xl bg-wa px-3 py-1.5 text-xs font-semibold text-night",
					children: [
						"⬇ CSV (",
						shown.length,
						")"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "scroll-thin max-h-72 overflow-auto rounded-xl border border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-[11.5px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "sticky top-0 bg-night/80 text-left text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Phone"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-2 py-1 font-medium",
								children: "Groups / Accounts"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: shown.slice(0, 500).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-2 py-1 font-mono",
								children: c.phone
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "max-w-[160px] truncate px-2 py-1",
								children: c.name || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-dim",
									children: "—"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "max-w-[220px] truncate px-2 py-1 text-muted",
								children: (c.groups ?? (c.groupName ? [c.groupName] : [])).join(", ") || (c.sources ?? (c.sessionId ? [c.sessionId] : [])).join(", ")
							})
						]
					}, c.jid + (c.groupName ?? ""))) })]
				})
			}),
			shown.length > 500 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-[11px] text-muted",
				children: [
					"Showing first 500 — the CSV holds all ",
					shown.length,
					"."
				]
			}) : null
		]
	});
}
function ContactScraper() {
	const pushToast = useGateway((s) => s.pushToast);
	const activeAccountId = useGateway((s) => s.activeAccountId);
	const [selected, setSelected] = (0, import_react.useState)(activeAccountId ? [activeAccountId] : []);
	const [dedupe, setDedupe] = (0, import_react.useState)(true);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	const run = async () => {
		if (selected.length === 0) return pushToast("error", "Pick at least one account");
		setLoading(true);
		setResult(null);
		try {
			const r = await scrapeContacts(selected, { dedupe });
			if (!r.success || !r.data) return pushToast("error", r.message || "Scrape failed");
			setResult(r.data.contacts);
			pushToast("success", `Scraped ${r.data.total} contacts from ${r.data.accounts.length} account(s)`);
		} catch {
			pushToast("error", "Gateway unreachable");
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
		title: "Contact Scraper",
		sub: "Pull the saved contacts from one or more connected accounts.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountPicker, {
				selected,
				onToggle: (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]),
				onAll: (on) => {
					const conn = useGateway.getState().sessions.filter((s) => s.status === "connected").map((s) => s.sessionId);
					setSelected(on ? conn : []);
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mt-2 flex items-center gap-2 text-[12px] text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: dedupe,
					onChange: (e) => setDedupe(e.target.checked),
					className: "accent-wa"
				}), "Merge duplicates across accounts"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: loading || selected.length === 0,
				onClick: () => void run(),
				className: "mt-3 rounded-xl bg-indigo px-4 py-2 text-sm font-medium disabled:opacity-50",
				children: loading ? "Scraping…" : "Scrape contacts"
			}),
			result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultTable, {
				contacts: result,
				filename: "contacts.csv"
			}) : null
		]
	});
}
function GroupScraper() {
	const pushToast = useGateway((s) => s.pushToast);
	const sessions = useGateway((s) => s.sessions);
	const activeAccountId = useGateway((s) => s.activeAccountId);
	const connected = sessions.filter((s) => s.status === "connected");
	const [sessionId, setSessionId] = (0, import_react.useState)(() => (connected.find((s) => s.sessionId === activeAccountId) ?? connected[0])?.sessionId ?? "");
	const [scope, setScope] = (0, import_react.useState)("all");
	const [groups, setGroups] = (0, import_react.useState)([]);
	const [groupsLoading, setGroupsLoading] = (0, import_react.useState)(false);
	const [picked, setPicked] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (scope !== "pick" || !sessionId) return;
		let cancelled = false;
		setGroupsLoading(true);
		listGroups(sessionId).then((r) => {
			if (!cancelled) setGroups(r.success && r.data ? r.data.groups : []);
		}).catch(() => !cancelled && setGroups([])).finally(() => !cancelled && setGroupsLoading(false));
		return () => {
			cancelled = true;
		};
	}, [scope, sessionId]);
	(0, import_react.useEffect)(() => {
		setPicked([]);
		setResult(null);
	}, [sessionId]);
	const run = async () => {
		if (!sessionId) return pushToast("error", "Pick a connected account");
		if (scope === "pick" && picked.length === 0) return pushToast("error", "Pick at least one group");
		setLoading(true);
		setResult(null);
		try {
			const r = await scrapeGroups([sessionId], scope === "all" ? null : picked, { dedupe: true });
			if (!r.success || !r.data) return pushToast("error", r.message || "Scrape failed");
			setResult(r.data.contacts);
			pushToast("success", `Scraped ${r.data.total} members from ${r.data.groups.length} group(s)`);
		} catch {
			pushToast("error", "Gateway unreachable");
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
		title: "Group Scraper",
		sub: "Pull members from all groups on an account, or just the groups you choose.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: label,
				children: ["Account", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					value: sessionId,
					onChange: (e) => setSessionId(e.target.value),
					className: cn(field, "mt-1"),
					children: [connected.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "No connected account"
					}) : null, connected.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value: s.sessionId,
						children: [s.name || s.sessionId, s.phoneNumber ? ` · ${s.phoneNumber}` : ""]
					}, s.sessionId))]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex gap-1 rounded-xl border border-line bg-night/30 p-1 text-[12px]",
				children: ["all", "pick"].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setScope(v),
					className: cn("flex-1 rounded-lg py-1.5", scope === v ? "bg-indigo/30 text-indigo" : "text-muted"),
					children: v === "all" ? "All groups" : "Choose groups"
				}, v))
			}),
			scope === "pick" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "scroll-thin mt-2 max-h-40 space-y-0.5 overflow-auto rounded-xl border border-line bg-night/30 p-1",
				children: groupsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "wa-loadbar mx-2 my-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "p-3 text-center text-xs text-muted",
					children: "Loading groups…"
				})] }) : groups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "p-3 text-center text-xs text-muted",
					children: "No groups on this account."
				}) : groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: picked.includes(g.id),
							onChange: () => setPicked((p) => p.includes(g.id) ? p.filter((x) => x !== g.id) : [...p, g.id]),
							className: "accent-wa"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "min-w-0 flex-1 truncate",
							children: g.name || g.id
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "shrink-0 text-[10px] text-dim",
							children: g.participantsCount ?? "?"
						})
					]
				}, g.id))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: loading || !sessionId,
				onClick: () => void run(),
				className: "mt-3 rounded-xl bg-indigo px-4 py-2 text-sm font-medium disabled:opacity-50",
				children: loading ? "Scraping…" : scope === "all" ? "Scrape all groups" : `Scrape ${picked.length || ""} group(s)`
			}),
			result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultTable, {
				contacts: result,
				filename: "group-members.csv"
			}) : null
		]
	});
}
function AddToGroup() {
	const pushToast = useGateway((s) => s.pushToast);
	const sessions = useGateway((s) => s.sessions);
	const activeAccountId = useGateway((s) => s.activeAccountId);
	const connected = sessions.filter((s) => s.status === "connected");
	const [sessionId, setSessionId] = (0, import_react.useState)(() => (connected.find((s) => s.sessionId === activeAccountId) ?? connected[0])?.sessionId ?? "");
	const [groups, setGroups] = (0, import_react.useState)([]);
	const [groupId, setGroupId] = (0, import_react.useState)("");
	const [numbers, setNumbers] = (0, import_react.useState)("");
	const [name, setName] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [log, setLog] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!sessionId) return;
		let cancelled = false;
		listGroups(sessionId).then((r) => {
			if (cancelled) return;
			const gs = r.success && r.data ? r.data.groups : [];
			setGroups(gs);
			setGroupId((cur) => gs.some((g) => g.id === cur) ? cur : gs[0]?.id ?? "");
		}).catch(() => !cancelled && setGroups([]));
		return () => {
			cancelled = true;
		};
	}, [sessionId]);
	const parsed = (0, import_react.useMemo)(() => parseRecipients(numbers), [numbers]);
	const run = async () => {
		if (!sessionId || !groupId) return pushToast("error", "Pick an account and a group");
		if (parsed.valid.length === 0) return pushToast("error", "Add at least one valid number");
		setBusy(true);
		setLog(null);
		try {
			const r = await addContactsToGroup({
				sessionId,
				groupId,
				phones: parsed.valid,
				name: name.trim() || void 0
			});
			if (!r.data) return pushToast("error", r.message || "Failed");
			setLog(r.data.results.map((x) => ({
				phone: x.phone,
				ok: x.success,
				msg: x.message || (x.success ? "added" : "failed")
			})));
			pushToast(r.data.added > 0 ? "success" : "error", `Added ${r.data.added}/${r.data.results.length}. Each number is saved as a contact first.`);
		} catch {
			pushToast("error", "Gateway unreachable");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
		title: "Add Contacts to a Group",
		sub: "Each number is saved to the account's address book first, then added to the group.",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: label,
					children: ["Account", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: sessionId,
						onChange: (e) => setSessionId(e.target.value),
						className: cn(field, "mt-1"),
						children: [connected.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "No connected account"
						}) : null, connected.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: s.sessionId,
							children: s.name || s.sessionId
						}, s.sessionId))]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: label,
					children: ["Group", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: groupId,
						onChange: (e) => setGroupId(e.target.value),
						className: cn(field, "mt-1"),
						children: [groups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "No groups"
						}) : null, groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: g.id,
							children: g.name || g.id
						}, g.id))]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: cn(label, "mt-2"),
				children: [
					"Contact name ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "normal-case tracking-normal text-dim",
						children: "(optional — used for all)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: "e.g. Lead",
						className: cn(field, "mt-1")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: cn(label, "mt-2"),
				children: ["Phone numbers", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					value: numbers,
					onChange: (e) => setNumbers(e.target.value),
					rows: 5,
					placeholder: "One per line\n628123456789\n628987654321",
					className: cn(field, "mt-1 font-mono text-xs")
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-[11px] text-muted",
				children: [
					parsed.valid.length,
					" valid",
					parsed.invalid.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-danger",
						children: [
							" · ",
							parsed.invalid.length,
							" ignored"
						]
					}) : null,
					" · only the group's admins can add members, and some numbers reject being added by strangers."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: busy || !groupId || parsed.valid.length === 0,
				onClick: () => void run(),
				className: "mt-3 rounded-xl bg-wa px-4 py-2 text-sm font-semibold text-night disabled:opacity-50",
				children: busy ? "Adding…" : `Save & add ${parsed.valid.length || ""} to group`
			}),
			log ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "scroll-thin mt-3 max-h-56 space-y-1 overflow-auto rounded-xl border border-line p-1 text-[11.5px]",
				children: log.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 px-2 py-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 shrink-0 rounded-full", l.ok ? "bg-wa" : "bg-danger") }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono",
							children: l.phone
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("truncate", l.ok ? "text-muted" : "text-danger"),
							children: l.msg
						})
					]
				}, l.phone))
			}) : null
		]
	});
}
function ScrapersPanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass scroll-thin min-w-0 flex-1 overflow-auto rounded-2xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-1 text-base font-semibold",
				children: "Scrapers & Contacts"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 text-[12px] text-muted",
				children: "Export contacts, pull group members, and add saved contacts into groups."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 xl:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContactScraper, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GroupScraper, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "xl:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddToGroup, {})
					})
				]
			})
		]
	});
}
var TYPE_COLORS = {
	text: "#25d366",
	image: "#3b82f6",
	contact: "#a855f7",
	document: "#f59e0b",
	audio: "#06b6d4",
	voice: "#ec4899",
	video: "#14b8a6",
	sticker: "#ef4444",
	location: "#84cc16",
	poll: "#6366f1",
	revoked: "#f43f5e",
	unknown: "#64748b"
};
function formatLastActive(date) {
	if (!date) return "Never";
	const diff = Date.now() - new Date(date).getTime();
	if (diff < 6e4) return "Just now";
	if (diff < 36e5) return `${Math.floor(diff / 6e4)} min ago`;
	if (diff < 864e5) return `${Math.floor(diff / 36e5)} hours ago`;
	return new Date(date).toLocaleDateString();
}
function OverviewPanel() {
	const setPanel = useGateway((s) => s.setSettingsPanel);
	const sessions = useSessionsQuery();
	const stats = useSessionStatsQuery();
	const webhooks = useWebhooksQuery();
	const overview = useStatsOverviewQuery();
	const stop = useStopSessionMutation();
	const [period, setPeriod] = (0, import_react.useState)("24h");
	const charts = useStatsMessagesQuery(period);
	const forbidden = charts.error?.status === 403;
	const messagesToday = overview.data ? overview.data.messages.today.sent + overview.data.messages.today.received : "—";
	const totalMessages = overview.data ? overview.data.messages.sent + overview.data.messages.received : "—";
	const webhookCount = webhooks.isError && !webhooks.data ? "—" : (webhooks.data ?? []).length;
	const timeSeries = (charts.data?.timeSeries ?? []).map((p) => ({
		...p,
		label: period === "24h" ? p.timestamp.slice(11, 16) : p.timestamp.slice(5)
	}));
	const byType = Object.entries(charts.data?.byType ?? {}).map(([name, value]) => ({
		name,
		value
	})).sort((a, b) => b.value - a.value);
	const topChats = (charts.data?.topChats ?? []).slice(0, 8).map((c) => ({
		name: c.chatName || c.chatId.split("@")[0],
		count: c.messageCount
	}));
	if (sessions.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: sessions.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
				children: [
					{
						label: "Ready sessions",
						value: stats.data?.ready ?? 0,
						icon: MessageSquare,
						detail: stats.data ? `${stats.data.active} running · ${stats.data.total} total` : void 0
					},
					{
						label: "Messages today",
						value: messagesToday,
						icon: Send
					},
					{
						label: "Webhooks",
						value: webhookCount,
						icon: Webhook
					},
					{
						label: "Total messages",
						value: totalMessages,
						icon: Activity
					}
				].map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
					title: card.label,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-2xl font-semibold",
						children: typeof card.value === "number" ? card.value.toLocaleString() : card.value
					}), card.detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] text-muted",
						children: card.detail
					}) : null]
				}, card.label))
			}),
			!forbidden ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Traffic",
				sub: "Message volume from GET /stats/messages",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-1",
					children: [
						"24h",
						"7d",
						"30d"
					].map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: period === p ? btn : ghost,
						onClick: () => setPeriod(p),
						children: p
					}, p))
				}),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: charts.error }),
					charts.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-4 lg:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-56",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
										data: timeSeries,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
												dataKey: "label",
												stroke: "#9aa3c0",
												fontSize: 11
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
												stroke: "#9aa3c0",
												fontSize: 11
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
												type: "monotone",
												dataKey: "sent",
												stroke: "#25d366",
												fill: "rgba(37,211,102,0.2)"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
												type: "monotone",
												dataKey: "received",
												stroke: "#6366f1",
												fill: "rgba(99,102,241,0.2)"
											})
										]
									})
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-56",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
										data: byType,
										dataKey: "value",
										nameKey: "name",
										innerRadius: 40,
										outerRadius: 70,
										children: byType.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: TYPE_COLORS[entry.name] ?? "#64748b" }, entry.name))
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {})] })
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-56 lg:col-span-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
										data: topChats,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
												dataKey: "name",
												stroke: "#9aa3c0",
												fontSize: 11
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
												stroke: "#9aa3c0",
												fontSize: 11
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
												dataKey: "count",
												fill: "#8b5cf6"
											})
										]
									})
								})
							})
						]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
				title: "Sessions",
				sub: `${sessions.data?.length ?? 0} accounts`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "overflow-hidden rounded-xl border border-line",
					children: [(sessions.data ?? []).map((session) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 last:border-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-medium",
							children: session.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[11px] text-muted",
							children: [
								session.phone || "—",
								" · ",
								session.status,
								" · ",
								formatLastActive(session.lastActive)
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => setPanel("sessions"),
								children: "Manage"
							}), [
								"ready",
								"initializing",
								"qr_ready"
							].includes(session.status) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								disabled: stop.isPending,
								onClick: () => stop.mutate(session.id),
								children: "Disconnect"
							}) : null]
						})]
					}, session.id)), (sessions.data ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-3 py-6 text-center text-sm text-muted",
						children: "No sessions yet"
					}) : null]
				})
			})
		]
	});
}
var STARTED_STATUSES_FALLBACK = /* @__PURE__ */ new Set([
	"initializing",
	"qr_ready",
	"authenticating",
	"ready",
	"action_required"
]);
function isSessionStarted(session) {
	return session.engineLoaded ?? STARTED_STATUSES_FALLBACK.has(session.status);
}
function canUnlinkSession(session) {
	return isSessionStarted(session);
}
function canForceKillSession(session) {
	return isSessionStarted(session);
}
function classifyUnlinkError(err) {
	return err?.code === "SESSION_LOGOUT_INCOMPLETE" ? "incomplete" : "generic";
}
var NAME_FORMAT = /^[a-z0-9-]+$/;
var NAME_MAX_LENGTH = 50;
function sessionNameIssues(name, existingNames) {
	if (!name.trim()) return ["empty"];
	const issues = [];
	if (!NAME_FORMAT.test(name)) issues.push("format");
	if (name.length > NAME_MAX_LENGTH) issues.push("too-long");
	if (issues.length === 0 && existingNames.includes(name)) issues.push("duplicate");
	return issues;
}
function canCreateSession(name, existingNames) {
	return sessionNameIssues(name, existingNames).length === 0;
}
var PROXY_PROTOCOLS = /* @__PURE__ */ new Set([
	"http:",
	"https:",
	"socks4:",
	"socks5:"
]);
function isValidProxyUrl(url) {
	try {
		return PROXY_PROTOCOLS.has(new URL(url.trim()).protocol);
	} catch {
		return false;
	}
}
var STATUS_GROUPS = {
	active: ["ready"],
	connecting: [
		"initializing",
		"authenticating",
		"qr_ready"
	],
	inactive: [
		"created",
		"disconnected",
		"action_required",
		"failed"
	]
};
function matchesStatusFilter(status, filter) {
	if (filter === "all") return true;
	return (STATUS_GROUPS[filter] ?? []).includes(status);
}
function filterSessions(sessions, search, statusFilter) {
	const needle = search.toLowerCase();
	return sessions.filter((s) => (s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle)) && matchesStatusFilter(s.status, statusFilter));
}
function SessionsPanel() {
	const toast = useAppToast();
	const openOverlay = useGateway((s) => s.openOverlay);
	const refreshSessions = useGateway((s) => s.refreshSessions);
	const sessionsQ = useSessionsQuery();
	const start = useStartSessionMutation();
	const stop = useStopSessionMutation();
	const logout = useLogoutSessionMutation();
	const kill = useForceKillSessionMutation();
	const remove = useDeleteSessionMutation();
	const create = useCreateSessionMutation();
	const [search, setSearch] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [name, setName] = (0, import_react.useState)("");
	const [proxy, setProxy] = (0, import_react.useState)("");
	const [detailId, setDetailId] = (0, import_react.useState)(null);
	const [confirm, setConfirm] = (0, import_react.useState)(null);
	const rows = filterSessions(sessionsQ.data ?? [], search, statusFilter);
	const issues = sessionNameIssues(name, (sessionsQ.data ?? []).map((s) => s.name));
	const run = async (fn, ok) => {
		try {
			await fn();
			toast.success(ok);
			refreshSessions();
		} catch (err) {
			toast.error("Action failed", err instanceof Error ? err.message : "Unknown error");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: sessionsQ.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Create session",
				sub: "Letters, numbers, and hyphens. Optional proxy is used on first connect.",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: name,
							onChange: (e) => setName(e.target.value),
							placeholder: "session-name"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: proxy,
							onChange: (e) => setProxy(e.target.value),
							placeholder: "socks5://host:1080 (optional)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: btn,
							disabled: !canCreateSession(name, (sessionsQ.data ?? []).map((s) => s.name)) || create.isPending || proxy.trim() !== "" && !isValidProxyUrl(proxy),
							onClick: () => void run(async () => {
								await create.mutateAsync({
									name,
									proxyUrl: proxy.trim() || void 0
								});
								setName("");
								setProxy("");
							}, "Session created"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Create"]
						})
					]
				}), issues.filter((i) => i !== "empty").map((issue) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[11px] text-danger",
					children: issue === "format" ? "Use lowercase letters, numbers, and hyphens." : issue === "too-long" ? "Max 50 characters." : "Name already in use."
				}, issue))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: `${field$2} min-w-0 flex-1`,
					value: search,
					onChange: (e) => setSearch(e.target.value),
					placeholder: "Search sessions"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: `${field$2} w-40`,
					value: statusFilter,
					onChange: (e) => setStatusFilter(e.target.value),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "all",
							children: "All statuses"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "active",
							children: "Ready"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "connecting",
							children: "Connecting"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "inactive",
							children: "Inactive"
						})
					]
				})]
			}),
			sessionsQ.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			rows.map((session) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border border-line bg-night/30 px-4 py-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-start justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-medium",
						children: session.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[11px] text-muted",
						children: [
							session.status,
							session.phone ? ` · ${session.phone}` : "",
							session.lastError ? ` · ${session.lastError}` : "",
							session.restriction ? ` · ${session.restriction.kind}` : ""
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-1.5",
						children: [
							!isSessionStarted(session) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ghost,
								disabled: start.isPending,
								onClick: () => void run(() => start.mutateAsync(session.id), "Starting"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { size: 12 }), " Start"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ghost,
								disabled: stop.isPending,
								onClick: () => void run(() => stop.mutateAsync(session.id), "Stopped"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { size: 12 }), " Stop"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ghost,
								onClick: () => openOverlay("qr", session.id),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { size: 12 }), " QR"]
							}),
							canUnlinkSession(session) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: ghost,
								onClick: () => setConfirm({
									type: "unlink",
									id: session.id,
									name: session.name
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Unlink, { size: 12 }), " Unlink"]
							}) : null,
							canForceKillSession(session) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: danger,
								onClick: () => setConfirm({
									type: "kill",
									id: session.id,
									name: session.name
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skull, { size: 12 }), " Kill"]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => setDetailId(session.id),
								children: "Config"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: danger,
								onClick: () => setConfirm({
									type: "delete",
									id: session.id,
									name: session.name
								}),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
							})
						]
					})]
				})
			}, session.id)),
			detailId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionDetail, {
				id: detailId,
				onClose: () => setDetailId(null)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				open: Boolean(confirm),
				title: confirm?.type === "delete" ? "Delete session" : confirm?.type === "kill" ? "Force kill" : "Unlink WhatsApp",
				onClose: () => setConfirm(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-4 text-sm text-muted",
					children: confirm?.type === "delete" ? `Delete ${confirm.name}? This cannot be undone.` : confirm?.type === "kill" ? `Force-kill the engine for ${confirm.name}?` : `Logout ${confirm?.name} from WhatsApp? You will need to scan QR again.`
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						onClick: () => setConfirm(null),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: danger,
						onClick: () => {
							if (!confirm) return;
							run(async () => {
								if (confirm.type === "delete") await remove.mutateAsync(confirm.id);
								else if (confirm.type === "kill") await kill.mutateAsync(confirm.id);
								else try {
									await logout.mutateAsync(confirm.id);
								} catch (err) {
									if (classifyUnlinkError(err) === "incomplete") {
										toast.warning("Unlink incomplete", "The session stopped locally. Start it and retry logout.");
										return;
									}
									throw err;
								}
							}, "Done");
							setConfirm(null);
						},
						children: "Confirm"
					})]
				})]
			})
		]
	});
}
function SessionDetail({ id, onClose }) {
	const toast = useAppToast();
	const configQ = useSessionConfigQuery(id, true);
	const proxyQ = useSessionProxyQuery(id, true);
	const saveConfig = useUpdateSessionConfigMutation();
	const saveProxy = useUpdateSessionProxyMutation();
	const [proxyUrl, setProxyUrl] = (0, import_react.useState)("");
	const [reject, setReject] = (0, import_react.useState)(null);
	const autoReject = reject ?? configQ.data?.autoRejectCalls ?? false;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		open: true,
		title: "Session settings",
		onClose,
		wide: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: configQ.error ?? proxyQ.error }),
			configQ.isLoading || proxyQ.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm",
					children: "Auto-reject calls"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[11px] text-muted",
					children: "Decline incoming WhatsApp calls"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
					checked: autoReject,
					onChange: setReject
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn} mb-4`,
				disabled: saveConfig.isPending,
				onClick: () => void saveConfig.mutateAsync({
					id,
					patch: { autoRejectCalls: autoReject }
				}).then(() => toast.success("Config saved")).catch((err) => toast.error("Save failed", err instanceof Error ? err.message : "")),
				children: "Save config"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Proxy",
				sub: proxyQ.data?.enabled ? proxyQ.data.proxyHost ?? "Configured" : "Direct connection",
				children: [
					proxyQ.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-sm text-danger",
						children: "Could not load proxy — not shown so a save cannot wipe it."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: field$2,
						value: proxyUrl,
						onChange: (e) => setProxyUrl(e.target.value),
						placeholder: "socks5://user:pass@host:1080"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							disabled: saveProxy.isPending || !isValidProxyUrl(proxyUrl),
							onClick: () => void saveProxy.mutateAsync({
								id,
								proxyUrl
							}).then(() => toast.success("Proxy saved")).catch((err) => toast.error("Proxy failed", err instanceof Error ? err.message : "")),
							children: "Save proxy"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							disabled: saveProxy.isPending || proxyQ.isError,
							onClick: () => void saveProxy.mutateAsync({
								id,
								proxyUrl: null
							}).then(() => toast.success("Proxy removed")),
							children: "Remove"
						})]
					})
				]
			})
		]
	});
}
function WebhookDeliveries({ sessionId, webhookId }) {
	const [rows, setRows] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(false);
	if (!open) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: ghost,
		onClick: () => setOpen(true),
		children: "Deliveries"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-2 space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: btn,
				onClick: () => {
					setError(null);
					listWebhookDeliveries(sessionId, webhookId).then(setRows).catch(setError);
				},
				children: "Refresh deliveries"
			}),
			rows && rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-muted",
				children: "No attempts recorded."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-1 text-[11px]",
				children: (rows ?? []).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-lg border border-line bg-night/30 px-2 py-1",
					children: [
						r.status,
						" · HTTP ",
						r.httpCode ?? "—",
						" · ",
						r.durationMs,
						"ms · try ",
						r.attempt,
						r.errorSnippet ? ` · ${r.errorSnippet}` : ""
					]
				}, r.id))
			})
		]
	});
}
var MESSAGE_FIELDS = [
	{
		field: "sender",
		kind: "id",
		operators: ["is", "isNot"]
	},
	{
		field: "recipient",
		kind: "id",
		operators: ["is", "isNot"]
	},
	{
		field: "chatId",
		kind: "id",
		operators: ["is", "isNot"]
	},
	{
		field: "body",
		kind: "text",
		operators: ["contains", "equals"]
	},
	{
		field: "type",
		kind: "enum",
		operators: ["is", "isNot"],
		enumValues: MESSAGE_TYPES
	},
	{
		field: "isGroup",
		kind: "boolean",
		operators: ["is"]
	},
	{
		field: "kind",
		kind: "enum",
		operators: ["is", "isNot"],
		enumValues: CHAT_KINDS
	},
	{
		field: "fromMe",
		kind: "boolean",
		operators: ["is"]
	},
	{
		field: "hasMedia",
		kind: "boolean",
		operators: ["is"]
	},
	{
		field: "mentions",
		kind: "idArray",
		operators: ["is", "isNot"]
	}
];
var descriptorFor = (fieldName) => MESSAGE_FIELDS.find((f) => f.field === fieldName) ?? MESSAGE_FIELDS[0];
function defaultValueFor(kind) {
	if (kind === "boolean") return true;
	if (kind === "text") return "";
	return [];
}
function normalizeToJid(raw) {
	const value = raw.trim();
	if (!value) return null;
	if (value.includes("@")) return value.toLowerCase();
	const digits = value.replace(/[^0-9]/g, "");
	return digits ? `${digits}@c.us` : null;
}
function ContactChipsInput({ value, onChange, chats }) {
	const [text, setText] = (0, import_react.useState)("");
	const [open, setOpen] = (0, import_react.useState)(false);
	const suggestions = (0, import_react.useMemo)(() => {
		const query = text.trim().toLowerCase();
		const chosen = new Set(value);
		return chats.filter((c) => !chosen.has(c.id)).filter((c) => !query || c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)).slice(0, 50);
	}, [
		text,
		chats,
		value
	]);
	const add = (jid) => {
		if (jid && !value.includes(jid)) onChange([...value, jid]);
		setText("");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap gap-1 rounded-xl border border-line bg-night/40 p-2",
			children: [value.map((jid) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-[11px]",
				children: [chats.find((c) => c.id === jid)?.name ?? jid, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onChange(value.filter((v) => v !== jid)),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 10 })
				})]
			}, jid)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "min-w-24 flex-1 bg-transparent text-sm outline-none",
				value: text,
				placeholder: "Phone or chat",
				onChange: (e) => setText(e.target.value),
				onFocus: () => setOpen(true),
				onBlur: () => setTimeout(() => setOpen(false), 120),
				onKeyDown: (e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						const jid = normalizeToJid(text);
						if (jid) add(jid);
					}
				}
			})]
		}), open && (suggestions.length > 0 || text.trim()) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-line bg-night p-1",
			children: suggestions.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "block w-full rounded-lg px-2 py-1 text-left text-xs hover:bg-white/5",
				onMouseDown: (e) => e.preventDefault(),
				onClick: () => add(c.id),
				children: c.name || c.id
			}, c.id))
		}) : null]
	});
}
function FilterBuilder({ filters, onChange, chats }) {
	const conditions = filters?.conditions ?? [];
	const emit = (next) => onChange(next.length ? { conditions: next } : null);
	const updateAt = (index, patch) => emit(conditions.map((c, i) => i === index ? {
		...c,
		...patch
	} : c));
	const changeField = (index, fieldName) => {
		const def = descriptorFor(fieldName);
		updateAt(index, {
			field: fieldName,
			operator: def.operators[0],
			value: defaultValueFor(def.kind),
			caseSensitive: void 0
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-muted",
				children: "Filters apply to message.* events. All conditions must match."
			}),
			conditions.map((condition, index) => {
				const def = descriptorFor(condition.field);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_1fr_auto]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: field$2,
							value: condition.field,
							onChange: (e) => changeField(index, e.target.value),
							children: MESSAGE_FIELDS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: f.field,
								children: f.field
							}, f.field))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: field$2,
							value: condition.operator,
							onChange: (e) => updateAt(index, { operator: e.target.value }),
							children: def.operators.map((op) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: op,
								children: op
							}, op))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							onClick: () => emit(conditions.filter((_, i) => i !== index)),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 14 })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sm:col-span-3",
							children: [
								def.kind === "id" || def.kind === "idArray" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContactChipsInput, {
									value: Array.isArray(condition.value) ? condition.value : [],
									onChange: (next) => updateAt(index, { value: next }),
									chats
								}) : null,
								def.kind === "enum" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-1",
									children: def.enumValues?.map((option) => {
										const selected = Array.isArray(condition.value) && condition.value.includes(option);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: selected ? "rounded-lg bg-wa/20 px-2 py-1 text-[11px] text-wa" : "rounded-lg border border-line px-2 py-1 text-[11px]",
											onClick: () => {
												const current = Array.isArray(condition.value) ? condition.value : [];
												updateAt(index, { value: selected ? current.filter((v) => v !== option) : [...current, option] });
											},
											children: option
										}, option);
									})
								}) : null,
								def.kind === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: field$2,
										value: typeof condition.value === "string" ? condition.value : "",
										onChange: (e) => updateAt(index, { value: e.target.value })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-1 text-[11px] text-muted",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: condition.caseSensitive ?? false,
											onChange: (e) => updateAt(index, { caseSensitive: e.target.checked || void 0 })
										}), "Aa"]
									})]
								}) : null,
								def.kind === "boolean" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: field$2,
									value: condition.value === true ? "true" : "false",
									onChange: (e) => updateAt(index, { value: e.target.value === "true" }),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "true",
										children: "yes"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "false",
										children: "no"
									})]
								}) : null
							]
						})
					]
				}, index);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: ghost,
				onClick: () => {
					const def = MESSAGE_FIELDS[0];
					emit([...conditions, {
						field: def.field,
						operator: def.operators[0],
						value: defaultValueFor(def.kind)
					}]);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " Add condition"]
			})
		]
	});
}
var EVENT_NAMES = [
	"message.received",
	"message.sent",
	"message.ack",
	"message.failed",
	"message.revoked",
	"message.reaction",
	"message.edited",
	"session.status",
	"session.qr",
	"session.authenticated",
	"session.disconnected",
	"session.reconnect_loop",
	"session.restriction",
	"presence.update",
	"group.join",
	"group.leave",
	"group.update",
	"group.join_request",
	"call.received",
	"call.accepted",
	"call.rejected",
	"call.missed",
	"status.received",
	"*",
	...AKG_WEBHOOK_EVENTS
];
var supportsFilters = (events) => events.some((e) => e === "*" || e.startsWith("message."));
function WebhooksPanel() {
	const toast = useAppToast();
	const sessions = useSessionsQuery();
	const webhooks = useWebhooksQuery();
	const create = useCreateWebhookMutation();
	const update = useUpdateWebhookMutation();
	const remove = useDeleteWebhookMutation();
	const [form, setForm] = (0, import_react.useState)({
		url: "",
		events: ["message.received"],
		sessionId: "",
		filters: null
	});
	const [edit, setEdit] = (0, import_react.useState)(null);
	const [testingId, setTestingId] = (0, import_react.useState)(null);
	const sid = form.sessionId || sessions.data?.[0]?.id || "";
	const chats = useChatsQuery(edit?.sessionId || sid, Boolean(edit || sid));
	const toggleEvent = (name, list, set) => {
		set(list.includes(name) ? list.filter((e) => e !== name) : [...list, name]);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: webhooks.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
				title: "Register webhook",
				sub: "Deliver OpenWA events to an HTTPS endpoint.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: field$2,
							value: sid,
							onChange: (e) => setForm((f) => ({
								...f,
								sessionId: e.target.value
							})),
							children: (sessions.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: s.id,
								children: s.name
							}, s.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.url,
							onChange: (e) => setForm((f) => ({
								...f,
								url: e.target.value
							})),
							placeholder: "https://example.com/hook"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: EVENT_NAMES.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: form.events.includes(name) ? "rounded-lg bg-wa/20 px-2 py-1 text-[11px] text-wa" : "rounded-lg border border-line px-2 py-1 text-[11px] text-muted",
								onClick: () => toggleEvent(name, form.events, (events) => setForm((f) => ({
									...f,
									events
								}))),
								children: name
							}, name))
						}),
						supportsFilters(form.events) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBuilder, {
							filters: form.filters,
							onChange: (filters) => setForm((f) => ({
								...f,
								filters
							})),
							chats: chats.data ?? []
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: btn,
							disabled: !sid || !form.url || form.events.length === 0 || create.isPending,
							onClick: () => create.mutateAsync({
								sessionId: sid,
								url: form.url,
								events: form.events,
								filters: form.filters
							}).then(() => toast.success("Webhook created")).catch((err) => toast.error("Create failed", err instanceof Error ? err.message : "")),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 12 }),
								" ",
								create.isPending ? "Saving…" : "Create"
							]
						})
					]
				})
			}),
			webhooks.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			(webhooks.data ?? []).map((hook) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
				title: hook.url,
				sub: `${hook.sessionId} · ${hook.active ? "active" : "paused"} · ${(hook.events ?? []).join(", ")}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ghost,
							disabled: testingId === hook.id,
							onClick: async () => {
								setTestingId(hook.id);
								try {
									const res = await testWebhook(hook.sessionId, hook.id);
									toast.success(res.success ? "Test delivered" : "Test failed", res.error || String(res.statusCode ?? ""));
								} catch (err) {
									toast.error("Test failed", err instanceof Error ? err.message : "");
								} finally {
									setTestingId(null);
								}
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { size: 12 }), " Test"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							onClick: () => setEdit(hook),
							children: "Edit"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ghost,
							onClick: () => remove.mutate({
								id: hook.id,
								sessionId: hook.sessionId
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 }), " Delete"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WebhookDeliveries, {
							sessionId: hook.sessionId,
							webhookId: hook.id
						})
					]
				})
			}, hook.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				open: Boolean(edit),
				title: "Edit webhook",
				onClose: () => setEdit(null),
				wide: true,
				children: edit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: edit.url,
							onChange: (e) => setEdit({
								...edit,
								url: e.target.value
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: EVENT_NAMES.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: (edit.events ?? []).includes(name) ? "rounded-lg bg-wa/20 px-2 py-1 text-[11px] text-wa" : "rounded-lg border border-line px-2 py-1 text-[11px] text-muted",
								onClick: () => toggleEvent(name, edit.events ?? [], (events) => setEdit({
									...edit,
									events
								})),
								children: name
							}, name))
						}),
						supportsFilters(edit.events ?? []) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterBuilder, {
							filters: edit.filters,
							onChange: (filters) => setEdit({
								...edit,
								filters
							}),
							chats: chats.data ?? []
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							disabled: update.isPending,
							onClick: () => update.mutateAsync({
								id: edit.id,
								dto: {
									sessionId: edit.sessionId,
									url: edit.url,
									events: edit.events,
									filters: edit.filters,
									active: edit.active
								}
							}).then(() => {
								toast.success("Webhook updated");
								setEdit(null);
							}).catch((err) => toast.error("Update failed", err instanceof Error ? err.message : "")),
							children: "Save"
						})
					]
				}) : null
			})
		]
	});
}
async function copyToClipboard(text) {
	if (navigator.clipboard?.writeText) try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {}
	try {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.setAttribute("readonly", "");
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
}
function canScopeSessions(role) {
	return role === "operator" || role === "viewer";
}
function sameSessionScope(a, b) {
	if (a.length !== b.length) return false;
	const left = [...a].sort();
	const right = [...b].sort();
	return left.every((id, index) => id === right[index]);
}
function sessionScopeNames(allowedSessions, sessions) {
	if (!allowedSessions || allowedSessions.length === 0) return null;
	const byId = new Map(sessions.map((session) => [session.id, session.name]));
	return allowedSessions.map((id) => byId.get(id) ?? id);
}
var emptyForm$2 = {
	name: "",
	role: "operator",
	allowedSessions: []
};
function ApiKeysPanel() {
	const toast = useAppToast();
	const keys = useApiKeysQuery();
	const sessions = useSessionsQuery();
	const create = useCreateApiKeyMutation();
	const update = useUpdateApiKeyMutation();
	const remove = useDeleteApiKeyMutation();
	const revoke = useRevokeApiKeyMutation();
	const [form, setForm] = (0, import_react.useState)(emptyForm$2);
	const [created, setCreated] = (0, import_react.useState)(null);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [editSessions, setEditSessions] = (0, import_react.useState)([]);
	const [confirm, setConfirm] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: keys.error }),
			created ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Copy this key now",
				sub: "OpenWA only shows the plaintext once.",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
					className: "mb-2 block break-all rounded-xl border border-line bg-night/40 p-3 text-xs",
					children: created
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ghost,
					onClick: () => void copyToClipboard(created).then((ok) => ok && toast.success("Copied")),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 12 }), " Copy"]
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Create key",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2 sm:grid-cols-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.name,
							onChange: (e) => setForm({
								...form,
								name: e.target.value
							}),
							placeholder: "Name"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: field$2,
							value: form.role,
							onChange: (e) => setForm({
								...form,
								role: e.target.value,
								allowedSessions: []
							}),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "admin",
									children: "admin"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "operator",
									children: "operator"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "viewer",
									children: "viewer"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: btn,
							disabled: !form.name || create.isPending,
							onClick: async () => {
								try {
									const row = await create.mutateAsync({
										name: form.name,
										role: form.role,
										...canScopeSessions(form.role) ? { allowedSessions: form.allowedSessions } : {}
									});
									setCreated(row.apiKey);
									setForm(emptyForm$2);
								} catch (err) {
									toast.error("Create failed", err instanceof Error ? err.message : "");
								}
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 12 }), " Create"]
						})
					]
				}), canScopeSessions(form.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 max-h-40 overflow-auto rounded-xl border border-line p-2",
					children: [(sessions.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-2 py-1 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: form.allowedSessions.includes(s.id),
							onChange: (e) => setForm({
								...form,
								allowedSessions: e.target.checked ? [...form.allowedSessions, s.id] : form.allowedSessions.filter((id) => id !== s.id)
							})
						}), s.name]
					}, s.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] text-muted",
						children: "Empty allowlist = all current and future sessions."
					})]
				}) : null]
			}),
			keys.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			(keys.data ?? []).map((k) => {
				const scope = sessionScopeNames(k.allowedSessions, sessions.data ?? []);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-night/30 px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-sm font-medium",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { size: 14 }),
							" ",
							k.name
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[11px] text-muted",
						children: [
							k.role,
							" · ",
							k.keyPrefix,
							"… · ",
							k.isActive ? "active" : "revoked",
							" · used ",
							k.usageCount,
							scope ? ` · ${scope.join(", ")}` : " · all sessions"
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1.5",
						children: [
							canScopeSessions(k.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => {
									setEditing(k);
									setEditSessions(k.allowedSessions ?? []);
								},
								children: "Sessions"
							}) : null,
							k.isActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => setConfirm({
									type: "revoke",
									id: k.id,
									name: k.name
								}),
								children: "Revoke"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: danger,
								onClick: () => setConfirm({
									type: "delete",
									id: k.id,
									name: k.name
								}),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
							})
						]
					})]
				}, k.id);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				open: Boolean(editing),
				title: "Session scope",
				onClose: () => setEditing(null),
				children: [(sessions.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 py-1 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: editSessions.includes(s.id),
						onChange: (e) => setEditSessions(e.target.checked ? [...editSessions, s.id] : editSessions.filter((id) => id !== s.id))
					}), s.name]
				}, s.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `${btn} mt-3`,
					disabled: update.isPending || !editing,
					onClick: async () => {
						if (!editing) return;
						if (sameSessionScope(editSessions, editing.allowedSessions ?? [])) {
							setEditing(null);
							return;
						}
						try {
							await update.mutateAsync({
								id: editing.id,
								data: { allowedSessions: editSessions }
							});
							setEditing(null);
							toast.success("Scope updated");
						} catch (err) {
							toast.error("Update failed", err instanceof Error ? err.message : "");
						}
					},
					children: "Save"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				open: Boolean(confirm),
				title: confirm?.type === "delete" ? "Delete key" : "Revoke key",
				onClose: () => setConfirm(null),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-4 text-sm text-muted",
					children: confirm?.type === "delete" ? `Permanently delete ${confirm.name}?` : `Revoke ${confirm?.name}? It will stop working immediately.`
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-end gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						onClick: () => setConfirm(null),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: danger,
						onClick: () => {
							if (!confirm) return;
							if (confirm.type === "delete") remove.mutate(confirm.id);
							else revoke.mutate(confirm.id);
							setConfirm(null);
						},
						children: "Confirm"
					})]
				})]
			})
		]
	});
}
var emptyForm$1 = {
	name: "",
	header: "",
	body: "",
	footer: ""
};
function extractPlaceholders(template) {
	const source = [
		template.header,
		template.body,
		template.footer
	].filter(Boolean).join("\n");
	return Array.from(new Set(Array.from(source.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g), (m) => m[1]))).sort();
}
function toPayload(form) {
	return {
		name: form.name.trim(),
		header: form.header.trim() || null,
		body: form.body.trim(),
		footer: form.footer.trim() || null
	};
}
function renderPreview(template, values) {
	return [
		template.header,
		template.body,
		template.footer
	].filter(Boolean).join("\n\n").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key) => values[key] || `{{${key}}}`);
}
function TemplatesPanel() {
	const toast = useAppToast();
	const apply = useGateway((s) => s.applyTemplate);
	const sessions = useSessionsQuery();
	const [sessionId, setSessionId] = (0, import_react.useState)("");
	const sid = sessionId || sessions.data?.[0]?.id || "";
	const query = useTemplatesQuery(sid, Boolean(sid));
	const create = useCreateTemplateMutation();
	const update = useUpdateTemplateMutation();
	const remove = useDeleteTemplateMutation();
	const [form, setForm] = (0, import_react.useState)(emptyForm$1);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [search, setSearch] = (0, import_react.useState)("");
	const [previewValues, setPreviewValues] = (0, import_react.useState)({});
	const placeholders = (0, import_react.useMemo)(() => extractPlaceholders(form), [form]);
	const preview = (0, import_react.useMemo)(() => renderPreview(form, previewValues), [form, previewValues]);
	const filtered = (query.data ?? []).filter((t) => [
		t.name,
		t.header,
		t.body,
		t.footer
	].filter(Boolean).some((v) => v.toLowerCase().includes(search.toLowerCase())));
	const save = async () => {
		if (!sid || !form.name.trim() || !form.body.trim()) return;
		try {
			if (editing) {
				await update.mutateAsync({
					sessionId: sid,
					id: editing.id,
					dto: toPayload(form)
				});
				toast.success("Template updated");
			} else {
				await create.mutateAsync({
					sessionId: sid,
					dto: toPayload(form)
				});
				toast.success("Template created");
			}
			setForm(emptyForm$1);
			setEditing(null);
		} catch (err) {
			toast.error("Save failed", err instanceof Error ? err.message : "");
		}
	};
	if (!sid) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Create a session first."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: query.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				className: field$2,
				value: sid,
				onChange: (e) => setSessionId(e.target.value),
				children: (sessions.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: s.id,
					children: s.name
				}, s.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: editing ? `Edit ${editing.name}` : "New template",
				sub: "Use {{name}} placeholders in header, body, or footer.",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: cn(field$2, "mb-2"),
						value: form.name,
						onChange: (e) => setForm({
							...form,
							name: e.target.value
						}),
						placeholder: "Name"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: cn(field$2, "mb-2"),
						value: form.header,
						onChange: (e) => setForm({
							...form,
							header: e.target.value
						}),
						placeholder: "Header (optional)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						className: cn(field$2, "mb-2 min-h-24"),
						value: form.body,
						onChange: (e) => setForm({
							...form,
							body: e.target.value
						}),
						placeholder: "Body"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: cn(field$2, "mb-2"),
						value: form.footer,
						onChange: (e) => setForm({
							...form,
							footer: e.target.value
						}),
						placeholder: "Footer (optional)"
					}),
					placeholders.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-2 grid gap-2 sm:grid-cols-2",
						children: placeholders.map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: previewValues[key] ?? "",
							onChange: (e) => setPreviewValues({
								...previewValues,
								[key]: e.target.value
							}),
							placeholder: `{{${key}}}`
						}, key))
					}) : null,
					preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mb-2 whitespace-pre-wrap rounded-xl border border-line bg-night/40 p-3 text-xs text-muted",
						children: preview
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: btn,
							disabled: !form.name || !form.body || create.isPending || update.isPending,
							onClick: () => void save(),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 12 }),
								" ",
								editing ? "Update" : "Save template"
							]
						}), editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							onClick: () => {
								setEditing(null);
								setForm(emptyForm$1);
							},
							children: "Cancel"
						}) : null]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: field$2,
				value: search,
				onChange: (e) => setSearch(e.target.value),
				placeholder: "Search templates"
			}),
			query.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			filtered.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
				title: t.name,
				sub: [
					t.header,
					t.body,
					t.footer
				].filter(Boolean).join(" · "),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							onClick: () => apply([
								t.header,
								t.body,
								t.footer
							].filter(Boolean).join("\n\n")),
							children: "Use in composer"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							onClick: () => void copyToClipboard(t.body),
							children: "Copy body"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							onClick: () => {
								setEditing(t);
								setForm({
									name: t.name,
									header: t.header || "",
									body: t.body,
									footer: t.footer || ""
								});
							},
							children: "Edit"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ghost,
							onClick: () => remove.mutate({
								sessionId: sid,
								id: t.id
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 }), " Delete"]
						})
					]
				})
			}, t.id))
		]
	});
}
function emptyForField(field) {
	if (field.default !== void 0) return field.default;
	if (field.enum && field.enum.length > 0) return field.enum[0];
	switch (field.type) {
		case "boolean": return false;
		case "array": return [];
		case "object": {
			const obj = {};
			if (field.properties) for (const [k, sub] of Object.entries(field.properties)) obj[k] = emptyForField(sub);
			return obj;
		}
		case "number": return;
		default: return "";
	}
}
function coerceFieldInput(field, raw) {
	if (field.type === "number") return raw === "" ? void 0 : Number(raw);
	return raw;
}
function configUiSafeConfig(plugin, sessionId) {
	const props = plugin.configSchema?.properties;
	if (!props) return {};
	const override = sessionId ? plugin.sessionConfig?.[sessionId] ?? {} : {};
	return Object.fromEntries(Object.keys(props).flatMap((k) => {
		if (sessionId && k in override) return [[k, override[k]]];
		return k in (plugin.config ?? {}) ? [[k, plugin.config[k]]] : [];
	}));
}
function sparseSessionOverride(full, plugin) {
	const props = plugin.configSchema?.properties;
	if (!props) return full;
	const out = {};
	for (const [key, field] of Object.entries(props)) {
		if (!(key in full)) continue;
		const val = full[key];
		if (field.secret) {
			out[key] = val;
			continue;
		}
		if (JSON.stringify(val) === JSON.stringify(plugin.config?.[key])) continue;
		if (plugin.config?.[key] === void 0 && JSON.stringify(val) === JSON.stringify(emptyForField(field))) continue;
		out[key] = val;
	}
	return out;
}
function missingRequiredConfig(plugin) {
	const props = plugin.configSchema?.properties ?? {};
	return Object.entries(props).filter(([key, field]) => field.required === true && (plugin.config?.[key] === void 0 || plugin.config?.[key] === null || plugin.config?.[key] === "")).map(([key]) => key);
}
var CONFIG_UI_CSP = [
	"img-src 'self' data:",
	"media-src 'self' data:",
	"font-src 'self' data:",
	"style-src 'unsafe-inline'",
	"connect-src 'none'",
	"form-action 'none'",
	"object-src 'none'",
	"frame-src 'none'",
	"worker-src 'none'",
	"manifest-src 'none'",
	"base-uri 'none'"
].join("; ");
function injectConfigUiCsp(doc) {
	const meta = doc.createElement("meta");
	meta.httpEquiv = "Content-Security-Policy";
	meta.content = CONFIG_UI_CSP;
	doc.head.prepend(meta);
}
var INSTANCE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
function isValidInstanceId(id) {
	return INSTANCE_ID_PATTERN.test(id);
}
function isValidInstanceSecret(raw) {
	return raw.trim() === "" || raw.trim().length >= 16;
}
function parseInstanceConfig(raw) {
	if (raw.trim() === "") return {
		ok: true,
		value: void 0
	};
	try {
		const parsed = JSON.parse(raw);
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false };
		return {
			ok: true,
			value: parsed
		};
	} catch {
		return { ok: false };
	}
}
var emptyForm = {
	instanceId: "",
	sessionScope: "",
	verifyToken: "",
	secret: "",
	config: ""
};
function PluginInstances({ pluginId }) {
	const toast = useAppToast();
	const list = usePluginInstancesQuery(pluginId, true);
	const createM = useCreateInstanceMutation(pluginId);
	const regenM = useRegenerateInstanceSecretMutation(pluginId);
	const updateM = useUpdateInstanceMutation(pluginId);
	const deleteM = useDeleteInstanceMutation(pluginId);
	const [showForm, setShowForm] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const [formError, setFormError] = (0, import_react.useState)(null);
	const [minted, setMinted] = (0, import_react.useState)(null);
	const submit = async () => {
		if (!isValidInstanceId(form.instanceId)) {
			setFormError("Instance id: 1–64 letters, numbers, _ or -");
			return;
		}
		const parsed = parseInstanceConfig(form.config);
		if (!parsed.ok) {
			setFormError("Config must be a JSON object");
			return;
		}
		if (!isValidInstanceSecret(form.secret)) {
			setFormError("Secret must be empty (auto) or at least 16 characters");
			return;
		}
		try {
			const created = await createM.mutateAsync({
				instanceId: form.instanceId,
				sessionScope: form.sessionScope.trim() || void 0,
				verifyToken: form.verifyToken.trim() || void 0,
				secret: form.secret.trim() || void 0,
				config: parsed.value
			});
			setShowForm(false);
			setForm(emptyForm);
			setMinted(created);
			toast.success("Instance created", created.instanceId);
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Create failed");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: list.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: btn,
				onClick: () => {
					setShowForm(true);
					setFormError(null);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 14 }), " New instance"]
			}),
			list.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			(list.data ?? []).map((inst) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: inst.instanceId,
				sub: `${inst.enabled ? "enabled" : "disabled"} · ${inst.sessionScope || "all sessions"}`,
				children: [inst.ingressUrls.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-1 flex items-center gap-2 text-[11px] text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "truncate",
						children: u.url
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						onClick: () => void copyToClipboard(u.url),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { size: 10 })
					})]
				}, u.route)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex flex-wrap gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ghost,
							disabled: updateM.isPending,
							onClick: () => void updateM.mutateAsync({
								instanceId: inst.instanceId,
								body: { enabled: !inst.enabled }
							}),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, { size: 12 }),
								" ",
								inst.enabled ? "Disable" : "Enable"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ghost,
							onClick: () => void regenM.mutateAsync(inst.instanceId).then((row) => {
								setMinted(row);
								toast.success("Secret regenerated");
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { size: 12 }), " New secret"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: danger,
							onClick: () => {
								if (window.confirm(`Delete ${inst.instanceId}?`)) deleteM.mutate(inst.instanceId);
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
						})
					]
				})]
			}, inst.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				open: showForm,
				title: "Provision instance",
				onClose: () => setShowForm(false),
				children: [formError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-2 text-sm text-danger",
					children: formError
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.instanceId,
							onChange: (e) => setForm({
								...form,
								instanceId: e.target.value
							}),
							placeholder: "instance-id"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.sessionScope,
							onChange: (e) => setForm({
								...form,
								sessionScope: e.target.value
							}),
							placeholder: "session id (optional)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.verifyToken,
							onChange: (e) => setForm({
								...form,
								verifyToken: e.target.value
							}),
							placeholder: "verify token (optional)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.secret,
							onChange: (e) => setForm({
								...form,
								secret: e.target.value
							}),
							placeholder: "secret (blank = auto)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: `${field$2} min-h-20`,
							value: form.config,
							onChange: (e) => setForm({
								...form,
								config: e.target.value
							}),
							placeholder: "config JSON (optional) e.g. {\"foo\":1}"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							disabled: createM.isPending,
							onClick: () => void submit(),
							children: "Create"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				open: Boolean(minted),
				title: "Copy secret now",
				onClose: () => setMinted(null),
				children: minted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "block break-all rounded-xl border border-line p-3 text-xs",
						children: minted.secret
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						onClick: () => void copyToClipboard(minted.secret),
						children: "Copy secret"
					})]
				}) : null
			})
		]
	});
}
function ConfigField({ fieldDef, label, value, onChange }) {
	const fieldId = (0, import_react.useId)();
	if (fieldDef.type === "boolean") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex items-center justify-between gap-3 py-1 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "checkbox",
			id: fieldId,
			checked: Boolean(value),
			onChange: (e) => onChange(e.target.checked)
		})]
	});
	if (fieldDef.enum && fieldDef.enum.length > 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-sm",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			className: `${field$2} mt-1`,
			id: fieldId,
			value: String(value ?? ""),
			onChange: (e) => onChange(fieldDef.enum?.find((o) => String(o) === e.target.value) ?? e.target.value),
			children: fieldDef.enum.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
				value: String(opt),
				children: String(opt)
			}, String(opt)))
		})]
	});
	if (fieldDef.type === "object") {
		const obj = value && typeof value === "object" && !Array.isArray(value) ? value : {};
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
			className: "rounded-xl border border-line p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
				className: "px-1 text-xs text-muted",
				children: label
			}), Object.entries(fieldDef.properties ?? {}).map(([k, sub]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigField, {
				fieldDef: sub,
				label: sub.title || k,
				value: obj[k],
				onChange: (v) => onChange({
					...obj,
					[k]: v
				})
			}, k))]
		});
	}
	if (fieldDef.type === "array") {
		const rows = Array.isArray(value) ? value : [];
		const item = fieldDef.items;
		if (!item) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted",
			children: label
		});
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-1 text-xs text-muted",
				children: label
			}),
			rows.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigField, {
						fieldDef: item,
						label: `#${i + 1}`,
						value: row,
						onChange: (v) => onChange(rows.map((r, j) => j === i ? v : r))
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: ghost,
					onClick: () => onChange(rows.filter((_, j) => j !== i)),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
				})]
			}, i)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: ghost,
				onClick: () => onChange([...rows, emptyForField(item)]),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 12 }), " Add"]
			})
		] });
	}
	if (fieldDef.type === "textarea") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-sm",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
			className: `${field$2} mt-1 min-h-20`,
			id: fieldId,
			value: value == null ? "" : String(value),
			onChange: (e) => onChange(e.target.value)
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-sm",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			className: `${field$2} mt-1`,
			id: fieldId,
			type: fieldDef.type === "number" ? "number" : fieldDef.secret ? "password" : "text",
			value: value == null ? "" : String(value),
			onChange: (e) => onChange(coerceFieldInput(fieldDef, e.target.value))
		})]
	});
}
var typeIcons = {
	engine: Cpu,
	storage: Database,
	queue: Server,
	auth: Shield,
	extension: Zap
};
function PluginsPanel() {
	const toast = useAppToast();
	const pluginsQ = usePluginsQuery();
	const toggle = usePluginToggleMutation();
	const uninstall = useUninstallPluginMutation();
	const installUrl = useInstallPluginUrlMutation();
	const installFile = useInstallPluginFileMutation();
	const [configId, setConfigId] = (0, import_react.useState)(null);
	const [showInstall, setShowInstall] = (0, import_react.useState)(false);
	const [installMode, setInstallMode] = (0, import_react.useState)("catalog");
	const [url, setUrl] = (0, import_react.useState)("");
	const [search, setSearch] = (0, import_react.useState)("");
	const catalogQ = usePluginCatalogQuery(showInstall && installMode === "catalog");
	const configPlugin = (pluginsQ.data ?? []).find((p) => p.id === configId) ?? null;
	const handleToggle = async (plugin) => {
		if (plugin.status !== "enabled") {
			const missing = missingRequiredConfig(plugin);
			if (missing.length > 0) {
				toast.warning("Config required", `Fill: ${missing.join(", ")}`);
				setConfigId(plugin.id);
				return;
			}
		}
		try {
			const res = await toggle.mutateAsync({
				id: plugin.id,
				enable: plugin.status !== "enabled"
			});
			if (!res.success) toast.warning("Toggle failed", res.message);
		} catch (err) {
			toast.error("Toggle failed", err instanceof Error ? err.message : "");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: pluginsQ.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: btn,
					onClick: () => setShowInstall(true),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 14 }), " Install plugin"]
				})
			}),
			pluginsQ.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			(pluginsQ.data ?? []).map((p) => {
				const Icon = typeIcons[p.type] ?? Puzzle;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-night/30 px-4 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "grid size-9 place-items-center rounded-xl bg-indigo/20 text-indigo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 16 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-sm font-medium",
							children: [
								p.name,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-dim",
									children: p.version
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[11px] text-muted",
							children: [
								p.type,
								" · ",
								p.status,
								p.error ? ` · ${p.error}` : ""
							]
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => setConfigId(p.id),
								children: "Configure"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => void pluginHealthCheck(p.id).then((r) => r.healthy ? toast.success("Healthy", r.message) : toast.warning("Unhealthy", r.message)),
								children: "Health"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: p.status === "enabled" ? ghost : btn,
								disabled: toggle.isPending || p.builtIn,
								onClick: () => void handleToggle(p),
								children: p.status === "enabled" ? "Disable" : "Enable"
							}),
							!p.builtIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: danger,
								onClick: () => {
									if (window.confirm(`Uninstall ${p.name}?`)) uninstall.mutate(p.id);
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 12 })
							}) : null
						]
					})]
				}, p.id);
			}),
			configPlugin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginConfigModal, {
				plugin: configPlugin,
				onClose: () => setConfigId(null)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				open: showInstall,
				title: "Install plugin",
				onClose: () => setShowInstall(false),
				wide: true,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-3 flex gap-1",
						children: [
							"catalog",
							"url",
							"upload"
						].map((mode) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: installMode === mode ? btn : ghost,
							onClick: () => setInstallMode(mode),
							children: mode
						}, mode))
					}),
					installMode === "url" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: url,
							onChange: (e) => setUrl(e.target.value),
							placeholder: "https://…/plugin.zip"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: btn,
							disabled: !url || installUrl.isPending,
							onClick: () => installUrl.mutateAsync(url).then(() => {
								toast.success("Installed");
								setShowInstall(false);
							}).catch((err) => toast.error("Install failed", err instanceof Error ? err.message : "")),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { size: 14 }), " Install"]
						})]
					}) : null,
					installMode === "upload" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: ghost,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 14 }),
							" Choose .zip",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: ".zip",
								className: "hidden",
								onChange: (e) => {
									const file = e.target.files?.[0];
									if (!file) return;
									installFile.mutateAsync(file).then(() => {
										toast.success("Installed");
										setShowInstall(false);
									}).catch((err) => toast.error("Install failed", err instanceof Error ? err.message : ""));
								}
							})
						]
					}) : null,
					installMode === "catalog" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative mb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
								size: 14,
								className: "pointer-events-none absolute top-2.5 left-3 text-muted"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: `${field$2} pl-8`,
								value: search,
								onChange: (e) => setSearch(e.target.value),
								placeholder: "Search catalog"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: catalogQ.error }),
						catalogQ.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
						(catalogQ.data ?? []).filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 flex items-center justify-between rounded-xl border border-line px-3 py-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm",
								children: c.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[11px] text-muted",
								children: [
									c.version,
									" ",
									c.installed ? "· installed" : "",
									" ",
									c.updateAvailable ? "· update available" : ""
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled: !c.download || installUrl.isPending,
								onClick: () => {
									if (!c.download) return;
									installUrl.mutateAsync(c.download).then(() => toast.success(c.installed ? "Updated" : "Installed")).catch((err) => toast.error("Install failed", err instanceof Error ? err.message : ""));
								},
								children: c.installed ? "Update" : "Install"
							})]
						}, c.id))
					] }) : null
				]
			})
		]
	});
}
function PluginConfigModal({ plugin, onClose }) {
	const toast = useAppToast();
	const saveConfig = useUpdatePluginConfigMutation();
	const [tab, setTab] = (0, import_react.useState)("config");
	const [schemaConfig, setSchemaConfig] = (0, import_react.useState)(() => seedConfig(plugin));
	const formRef = (0, import_react.useRef)(null);
	const hasSchema = !!plugin.configSchema && Object.keys(plugin.configSchema.properties).length > 0;
	const hasUi = !!plugin.configUi;
	const showInstances = Boolean(plugin.ingressCapable);
	const save = async () => {
		if (formRef.current && !formRef.current.reportValidity()) return;
		try {
			const res = await saveConfig.mutateAsync({
				id: plugin.id,
				config: schemaConfig
			});
			if (!res.success) throw new Error(res.message);
			toast.success("Saved");
		} catch (err) {
			toast.error("Save failed", err instanceof Error ? err.message : "");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
		open: true,
		title: `${plugin.name} config`,
		onClose,
		wide: true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 flex gap-1",
				children: [
					"config",
					...plugin.sessionScoped ? ["sessions"] : [],
					...showInstances ? ["instances"] : []
				].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: tab === t ? btn : ghost,
					onClick: () => setTab(t),
					children: t
				}, t))
			}),
			tab === "config" ? hasUi ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginConfigUi, { plugin }) : hasSchema ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				ref: formRef,
				className: "space-y-2",
				onSubmit: (e) => e.preventDefault(),
				children: [Object.entries(plugin.configSchema.properties).map(([key, def]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigField, {
					fieldDef: def,
					label: def.title || key,
					value: schemaConfig[key],
					onChange: (v) => setSchemaConfig({
						...schemaConfig,
						[key]: v
					})
				}, key)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: btn,
					disabled: saveConfig.isPending,
					onClick: () => void save(),
					children: "Save"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "This plugin has no configurable fields."
			}) : null,
			tab === "sessions" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionsTab, { plugin }) : null,
			tab === "instances" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginInstances, { pluginId: plugin.id }) : null
		]
	});
}
function seedConfig(plugin) {
	const props = plugin.configSchema?.properties ?? {};
	const seeded = {};
	for (const [key, def] of Object.entries(props)) seeded[key] = plugin.config?.[key] ?? emptyForField(def);
	return seeded;
}
function PluginConfigUi({ plugin, sessionId }) {
	const toast = useAppToast();
	const qc = useQueryClient();
	const htmlQ = usePluginConfigUiQuery(plugin.id, true);
	const iframeRef = (0, import_react.useRef)(null);
	const [handshake, setHandshake] = (0, import_react.useState)(false);
	const saveConfig = useUpdatePluginConfigMutation();
	const saveSession = useUpdatePluginSessionConfigMutation();
	const srcDoc = htmlQ.data ? harden(htmlQ.data) : "";
	(0, import_react.useEffect)(() => {
		const onMessage = (e) => {
			const frame = iframeRef.current?.contentWindow;
			if (!frame || e.source !== frame) return;
			const msg = e.data;
			const post = (m) => frame.postMessage(m, "*");
			if (msg?.type === "config:get") {
				setHandshake(true);
				post({
					type: "config:value",
					config: configUiSafeConfig(plugin, sessionId),
					schema: plugin.configSchema,
					theme: "dark"
				});
			} else if (msg?.type === "config:save") (async () => {
				try {
					const res = sessionId ? await saveSession.mutateAsync({
						id: plugin.id,
						sessionId,
						config: sparseSessionOverride(msg.config ?? {}, plugin)
					}) : await saveConfig.mutateAsync({
						id: plugin.id,
						config: msg.config ?? {}
					});
					if (!res.success) throw new Error(res.message);
					qc.invalidateQueries({ queryKey: queryKeys.plugins });
					post({ type: "config:saved" });
					toast.success("Saved");
				} catch (err) {
					const message = err instanceof Error ? err.message : "Save failed";
					post({
						type: "config:error",
						message
					});
					toast.error("Save failed", message);
				}
			})();
		};
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, [
		plugin,
		sessionId,
		qc,
		toast,
		saveConfig,
		saveSession
	]);
	if (htmlQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" });
	if (htmlQ.isError) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: htmlQ.error });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [!handshake ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-2 text-[11px] text-muted",
		children: "Waiting for editor handshake…"
	}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
		ref: iframeRef,
		sandbox: "allow-scripts",
		srcDoc,
		title: plugin.name,
		className: "w-full rounded-xl border border-line bg-white",
		style: { height: plugin.configUi?.height ?? 600 }
	})] });
}
function harden(source) {
	const nonce = document.querySelector("meta[name=\"openwa-csp-nonce\"]")?.content ?? "";
	const doc = new DOMParser().parseFromString(source, "text/html");
	if (nonce && nonce !== "__OPENWA_CSP_NONCE__") for (const script of doc.querySelectorAll("script:not([src])")) script.setAttribute("nonce", nonce);
	injectConfigUiCsp(doc);
	return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
function SessionsTab({ plugin }) {
	const toast = useAppToast();
	const sessions = useSessionsQuery();
	const setSessions = useSetPluginSessionsMutation();
	const saveOverride = useUpdatePluginSessionConfigMutation();
	const [mode, setMode] = (0, import_react.useState)(plugin.activeSessions?.includes("*") ? "all" : "specific");
	const [picked, setPicked] = (0, import_react.useState)(new Set((plugin.activeSessions ?? []).filter((s) => s !== "*")));
	const [selSession, setSelSession] = (0, import_react.useState)("");
	const [overrideCfg, setOverrideCfg] = (0, import_react.useState)({});
	const props = plugin.configSchema?.properties ?? {};
	(0, import_react.useEffect)(() => {
		if (!selSession || !plugin.configSchema?.properties) {
			setOverrideCfg({});
			return;
		}
		const ov = plugin.sessionConfig?.[selSession] ?? {};
		const seeded = {};
		for (const [key, def] of Object.entries(plugin.configSchema.properties)) seeded[key] = key in ov ? ov[key] : plugin.config?.[key] ?? emptyForField(def);
		setOverrideCfg(seeded);
	}, [
		selSession,
		plugin.id,
		plugin.configSchema,
		plugin.config,
		plugin.sessionConfig
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-sm",
				children: "Activation"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "mr-4 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "radio",
					checked: mode === "all",
					onChange: () => setMode("all")
				}), " All sessions"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "radio",
					checked: mode === "specific",
					onChange: () => setMode("specific")
				}), " Selected sessions"]
			}),
			mode === "specific" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 max-h-40 overflow-auto rounded-xl border border-line p-2",
				children: (sessions.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 py-1 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: picked.has(s.id),
						onChange: (e) => {
							const next = new Set(picked);
							if (e.target.checked) next.add(s.id);
							else next.delete(s.id);
							setPicked(next);
						}
					}), s.name]
				}, s.id))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${btn} mt-2`,
				disabled: setSessions.isPending,
				onClick: () => setSessions.mutateAsync({
					id: plugin.id,
					sessions: mode === "all" ? ["*"] : Array.from(picked)
				}).then(() => toast.success("Activation saved")).catch((err) => toast.error("Save failed", err instanceof Error ? err.message : "")),
				children: "Save activation"
			})
		] }), plugin.configSchema ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-2 text-sm",
				children: "Per-session override"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
				className: field$2,
				value: selSession,
				onChange: (e) => setSelSession(e.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "Select session"
				}), (sessions.data ?? []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
					value: s.id,
					children: [s.name, Object.keys(plugin.sessionConfig?.[s.id] ?? {}).length ? " ●" : ""]
				}, s.id))]
			}),
			selSession && plugin.configUi ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginConfigUi, {
				plugin,
				sessionId: selSession
			}, selSession) : null,
			selSession && !plugin.configUi ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 space-y-2",
				children: [Object.entries(props).map(([key, def]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigField, {
					fieldDef: def,
					label: def.title || key,
					value: overrideCfg[key],
					onChange: (v) => setOverrideCfg({
						...overrideCfg,
						[key]: v
					})
				}, key)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						onClick: () => void saveOverride.mutateAsync({
							id: plugin.id,
							sessionId: selSession,
							config: {}
						}).then(() => toast.success("Override cleared")),
						children: "Clear"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: btn,
						onClick: () => void saveOverride.mutateAsync({
							id: plugin.id,
							sessionId: selSession,
							config: sparseSessionOverride(overrideCfg, plugin)
						}).then(() => toast.success("Override saved")),
						children: "Save override"
					})]
				})]
			}) : null
		] }) : null]
	});
}
function useConfigSave({ buildPayload, onSaved }) {
	const toast = useAppToast();
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [savePending, setSavePending] = (0, import_react.useState)(false);
	const saveConfig = async () => {
		setSaving(true);
		try {
			const result = await saveInfraConfig(buildPayload());
			if (result.saved) {
				setSavePending(true);
				onSaved(result.profiles || []);
			} else toast.error("Save failed", result.message);
		} catch (err) {
			toast.error("Save failed", err instanceof Error ? err.message : "Unknown error");
		} finally {
			setSaving(false);
		}
	};
	return {
		saving,
		savePending,
		saveConfig
	};
}
function shouldOfferStopOrphansRetry(status, code, alreadyRetriedWithStopOrphans) {
	if (status !== 409) return false;
	if (alreadyRetriedWithStopOrphans) return false;
	return code === "IMPORT_WOULD_ORPHAN_ENGINES";
}
function useDataBackup() {
	const toast = useAppToast();
	const [migrating, setMigrating] = (0, import_react.useState)(false);
	const exportBackup = async () => {
		setMigrating(true);
		try {
			const dump = await exportInfraData();
			const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `openwa-backup-${dump.exportedAt?.slice(0, 10) || "data"}.json`;
			a.click();
			URL.revokeObjectURL(url);
			const omitted = dump.omittedInlineMedia;
			const dropped = (omitted?.messages ?? 0) + (omitted?.messageBatches ?? 0);
			if (dropped > 0) toast.warning("Partial backup", `${dropped} media payloads were omitted from the archive.`);
		} catch (err) {
			toast.error("Export failed", err instanceof Error ? err.message : "Unknown error");
		} finally {
			setMigrating(false);
		}
	};
	const runImport = async (tables, stopOrphans = false) => {
		try {
			const res = await importInfraData(tables, stopOrphans ? { stopOrphans: true } : void 0);
			if (res.imported) {
				if (res.restartRequired || res.notices && res.notices.length > 0) toast.warning("Import finished", (res.notices ?? []).join("; ") || void 0);
				else toast.success("Import finished");
			} else toast.error("Import failed", (res.warnings || []).slice(0, 3).join("; ") || res.message);
		} catch (err) {
			const status = err?.status;
			const code = err?.code;
			if (shouldOfferStopOrphansRetry(status, code, stopOrphans) && err instanceof Error) {
				if (window.confirm(err.message)) await runImport(tables, true);
				else toast.error("Import failed", err.message);
				return;
			}
			const detail = status === 413 ? "Backup is larger than the server body limit. Increase BODY_SIZE_LIMIT and retry." : err instanceof Error ? err.message : "Unknown error";
			toast.error("Import failed", detail);
		}
	};
	const importBackup = async (file) => {
		let parsed;
		try {
			parsed = JSON.parse(await file.text());
		} catch {
			toast.error("Import failed", "Invalid JSON file");
			return;
		}
		if (!parsed?.tables || typeof parsed.tables !== "object") {
			toast.error("Import failed", "Invalid backup file");
			return;
		}
		const rows = Object.values(parsed.tables).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0);
		if (!window.confirm(`This replaces all current data (${rows} rows). Continue?`)) return;
		setMigrating(true);
		try {
			await runImport(parsed.tables);
		} finally {
			setMigrating(false);
		}
	};
	return {
		migrating,
		exportBackup,
		importBackup
	};
}
function useInfraConfigForm(infraStatus, savedConfig) {
	const [dbConfig, setDbConfig] = (0, import_react.useState)({
		type: "sqlite",
		builtIn: false,
		host: "localhost",
		port: "5432",
		username: "postgres",
		password: "",
		database: "openwa",
		schema: "public",
		poolSize: 10,
		sslEnabled: false,
		sslRejectUnauthorized: true
	});
	const [redisConfig, setRedisConfig] = (0, import_react.useState)({
		builtIn: false,
		host: "localhost",
		port: "6379",
		password: "",
		connected: false
	});
	const [storageConfig, setStorageConfig] = (0, import_react.useState)({
		type: "local",
		builtIn: false,
		localPath: "./data/media",
		s3Bucket: "",
		s3Region: "ap-southeast-1",
		s3AccessKey: "",
		s3SecretKey: "",
		s3Endpoint: ""
	});
	const [engineConfig, setEngineConfig] = (0, import_react.useState)({
		type: "whatsapp-web.js",
		headless: true,
		sessionDataPath: "./data/sessions",
		browserArgs: "--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu"
	});
	const [redisEnabled, setRedisEnabledState] = (0, import_react.useState)(false);
	const [queueEnabled, setQueueEnabled] = (0, import_react.useState)(false);
	const formHydrated = (0, import_react.useRef)(false);
	const engineHydrated = (0, import_react.useRef)(false);
	const engineTouched = (0, import_react.useRef)(false);
	const engineTypeKnown = () => engineHydrated.current || engineTouched.current;
	(0, import_react.useEffect)(() => {
		if (!infraStatus || formHydrated.current) return;
		setDbConfig((prev) => ({
			...prev,
			type: infraStatus.database.type || "sqlite",
			host: infraStatus.database.host || "localhost",
			builtIn: infraStatus.database.builtIn
		}));
		setRedisConfig((prev) => ({
			...prev,
			host: infraStatus.redis.host,
			port: String(infraStatus.redis.port),
			builtIn: infraStatus.redis.builtIn
		}));
		setRedisEnabledState(infraStatus.redis.enabled);
		setStorageConfig((prev) => ({
			...prev,
			type: infraStatus.storage.type,
			localPath: infraStatus.storage.path || "./uploads",
			builtIn: infraStatus.storage.builtIn
		}));
		setQueueEnabled(infraStatus.queue.enabled);
	}, [infraStatus]);
	(0, import_react.useEffect)(() => {
		if (!savedConfig || formHydrated.current) return;
		setDbConfig((prev) => ({
			...prev,
			host: savedConfig.database.host || prev.host,
			port: savedConfig.database.port || prev.port,
			username: savedConfig.database.username || prev.username,
			database: savedConfig.database.database || prev.database,
			schema: savedConfig.database.schema || prev.schema,
			poolSize: savedConfig.database.poolSize,
			sslEnabled: savedConfig.database.sslEnabled,
			sslRejectUnauthorized: savedConfig.database.sslRejectUnauthorized
		}));
		setRedisConfig((prev) => ({
			...prev,
			host: savedConfig.redis.host || prev.host,
			port: savedConfig.redis.port || prev.port
		}));
		setStorageConfig((prev) => ({
			...prev,
			localPath: savedConfig.storage.localPath || prev.localPath,
			s3Bucket: savedConfig.storage.s3Bucket || prev.s3Bucket,
			s3Region: savedConfig.storage.s3Region || prev.s3Region,
			s3Endpoint: savedConfig.storage.s3Endpoint || prev.s3Endpoint
		}));
		setEngineConfig((prev) => ({
			...prev,
			headless: savedConfig.engine.headless,
			sessionDataPath: savedConfig.engine.sessionDataPath || prev.sessionDataPath,
			browserArgs: savedConfig.engine.browserArgs || prev.browserArgs
		}));
	}, [savedConfig]);
	(0, import_react.useEffect)(() => {
		if (infraStatus && savedConfig) formHydrated.current = true;
	}, [infraStatus, savedConfig]);
	(0, import_react.useEffect)(() => {
		const seed = savedConfig?.engine.type;
		if (!seed || engineHydrated.current || engineTouched.current) return;
		engineHydrated.current = true;
		setEngineConfig((prev) => prev.type === seed ? prev : {
			...prev,
			type: seed
		});
	}, [savedConfig]);
	const updateDbConfig = (key, value) => setDbConfig((prev) => ({
		...prev,
		[key]: value
	}));
	const updateRedisConfig = (key, value) => setRedisConfig((prev) => ({
		...prev,
		[key]: value
	}));
	const updateStorageConfig = (key, value) => setStorageConfig((prev) => ({
		...prev,
		[key]: value
	}));
	const updateEngineConfig = (key, value) => {
		if (key === "type") engineTouched.current = true;
		setEngineConfig((prev) => ({
			...prev,
			[key]: value
		}));
	};
	const setRedisEnabled = (enabled) => {
		setRedisEnabledState(enabled);
		if (!enabled) setQueueEnabled(false);
	};
	const setRedisConnected = (connected) => setRedisConfig((prev) => ({
		...prev,
		connected
	}));
	const buildSavePayload = () => ({
		database: { ...dbConfig },
		redis: {
			enabled: redisEnabled,
			builtIn: redisConfig.builtIn,
			host: redisConfig.host,
			port: redisConfig.port,
			password: redisConfig.password
		},
		queue: { enabled: queueEnabled },
		storage: { ...storageConfig },
		engine: engineTypeKnown() && !(engineHydrated.current && !engineTouched.current && infraStatus?.envPinned?.includes("ENGINE_TYPE")) ? { ...engineConfig } : {
			...engineConfig,
			type: void 0
		}
	});
	return {
		dbConfig,
		redisConfig,
		storageConfig,
		engineConfig,
		redisEnabled,
		queueEnabled,
		setRedisEnabled,
		setQueueEnabled,
		setRedisConnected,
		updateDbConfig,
		updateRedisConfig,
		updateStorageConfig,
		updateEngineConfig,
		buildSavePayload
	};
}
var MIN_ATTEMPTS = 60;
var MAX_ATTEMPTS = 300;
function restartPollAttempts(estimatedSeconds) {
	if (!Number.isFinite(estimatedSeconds) || estimatedSeconds <= 0) return MIN_ATTEMPTS;
	return Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Math.ceil(estimatedSeconds * 2)));
}
function useRestartFlow() {
	const [showRestartModal, setShowRestartModal] = (0, import_react.useState)(false);
	const [restartCountdown, setRestartCountdown] = (0, import_react.useState)(0);
	const [restartStatus, setRestartStatus] = (0, import_react.useState)("idle");
	const [profiles, setProfiles] = (0, import_react.useState)({
		pending: [],
		previous: []
	});
	const [dbSwitch, setDbSwitch] = (0, import_react.useState)(false);
	const [storageSwitch, setStorageSwitch] = (0, import_react.useState)(false);
	const pollTimeoutsRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const countdownIntervalRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const pollTimeouts = pollTimeoutsRef.current;
		return () => {
			for (const handle of pollTimeouts) clearTimeout(handle);
			pollTimeouts.clear();
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
				countdownIntervalRef.current = null;
			}
		};
	}, []);
	const schedulePollTimeout = (fn, ms) => {
		const handle = setTimeout(() => {
			pollTimeoutsRef.current.delete(handle);
			fn();
		}, ms);
		pollTimeoutsRef.current.add(handle);
	};
	const stopCountdown = () => {
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
			countdownIntervalRef.current = null;
		}
	};
	const open = ({ profiles: newProfiles, dbSwitch: nextDbSwitch, storageSwitch: nextStorageSwitch }) => {
		setProfiles((prev) => ({
			previous: prev.pending,
			pending: newProfiles
		}));
		setDbSwitch(nextDbSwitch);
		setStorageSwitch(nextStorageSwitch);
		setShowRestartModal(true);
	};
	const close = () => {
		if (restartStatus === "idle") setShowRestartModal(false);
	};
	const checkServerHealth = (estimatedTime) => {
		let attempts = 0;
		const maxAttempts = restartPollAttempts(estimatedTime);
		const check = async () => {
			try {
				await getReadyHealth();
				stopCountdown();
				setRestartCountdown(0);
				setRestartStatus("success");
				schedulePollTimeout(() => window.location.reload(), 2e3);
			} catch {
				attempts++;
				if (attempts < maxAttempts) schedulePollTimeout(check, 1e3);
				else setRestartStatus("error");
			}
		};
		schedulePollTimeout(check, 3e3);
	};
	const start = async () => {
		setRestartStatus("restarting");
		setRestartCountdown(30);
		const profilesToRemove = profiles.previous.filter((p) => !profiles.pending.includes(p));
		let estimatedTime;
		try {
			const response = await restartInfra(profiles.pending, profilesToRemove);
			estimatedTime = response.estimatedTime;
			if (response.estimatedTime) setRestartCountdown(response.estimatedTime);
		} catch {}
		setRestartStatus("waiting");
		stopCountdown();
		countdownIntervalRef.current = setInterval(() => {
			setRestartCountdown((prev) => {
				if (prev <= 1) {
					stopCountdown();
					return 0;
				}
				return prev - 1;
			});
		}, 1e3);
		checkServerHealth(estimatedTime);
	};
	return {
		showRestartModal,
		restartCountdown,
		restartStatus,
		pendingProfiles: profiles.pending,
		previousProfiles: profiles.previous,
		dbSwitch,
		storageSwitch,
		open,
		close,
		start
	};
}
function InfraPanel() {
	const toast = useAppToast();
	const statusQ = useInfraQuery();
	const configQ = useInfraConfigQuery();
	const enginesQ = useEnginesQuery();
	const currentEngineQ = useCurrentEngineQuery();
	const infraStatus = statusQ.data;
	const savedConfig = configQ.data;
	const configForm = useInfraConfigForm(infraStatus, savedConfig);
	const restartFlow = useRestartFlow();
	const dataBackup = useDataBackup();
	const configSave = useConfigSave({
		buildPayload: configForm.buildSavePayload,
		onSaved: (profiles) => {
			const dbExternalRetarget = configForm.dbConfig.type === "postgres" && !configForm.dbConfig.builtIn && !!savedConfig && (configForm.dbConfig.host !== savedConfig.database.host || configForm.dbConfig.port !== savedConfig.database.port || configForm.dbConfig.database !== savedConfig.database.database);
			const dbSwitch = !!infraStatus && (configForm.dbConfig.type !== infraStatus.database.type || configForm.dbConfig.type === "postgres" && configForm.dbConfig.builtIn !== infraStatus.database.builtIn || dbExternalRetarget);
			const storageSwitch = !!infraStatus && (configForm.storageConfig.type !== infraStatus.storage.type || configForm.storageConfig.type === "s3" && configForm.storageConfig.builtIn !== infraStatus.storage.builtIn);
			restartFlow.open({
				profiles,
				dbSwitch,
				storageSwitch
			});
		}
	});
	const [queueStats, setQueueStats] = (0, import_react.useState)({
		pending: 0,
		completed: 0,
		failed: 0
	});
	const currentEngine = currentEngineQ.data?.engineType ?? "";
	(0, import_react.useEffect)(() => {
		if (!infraStatus) return;
		configForm.setRedisConnected(infraStatus.redis.connected);
		setQueueStats(infraStatus.queue.webhooks);
	}, [infraStatus]);
	if (statusQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" });
	if (statusQ.isError || !infraStatus) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
		title: "Infrastructure",
		sub: "Live status from GET /api/infra/status",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: statusQ.error ?? /* @__PURE__ */ new Error("Could not load infrastructure status") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: ghost,
			onClick: () => void statusQ.refetch(),
			children: "Retry"
		})]
	});
	const settingNote = (envKey, running, saved) => {
		if (infraStatus.envPinned?.includes(envKey)) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-3 flex items-center gap-1 text-[11px] text-amber-300",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 14 }),
				" ",
				envKey,
				" is pinned by the environment and cannot be changed here."
			]
		});
		return !configSave.saving && !!savedConfig && running !== saved ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-3 flex items-center gap-1 text-[11px] text-amber-300",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { size: 14 }), " Saved — restart the gateway to apply this change."]
		}) : null;
	};
	const s3Unreachable = configForm.storageConfig.type === "s3" && infraStatus.storage.s3Available === false;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: statusQ.error ?? configQ.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Database",
				sub: configForm.dbConfig.type === "postgres" ? "PostgreSQL" : "SQLite",
				actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] text-wa",
					children: infraStatus.database.connected ? "connected" : "offline"
				}),
				children: [
					settingNote("DATABASE_TYPE", infraStatus.database.type, savedConfig?.database.type),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-3 grid gap-2 sm:grid-cols-2",
						children: ["sqlite", "postgres"].map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: `cursor-pointer rounded-xl border p-3 ${configForm.dbConfig.type === type ? "border-wa/50 bg-wa/10" : "border-line"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "radio",
								className: "mr-2",
								checked: configForm.dbConfig.type === type,
								onChange: () => configForm.updateDbConfig("type", type)
							}), type === "sqlite" ? "SQLite (file)" : "PostgreSQL"]
						}, type))
					}),
					configForm.dbConfig.type === "postgres" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm",
							children: "Use built-in Postgres"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-muted",
							children: "OpenWA-managed container"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							checked: configForm.dbConfig.builtIn,
							onChange: (v) => configForm.updateDbConfig("builtIn", v)
						})]
					}), !configForm.dbConfig.builtIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.dbConfig.host,
								onChange: (e) => configForm.updateDbConfig("host", e.target.value),
								placeholder: "Host"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.dbConfig.port,
								onChange: (e) => configForm.updateDbConfig("port", e.target.value),
								placeholder: "Port"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.dbConfig.username,
								onChange: (e) => configForm.updateDbConfig("username", e.target.value),
								placeholder: "Username"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								type: "password",
								value: configForm.dbConfig.password,
								onChange: (e) => configForm.updateDbConfig("password", e.target.value),
								placeholder: "Password (blank keeps current)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.dbConfig.database,
								onChange: (e) => configForm.updateDbConfig("database", e.target.value),
								placeholder: "Database"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								type: "number",
								value: configForm.dbConfig.poolSize,
								onChange: (e) => configForm.updateDbConfig("poolSize", parseInt(e.target.value)),
								placeholder: "Pool size"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.dbConfig.schema,
								onChange: (e) => configForm.updateDbConfig("schema", e.target.value),
								placeholder: "Schema"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-xl border border-line px-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm",
									children: "SSL"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
									checked: configForm.dbConfig.sslEnabled,
									onChange: (v) => configForm.updateDbConfig("sslEnabled", v)
								})]
							})
						]
					}) : null] }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-center gap-2 text-[12px] text-wa",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { size: 14 }), " Migrations applied automatically"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ghost,
							disabled: dataBackup.migrating,
							onClick: () => void dataBackup.exportBackup(),
							children: [dataBackup.migrating ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								size: 14,
								className: "animate-spin"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 14 }), " Export backup"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: ghost,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 14 }),
								" Import backup",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "file",
									accept: "application/json,.json",
									className: "hidden",
									disabled: dataBackup.migrating,
									onChange: (e) => {
										const file = e.target.files?.[0];
										if (file) dataBackup.importBackup(file);
										e.target.value = "";
									}
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "WhatsApp engine",
				sub: currentEngine || configForm.engineConfig.type,
				children: [
					settingNote("ENGINE_TYPE", infraStatus.engine.type, savedConfig?.engine.type),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-3 grid gap-2 sm:grid-cols-2",
						children: (enginesQ.data ?? []).map((engine) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: `cursor-pointer rounded-xl border p-3 ${configForm.engineConfig.type === engine.id ? "border-wa/50 bg-wa/10" : "border-line"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "radio",
									className: "mr-2",
									checked: configForm.engineConfig.type === engine.id,
									onChange: () => configForm.updateEngineConfig("type", engine.id)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-medium",
									children: engine.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted",
									children: engine.library ? `${engine.library.name} ${engine.library.version}` : "Built-in"
								})
							]
						}, engine.id))
					}),
					infraStatus.engine.webVersion !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mb-3 text-[11px] text-muted",
						children: [
							"WhatsApp Web: ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: infraStatus.engine.webVersion ?? "native" }),
							infraStatus.engine.webVersionSource ? ` (${infraStatus.engine.webVersionSource})` : ""
						]
					}) : null,
					configForm.engineConfig.type === "whatsapp-web.js" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm",
									children: "Headless browser"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
									checked: configForm.engineConfig.headless,
									onChange: (v) => configForm.updateEngineConfig("headless", v)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.engineConfig.sessionDataPath,
								onChange: (e) => configForm.updateEngineConfig("sessionDataPath", e.target.value),
								placeholder: "Session data path"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.engineConfig.browserArgs,
								onChange: (e) => configForm.updateEngineConfig("browserArgs", e.target.value),
								placeholder: "Browser args"
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-muted",
						children: "This engine does not launch a browser."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Redis",
				sub: configForm.redisEnabled ? configForm.redisConfig.connected ? "Connected" : "Disconnected" : "Disabled",
				children: [
					settingNote("REDIS_ENABLED", infraStatus.redis.enabled, savedConfig?.redis.enabled),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm",
							children: "Enable Redis"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-muted",
							children: "Required for webhook queues"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							checked: configForm.redisEnabled,
							onChange: configForm.setRedisEnabled
						})]
					}),
					configForm.redisEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm",
								children: "Use built-in Redis"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								checked: configForm.redisConfig.builtIn,
								onChange: (v) => configForm.updateRedisConfig("builtIn", v)
							})]
						}),
						!configForm.redisConfig.builtIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 grid gap-2 sm:grid-cols-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: field$2,
									value: configForm.redisConfig.host,
									onChange: (e) => configForm.updateRedisConfig("host", e.target.value),
									placeholder: "Host"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: field$2,
									value: configForm.redisConfig.port,
									onChange: (e) => configForm.updateRedisConfig("port", e.target.value),
									placeholder: "Port"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: field$2,
									type: "password",
									value: configForm.redisConfig.password,
									onChange: (e) => configForm.updateRedisConfig("password", e.target.value),
									placeholder: "Password (optional)"
								})
							]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm",
								children: "Webhook queue"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								checked: configForm.queueEnabled,
								onChange: configForm.setQueueEnabled
							})]
						}),
						configForm.queueEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-2 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border border-line p-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-lg font-semibold",
										children: queueStats.pending
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-muted",
										children: "Pending"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border border-line p-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-lg font-semibold",
										children: queueStats.completed.toLocaleString()
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-muted",
										children: "Completed"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border border-line p-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-lg font-semibold text-danger",
										children: queueStats.failed
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-muted",
										children: "Failed"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `${ghost} col-span-3`,
									onClick: () => {
										copyToClipboard(`${getOpenWAApiBase()}/admin/queues`).then((ok) => {
											if (ok) toast.success("BullMQ URL copied", "Open it with an authenticated client.");
										});
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { size: 14 }), " Copy BullMQ admin URL"]
								})
							]
						}) : null
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-muted",
						children: "Redis is optional. Enable it for durable webhook delivery."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Storage",
				sub: configForm.storageConfig.type === "s3" ? s3Unreachable ? "S3 unreachable" : "S3" : "Local disk",
				children: [
					settingNote("STORAGE_TYPE", infraStatus.storage.type, savedConfig?.storage.type),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-3 grid gap-2 sm:grid-cols-2",
						children: ["local", "s3"].map((type) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: `cursor-pointer rounded-xl border p-3 ${configForm.storageConfig.type === type ? "border-wa/50 bg-wa/10" : "border-line"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "radio",
								className: "mr-2",
								checked: configForm.storageConfig.type === type,
								onChange: () => configForm.updateStorageConfig("type", type)
							}), type === "local" ? "Local folder" : "S3 / MinIO"]
						}, type))
					}),
					configForm.storageConfig.type === "local" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: field$2,
						value: configForm.storageConfig.localPath,
						onChange: (e) => configForm.updateStorageConfig("localPath", e.target.value),
						placeholder: "Storage path"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm",
							children: "Use built-in MinIO"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							checked: configForm.storageConfig.builtIn,
							onChange: (v) => configForm.updateStorageConfig("builtIn", v)
						})]
					}), !configForm.storageConfig.builtIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.storageConfig.s3Bucket,
								onChange: (e) => configForm.updateStorageConfig("s3Bucket", e.target.value),
								placeholder: "Bucket"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.storageConfig.s3Region,
								onChange: (e) => configForm.updateStorageConfig("s3Region", e.target.value),
								placeholder: "Region"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: configForm.storageConfig.s3AccessKey,
								onChange: (e) => configForm.updateStorageConfig("s3AccessKey", e.target.value),
								placeholder: "Access key"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								type: "password",
								value: configForm.storageConfig.s3SecretKey,
								onChange: (e) => configForm.updateStorageConfig("s3SecretKey", e.target.value),
								placeholder: "Secret key"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: `${field$2} sm:col-span-2`,
								value: configForm.storageConfig.s3Endpoint,
								onChange: (e) => configForm.updateStorageConfig("s3Endpoint", e.target.value),
								placeholder: "Endpoint (optional)"
							})
						]
					}) : null] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: `${btn} w-full py-3 text-sm`,
				disabled: configSave.saving,
				onClick: () => void configSave.saveConfig(),
				children: [configSave.saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
					size: 16,
					className: "animate-spin"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { size: 16 }), configSave.saving ? "Saving…" : "Save configuration"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				open: restartFlow.showRestartModal,
				title: restartFlow.restartStatus === "idle" ? "Restart gateway?" : restartFlow.restartStatus === "success" ? "Restarted" : restartFlow.restartStatus === "error" ? "Restart failed" : "Restarting…",
				onClose: restartFlow.close,
				children: [
					restartFlow.restartStatus === "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Apply the saved config by restarting OpenWA. Sessions reconnect automatically after the process comes back."
							}),
							restartFlow.dbSwitch || restartFlow.storageSwitch ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
										size: 16,
										className: "mb-1 inline"
									}),
									" Switching backends starts empty.",
									restartFlow.dbSwitch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Export a backup before restarting if you need the current database." }) : null,
									restartFlow.dbSwitch ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${ghost} mt-2`,
										disabled: dataBackup.migrating,
										onClick: () => void dataBackup.exportBackup(),
										children: "Download backup"
									}) : null
								]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-end gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: ghost,
									onClick: restartFlow.close,
									children: "Later"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: btn,
									onClick: () => void restartFlow.start(),
									children: "Restart now"
								})]
							})
						]
					}) : null,
					restartFlow.restartStatus === "restarting" || restartFlow.restartStatus === "waiting" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-6 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								className: "mx-auto mb-3 animate-spin",
								size: 36
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm",
								children: restartFlow.restartCountdown > 0 ? `Restarting… ${restartFlow.restartCountdown}s` : "Checking readiness…"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-[11px] text-muted",
								children: "Do not close this tab."
							})
						]
					}) : null,
					restartFlow.restartStatus === "success" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "py-4 text-center text-wa",
						children: "Gateway is ready. Reloading…"
					}) : null,
					restartFlow.restartStatus === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-danger",
							children: "The gateway did not become ready in time."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							onClick: () => window.location.reload(),
							children: "Reload"
						})]
					}) : null
				]
			})
		]
	});
}
function escapeCsvCell(value) {
	let s = value === void 0 || value === null ? "" : String(value);
	if (/^[=+\-@]/.test(s)) s = `'${s}`;
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
}
async function fetchAllPages(fetchPage, { pageSize = 200, maxItems = 5e4 } = {}) {
	const all = [];
	let offset = 0;
	for (;;) {
		const { data, total } = await fetchPage(pageSize, offset);
		all.push(...data);
		offset += data.length;
		if (data.length === 0 || offset >= total || all.length >= maxItems) break;
	}
	return all;
}
function pageWindow(current, totalPages, size = 5) {
	if (totalPages <= 0) return [];
	const clamped = Math.min(Math.max(current, 1), totalPages);
	const count = Math.min(size, totalPages);
	let start = clamped - Math.floor(count / 2);
	start = Math.max(1, Math.min(start, totalPages - count + 1));
	return Array.from({ length: count }, (_, i) => start + i);
}
function buildCsv(rows) {
	const headers = [
		"timestamp",
		"action",
		"severity",
		"session",
		"apiKey",
		"ip",
		"method",
		"path",
		"statusCode",
		"errorMessage"
	];
	const lines = rows.map((log) => [
		log.createdAt,
		log.action,
		log.severity,
		log.sessionName || log.sessionId || "",
		log.apiKeyName || log.apiKeyId || "",
		log.ipAddress,
		log.method,
		log.path,
		log.statusCode,
		log.errorMessage
	].map(escapeCsvCell).join(","));
	return [headers.join(","), ...lines].join("\n");
}
function LogsPanel() {
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [severity, setSeverity] = (0, import_react.useState)("");
	const [page, setPage] = (0, import_react.useState)(0);
	const [exporting, setExporting] = (0, import_react.useState)(false);
	const limit = 20;
	const logs = useLogsQuery({
		severity: severity || void 0,
		page,
		limit
	});
	const rows = logs.data?.data ?? [];
	const total = logs.data?.total ?? 0;
	const filtered = rows.filter((log) => log.action.toLowerCase().includes(searchQuery.toLowerCase()) || (log.errorMessage || "").toLowerCase().includes(searchQuery.toLowerCase()));
	const totalPages = Math.max(1, Math.ceil(total / limit));
	const download = (csv) => {
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `openwa-logs-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};
	const handleExport = async () => {
		if (exporting) return;
		setExporting(true);
		try {
			const all = await fetchAllPages((lim, offset) => listAuditLogs({
				severity: severity || void 0,
				limit: lim,
				offset
			}));
			const q = searchQuery.toLowerCase();
			const out = q ? all.filter((l) => l.action.toLowerCase().includes(q) || (l.errorMessage || "").toLowerCase().includes(q)) : all;
			if (out.length > 0) download(buildCsv(out));
		} catch {
			if (filtered.length > 0) download(buildCsv(filtered));
		} finally {
			setExporting(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: logs.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							size: 14,
							className: "pointer-events-none absolute top-2.5 left-3 text-muted"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: `${field$2} pl-8`,
							value: searchQuery,
							onChange: (e) => {
								setSearchQuery(e.target.value);
								setPage(0);
							},
							placeholder: "Search action or error"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: `${field$2} w-36`,
						value: severity,
						onChange: (e) => {
							setSeverity(e.target.value);
							setPage(0);
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "",
								children: "All severities"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "info",
								children: "info"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "warn",
								children: "warn"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "error",
								children: "error"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: ghost,
						disabled: exporting || total === 0,
						onClick: () => void handleExport(),
						children: [exporting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
							size: 14,
							className: "animate-spin"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { size: 14 }), " Export CSV"]
					})
				]
			}),
			logs.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden rounded-2xl border border-line",
				children: filtered.length === 0 && !logs.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-4 py-10 text-center text-sm text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "mx-auto mb-2" }), searchQuery || severity ? "No logs match these filters on this page." : "No audit logs yet."]
				}) : filtered.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-b border-line px-3 py-2 text-[12px] last:border-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: row.severity === "error" ? "text-danger" : row.severity === "warn" ? "text-amber-300" : "text-muted",
								children: row.severity
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-dim",
								children: new Date(row.createdAt).toLocaleString()
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium",
							children: row.action
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-muted",
							children: [
								row.sessionName || row.sessionId || "—",
								" · ",
								row.apiKeyName || row.apiKeyId || "—",
								" · ",
								row.ipAddress || "—"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-dim",
							children: [
								row.method,
								" ",
								row.path,
								" ",
								row.statusCode ?? "",
								" ",
								row.errorMessage ?? ""
							]
						})
					]
				}, row.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						disabled: page === 0,
						onClick: () => setPage((p) => Math.max(0, p - 1)),
						children: "Previous"
					}),
					pageWindow(page + 1, totalPages).map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: n === page + 1 ? ghost.replace("text-muted", "text-ink") : ghost,
						onClick: () => setPage(n - 1),
						children: n
					}, n)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						disabled: page + 1 >= totalPages,
						onClick: () => setPage((p) => p + 1),
						children: "Next"
					})
				]
			})
		]
	});
}
var messageTypes = [
	"text",
	"image",
	"video",
	"audio",
	"document",
	"location",
	"contact",
	"sticker",
	"poll",
	"forward",
	"bulk"
];
var mediaTypes = [
	"image",
	"video",
	"audio",
	"document",
	"sticker"
];
var MEDIA_UPLOAD_MAX_BYTES = 18874368;
function MessageTesterPanel() {
	const toast = useAppToast();
	const sessionsQ = useSessionsQuery();
	const ready = (sessionsQ.data ?? []).filter((s) => s.status === "ready");
	const [sessionId, setSessionId] = (0, import_react.useState)("");
	const sid = sessionId || ready[0]?.id || "";
	const [recipient, setRecipient] = (0, import_react.useState)("");
	const [recipientType, setRecipientType] = (0, import_react.useState)("personal");
	const [selectedGroup, setSelectedGroup] = (0, import_react.useState)("");
	const [messageType, setMessageType] = (0, import_react.useState)("text");
	const [content, setContent] = (0, import_react.useState)("");
	const [mediaUrl, setMediaUrl] = (0, import_react.useState)("");
	const [mediaFile, setMediaFile] = (0, import_react.useState)(null);
	const [latitude, setLatitude] = (0, import_react.useState)("");
	const [longitude, setLongitude] = (0, import_react.useState)("");
	const [locationDescription, setLocationDescription] = (0, import_react.useState)("");
	const [locationAddress, setLocationAddress] = (0, import_react.useState)("");
	const [contactName, setContactName] = (0, import_react.useState)("");
	const [contactNumber, setContactNumber] = (0, import_react.useState)("");
	const [pollQuestion, setPollQuestion] = (0, import_react.useState)("");
	const [pollOptions, setPollOptions] = (0, import_react.useState)(["", ""]);
	const [allowMultipleAnswers, setAllowMultipleAnswers] = (0, import_react.useState)(false);
	const [forwardFrom, setForwardFrom] = (0, import_react.useState)("");
	const [forwardTo, setForwardTo] = (0, import_react.useState)("");
	const [forwardMessageId, setForwardMessageId] = (0, import_react.useState)("");
	const [bulkRecipients, setBulkRecipients] = (0, import_react.useState)("");
	const [bulkDelay, setBulkDelay] = (0, import_react.useState)("1500");
	const [sending, setSending] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	const [batchId, setBatchId] = (0, import_react.useState)("");
	const [batchSession, setBatchSession] = (0, import_react.useState)("");
	const groupsQ = useGroupsQuery(sid, recipientType === "group" && Boolean(sid));
	const batchQ = useBatchStatusQuery(batchSession, batchId, Boolean(batchId));
	const fileRef = (0, import_react.useRef)(null);
	const chatId = recipientType === "group" ? selectedGroup : recipient;
	const mediaPayload = (0, import_react.useMemo)(() => {
		if (mediaFile) return {
			base64: mediaFile.base64,
			mimetype: mediaFile.mimetype,
			filename: mediaFile.filename,
			caption: content || void 0
		};
		if (mediaUrl.trim()) return {
			url: mediaUrl.trim(),
			caption: content || void 0
		};
		return null;
	}, [
		mediaFile,
		mediaUrl,
		content
	]);
	const onPickMedia = async (e) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
			toast.error("File too large", "Max ~18 MiB for base64 uploads.");
			return;
		}
		setMediaUrl("");
		setMediaFile(await fileToBase64(file));
	};
	const send = async () => {
		if (!sid) return;
		setSending(true);
		setResult(null);
		try {
			if (messageType === "text") {
				const res = await sendText$1(sid, chatId, content);
				setResult(JSON.stringify(res, null, 2));
			} else if (mediaTypes.includes(messageType)) {
				if (!mediaPayload) throw new Error("Pick a file or enter a media URL");
				if (messageType === "sticker") setResult(JSON.stringify(await sendSticker(sid, chatId, mediaPayload), null, 2));
				else setResult(JSON.stringify(await sendTypedMedia(sid, chatId, messageType, mediaPayload), null, 2));
			} else if (messageType === "location") setResult(JSON.stringify(await sendLocation(sid, {
				chatId,
				latitude: Number(latitude),
				longitude: Number(longitude),
				description: locationDescription || void 0,
				address: locationAddress || void 0
			}), null, 2));
			else if (messageType === "contact") setResult(JSON.stringify(await sendContact(sid, {
				chatId,
				contactName,
				contactNumber
			}), null, 2));
			else if (messageType === "poll") setResult(JSON.stringify(await sendPoll(sid, {
				chatId,
				name: pollQuestion,
				options: pollOptions.map((o) => o.trim()).filter(Boolean),
				allowMultipleAnswers
			}), null, 2));
			else if (messageType === "forward") setResult(JSON.stringify(await forwardMessage(sid, {
				fromChatId: forwardFrom,
				toChatId: forwardTo,
				messageId: forwardMessageId
			}), null, 2));
			else if (messageType === "bulk") {
				const numbers = bulkRecipients.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
				const messages = [];
				for (const number of numbers) {
					const id = (await checkNumber(sid, number.replace(/\D/g, ""))).whatsappId || number;
					messages.push({
						chatId: id,
						type: "text",
						content: { text: content }
					});
				}
				const batch = await sendBulk(sid, {
					messages,
					options: {
						delayBetweenMessages: Number(bulkDelay) || 1500,
						randomizeDelay: true
					}
				});
				setBatchSession(sid);
				setBatchId(batch.batchId);
				setResult(JSON.stringify(batch, null, 2));
			}
			toast.success("Sent");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Send failed";
			setResult(message);
			toast.error("Send failed", message);
		} finally {
			setSending(false);
		}
	};
	const batch = batchQ.data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorLine, { error: sessionsQ.error ?? groupsQ.error ?? batchQ.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Message tester",
				sub: "Send every OpenWA message type against a ready session.",
				children: [
					sessionsQ.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin text-muted" }) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: field$2,
								value: sid,
								onChange: (e) => setSessionId(e.target.value),
								children: ready.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: s.id,
									children: [
										s.name,
										" ",
										s.phone ? `(${s.phone})` : ""
									]
								}, s.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: field$2,
								value: messageType,
								onChange: (e) => setMessageType(e.target.value),
								children: messageTypes.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: t,
									children: t
								}, t))
							}),
							messageType !== "forward" && messageType !== "bulk" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: field$2,
								value: recipientType,
								onChange: (e) => setRecipientType(e.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "personal",
									children: "Personal"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "group",
									children: "Group"
								})]
							}), recipientType === "group" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: field$2,
								value: selectedGroup,
								onChange: (e) => setSelectedGroup(e.target.value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Select group"
								}), (groupsQ.data ?? []).map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: g.id,
									children: g.name
								}, g.id))]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: recipient,
								onChange: (e) => setRecipient(e.target.value),
								placeholder: "chatId or phone"
							})] }) : null
						]
					}),
					messageType === "text" || mediaTypes.includes(messageType) || messageType === "bulk" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						className: `${field$2} mt-2 min-h-24`,
						value: content,
						onChange: (e) => setContent(e.target.value),
						placeholder: "Message / caption"
					}) : null,
					mediaTypes.includes(messageType) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: mediaUrl,
								onChange: (e) => {
									setMediaUrl(e.target.value);
									setMediaFile(null);
								},
								placeholder: "https://… media URL"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: ghost,
									onClick: () => fileRef.current?.click(),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { size: 14 }), " Upload file"]
								}), mediaFile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									className: ghost,
									onClick: () => setMediaFile(null),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 14 }),
										" ",
										mediaFile.filename
									]
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: fileRef,
								type: "file",
								className: "hidden",
								onChange: (e) => void onPickMedia(e)
							})
						]
					}) : null,
					messageType === "location" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 grid gap-2 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: latitude,
								onChange: (e) => setLatitude(e.target.value),
								placeholder: "Latitude"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: longitude,
								onChange: (e) => setLongitude(e.target.value),
								placeholder: "Longitude"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: locationDescription,
								onChange: (e) => setLocationDescription(e.target.value),
								placeholder: "Description"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: locationAddress,
								onChange: (e) => setLocationAddress(e.target.value),
								placeholder: "Address"
							})
						]
					}) : null,
					messageType === "contact" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 grid gap-2 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: contactName,
							onChange: (e) => setContactName(e.target.value),
							placeholder: "Contact name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: contactNumber,
							onChange: (e) => setContactNumber(e.target.value),
							placeholder: "Contact number"
						})]
					}) : null,
					messageType === "poll" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: pollQuestion,
								onChange: (e) => setPollQuestion(e.target.value),
								placeholder: "Question"
							}),
							pollOptions.map((opt, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: opt,
								onChange: (e) => setPollOptions(pollOptions.map((o, j) => j === i ? e.target.value : o)),
								placeholder: `Option ${i + 1}`
							}, i)),
							pollOptions.length < 12 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => setPollOptions([...pollOptions, ""]),
								children: "Add option"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: allowMultipleAnswers,
									onChange: (e) => setAllowMultipleAnswers(e.target.checked)
								}), "Allow multiple answers"]
							})
						]
					}) : null,
					messageType === "forward" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 grid gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: forwardFrom,
								onChange: (e) => setForwardFrom(e.target.value),
								placeholder: "From chatId"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: forwardTo,
								onChange: (e) => setForwardTo(e.target.value),
								placeholder: "To chatId"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: forwardMessageId,
								onChange: (e) => setForwardMessageId(e.target.value),
								placeholder: "Message id"
							})
						]
					}) : null,
					messageType === "bulk" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: `${field$2} min-h-24`,
							value: bulkRecipients,
							onChange: (e) => setBulkRecipients(e.target.value),
							placeholder: "One number per line"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: bulkDelay,
							onChange: (e) => setBulkDelay(e.target.value),
							placeholder: "Delay ms"
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${btn} mt-3`,
						disabled: sending || !sid,
						onClick: () => void send(),
						children: [sending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
							size: 14,
							className: "animate-spin"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { size: 14 }), " Send"]
					})
				]
			}),
			batch ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: `Batch ${batch.batchId}`,
				sub: batch.status,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-2 h-2 overflow-hidden rounded-full bg-white/10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-wa",
							style: { width: `${batch.progress.total ? 100 * (batch.progress.sent + batch.progress.failed) / batch.progress.total : 0}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[12px] text-muted",
						children: [
							batch.progress.sent,
							" sent · ",
							batch.progress.failed,
							" failed · ",
							batch.progress.pending,
							" pending · ",
							batch.progress.total,
							" total"
						]
					}),
					batch.status === "processing" || batch.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${ghost} mt-2`,
						onClick: () => void cancelBatch(batchSession, batch.batchId).then(() => toast.success("Cancel requested")),
						children: "Cancel batch"
					}) : null
				]
			}) : null,
			result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "scroll-thin max-h-64 overflow-auto rounded-2xl border border-line bg-night/40 p-3 text-[11px] text-muted",
				children: result
			}) : null
		]
	});
}
var STATUS = {
	pending: "bg-indigo/20 text-indigo",
	sending: "bg-wa/20 text-wa",
	sent: "bg-wa/15 text-wa",
	failed: "bg-danger/15 text-danger",
	cancelled: "bg-white/10 text-muted",
	paused: "bg-white/10 text-muted"
};
var WEEKDAYS = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat"
];
function recurrenceLabel(job) {
	if (!job.recurrence || job.recurrence === "none") return "one-shot";
	const every = job.interval > 1 ? ` every ${job.interval}` : "";
	if (job.recurrence === "weekly") {
		const days = (job.daysOfWeek ?? []).map((d) => WEEKDAYS[d] ?? d).join(",");
		return `weekly${every}${days ? ` (${days})` : ""}`;
	}
	if (job.recurrence === "monthly") return `monthly${every} (day ${job.dayOfMonth ?? "?"})`;
	return `${job.recurrence}${every}`;
}
function SchedulerPanel() {
	const toast = useAppToast();
	const flags = useAkgFeatures();
	const { sessions, sessionId, setSessionId } = useAkgSession();
	const canWrite = useCanWrite();
	const [rows, setRows] = (0, import_react.useState)([]);
	const [error, setError] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [chatId, setChatId] = (0, import_react.useState)("");
	const [when, setWhen] = (0, import_react.useState)("");
	const [tz, setTz] = (0, import_react.useState)(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
	const [text, setText] = (0, import_react.useState)("");
	const [mediaUrl, setMediaUrl] = (0, import_react.useState)("");
	const [recurrence, setRecurrence] = (0, import_react.useState)("none");
	const [interval, setIntervalN] = (0, import_react.useState)(1);
	const [daysOfWeek, setDaysOfWeek] = (0, import_react.useState)([1]);
	const [dayOfMonth, setDayOfMonth] = (0, import_react.useState)(1);
	const [until, setUntil] = (0, import_react.useState)("");
	const [maxOccurrences, setMaxOccurrences] = (0, import_react.useState)("12");
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [cancelId, setCancelId] = (0, import_react.useState)(null);
	const zones = listTimeZones();
	const reload = () => {
		if (!sessionId || !flags.data.scheduler) return;
		setLoading(true);
		listScheduledMessages(sessionId).then(setRows).catch(setError).finally(() => setLoading(false));
	};
	(0, import_react.useEffect)(() => {
		setError(null);
		reload();
	}, [sessionId, flags.data.scheduler]);
	if (!flags.loading && !flags.data.scheduler) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagOff, { name: "Scheduler" });
	const fillFrom = (job) => {
		setEditing(job);
		setChatId(job.chatId);
		setText(job.text ?? "");
		setMediaUrl(job.mediaUrl ?? "");
		setTz(job.timezone);
		try {
			setWhen(isoInstantToLocalDateTime(job.sendAt, job.timezone));
		} catch {
			setWhen("");
		}
		setRecurrence(job.recurrence ?? "none");
		setIntervalN(job.interval || 1);
		setDaysOfWeek(job.daysOfWeek?.length ? job.daysOfWeek : [1]);
		setDayOfMonth(job.dayOfMonth || 1);
		setUntil(job.until ? job.until.slice(0, 10) : "");
		setMaxOccurrences(job.maxOccurrences != null ? String(job.maxOccurrences) : "");
	};
	const submit = async () => {
		setError(null);
		try {
			const max = Number(maxOccurrences);
			const body = buildScheduledCreateBody({
				chatId,
				localDateTime: when,
				timeZone: tz,
				text,
				mediaUrl,
				recurrence,
				interval,
				daysOfWeek,
				dayOfMonth,
				until: until || void 0,
				maxOccurrences: Number.isFinite(max) && max > 0 ? max : void 0
			});
			if (editing) {
				await updateScheduledMessage(sessionId, editing.id, body);
				toast.success("Schedule updated");
				setEditing(null);
			} else {
				await createScheduledMessage(sessionId, body);
				toast.success("Scheduled");
			}
			setText("");
			setMediaUrl("");
			reload();
		} catch (err) {
			setError(err);
		}
	};
	const toggleDay = (day) => {
		setDaysOfWeek((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error: error ?? flags.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
				title: "Schedule a send",
				sub: "Local date-time is converted to an ISO instant with the IANA offset (DST-correct). Recurring fires stay on this row. Goes through paced send.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionSelect, {
							value: sessionId,
							onChange: setSessionId,
							sessions: sessions.data ?? []
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: chatId,
							onChange: (e) => setChatId(e.target.value),
							placeholder: "chat JID"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							type: "datetime-local",
							value: when,
							onChange: (e) => setWhen(e.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: field$2,
							value: tz,
							onChange: (e) => setTz(e.target.value),
							children: zones.map((z) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: z,
								children: z
							}, z))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: field$2,
							value: text,
							onChange: (e) => setText(e.target.value),
							placeholder: "Text (or leave empty and set a media URL)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: mediaUrl,
							onChange: (e) => setMediaUrl(e.target.value),
							placeholder: "https://… media URL (optional)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: field$2,
							value: recurrence,
							onChange: (e) => setRecurrence(e.target.value),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "none",
									children: "one-shot"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "daily",
									children: "daily"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "weekly",
									children: "weekly"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "monthly",
									children: "monthly"
								})
							]
						}),
						recurrence !== "none" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								type: "number",
								min: 1,
								value: interval,
								onChange: (e) => setIntervalN(Number(e.target.value) || 1),
								placeholder: "interval"
							}),
							recurrence === "weekly" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1",
								children: WEEKDAYS.map((label, day) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: daysOfWeek.includes(day) ? btn : ghost,
									onClick: () => toggleDay(day),
									children: label
								}, label))
							}) : null,
							recurrence === "monthly" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								type: "number",
								min: 1,
								max: 31,
								value: dayOfMonth,
								onChange: (e) => setDayOfMonth(Number(e.target.value) || 1),
								placeholder: "day of month"
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								type: "date",
								value: until,
								onChange: (e) => setUntil(e.target.value),
								placeholder: "until date"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								type: "number",
								min: 1,
								value: maxOccurrences,
								onChange: (e) => setMaxOccurrences(e.target.value),
								placeholder: "max occurrences"
							})
						] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							disabled: !canWrite || !sessionId,
							onClick: () => void submit(),
							children: editing ? "Save changes" : "Schedule"
						}),
						!canWrite ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-muted",
							children: "Viewer key — writes hidden."
						}) : null
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Jobs",
				sub: loading ? "Loading…" : `${rows.length} job(s)`,
				children: [rows.length === 0 && !loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyHint, { children: "No scheduled messages." }) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-2",
					children: rows.map((job) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-xl border border-line bg-night/30 p-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `rounded-full px-2 py-0.5 text-[10px] ${STATUS[job.status]}`,
									children: job.status
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 font-medium",
									children: job.chatId
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[11px] text-muted",
									children: [
										"next ",
										job.sendAt,
										" · ",
										job.timezone,
										" · ",
										recurrenceLabel(job),
										job.maxOccurrences != null ? ` · ${job.occurrenceCount ?? 0}/${job.maxOccurrences}` : ""
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[12px]",
									children: job.text || job.mediaUrl
								}),
								job.lastError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1 text-[11px] text-danger",
									children: job.lastError
								}) : null
							] }), canWrite && (job.status === "pending" || job.status === "paused") ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: ghost,
										onClick: () => fillFrom(job),
										children: "Edit"
									}),
									job.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: ghost,
										onClick: () => {
											updateScheduledMessage(sessionId, job.id, { status: "paused" }).then(() => {
												toast.success("Paused");
												reload();
											}).catch(setError);
										},
										children: "Pause"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: ghost,
										onClick: () => {
											updateScheduledMessage(sessionId, job.id, { status: "pending" }).then(() => {
												toast.success("Resumed");
												reload();
											}).catch(setError);
										},
										children: "Resume"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: danger,
										onClick: () => setCancelId(job.id),
										children: "Cancel"
									})
								]
							}) : null]
						}), cancelId === job.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmBar, {
							prompt: "Cancel this pending send?",
							onCancel: () => setCancelId(null),
							onConfirm: () => {
								cancelScheduledMessage(sessionId, job.id).then(() => {
									toast.success("Cancelled");
									setCancelId(null);
									reload();
								}).catch(setError);
							}
						}) : null]
					}, job.id))
				})]
			})
		]
	});
}
var MATCH = [
	"contains",
	"equals",
	"startsWith",
	"regex"
];
var CTX = [
	"all",
	"private",
	"group"
];
function AutomationPanel() {
	const toast = useAppToast();
	const flags = useAkgFeatures();
	const { sessions, sessionId, setSessionId } = useAkgSession();
	const canWrite = useCanWrite();
	const [rules, setRules] = (0, import_react.useState)([]);
	const [bot, setBot] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		replyText: "",
		replyMediaUrl: "",
		matchMode: "contains",
		matchPattern: "",
		chatContext: "all",
		cooldownSeconds: "60",
		enabled: true
	});
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const reload = () => {
		if (!sessionId) return;
		Promise.all([listAutomationRules(sessionId), getBotConfig(sessionId)]).then(([r, b]) => {
			setRules(r);
			setBot(b);
		}).catch(setError);
	};
	(0, import_react.useEffect)(() => {
		setError(null);
		reload();
	}, [sessionId]);
	const saveRule = async () => {
		setError(null);
		try {
			if (form.matchMode === "regex" && !flags.data.regexRules) {
				toast.error("Regex matchMode needs AUTO_REPLY_REGEX=true");
				return;
			}
			await createAutomationRule(sessionId, {
				name: form.name,
				replyText: form.replyText,
				replyMediaUrl: form.replyMediaUrl || void 0,
				matchMode: form.matchMode,
				matchPattern: form.matchPattern || void 0,
				chatContext: form.chatContext,
				cooldownSeconds: Number(form.cooldownSeconds) || 60,
				enabled: form.enabled
			});
			toast.success("Rule created");
			reload();
		} catch (err) {
			setError(err);
		}
	};
	const saveBot = async () => {
		if (!bot) return;
		setError(null);
		try {
			setBot(await putBotConfig(sessionId, bot));
			toast.success("Bot settings saved");
		} catch (err) {
			setError(err);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error: error ?? flags.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionSelect, {
				value: sessionId,
				onChange: setSessionId,
				sessions: sessions.data ?? []
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
				title: "Auto-reply rule",
				sub: "Access lists on bot settings are evaluated before these conditions.",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.name,
							onChange: (e) => setForm((f) => ({
								...f,
								name: e.target.value
							})),
							placeholder: "Name"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: field$2,
							value: form.replyText,
							onChange: (e) => setForm((f) => ({
								...f,
								replyText: e.target.value
							})),
							placeholder: "Reply text"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.replyMediaUrl,
							onChange: (e) => setForm((f) => ({
								...f,
								replyMediaUrl: e.target.value
							})),
							placeholder: "Reply media URL (optional)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: field$2,
							value: form.matchMode,
							onChange: (e) => setForm((f) => ({
								...f,
								matchMode: e.target.value
							})),
							children: MATCH.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: m,
								disabled: m === "regex" && !flags.data.regexRules,
								children: [m, m === "regex" && !flags.data.regexRules ? " (flag off)" : ""]
							}, m))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.matchPattern,
							onChange: (e) => setForm((f) => ({
								...f,
								matchPattern: e.target.value
							})),
							placeholder: "Pattern"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: field$2,
							value: form.chatContext,
							onChange: (e) => setForm((f) => ({
								...f,
								chatContext: e.target.value
							})),
							children: CTX.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c,
								children: c
							}, c))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: form.cooldownSeconds,
							onChange: (e) => setForm((f) => ({
								...f,
								cooldownSeconds: e.target.value
							})),
							placeholder: "Cooldown seconds"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								checked: form.enabled,
								onChange: (enabled) => setForm((f) => ({
									...f,
									enabled
								}))
							}), "Enabled"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							disabled: !canWrite,
							onClick: () => void saveRule(),
							children: "Create rule"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Rules",
				sub: rules.length ? `${rules.length} rule(s)` : "None yet",
				children: [rules.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyHint, { children: "No auto-reply rules." }) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-2",
					children: rules.map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-xl border border-line bg-night/30 p-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: rule.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[11px] text-muted",
									children: [
										rule.matchMode,
										" ",
										rule.chatContext,
										" · cooldown ",
										rule.cooldownSeconds,
										"s ·",
										" ",
										rule.enabled ? "on" : "off"
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: rule.replyText })
							] }), canWrite ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: ghost,
									onClick: () => void updateAutomationRule(sessionId, rule.id, { enabled: !rule.enabled }).then(reload).catch(setError),
									children: rule.enabled ? "Disable" : "Enable"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: danger,
									onClick: () => setDeleteId(rule.id),
									children: "Delete"
								})]
							}) : null]
						}), deleteId === rule.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmBar, {
							prompt: "Delete this rule?",
							onCancel: () => setDeleteId(null),
							onConfirm: () => {
								deleteAutomationRule(sessionId, rule.id).then(() => {
									setDeleteId(null);
									reload();
								}).catch(setError);
							}
						}) : null]
					}, rule.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card$1, {
				title: "Bot settings",
				sub: `Commands flag ${flags.data.botCommands ? "on" : "off"} globally. Welcome uses paced send on group.join.`,
				children: bot ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							className: field$2,
							value: bot.accessMode,
							onChange: (e) => setBot({
								...bot,
								accessMode: e.target.value
							}),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "all",
									children: "all"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "allow",
									children: "allow list"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "block",
									children: "block list"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: field$2,
							value: bot.allowList.join("\n"),
							onChange: (e) => setBot({
								...bot,
								allowList: e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean)
							}),
							placeholder: "Allow list JIDs"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: field$2,
							value: bot.blockList.join("\n"),
							onChange: (e) => setBot({
								...bot,
								blockList: e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean)
							}),
							placeholder: "Block list JIDs"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: bot.prefix,
							onChange: (e) => setBot({
								...bot,
								prefix: e.target.value
							}),
							placeholder: "Command prefix"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								checked: bot.commandsEnabled,
								onChange: (commandsEnabled) => setBot({
									...bot,
									commandsEnabled
								})
							}), "Commands on (also needs BOT_COMMANDS)"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								checked: bot.autoRead,
								onChange: (autoRead) => setBot({
									...bot,
									autoRead
								})
							}), "Auto-read inbound chats"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
								checked: bot.alwaysOnline,
								onChange: (alwaysOnline) => setBot({
									...bot,
									alwaysOnline
								})
							}), "Always online (applied on save)"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: field$2,
							value: bot.welcomeMessage ?? "",
							onChange: (e) => setBot({
								...bot,
								welcomeMessage: e.target.value || null
							}),
							placeholder: "Welcome message on group.join (empty disables)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: bot.stickerPackName ?? "",
							onChange: (e) => setBot({
								...bot,
								stickerPackName: e.target.value || null
							}),
							placeholder: "Sticker pack name (#sticker media)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: field$2,
							value: bot.stickerPackAuthor ?? "",
							onChange: (e) => setBot({
								...bot,
								stickerPackAuthor: e.target.value || null
							}),
							placeholder: "Sticker pack author"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: btn,
							disabled: !canWrite,
							onClick: () => void saveBot(),
							children: "Save bot settings"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyHint, { children: "Loading bot config…" })
			})
		]
	});
}
function MediaFilesPanel() {
	const toast = useAppToast();
	const flags = useAkgFeatures();
	const { sessions, sessionId, setSessionId } = useAkgSession();
	const canWrite = useCanWrite();
	const [rows, setRows] = (0, import_react.useState)([]);
	const [error, setError] = (0, import_react.useState)(null);
	const [deleteId, setDeleteId] = (0, import_react.useState)(null);
	const key = getOpenWAApiKey();
	const reload = () => {
		if (!sessionId || !flags.data.mediaPersist) return;
		listStoredMedia(sessionId).then(setRows).catch(setError);
	};
	(0, import_react.useEffect)(() => {
		setError(null);
		reload();
	}, [sessionId, flags.data.mediaPersist]);
	if (!flags.loading && !flags.data.mediaPersist) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlagOff, { name: "Media files" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error: error ?? flags.error }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
			title: "Stored inbound media",
			sub: "Only listed when MEDIA_PERSIST is on. Download uses the existing API-key header.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionSelect, {
					value: sessionId,
					onChange: setSessionId,
					sessions: sessions.data ?? []
				}),
				rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyHint, { children: "No stored files." }) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 space-y-2",
					children: rows.map((f) => {
						const messageId = f.messageId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between gap-2 rounded-xl border border-line bg-night/30 p-3 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: messageId || "(no message id)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-muted",
									children: f.createdAt
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [messageId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										className: "text-[12px] text-indigo underline",
										href: storedMediaUrl(sessionId, messageId),
										target: "_blank",
										rel: "noreferrer",
										onClick: (e) => {
											if (!key) return;
											e.preventDefault();
											fetch(storedMediaUrl(sessionId, messageId), { headers: { "X-API-Key": key } }).then((r) => r.blob()).then((blob) => {
												const url = URL.createObjectURL(blob);
												const a = document.createElement("a");
												a.href = url;
												a.download = messageId || "media";
												a.click();
												URL.revokeObjectURL(url);
											}).catch(setError);
										},
										children: "Download"
									}) : null, canWrite && messageId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: danger,
										onClick: () => setDeleteId(messageId),
										children: "Delete"
									}) : null]
								}),
								deleteId && deleteId === messageId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmBar, {
									prompt: "Delete this stored file?",
									onCancel: () => setDeleteId(null),
									onConfirm: () => {
										deleteStoredMedia(sessionId, deleteId).then(() => {
											setDeleteId(null);
											toast.success("Deleted");
											reload();
										}).catch(setError);
									}
								}) : null
							]
						}, `${messageId}-${f.url}`);
					})
				})
			]
		})]
	});
}
function ProfilePanel() {
	const toast = useAppToast();
	const { sessions, sessionId, setSessionId } = useAkgSession();
	const canWrite = useCanWrite();
	const [error, setError] = (0, import_react.useState)(null);
	const [name, setName] = (0, import_react.useState)("");
	const [status, setStatus] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [picture, setPicture] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!sessionId) return;
		setError(null);
		getOwnProfile(sessionId).then((p) => {
			setName(p.pushName ?? "");
			setStatus(p.status ?? "");
			setPhone(p.phone ?? "");
			setPicture(p.pictureUrl ?? null);
		}).catch(setError);
	}, [sessionId]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
			title: "Own profile",
			sub: "501 means this engine cannot read or write the field.",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionSelect, {
					value: sessionId,
					onChange: setSessionId,
					sessions: sessions.data ?? []
				}),
				picture ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: picture,
					alt: "",
					className: "mt-3 size-16 rounded-full object-cover"
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[12px] text-muted",
					children: phone || "No phone yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: `${field$2} mt-2`,
					value: name,
					onChange: (e) => setName(e.target.value),
					placeholder: "Display name"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `${btn} mt-2`,
					disabled: !canWrite,
					onClick: () => void setProfileName(sessionId, name).then(() => toast.success("Name updated")).catch(setError),
					children: "Save name"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: `${field$2} mt-2`,
					value: status,
					onChange: (e) => setStatus(e.target.value),
					placeholder: "About / status"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `${btn} mt-2`,
					disabled: !canWrite,
					onClick: () => void setProfileStatus(sessionId, status).then(() => toast.success("Status updated")).catch(setError),
					children: "Save about"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-[11px] text-dim",
					children: "Picture changes use PUT /profile/picture with the existing base64 path and size cap."
				})
			]
		})]
	});
}
var NAV = [
	{
		id: "overview",
		title: "Overview",
		sub: "Stats, charts, and session health",
		icon: Activity
	},
	{
		id: "sessions",
		title: "Sessions",
		sub: "Start, stop, QR, proxy, unlink",
		icon: Smartphone
	},
	{
		id: "webhooks",
		title: "Webhooks",
		sub: "Outbound event delivery + filters",
		icon: Webhook
	},
	{
		id: "api-keys",
		title: "API keys",
		sub: "Admin, operator, viewer tokens",
		icon: KeyRound
	},
	{
		id: "templates",
		title: "Templates",
		sub: "Reusable message bodies",
		icon: FileText
	},
	{
		id: "plugins",
		title: "Plugins",
		sub: "Catalog, config, instances",
		icon: Puzzle
	},
	{
		id: "infra",
		title: "Infrastructure",
		sub: "Database, Redis, engine, storage",
		icon: Server
	},
	{
		id: "logs",
		title: "Logs",
		sub: "Audit trail + CSV export",
		icon: ScrollText
	},
	{
		id: "message-tester",
		title: "Message tester",
		sub: "Every send type + bulk batch",
		icon: Send
	},
	{
		id: "scheduler",
		title: "Scheduler",
		sub: "One-shot delayed sends",
		icon: CalendarClock
	},
	{
		id: "automation",
		title: "Bot & auto-reply",
		sub: "Rules, access lists, welcome",
		icon: Bot
	},
	{
		id: "media-files",
		title: "Media files",
		sub: "Stored inbound files (MEDIA_PERSIST)",
		icon: FolderOpen
	},
	{
		id: "profile",
		title: "Own profile",
		sub: "Name, about, picture",
		icon: CircleUser
	}
];
function SettingsHub() {
	const panel = useGateway((s) => s.settingsPanel);
	const setPanel = useGateway((s) => s.setSettingsPanel);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass scroll-thin min-w-0 flex-1 overflow-auto rounded-2xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center gap-3",
				children: [panel !== "home" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: ghost,
					onClick: () => setPanel("home"),
					children: "Back"
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-semibold",
					children: panel === "home" ? "Settings" : NAV.find((n) => n.id === panel)?.title
				})]
			}),
			panel === "home" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
				children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setPanel(item.id),
					className: "flex items-start gap-3 rounded-2xl border border-line bg-night/30 p-4 text-left hover:bg-white/5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-10 place-items-center rounded-xl bg-indigo/20 text-indigo",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { size: 18 })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-sm font-medium",
						children: item.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11.5px] text-muted",
						children: item.sub
					})] })]
				}, item.id))
			}) : null,
			panel === "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewPanel, {}) : null,
			panel === "sessions" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionsPanel, {}) : null,
			panel === "webhooks" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WebhooksPanel, {}) : null,
			panel === "api-keys" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ApiKeysPanel, {}) : null,
			panel === "templates" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TemplatesPanel, {}) : null,
			panel === "plugins" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PluginsPanel, {}) : null,
			panel === "infra" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfraPanel, {}) : null,
			panel === "logs" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogsPanel, {}) : null,
			panel === "message-tester" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageTesterPanel, {}) : null,
			panel === "scheduler" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SchedulerPanel, {}) : null,
			panel === "automation" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutomationPanel, {}) : null,
			panel === "media-files" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaFilesPanel, {}) : null,
			panel === "profile" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfilePanel, {}) : null
		]
	});
}
var VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;
var FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m * m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 rampColor = mix(mix(uColorStops[0], uColorStops[1], uv.x * 2.0), uColorStops[2], max(uv.x * 2.0 - 1.0, 0.0));
  float height = exp(snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude);
  float intensity = 0.6 * (uv.y * 2.0 - height + 0.2);
  float alpha = smoothstep(0.20 - uBlend * 0.5, 0.20 + uBlend * 0.5, intensity);
  fragColor = vec4(intensity * rampColor * alpha, alpha);
}`;
function Aurora({ colorStops = [
	"#3A29FF",
	"#FF94B4",
	"#FF3232"
], speed = 1, blend = .5, amplitude = 1 }) {
	const containerRef = (0, import_react.useRef)(null);
	const propsRef = (0, import_react.useRef)({
		colorStops,
		speed,
		blend,
		amplitude
	});
	propsRef.current = {
		colorStops,
		speed,
		blend,
		amplitude
	};
	(0, import_react.useEffect)(() => {
		const container = containerRef.current;
		if (!container) return;
		const renderer = new Renderer({
			alpha: true,
			premultipliedAlpha: true,
			antialias: true
		});
		const gl = renderer.gl;
		gl.clearColor(0, 0, 0, 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.canvas.style.backgroundColor = "transparent";
		const geometry = new Triangle(gl);
		if (geometry.attributes.uv) delete geometry.attributes.uv;
		const toRgb = (stops) => stops.map((hex) => {
			const color = new Color(hex);
			return [
				color.r,
				color.g,
				color.b
			];
		});
		const program = new Program(gl, {
			vertex: VERT,
			fragment: FRAG,
			uniforms: {
				uTime: { value: 0 },
				uAmplitude: { value: amplitude },
				uColorStops: { value: toRgb(colorStops) },
				uResolution: { value: [container.offsetWidth, container.offsetHeight] },
				uBlend: { value: blend }
			}
		});
		const mesh = new Mesh(gl, {
			geometry,
			program
		});
		container.appendChild(gl.canvas);
		const resize = () => {
			renderer.setSize(container.offsetWidth, container.offsetHeight);
			program.uniforms.uResolution.value = [container.offsetWidth, container.offsetHeight];
		};
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(container);
		resize();
		let animationId = 0;
		const update = (time) => {
			const current = propsRef.current;
			program.uniforms.uTime.value = time * .001 * current.speed;
			program.uniforms.uAmplitude.value = current.amplitude;
			program.uniforms.uBlend.value = current.blend;
			program.uniforms.uColorStops.value = toRgb(current.colorStops);
			renderer.render({ scene: mesh });
			animationId = requestAnimationFrame(update);
		};
		animationId = requestAnimationFrame(update);
		return () => {
			cancelAnimationFrame(animationId);
			resizeObserver.disconnect();
			gl.canvas.remove();
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: containerRef,
		className: "aurora-container",
		"aria-hidden": "true"
	});
}
function OpenWALogin() {
	const login = useGateway((s) => s.login);
	const [url, setUrl] = (0, import_react.useState)(() => getOpenWAUrl());
	const [apiKey, setApiKey] = (0, import_react.useState)("");
	const [showKey, setShowKey] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const onSubmit = async (e) => {
		e.preventDefault();
		if (!apiKey.trim()) {
			setError("API key is required");
			return;
		}
		setBusy(true);
		setError("");
		const ok = await login("operator", "", apiKey.trim(), url.trim() || "http://localhost:2785");
		setBusy(false);
		if (!ok) setError("Could not validate that key against OpenWA. Check the URL and key.");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex h-dvh items-center justify-center overflow-hidden text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "app-bg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Aurora, {
				colorStops: [
					"#f8a66d",
					"#B497CF",
					"#5227FF"
				],
				blend: .5,
				amplitude: 1,
				speed: .5
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit,
			className: "glass relative z-10 w-full max-w-md rounded-3xl p-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-6 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto mb-3 size-12 overflow-hidden rounded-[12px] bg-white shadow-[0_4px_12px_rgba(37,211,102,0.35)]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: "/__grok/logo.png",
								alt: "OpenWA",
								className: "size-full object-cover"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-xl font-semibold",
							children: "Connect OpenWA"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Enter the gateway URL and an admin API key to continue."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mb-3 block text-left text-xs text-muted",
					children: ["Server URL", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: url,
						onChange: (e) => setUrl(e.target.value),
						placeholder: "http://localhost:2785",
						className: "mt-1 w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 text-sm text-ink outline-none"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mb-4 block text-left text-xs text-muted",
					children: ["API key", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative mt-1 flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: showKey ? "text" : "password",
							value: apiKey,
							onChange: (e) => setApiKey(e.target.value),
							placeholder: "owa_k1_…",
							className: "w-full rounded-xl border border-line bg-night/40 px-3 py-2.5 pr-16 text-sm text-ink outline-none"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "absolute top-1/2 right-2 -translate-y-1/2 text-[11px] text-indigo",
							onClick: () => setShowKey((v) => !v),
							children: showKey ? "Hide" : "Show"
						})]
					})]
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: busy,
					className: "w-full rounded-xl bg-wa py-2.5 text-sm font-semibold text-night disabled:opacity-50",
					children: busy ? "Connecting…" : "Connect"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-center text-[11px] text-dim",
					children: [
						"First-boot key is in ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-muted",
							children: "data/.api-key"
						}),
						" on the OpenWA server."
					]
				})
			]
		})]
	});
}
function ComposerExtras({ sessionId, chatId }) {
	const toast = useAppToast();
	const canWrite = useCanWrite();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [pollName, setPollName] = (0, import_react.useState)("");
	const [pollOpts, setPollOpts] = (0, import_react.useState)("Yes\nNo");
	const [selectable, setSelectable] = (0, import_react.useState)("1");
	const [lat, setLat] = (0, import_react.useState)("");
	const [lng, setLng] = (0, import_react.useState)("");
	const [contactName, setContactName] = (0, import_react.useState)("");
	const [contactNumber, setContactNumber] = (0, import_react.useState)("");
	const [stickerUrl, setStickerUrl] = (0, import_react.useState)("");
	const [pack, setPack] = (0, import_react.useState)("OpenWA");
	const [author, setAuthor] = (0, import_react.useState)("OpenWA");
	const [fwdIds, setFwdIds] = (0, import_react.useState)("");
	const [fwdMsg, setFwdMsg] = (0, import_react.useState)("");
	const [listTitle, setListTitle] = (0, import_react.useState)("");
	const [listOpts, setListOpts] = (0, import_react.useState)("Option A\nOption B");
	const [fwdSummary, setFwdSummary] = (0, import_react.useState)("");
	if (!open) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: `${ghost} mb-2`,
		onClick: () => setOpen(true),
		children: "More send types"
	});
	const disabled = !canWrite || !sessionId || !chatId;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-3 space-y-2 rounded-xl border border-line bg-night/30 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-medium uppercase tracking-wide text-muted",
					children: "Poll / contact / location / sticker / forward / list"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: ghost,
					onClick: () => setOpen(false),
					children: "Hide"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: pollName,
								onChange: (e) => setPollName(e.target.value),
								placeholder: "Poll question"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								className: field$2,
								value: pollOpts,
								onChange: (e) => setPollOpts(e.target.value),
								placeholder: "Options, one per line"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: selectable,
								onChange: (e) => setSelectable(e.target.value),
								placeholder: "selectableCount (1 = single)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled,
								onClick: () => {
									setError(null);
									sendPollAkg(sessionId, {
										chatId,
										name: pollName,
										options: pollOpts.split("\n").map((s) => s.trim()).filter(Boolean),
										selectableCount: Number(selectable)
									}).then(() => toast.success("Poll sent")).catch(setError);
								},
								children: "Send poll"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: lat,
								onChange: (e) => setLat(e.target.value),
								placeholder: "Latitude"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: lng,
								onChange: (e) => setLng(e.target.value),
								placeholder: "Longitude"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled,
								onClick: () => {
									setError(null);
									sendLocation(sessionId, {
										chatId,
										latitude: Number(lat),
										longitude: Number(lng)
									}).then(() => toast.success("Location sent")).catch(setError);
								},
								children: "Send location"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: contactName,
								onChange: (e) => setContactName(e.target.value),
								placeholder: "Contact name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: contactNumber,
								onChange: (e) => setContactNumber(e.target.value),
								placeholder: "Contact number"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled,
								onClick: () => {
									setError(null);
									sendContact(sessionId, {
										chatId,
										contactName,
										contactNumber
									}).then(() => toast.success("Contact sent")).catch(setError);
								},
								children: "Send contact"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: stickerUrl,
								onChange: (e) => setStickerUrl(e.target.value),
								placeholder: "Sticker image URL"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: pack,
								onChange: (e) => setPack(e.target.value),
								placeholder: "Pack name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: author,
								onChange: (e) => setAuthor(e.target.value),
								placeholder: "Author"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled,
								onClick: () => {
									setError(null);
									sendStickerAkg(sessionId, chatId, {
										url: stickerUrl,
										packName: pack,
										author
									}).then(() => toast.success("Sticker sent")).catch(setError);
								},
								children: "Send sticker"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: fwdMsg,
								onChange: (e) => setFwdMsg(e.target.value),
								placeholder: "Message id to forward"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								className: field$2,
								value: fwdIds,
								onChange: (e) => setFwdIds(e.target.value),
								placeholder: "Destination JIDs, one per line"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled,
								onClick: () => {
									setError(null);
									forwardMany(sessionId, {
										fromChatId: chatId,
										messageId: fwdMsg,
										toChatIds: fwdIds.split("\n").map((s) => s.trim()).filter(Boolean)
									}).then((res) => {
										const mapped = mapForwardMany(res.status, res.results);
										setFwdSummary(`HTTP ${mapped.httpStatus}: ${mapped.sent} sent, ${mapped.failed} failed`);
										toast.success(`Forward ${mapped.httpStatus}`);
									}).catch(setError);
								},
								children: "Multi-forward"
							}),
							fwdSummary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted",
								children: fwdSummary
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: field$2,
								value: listTitle,
								onChange: (e) => setListTitle(e.target.value),
								placeholder: "Text-list title"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								className: field$2,
								value: listOpts,
								onChange: (e) => setListOpts(e.target.value),
								placeholder: "List options, one per line"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled,
								onClick: () => {
									setError(null);
									sendTextList(sessionId, {
										chatId,
										title: listTitle,
										options: listOpts.split("\n").map((s) => s.trim()).filter(Boolean)
									}).then(() => toast.success("List sent")).catch(setError);
								},
								children: "Send text list"
							})
						]
					})
				]
			})
		]
	});
}
function MessageActions({ sessionId, chatId, messageId }) {
	const toast = useAppToast();
	const canWrite = useCanWrite();
	const [error, setError] = (0, import_react.useState)(null);
	const [edit, setEdit] = (0, import_react.useState)("");
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(false);
	const run = (p, ok) => {
		setError(null);
		p.then(() => toast.success(ok)).catch(setError);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-1 flex flex-wrap items-center gap-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: ghost,
				disabled: !canWrite,
				onClick: () => run(reactToMessage(sessionId, {
					chatId,
					messageId,
					emoji: "👍"
				}), "Reacted"),
				children: "React"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: ghost,
				disabled: !canWrite,
				onClick: () => run(starMessage(sessionId, {
					chatId,
					messageId,
					star: true
				}), "Starred"),
				children: "Star"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: ghost,
				disabled: !canWrite,
				onClick: () => setConfirmDelete(true),
				children: "Delete"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: `${field$2} !w-32 !py-1 text-[11px]`,
				value: edit,
				onChange: (e) => setEdit(e.target.value),
				placeholder: "Edit text"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: ghost,
				disabled: !canWrite || !edit.trim(),
				onClick: () => run(editMessage(sessionId, {
					chatId,
					messageId,
					body: edit
				}), "Edited"),
				children: "Edit"
			}),
			confirmDelete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmBar, {
				prompt: "Delete this message for everyone?",
				onCancel: () => setConfirmDelete(false),
				onConfirm: () => {
					setConfirmDelete(false);
					run(deleteMessage(sessionId, {
						chatId,
						messageId,
						forEveryone: true
					}), "Deleted");
				}
			}) : null
		]
	});
}
var s = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.8,
	strokeLinecap: "round",
	strokeLinejoin: "round"
};
function IconSearch(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "18",
		height: "18",
		...s,
		...p,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "11",
			cy: "11",
			r: "7"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m20 20-3.5-3.5" })]
	});
}
function IconBell(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "18",
		height: "18",
		...s,
		...p,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })]
	});
}
function IconSun(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "18",
		height: "18",
		...s,
		...p,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "4"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" })]
	});
}
function IconPhone(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		width: "18",
		height: "18",
		...s,
		...p,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.2 1.9.5 2.8.7A2 2 0 0 1 22 16.9z" })
	});
}
function IconVideo(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "18",
		height: "18",
		...s,
		...p,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: "1",
			y: "5",
			width: "15",
			height: "14",
			rx: "2"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m23 7-7 5 7 5V7z" })]
	});
}
function IconDots(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "18",
		height: "18",
		...s,
		...p,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "5",
				cy: "12",
				r: "1.2",
				fill: "currentColor",
				stroke: "none"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "12",
				cy: "12",
				r: "1.2",
				fill: "currentColor",
				stroke: "none"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "19",
				cy: "12",
				r: "1.2",
				fill: "currentColor",
				stroke: "none"
			})
		]
	});
}
function IconChat(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		width: "20",
		height: "20",
		...s,
		...p,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })
	});
}
function IconUsers(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "20",
		height: "20",
		...s,
		...p,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "9",
				cy: "7",
				r: "4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" })
		]
	});
}
function IconSend(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "18",
		height: "18",
		...s,
		...p,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M22 2 11 13" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M22 2 15 22 11 13 2 9z" })]
	});
}
function IconGear(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "20",
		height: "20",
		...s,
		...p,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "3"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" })]
	});
}
function IconTools(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "20",
		height: "20",
		...s,
		...p,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "3",
				width: "7",
				height: "7",
				rx: "1.4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "14",
				y: "3",
				width: "7",
				height: "7",
				rx: "1.4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "14",
				width: "7",
				height: "7",
				rx: "1.4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "14",
				y: "14",
				width: "7",
				height: "7",
				rx: "1.4"
			})
		]
	});
}
function IconWA(p) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		width: "22",
		height: "22",
		fill: "currentColor",
		...p,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65A11.88 11.88 0 0 0 12.05 23.8h.01c6.55 0 11.89-5.34 11.89-11.89A11.82 11.82 0 0 0 12.05 0zm0 21.78h0a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26C2.17 6.44 6.6 2.01 12.05 2.01a9.82 9.82 0 0 1 6.99 2.9 9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88z" })]
	});
}
var menuItem = "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] text-ink hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";
function ChatHeaderActions({ sessionId, chatId }) {
	const toast = useAppToast();
	const canWrite = useCanWrite();
	const [error, setError] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(false);
	const root = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		setOpen(false);
		setError(null);
	}, [sessionId, chatId]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onDoc = (e) => {
			if (root.current && !root.current.contains(e.target)) setOpen(false);
		};
		const onKey = (e) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	const run = (p, ok) => {
		setError(null);
		p.then(() => {
			toast.success(ok);
			setOpen(false);
		}).catch(setError);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: root,
		className: "relative shrink-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "relative grid size-9 place-items-center rounded-[10px] border border-line bg-white/5 text-ink/80 hover:bg-white/10",
			"aria-haspopup": "menu",
			"aria-expanded": open,
			"aria-label": "Chat actions",
			onClick: () => setOpen((v) => !v),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconDots, {})
		}), open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "menu",
			className: "absolute right-0 z-30 mt-1 w-44 rounded-xl border border-line bg-night p-1 shadow-lg",
			children: [
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-1 pt-1 [&_p]:mb-1 [&_p]:px-2 [&_p]:py-1.5 [&_p]:text-[11px]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error })
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "menuitem",
					className: menuItem,
					disabled: !canWrite,
					onClick: () => run(archiveChat(sessionId, chatId, true), "Archived"),
					children: "Archive"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "menuitem",
					className: menuItem,
					disabled: !canWrite,
					onClick: () => run(muteChat(sessionId, chatId, 28800), "Muted 8h"),
					children: "Mute 8h"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "menuitem",
					className: menuItem,
					disabled: !canWrite,
					onClick: () => run(muteChat(sessionId, chatId, null), "Unmuted"),
					children: "Unmute"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "menuitem",
					className: menuItem,
					disabled: !canWrite,
					onClick: () => run(pinChat(sessionId, chatId, true), "Pinned"),
					children: "Pin"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					role: "menuitem",
					className: menuItem,
					disabled: !canWrite,
					onClick: () => run(markChatRead$1(sessionId, chatId), "Read"),
					children: "Mark read"
				})
			]
		}) : null]
	});
}
function DirectoryActions({ sessionId, kind }) {
	const toast = useAppToast();
	const canWrite = useCanWrite();
	const [error, setError] = (0, import_react.useState)(null);
	const [numbers, setNumbers] = (0, import_react.useState)("");
	const [checkOut, setCheckOut] = (0, import_react.useState)("");
	const [contactId, setContactId] = (0, import_react.useState)("");
	const [groupId, setGroupId] = (0, import_react.useState)("");
	const [subject, setSubject] = (0, import_react.useState)("");
	const [participants, setParticipants] = (0, import_react.useState)("");
	const [invite, setInvite] = (0, import_react.useState)("");
	const [leaveConfirm, setLeaveConfirm] = (0, import_react.useState)(false);
	const [labelId, setLabelId] = (0, import_react.useState)("");
	const [labels, setLabels] = (0, import_react.useState)([]);
	const run = (p, ok) => {
		setError(null);
		p.then(() => toast.success(ok)).catch(setError);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-4 space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AkgBanner, { error }),
			kind === "dm" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Contacts",
				sub: "Bulk check is capped at 50 and paced. 429 is shown if the per-session limit trips.",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						className: field$2,
						value: numbers,
						onChange: (e) => setNumbers(e.target.value),
						placeholder: "Numbers, one per line (max 50)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${btn} mt-2`,
						disabled: !canWrite || !sessionId,
						onClick: () => {
							const list = clampCheckNumbers(parseNumberList(numbers));
							setError(null);
							checkNumbers(sessionId, list).then((r) => {
								setCheckOut(r.results.map((x) => `${x.input}: ${x.exists ? x.chatId : x.error || "not on WhatsApp"}`).join("\n"));
								toast.success("Checked");
							}).catch(setError);
						},
						children: "Check numbers"
					}),
					checkOut ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mt-2 whitespace-pre-wrap text-[11px] text-muted",
						children: checkOut
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: `${field$2} mt-2`,
						value: contactId,
						onChange: (e) => setContactId(e.target.value),
						placeholder: "Contact JID to block/unblock"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							disabled: !canWrite,
							onClick: () => run(blockContact(sessionId, contactId), "Blocked"),
							children: "Block"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: ghost,
							disabled: !canWrite,
							onClick: () => run(unblockContact(sessionId, contactId), "Unblocked"),
							children: "Unblock"
						})]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Group tools",
				sub: "Engine-unsupported calls show 501, not a generic crash.",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: field$2,
						value: groupId,
						onChange: (e) => setGroupId(e.target.value),
						placeholder: "Group JID"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: `${field$2} mt-2`,
						value: subject,
						onChange: (e) => setSubject(e.target.value),
						placeholder: "New subject"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: btn,
								disabled: !canWrite,
								onClick: () => run(setGroupSubject(sessionId, groupId, subject), "Subject set"),
								children: "Set subject"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								disabled: !canWrite,
								onClick: () => {
									setError(null);
									listGroupInvite(sessionId, groupId).then((r) => {
										setInvite(r.inviteCode);
										toast.success("Invite loaded");
									}).catch(setError);
								},
								children: "Invite code"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: ghost,
								onClick: () => setLeaveConfirm(true),
								children: "Leave"
							})
						]
					}),
					invite ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-[12px] text-muted",
						children: invite
					}) : null,
					leaveConfirm ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfirmBar, {
						prompt: "Leave this group?",
						onCancel: () => setLeaveConfirm(false),
						onConfirm: () => {
							setLeaveConfirm(false);
							run(leaveGroup(sessionId, groupId), "Left");
						}
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						className: `${field$2} mt-2`,
						value: participants,
						onChange: (e) => setParticipants(e.target.value),
						placeholder: "Participant JIDs to add, one per line"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${btn} mt-2`,
						disabled: !canWrite,
						onClick: () => run(addGroupParticipants(sessionId, groupId, participants.split("\n").map((s) => s.trim()).filter(Boolean)), "Participants added"),
						children: "Add participants"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card$1, {
				title: "Labels",
				sub: "whatsapp-web.js reads; Baileys writes. 501 means the engine cannot.",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: ghost,
						onClick: () => {
							setError(null);
							listLabels(sessionId).then(setLabels).catch(setError);
						},
						children: "Load labels"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: `${field$2} mt-2`,
						value: labelId,
						onChange: (e) => setLabelId(e.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Select label"
						}), labels.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: l.id,
							children: l.name
						}, l.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: `${field$2} mt-2`,
						value: contactId,
						onChange: (e) => setContactId(e.target.value),
						placeholder: "Chat JID to tag"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${btn} mt-2`,
						disabled: !canWrite || !labelId,
						onClick: () => run(addLabelToChat(sessionId, contactId, labelId), "Label added"),
						children: "Add label to chat"
					})
				]
			})
		]
	});
}
function GatewayApp() {
	const init = useGateway((s) => s.init);
	const authNeeded = useGateway((s) => s.authNeeded);
	const openOverlay = useGateway((s) => s.openOverlay);
	(0, import_react.useEffect)(() => {
		init();
	}, [init]);
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				openOverlay("search");
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [openOverlay]);
	if (authNeeded) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OpenWALogin, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-dvh overflow-hidden text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "app-bg",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Aurora, {
					colorStops: [
						"#f8a66d",
						"#B497CF",
						"#5227FF"
					],
					blend: .5,
					amplitude: 1,
					speed: .5
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 flex h-full flex-col p-3 sm:p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex min-h-0 flex-1 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AccountsRail, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MainStage, {})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MobileDock, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlays, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toasts, {})
		]
	});
}
function IconBtn({ children, className, ...rest }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: cn("relative grid size-9 place-items-center rounded-[10px] border border-line bg-white/5 text-ink/80 hover:bg-white/10", className),
		...rest,
		children
	});
}
function Header() {
	const user = useGateway((s) => s.user);
	const live = useGateway((s) => s.live);
	const wsConnected = useGateway((s) => s.wsConnected);
	const openOverlay = useGateway((s) => s.openOverlay);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "glass flex h-16 shrink-0 items-center gap-3 overflow-hidden rounded-2xl px-3 sm:px-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 shrink-0 items-center gap-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "size-9 overflow-hidden rounded-[10px] bg-white shadow-[0_4px_12px_rgba(37,211,102,0.35)]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/__grok/logo.png",
						alt: "WA Gateway",
						className: "size-full object-cover"
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "leading-tight",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[15px] font-semibold tracking-tight",
						children: "WA Gateway"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "hidden text-[11px] text-muted sm:block",
						children: "Multi-account Control Center"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => openOverlay("search"),
				className: "mx-2 hidden h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-white/5 px-3 text-sm text-dim lg:flex",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "min-w-0 flex-1 truncate text-left",
						children: "Search messages, contacts, groups..."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: "shrink-0 rounded-md border border-line bg-white/5 px-1.5 py-0.5 text-[10px] text-muted",
						children: "Ctrl K"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "ml-auto flex shrink-0 items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "hidden items-center gap-2 rounded-full border border-line bg-night/40 px-3 py-1.5 text-[11px] text-muted xl:flex",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-2 rounded-full", wsConnected || live ? "bg-wa shadow-[0_0_8px_#25d366]" : "bg-danger") }), live ? "Live API" : "Offline"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						className: "lg:hidden",
						onClick: () => openOverlay("search"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(IconBtn, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBell, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						className: "hidden sm:grid",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSun, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 rounded-full border border-line bg-white/5 py-1 pr-2 pl-1 sm:pr-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid size-7 place-items-center rounded-full bg-gradient-to-br from-indigo to-violet text-[11px] font-semibold",
							children: (user || "?").slice(0, 1).toUpperCase()
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden leading-tight md:block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[12px] font-medium",
								children: user || "Not signed in"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-muted",
								children: user ? "Dashboard user" : "Sign in to manage"
							})]
						})]
					})
				]
			})
		]
	});
}
function MobileDock() {
	const nav = useGateway((s) => s.nav);
	const setNav = useGateway((s) => s.setNav);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "glass mt-3 flex shrink-0 items-center justify-around rounded-2xl py-2 md:hidden",
		children: [
			{
				id: "chats",
				label: "Chats",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconChat, {})
			},
			{
				id: "tools",
				label: "Tools",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconTools, {})
			},
			{
				id: "settings",
				label: "Settings",
				icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconGear, {})
			}
		].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setNav(item.id),
			className: cn("flex min-h-11 min-w-11 flex-col items-center gap-0.5 text-[10px]", nav === item.id ? "text-indigo" : "text-muted"),
			children: [item.icon, item.label]
		}, item.id))
	});
}
/** host:port from a redacted proxy URL, for the account hover card. */
function proxyHostPort(url) {
	if (!url) return null;
	try {
		const parsed = new URL(url);
		return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
	} catch {
		return url;
	}
}
function AccountsRail() {
	const nav = useGateway((s) => s.nav);
	const setNav = useGateway((s) => s.setNav);
	const sessions = useGateway((s) => s.sessions);
	const activeAccountId = useGateway((s) => s.activeAccountId);
	const selectAccount = useGateway((s) => s.selectAccount);
	const openOverlay = useGateway((s) => s.openOverlay);
	const online = sessions.filter((s) => s.status === "connected").length;
	const [peek, setPeek] = (0, import_react.useState)(null);
	const showPeek = (target, a) => {
		const r = target.getBoundingClientRect();
		setPeek({
			label: a.name || a.sessionId,
			phone: a.phoneNumber,
			proxy: a.proxyInfo?.active ?? a.proxy,
			proxyInfo: a.proxyInfo,
			status: a.status,
			connected: a.status === "connected",
			x: r.right,
			y: r.top + r.height / 2
		});
	};
	const items = [
		{
			id: "scrapers",
			label: "Scrapers",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconUsers, {})
		},
		{
			id: "tools",
			label: "Tools",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconTools, {})
		},
		{
			id: "settings",
			label: "Settings",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconGear, {})
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "glass relative z-40 hidden min-h-0 w-[76px] shrink-0 flex-col items-center overflow-hidden rounded-2xl py-4 md:flex",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[9px] font-semibold tracking-[0.12em] text-muted",
				children: "ACCOUNTS"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-lg font-bold leading-none",
				children: sessions.length
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 text-[10px] text-wa",
				children: [online, " online"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "scroll-thin flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto overscroll-contain pr-0.5",
				children: sessions.map((a) => {
					const label = a.name || a.sessionId;
					const connected = a.status === "connected";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "group relative",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								selectAccount(a.sessionId);
								setNav("chats");
							},
							"aria-label": `${label}, ${a.phoneNumber ?? "not linked"}`,
							onMouseEnter: (e) => showPeek(e.currentTarget, a),
							onMouseLeave: () => setPeek(null),
							onFocus: (e) => showPeek(e.currentTarget, a),
							onBlur: () => setPeek(null),
							className: cn("relative size-11 overflow-hidden rounded-2xl border-2", activeAccountId === a.sessionId ? "border-indigo shadow-[0_0_0_2px_rgba(99,102,241,0.25)]" : "border-transparent"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "grid size-full place-items-center bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold",
									children: label.slice(0, 2).toUpperCase()
								}),
								connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute right-0.5 bottom-0.5 size-2.5 rounded-full border-2 border-night bg-wa" }) : null,
								a.proxyInfo?.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									title: `Proxy: ${a.proxyInfo.active}`,
									className: cn("absolute left-0.5 top-0.5 grid size-3.5 place-items-center rounded-full border border-night text-[7px] font-bold leading-none", a.proxyInfo.connected ? "bg-indigo-400 text-night" : "bg-white/40 text-night"),
									children: "P"
								}) : null
							]
						})
					}, a.sessionId);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => openOverlay("create-session"),
				title: "Add account",
				className: "mt-2 grid size-11 shrink-0 place-items-center rounded-2xl border border-dashed border-white/20 text-xl text-muted",
				children: "+"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "mt-auto flex shrink-0 flex-col gap-1",
				children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setNav(item.id),
					title: item.label,
					className: cn("grid size-11 shrink-0 place-items-center rounded-xl text-muted", nav === item.id && "bg-indigo/25 text-indigo"),
					children: item.icon
				}, item.id))
			}),
			peek ? (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					left: peek.x + 12,
					top: peek.y
				},
				className: "pointer-events-none fixed z-[80] w-56 -translate-y-1/2 rounded-xl border border-white/15 bg-[rgba(24,20,58,0.94)] p-3 text-left shadow-[0_12px_30px_rgba(8,4,28,0.45)] backdrop-blur-xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "truncate text-sm font-semibold text-white",
						children: peek.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 truncate text-xs text-cyan-200",
						children: peek.phone ?? "Not linked"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 rounded-lg border border-indigo-400/25 bg-indigo-500/15 p-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[9px] font-semibold uppercase tracking-[0.14em] text-indigo-200",
							children: "Proxy"
						}), peek.proxy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-1 break-all font-mono text-[12px] leading-snug text-white",
								children: proxyHostPort(peek.proxy)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-0.5 break-all font-mono text-[9px] leading-snug text-indigo-100/80",
								children: peek.proxy
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 text-[9px] text-indigo-100/90",
								children: [peek.proxyInfo?.connected ? "Connected through this proxy" : "Assigned · not on this socket yet", peek.proxyInfo?.source === "pool" && peek.proxyInfo.poolSize > 0 ? ` · pool ${(peek.proxyInfo.index ?? 0) + 1}/${peek.proxyInfo.poolSize}` : peek.proxyInfo?.source === "session" ? " · session proxy" : ""]
							})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 text-[11px] text-amber-200",
							children: "Direct connection · no proxy assigned"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-wa",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", peek.connected ? "bg-wa shadow-[0_0_8px_#25d366]" : "bg-white/30") }), peek.status]
					})
				]
			}), document.body) : null
		]
	});
}
function MainStage() {
	const nav = useGateway((s) => s.nav);
	const mobilePane = useGateway((s) => s.mobilePane);
	if (nav === "tools") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass scroll-thin min-w-0 flex-1 overflow-auto rounded-2xl p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mb-4 text-base font-semibold",
			children: "Gateway Tools"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToolsPanel, {})]
	});
	if (nav === "settings") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsHub, {});
	if (nav === "contacts") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Directory, {
		title: "Contacts",
		kind: "dm"
	});
	if (nav === "groups") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Directory, {
		title: "Groups",
		kind: "group"
	});
	if (nav === "broadcast") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BroadcastPanel, {});
	if (nav === "scrapers") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrapersPanel, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 min-w-0 flex-1 gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("h-full w-full max-w-[320px] shrink-0", mobilePane !== "list" && "hidden lg:block"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatList, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("flex h-full min-h-0 min-w-0 flex-1", mobilePane === "list" && "hidden lg:flex"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Conversation, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("h-full w-[280px] shrink-0", mobilePane !== "profile" && "hidden xl:block"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContactPanel, {})
			})
		]
	});
}
function Directory({ title, kind }) {
	const chats = useGateway((s) => s.chats);
	const chatsLoading = useGateway((s) => s.chatsLoading);
	const sessionId = useGateway((s) => s.activeAccountId);
	const select = useGateway((s) => s.selectChat);
	const setNav = useGateway((s) => s.setNav);
	const rows = (0, import_react.useMemo)(() => chats.filter((c) => c.kind === kind), [chats, kind]);
	const ids = (0, import_react.useMemo)(() => rows.map((c) => c.id), [rows]);
	const pics = useProfilePictures(sessionId || void 0, ids);
	const busy = chatsLoading || pics.isFetching;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass scroll-thin min-w-0 flex-1 overflow-auto rounded-2xl p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-4 text-base font-semibold",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DirectoryActions, {
				sessionId,
				kind
			}),
			busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadBar, {})
			}) : null,
			rows.length === 0 && chatsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
				children: Array.from({ length: 6 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DirectorySkeleton, {}, i))
			}) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(EmptyState, { children: [kind === "group" ? "No groups yet." : "No contacts yet.", " Connect a session to load them."] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
				children: rows.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "flex items-center gap-3 rounded-2xl border border-line bg-night/30 p-3 text-left",
					onClick: () => {
						select(c.id);
						setNav("chats");
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatAvatar, {
						chat: c,
						pictureUrl: pics.data?.[c.id]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-medium",
						children: c.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted",
						children: c.phone || c.preview
					})] })]
				}, c.id))
			})
		]
	});
}
function DirectorySkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3 rounded-2xl border border-line bg-night/30 p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-11 shrink-0 animate-pulse rounded-full bg-white/10" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1 space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-2/3 animate-pulse rounded bg-white/10" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-1/2 animate-pulse rounded bg-white/8" })]
		})]
	});
}
/** Neutral placeholder for a pane with nothing to show. */
function EmptyState({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-4 py-10 text-center text-[12.5px] text-muted",
		children
	});
}
/** Why the chat list is empty: no search hit, or no data at all. */
function emptyChatsMessage(total, query) {
	if (total > 0) return query ? `No chats match "${query}".` : "No chats match this filter.";
	return "No chats yet. Connect a session and scan the QR to load your conversations.";
}
/** Tiny inline spinner. */
function Spinner({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("inline-block size-3.5 animate-spin rounded-full border-2 border-white/25 border-t-indigo", className) });
}
/** Indeterminate sliding loading bar for paginated fetches. */
function LoadBar() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "wa-loadbar my-1 w-full",
		"aria-label": "Loading"
	});
}
/** Thin progress bar shown while WhatsApp is still pushing this account's history. */
function SyncBanner({ sync }) {
	const pct = Math.min(100, Math.max(3, sync.progress || 0));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-4 mb-2 rounded-xl border border-indigo/30 bg-indigo/10 px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between text-[11px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium text-indigo",
				children: "Syncing history…"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-muted",
				children: [
					sync.chats,
					" chats · ",
					sync.messages,
					" msgs",
					sync.progress ? ` · ${sync.progress}%` : ""
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-full rounded-full bg-gradient-to-r from-indigo to-violet transition-[width] duration-500",
				style: { width: `${pct}%` }
			})
		})]
	});
}
function ChatList() {
	const chats = useGateway((s) => s.chats);
	const chatsHasMore = useGateway((s) => s.chatsHasMore);
	const chatsLoading = useGateway((s) => s.chatsLoading);
	const loadMoreChats = useGateway((s) => s.loadMoreChats);
	const filter = useGateway((s) => s.filter);
	const setFilter = useGateway((s) => s.setFilter);
	const active = useGateway((s) => s.activeChatId);
	const select = useGateway((s) => s.selectChat);
	const query = useGateway((s) => s.query);
	const account = useGateway((s) => s.sessions.find((x) => x.sessionId === s.activeAccountId));
	const sessionId = useGateway((s) => s.activeAccountId);
	const chatIds = (0, import_react.useMemo)(() => chats.map((c) => c.id), [chats]);
	const pics = useProfilePictures(account?.status === "connected" ? sessionId : void 0, chatIds);
	const busy = chatsLoading || pics.isFetching;
	const filtered = (0, import_react.useMemo)(() => {
		return chats.filter((c) => {
			if (filter === "unread" && c.unread === 0) return false;
			if (filter === "groups" && c.kind !== "group") return false;
			if (query && !`${c.name} ${c.preview}`.toLowerCase().includes(query.toLowerCase())) return false;
			return true;
		});
	}, [
		chats,
		filter,
		query
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "glass flex h-full flex-col rounded-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-4 pt-4 pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-1 text-[16px] font-semibold",
						children: "All Chats"
					}), account ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "truncate text-[11px] text-muted",
						children: [
							account.name || account.sessionId,
							account.phoneNumber ? ` · ${account.phoneNumber}` : "",
							account.status !== "connected" ? ` · ${account.status}` : ""
						]
					}) : null]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
					className: "size-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
						width: "14",
						height: "14",
						viewBox: "0 0 24 24",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 20h9" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" })]
					})
				})]
			}),
			account?.sync?.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SyncBanner, { sync: account.sync }) : null,
			busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4 pb-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadBar, {})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5 px-4 pb-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: filter === "all",
						onClick: () => setFilter("all"),
						count: chats.length,
						children: "All"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: filter === "unread",
						onClick: () => setFilter("unread"),
						count: chats.filter((c) => c.unread > 0).length,
						children: "Unread"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilterChip, {
						active: filter === "groups",
						onClick: () => setFilter("groups"),
						count: chats.filter((c) => c.kind === "group").length,
						children: "Groups"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3",
				children: [filtered.length === 0 && chatsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: Array.from({ length: 8 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatRowSkeleton, {}, i)) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { children: emptyChatsMessage(chats.length, query) }) : filtered.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => select(c.id),
					className: cn("mb-0.5 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left", active === c.id ? "bg-indigo/20" : "hover:bg-white/5"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatAvatar, {
						chat: c,
						pictureUrl: pics.data?.[c.id]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-[13.5px] font-medium",
								children: c.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "shrink-0 text-[11px] text-dim",
								children: c.time
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-[12.5px] text-muted",
								children: c.preview
							}), c.unread > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "grid min-w-[18px] place-items-center rounded-full bg-indigo px-1.5 text-[11px] font-semibold",
								children: c.unread
							}) : null]
						})]
					})]
				}, c.id)), chatsHasMore && !query && filter === "all" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: chatsLoading,
					onClick: () => void loadMoreChats(),
					className: "mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2 text-xs text-muted hover:text-ink disabled:opacity-70",
					children: chatsLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spinner, {}), " Loading more…"] }) : "Load more chats"
				}) : null]
			})
		]
	});
}
function ChatRowSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-0.5 flex items-center gap-3 px-2.5 py-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-11 shrink-0 animate-pulse rounded-full bg-white/10" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1 space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-2/3 animate-pulse rounded bg-white/10" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-1/2 animate-pulse rounded bg-white/8" })]
		})]
	});
}
function FilterChip({ active, count, children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick,
		className: cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", active ? "bg-gradient-to-r from-indigo to-violet text-white shadow-[0_2px_8px_rgba(99,102,241,0.35)]" : "bg-white/5 text-muted"),
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("rounded-full px-1.5 text-[10px]", active ? "bg-white/20" : "bg-white/10"),
			children: count
		})]
	});
}
function ChatAvatar({ chat, size = 44, pictureUrl }) {
	const [broken, setBroken] = (0, import_react.useState)(false);
	const photo = pictureUrl || chat.photo;
	(0, import_react.useEffect)(() => {
		setBroken(false);
	}, [photo]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative shrink-0 overflow-hidden rounded-full bg-white/10",
		style: {
			width: size,
			height: size
		},
		children: [Boolean(photo) && !broken ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: photo,
			alt: "",
			className: "size-full object-cover",
			onError: () => setBroken(true)
		}) : chat.avatar === "initials" || !chat.icon ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "grid size-full place-items-center bg-gradient-to-br from-blue-500 to-indigo-700 text-[13px] font-bold",
			children: chat.initials
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "grid size-full place-items-center bg-gradient-to-br from-indigo to-violet text-sm",
			children: {
				users: "👥",
				code: "</>",
				chart: "📊",
				headset: "🎧",
				palette: "🎨",
				support: "BC"
			}[chat.icon ?? "users"]
		}), chat.online ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-[#12102a] bg-wa" }) : null]
	});
}
function Conversation() {
	const chats = useGateway((s) => s.chats);
	const threads = useGateway((s) => s.threads);
	const id = useGateway((s) => s.activeChatId);
	const sessionId = useGateway((s) => s.activeAccountId);
	const meta = useGateway((s) => s.threadMeta[s.activeChatId]);
	const loadOlder = useGateway((s) => s.loadOlderMessages);
	const composer = useGateway((s) => s.composer);
	const setComposer = useGateway((s) => s.setComposer);
	const send = useGateway((s) => s.sendComposer);
	const sendAttachment = useGateway((s) => s.sendAttachment);
	const setMobilePane = useGateway((s) => s.setMobilePane);
	const openOverlay = useGateway((s) => s.openOverlay);
	const chat = chats.find((c) => c.id === id);
	const pp = useProfilePicture(sessionId || void 0, chat?.id);
	const messages = threads[id] ?? [];
	const [attachment, setAttachment] = (0, import_react.useState)(null);
	const [sending, setSending] = (0, import_react.useState)(false);
	const fileInput = (0, import_react.useRef)(null);
	const scroller = (0, import_react.useRef)(null);
	const lastId = messages.length ? messages[messages.length - 1].id : "";
	const busy = Boolean(meta?.loading || pp.isFetching);
	(0, import_react.useEffect)(() => {
		const el = scroller.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
	}, [id, lastId]);
	const submit = async () => {
		if (attachment) {
			setSending(true);
			const ok = await sendAttachment(attachment, composer.trim());
			setSending(false);
			if (ok) setAttachment(null);
			return;
		}
		await send();
	};
	if (!chat) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "glass flex h-full min-w-0 flex-1 items-center justify-center rounded-2xl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { children: "Select a chat to open the conversation." })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "glass flex h-full min-w-0 flex-1 flex-col rounded-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex h-[68px] items-center gap-3 border-b border-line px-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "text-muted lg:hidden",
						onClick: () => setMobilePane("list"),
						children: "←"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: "flex min-w-0 flex-1 items-center gap-3 text-left",
						onClick: () => setMobilePane("profile"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatAvatar, {
							chat,
							pictureUrl: pp.data
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "truncate text-[15px] font-semibold",
								children: chat.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-wa",
								children: chat.online ? "online" : chat.lastSeen || "offline"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						onClick: () => openOverlay("search"),
						"aria-label": "Search messages",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, {})
					}),
					sessionId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatHeaderActions, {
						sessionId,
						chatId: id
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
						"aria-label": "Chat actions",
						disabled: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconDots, {})
					})
				]
			}),
			busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "px-4 pt-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadBar, {})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scroller,
				className: "chat-wallpaper scroll-thin flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-6 py-5",
				children: [meta?.hasMore ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: meta.loading,
					onClick: () => void loadOlder(id),
					className: "flex items-center gap-2 self-center rounded-full border border-line bg-white/8 px-3.5 py-1 text-[11.5px] text-muted hover:text-ink disabled:opacity-70",
					children: meta.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Spinner, {}), " Loading older…"] }) : "Load older messages"
				}) : messages.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "self-center rounded-full bg-white/8 px-3.5 py-1 text-[11.5px] text-muted",
					children: meta?.loading ? "Loading…" : "Beginning of history"
				}) : meta?.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-3 py-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSkeleton, { mine: false }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSkeleton, { mine: true }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSkeleton, { mine: false }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSkeleton, { mine: true })
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { children: "No messages in this chat yet." }), messages.map((m) => m.kind === "promo" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromoCard, { time: m.time }, m.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageBubble, {
					chatId: id,
					sessionId,
					m
				}, m.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "border-t border-line px-4 py-3",
				onSubmit: (e) => {
					e.preventDefault();
					submit();
				},
				children: [
					sessionId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ComposerExtras, {
						sessionId,
						chatId: id
					}) : null,
					attachment ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center gap-3 rounded-xl border border-line bg-white/5 px-3 py-2 text-[12.5px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-lg",
								children: attachment.type.startsWith("image/") ? "🖼️" : attachment.type.startsWith("video/") ? "🎬" : attachment.type.startsWith("audio/") ? "🎵" : "📄"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate font-medium",
									children: attachment.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[11px] text-muted",
									children: [
										fmtBytes(attachment.size),
										" · ",
										attachment.type || "file",
										" — add a caption below, then send"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "text-xs text-danger",
								onClick: () => setAttachment(null),
								children: "Remove"
							})
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: fileInput,
								type: "file",
								hidden: true,
								accept: "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip",
								onChange: (e) => {
									const f = e.target.files?.[0];
									if (f) setAttachment(f);
									e.target.value = "";
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconBtn, {
								type: "button",
								title: "Attach image, video, audio or document",
								onClick: () => fileInput.current?.click(),
								children: "📎"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: composer,
								onChange: (e) => setComposer(e.target.value),
								placeholder: attachment ? "Caption (optional)…" : "Type a message...",
								className: "h-10 min-w-0 flex-1 rounded-xl border border-line bg-white/5 px-4 text-[13.5px] text-ink outline-none placeholder:text-dim"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: sending || !attachment && !composer.trim(),
								className: "grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo to-violet text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)] disabled:opacity-50",
								children: sending ? "…" : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSend, {})
							})
						]
					})
				]
			})
		]
	});
}
function fmtBytes(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function MessageSkeleton({ mine }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex max-w-[68%] flex-col", mine ? "self-end" : "self-start"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("h-12 animate-pulse rounded-2xl", mine ? "w-48 rounded-br-sm bg-wa/30" : "w-56 rounded-bl-sm bg-white/10") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("mt-1 h-2 w-10 animate-pulse rounded bg-white/8", mine && "self-end") })]
	});
}
function MessageBubble({ chatId, sessionId, m }) {
	const mine = m.from === "me";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex max-w-[68%] flex-col", mine ? "self-end" : "self-start"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("overflow-hidden rounded-2xl text-[13.5px] leading-relaxed", mine ? "rounded-br-sm bg-gradient-to-br from-wa to-wa-deep text-white" : "rounded-bl-sm bg-bubble-in", m.pending && "opacity-70"),
				children: [
					m.sender ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-3.5 pt-2 text-[11px] font-semibold text-indigo-200",
						children: m.sender
					}) : null,
					m.media ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaView, {
						chatId,
						messageId: m.id,
						media: m.media,
						mine
					}) : null,
					m.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-3.5 py-2.5 whitespace-pre-wrap break-words",
						children: m.text
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("mt-0.5 px-1 text-[10.5px] text-dim", mine && "text-right"),
				children: [m.time, mine ? m.pending ? " ◌" : " ✓✓" : ""]
			}),
			sessionId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageActions, {
				sessionId,
				chatId,
				messageId: m.id
			}) : null
		]
	});
}
/** Render an attachment inline, or offer to fetch it from WhatsApp when it is not on the server yet. */
function MediaView({ chatId, messageId, media, mine }) {
	const loadMedia = useGateway((s) => s.loadMedia);
	const name = media.filename || `${media.type}-${messageId}`;
	const download = media.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		href: media.url,
		download: name,
		target: "_blank",
		rel: "noreferrer",
		className: cn("text-[11px] underline underline-offset-2", mine ? "text-white/90" : "text-indigo"),
		children: "Download"
	}) : null;
	if (!media.url) {
		const label = {
			image: "Photo",
			video: "Video",
			audio: "Audio",
			ptt: "Voice message",
			document: media.filename || "Document",
			sticker: "Sticker"
		}[media.type];
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 px-3.5 py-2.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-lg",
				children: {
					image: "🖼️",
					video: "🎬",
					audio: "🎵",
					ptt: "🎤",
					document: "📄",
					sticker: "🏷️"
				}[media.type]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate text-[12.5px]",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: media.loading,
					onClick: () => void loadMedia(chatId, messageId),
					className: cn("text-[11px] underline underline-offset-2 disabled:opacity-60", mine ? "text-white/90" : "text-indigo"),
					children: media.loading ? "Fetching from WhatsApp…" : "Load"
				})]
			})]
		});
	}
	if (media.type === "image" || media.type === "sticker") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		href: media.url,
		target: "_blank",
		rel: "noreferrer",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: media.url,
			alt: media.filename ?? "",
			className: cn("block max-h-72 w-auto max-w-full object-contain", media.type === "sticker" ? "max-h-32 p-2" : "")
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-3.5 pt-1.5 pb-1",
		children: download
	})] });
	if (media.type === "video") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
		src: media.url,
		controls: true,
		preload: "metadata",
		className: "block max-h-72 w-full"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "px-3.5 pt-1.5 pb-1",
		children: download
	})] });
	if (media.type === "audio" || media.type === "ptt") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "px-3.5 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
			src: media.url,
			controls: true,
			preload: "metadata",
			className: "w-64 max-w-full"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pt-1",
			children: download
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
		href: media.url,
		download: name,
		target: "_blank",
		rel: "noreferrer",
		className: cn("flex items-center gap-3 px-3.5 py-2.5 hover:bg-white/5", mine ? "text-white" : ""),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-lg",
			children: "📄"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block truncate text-[12.5px] font-medium",
				children: media.filename || "Document"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: cn("block text-[11px]", mine ? "text-white/80" : "text-muted"),
				children: [media.mimetype || "file", " · click to download"]
			})]
		})]
	});
}
function PromoCard({ time }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-[320px] self-start overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-slate-900 to-indigo-950 p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-[15px] font-bold leading-snug",
				children: [
					"Grow",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"Your Business",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
					"with ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-wa",
						children: "WhatsApp"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 text-[11.5px] text-muted",
				children: "Faster. Smarter. Together."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-wa to-wa-deep text-white shadow-[0_4px_16px_rgba(37,211,102,0.4)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconWA, {})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1 text-right text-[10.5px] text-dim",
			children: time
		})]
	});
}
function ContactPanel() {
	const chats = useGateway((s) => s.chats);
	const id = useGateway((s) => s.activeChatId);
	const sessionId = useGateway((s) => s.activeAccountId);
	const thread = useGateway((s) => s.threads[s.activeChatId]);
	const threadLoading = useGateway((s) => s.threadMeta[s.activeChatId]?.loading);
	const tab = useGateway((s) => s.contactTab);
	const setTab = useGateway((s) => s.setContactTab);
	const openOverlay = useGateway((s) => s.openOverlay);
	const chat = chats.find((c) => c.id === id);
	const pp = useProfilePicture(sessionId || void 0, chat?.id);
	const attachments = (0, import_react.useMemo)(() => (thread ?? []).filter((b) => b.kind === "text" && Boolean(b.media)).reverse(), [thread]);
	if (!chat) return null;
	const visual = attachments.filter((b) => b.media && [
		"image",
		"video",
		"sticker"
	].includes(b.media.type));
	const files = attachments.filter((b) => b.media && [
		"document",
		"audio",
		"ptt"
	].includes(b.media.type));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "glass scroll-thin flex h-full flex-col overflow-auto rounded-2xl p-5",
		children: [
			threadLoading || pp.isFetching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadBar, {})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative mx-auto size-[72px] overflow-hidden rounded-full border-[3px] border-indigo/30",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatAvatar, {
							chat,
							size: 72,
							pictureUrl: pp.data
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 text-[16px] font-semibold",
						children: chat.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[12.5px] text-muted",
						children: chat.phone || "Group conversation"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[11.5px] text-dim",
						children: chat.lastSeen || (chat.kind === "group" ? "8 participants" : "")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex justify-center gap-3",
				children: [
					{
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconPhone, {}),
						label: "Call"
					},
					{
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconVideo, {}),
						label: "Video"
					},
					{
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSearch, {}),
						label: "Search",
						action: () => openOverlay("search")
					},
					{
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconDots, {}),
						label: "More"
					}
				].map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "flex flex-col items-center gap-1",
					onClick: a.action,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-10 place-items-center rounded-full border border-line bg-white/5",
						children: a.icon
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] text-muted",
						children: a.label
					})]
				}, a.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex border-b border-line text-[12.5px]",
				children: [
					"info",
					"media",
					"files",
					"links"
				].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setTab(t),
					className: cn("flex-1 py-2 capitalize", tab === t ? "border-b-2 border-indigo font-medium text-indigo" : "text-dim"),
					children: t
				}, t))
			}),
			tab === "info" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex items-center gap-3 rounded-xl border border-wa/20 bg-wa/10 px-3 py-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-8 place-items-center rounded-lg bg-wa text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconWA, {
							width: 16,
							height: 16
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-[12.5px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium text-wa",
							children: "Connected & online"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] text-muted",
							children: "Using WhatsApp"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 text-[12px] font-semibold tracking-wide text-muted uppercase",
					children: "Quick Actions"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionRow, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconSend, {}),
					color: "bg-indigo/20 text-indigo",
					title: "Send Message",
					sub: "Send to this contact",
					onClick: () => {}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionRow, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconUsers, {}),
					color: "bg-wa/15 text-wa",
					title: "Bulk Message",
					sub: "Send to multiple chats",
					onClick: () => openOverlay("bulk")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActionRow, {
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm",
						children: "📄"
					}),
					color: "bg-violet/20 text-violet",
					title: "Message Templates",
					sub: "Use saved templates",
					onClick: () => openOverlay("templates")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/20 bg-danger/10 py-2.5 text-[13px] font-medium text-danger",
					children: "Block Contact"
				})
			] }) : tab === "media" || tab === "files" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AttachmentList, {
				chatId: id,
				items: tab === "media" ? visual : files,
				empty: `No ${tab} in the loaded history`
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-8 text-center text-sm text-muted",
				children: [
					"No ",
					tab,
					" yet"
				]
			})
		]
	});
}
/** Attachments of the open conversation (what is loaded so far), newest first, each downloadable. */
function AttachmentList({ chatId, items, empty }) {
	const loadMedia = useGateway((s) => s.loadMedia);
	if (items.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-8 text-center text-sm text-muted",
		children: empty
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-3 space-y-1.5",
		children: items.map((b) => {
			const media = b.media;
			const name = media.filename || `${media.type}-${b.id}`;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2.5 rounded-xl border border-line bg-white/4 px-2.5 py-2",
				children: [
					media.url && (media.type === "image" || media.type === "sticker") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: media.url,
						alt: "",
						className: "size-10 shrink-0 rounded-lg object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid size-10 shrink-0 place-items-center rounded-lg bg-white/8 text-base",
						children: {
							image: "🖼️",
							video: "🎬",
							audio: "🎵",
							ptt: "🎤",
							document: "📄",
							sticker: "🏷️"
						}[media.type]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate text-[12px] font-medium",
							children: media.filename || b.text || media.type
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[10.5px] text-muted",
							children: [
								b.time,
								" · ",
								b.from === "me" ? "sent" : "received"
							]
						})]
					}),
					media.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: media.url,
						download: name,
						target: "_blank",
						rel: "noreferrer",
						className: "shrink-0 text-[11px] text-indigo underline underline-offset-2",
						children: "Download"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: media.loading,
						onClick: () => void loadMedia(chatId, b.id),
						className: "shrink-0 text-[11px] text-indigo underline underline-offset-2 disabled:opacity-60",
						children: media.loading ? "…" : "Load"
					})
				]
			}, b.id);
		})
	});
}
function ActionRow({ icon, color, title, sub, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick,
		className: "mt-2 flex w-full items-center gap-3 rounded-xl border border-line bg-white/4 px-3 py-2.5 text-left hover:bg-white/8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("grid size-9 place-items-center rounded-[10px]", color),
				children: icon
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-[13px] font-medium",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-[11px] text-muted",
					children: sub
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-dim",
				children: "›"
			})
		]
	});
}
//#endregion
export { GatewayApp as t };
