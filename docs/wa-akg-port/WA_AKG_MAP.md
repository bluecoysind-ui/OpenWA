# WA-AKG map (reference source)

Read-only tree: `_reference/WA-AKG`. Stack: Next.js 15 App Router + Prisma (MySQL in schema) + Baileys `^7.0.0-rc.9` only. Auth is NextAuth + SUPERADMIN/OWNER/STAFF — **out of scope** for the port.

Source was preferred over `all_routes.txt`, README, and swagger. Discrepancies are in §14.

---

## 1. HTTP surface (messaging)

Handlers live under `src/app/api/**/route.ts` (~77 files). Paths below omit the `/api` prefix.

### Messages

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `messages/{sessionId}/{jid}/send` | "Universal send": Baileys content object (`text`, `image`/`video`/`audio`/`document`/`sticker` URL, caption, mimetype, fileName, ptt, mentions, quotedMessageId) via `ChatService.sendTextMessage` |
| POST | `.../media` | Multipart upload → image/video/audio/voice/document/sticker |
| POST | `.../reply` and `.../{messageId}/reply` | Quoted reply |
| POST | `.../sticker` | Multipart → `wa-sticker-formatter` (pack/author) → send |
| POST | `.../poll` | `{ question, options, selectableCount }` |
| POST | `.../location` | lat/lng (+ name/address in body) |
| POST | `.../contact` | vCard-style contact |
| POST | `.../list` | **Not a native list message.** Formats `*title*` + numbered options + optional footer as **plain text** and `sendMessage({ text })` (`list/route.ts`) |
| POST | `.../{messageId}/react` | Reaction |
| POST | `.../{messageId}/star` | `chatModify` star |
| DELETE | `.../{messageId}` | Delete for everyone |
| PATCH | `.../{messageId}` | Edit text |
| POST | `messages/{sessionId}/forward` | `{ fromJid, messageId, toJids[] }` — one message to many chats (empty `message: {}` forward proto) |
| POST | `messages/{sessionId}/broadcast` | Text blast worker (see §5) |
| GET | `messages/{sessionId}/broadcast/history` `[/{logId}]` | `BroadcastLog` + recipients |
| GET | `messages/{sessionId}/search` | DB search (`q` / `jid` / `type` / `fromMe`) |
| GET | `messages/{sessionId}/download/{messageId}/media` | Serve stored file by message DB id |
| POST | `messages/{sessionId}/{jid}/spam` | **Repeat-send bomb** (see §9) |

### Scheduler

| Method | Path |
| --- | --- |
| GET/POST | `scheduler/{sessionId}` |
| PUT/DELETE | `scheduler/{sessionId}/{scheduleId}` |

No collection DELETE despite `all_routes.txt`.

### Auto-replies

| Method | Path |
| --- | --- |
| GET/POST | `autoreplies/{sessionId}` |
| PUT/DELETE | `autoreplies/{sessionId}/{replyId}` |

No collection DELETE.

### Session / bot

`GET/POST sessions`, `GET sessions/{id}`, `GET .../qr`, `GET/PATCH/DELETE .../settings`, `GET/POST .../bot-config`, `GET/POST/DELETE .../access` (RBAC share — out of scope), `POST .../{action}` (`start|stop|restart|logout|pair`).

### Chat

`GET chat/{sessionId}` list, `GET chat/{sessionId}/{jid}` paginated history, `POST chat/{sessionId}/check` (`onWhatsApp`, max 50), PUT archive/mute/pin/read, POST presence, POST profile-picture, `GET chats/{sessionId}/by-label/{labelId}`.

### Contacts / groups / labels / profile

- Contacts: GET list; POST block/unblock (`updateBlockStatus`).
- Groups: list, get, create, leave, invite get/regen, accept invite, members add/remove/promote/demote, subject, description, picture, settings, ephemeral.
- Labels: GET/POST collection; PUT/DELETE `{labelId}`; GET/PUT chat labels.
- Profile: GET profile; PUT name; PUT status = **About text** (`updateProfileStatus`); PUT/DELETE picture.

### Webhooks / media

`GET/POST webhooks/{sessionId}`, `PUT/DELETE .../{id}`, `POST .../{id}/test`, `GET .../{id}/logs`.  
`GET/DELETE /media`, `GET /media/{filename}` (auth + traversal guard).

### Documented, **no** `route.ts`

`POST /api/status/{sessionId}/update` (and deprecated `/api/status/update`) — listed in README, swagger, `all_routes.txt`. Folder does not exist.

---

## 2. Prisma models (messaging)

File: `prisma/schema.prisma` (`provider = mysql`).

| Model | Role |
| --- | --- |
| Session | `sessionId`, `status`, `qr`, `config` Json |
| Contact | `jid`, `lid?`, `remoteJidAlt?`, `name`, `notify`, `verifiedName`, `profilePic` |
| Message | `remoteJid`, `senderJid`, `fromMe`, `keyId`, `type` TEXT\|IMAGE\|…, `content`, `mediaUrl`, `quoteId` |
| Group | subject/description, participants Json, restrict/announce |
| AutoReply | `keyword`, `matchType` EXACT\|CONTAINS\|REGEX, `response`, `isMedia`, `mediaUrl`/`mediaType`, `triggerType` ALL\|GROUP\|PRIVATE |
| ScheduledMessage | `jid`, `content`, media, `sendAt`, optional `cronExpression`/`recurrenceRule`, status PENDING\|SENT\|FAILED |
| Webhook + WebhookLog | url, secret, events Json; per-attempt SUCCESS/FAILED logs |
| BotConfig | access modes, sticker flags, `removeBgApiKey`, prefix, anti-spam, welcome, autoRead, alwaysOnline |
| Label / ChatLabel | name/color; M2M via `chatJid` |
| BroadcastLog / BroadcastRecipient | totals, delay, status `running\|completed\|cancelled`; per-jid pending/sent/failed |
| Story | unused by send paths |
| AuthState | Baileys creds in DB |
| SystemConfig | `timezone` default `Asia/Jakarta` |

No Chat table; lists are aggregations over Message.

---

## 3. Baileys wrapper

`src/modules/whatsapp/instance.ts` — `makeWASocket` with Prisma auth, `markOnlineOnConnect`, `syncFullHistory`. Outbound `sendMessage` wrapped by an antispam queue when enabled.

Helpers: `chat.service.ts` (universal send, URL fetch → Buffer). Events: `store/index.ts` (persist + bot commands) and `store/autoreply.ts` both listen to `messages.upsert`. Groups sync in `store/groups.ts`.

---

## 4. Scheduler (two loops)

Both run in the custom server:

1. `src/lib/cron.ts` → `initScheduler()` from `WhatsAppManager`. `node-cron` every minute. Handles recurrence; next `sendAt` computed with **hardcoded `Asia/Jakarta`**, ignoring `SystemConfig` used at create time.
2. `src/modules/whatsapp/scheduler.ts` → `startScheduler()` from `src/server/index.ts`. Immediate + **30 s** interval. Marks SENT with no recurrence.

Create API: `moment.tz(sendAt, systemTimezone)` stored as UTC. Due rows: `sendAt <= now`. Disconnected session leaves PENDING. One-shot failure → FAILED.

**Restart:** PENDING rows survive. **Race:** both loops can claim the same PENDING row (double-send).

---

## 5. Broadcast

`messages/{sessionId}/broadcast/route.ts`: `{ recipients[], message, delay? }` **text only**. Inserts `BroadcastLog` + recipients, returns immediately, IIFE loop. Delay = `baseDelay` (default 2000) + random up to 50%. Socket.IO `broadcast.progress`. Finish → `completed`. Schema has `cancelled` but **no pause/cancel API and the worker never sets cancelled**. Failed recipients are marked failed; no retry.

---

## 6. Auto-reply and bot commands

### Auto-reply (`store/autoreply.ts`)

- Modes: EXACT, CONTAINS, REGEX (case-insensitive except raw regex).
- Context: ALL / GROUP / PRIVATE.
- Access via `BotConfig.autoReplyMode`: ALL | OWNER (self macros) | SPECIFIC | BLACKLIST + JID lists.
- Media replies from URL (image/video/audio/document); fallback to text on send error.
- First match wins. **No cooldown.**
- Standard ALL mode **ignores `fromMe`** (loop protection). OWNER mode **does** reply to self (snippets).
- Keyword extracted from conversation/extendedText only — image captions alone may not match.

### Bot commands (`bot/command-handler.ts`)

Prefix default `#`. Commands: `ping`, `id`, `uptime`, `sticker|s|stiker` (+ `nobg`/`removebg`), `menu|help`. Access: OWNER always if `fromMe`; else ALL / SPECIFIC / BLACKLIST. Sticker path: sharp (image), ffmpeg (video), `wa-sticker-formatter`; optional `POST https://api.remove.bg/v1.0/removebg` when API key set.

---

## 7. Webhooks (`src/lib/webhook.ts`)

**Typed events:** `message.received`, `message.sent`, `message.status`, `connection.update`, `group.update`, `contact.update`, `status.update`, `group.participant`, `message.deleted`, `message.edited`, `test`.

**Actually emitted:** received/sent, message.status, contact.update, group.update, group.participant, edited, deleted, connection.update. **`status.update` is never dispatched.**

**`message.received` payload `data`:** `key`, `from`, `receiver`, `sender`, `isGroup`, `chatType`, `type`, `content`, `fileUrl`, `caption`, `quoted` (type/content/caption/`fileUrl` from DB). JIDs resolved toward `@s.whatsapp.net` via LID utils.

HMAC: `X-Webhook-Signature: sha256={hmac}` when secret set. **Retries: none** (single POST, 10 s). Test + logs endpoints exist. Log retention: >30 days or last 500.

---

## 8. Baileys patch

`patches/@whiskeysockets+baileys+7.0.0-rc.9.patch`. Substantive hunks (~84 lines) are **newsletter/channel media** (mediatype attrs, newsletter upload URLs, unencrypted download). Most other hunks are file mode 100644→100755.

OpenWA is already on **rc14**, not rc.9. Do not apply this patch blindly.

---

## 9. Spam endpoint (do not port as-is)

`src/app/api/messages/[sessionId]/[jid]/spam/route.ts`:

- Body `{ message, count = 10, delay = 500 }`.
- Background `for` loop: `sendMessage({ text })` then sleep, `count` times.
- Immediate response: `"Bombing ${count} messages started"`.

This is a repeat-send bomb against one JID. OpenWA's README is explicit about ban risk. **Skip.** See `DECISIONS.md`.

---

## 10. Sticker maker and remove.bg

| Path | Behavior |
| --- | --- |
| `messages/.../sticker` | Upload → formatter (pack/author/quality) → send |
| Universal send `message.sticker` | URL → same |
| Bot `#sticker` | Reply/caption media; video via ffmpeg; `nobg` → remove.bg if `BotConfig.removeBgApiKey` |

---

## 11. LID

`src/lib/jid-utils.ts`: detect `@lid`; normalize `@c.us` → `@s.whatsapp.net`; resolve LID → phone via `remoteJidAlt` / Contact table. Used in persist, webhooks, history queries, group reply participant fix.

---

## 12. Status / Stories

**Does not work as a Stories API.** No `src/app/api/status/**`. `PUT profile/.../status` is About text. `Story` Prisma model is unused. README already warns the feature is unreliable; swagger still lists it.

---

## 13. Media on disk

Received media is written to disk and served at `GET /api/media/{filename}` (`{sessionId}-{keyId}.{ext}` in webhook `fileUrl`). List/delete owned files. Path-traversal protection. Download-by-message route compares `message.sessionId` (cuid) to path `sessionId` (string) — likely a **broken ownership check**.

---

## 14. Docs vs source

| Claim | Reality |
| --- | --- |
| `POST /status/{sessionId}/update` | No route file |
| `DELETE /scheduler/{sessionId}`, `DELETE /autoreplies/{sessionId}` | Missing; only per-id DELETE |
| Archive POST in `all_routes.txt` | Source is PUT |
| Broadcast pause/cancel | Schema only |
| Webhook retries | One attempt |
| Dual scheduler | Undocumented; double-send risk |
| Recurrence TZ | Hardcoded Asia/Jakarta vs SystemConfig on create |
| `status.update` webhook | Never emitted |
| Universal send / search / star / webhook logs | Exist in source, largely absent from `all_routes.txt` |
| Interactive list messages | List route is **formatted text** |

---

## Architecture sketch

```
API route.ts → ChatService / socket.* → antispam.enqueue → Baileys sendMessage
Baileys events → store/index (DB + bot) + autoreply + webhook.ts
Custom server → waManager (cron) + startScheduler (30s) + Socket.IO
```
