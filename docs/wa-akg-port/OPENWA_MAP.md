# OpenWA map (today)

Source of truth: `src/` in this repository. HTTP prefix is `/api` (`src/config/app-validation.ts`). Default engine is **whatsapp-web.js 1.34.7**; Baileys is **`@whiskeysockets/baileys@7.0.0-rc14`**, selected by `ENGINE_TYPE`.

This document describes existing behavior. It is not a proposal.

---

## 1. Engine abstraction

**Contract:** `src/engine/interfaces/whatsapp-engine.interface.ts` (`IWhatsAppEngine`, composed of capability slices).

**Capability truth:** `src/engine/engine-capability-matrix.ts` plus `docs/29-engine-capability-matrix.md`. Methods default to supported on both adapters. Curated exceptions throw `EngineNotSupportedError` → HTTP **501**. Root causes: `adapter-gap` | `library-limitation` | `uncertain`.

**Factory:** `src/engine/engine.factory.ts` — builtin plugins `whatsapp-web.js` and `baileys` under `src/engine/builtin/`.

### Slices (selected methods)

| Slice | Key methods |
| --- | --- |
| Lifecycle | `initialize`, `disconnect`, `logout`, `destroy`, `getStatus`, `getQRCode`, `requestPairingCode` |
| Messaging | `sendTextMessage`, image/video/audio/document, `sendLocationMessage`, `sendContactMessage`, `sendStickerMessage`, `sendPollMessage`, `replyToMessage`, `forwardMessage` |
| Message ops | `reactToMessage`, `deleteMessage`, `editMessage`, `starMessage`, `votePoll`, `clickButton`, pin/unpin |
| History | `getChatHistory` |
| Contacts | list/get/check/`getProfilePicture`/block/unblock/upsert/delete |
| Groups | create/info/participants/promote/demote/leave/subject/description/invite/join/settings/picture/`setGroupEphemeral` |
| Profile | set name/status/picture, delete picture |
| Labels | get/upsert/delete/assign/list chats by label |
| Chats | `getChats`, seen/unread, archive, pin, mute, delete, clear |
| Presence | `sendChatState`, `setOnlinePresence`, `subscribeToPresence` |
| Status | get/post text\|image\|video\|voice, delete |
| Channels / catalog / calls | present; several Baileys-only or wwjs-only cells in the matrix |

### Adapters

| Engine | Adapter | Messaging helpers |
| --- | --- | --- |
| whatsapp-web.js | `src/engine/adapters/whatsapp-web-js.adapter.ts` | `wwebjs-messaging.ts`, `wwebjs-message-events.ts`, `message-mapper.ts` |
| Baileys | `src/engine/adapters/baileys.adapter.ts` | `baileys-messaging.ts`, `baileys-events.ts`, `baileys-message-mapper.ts` |

### Event callbacks (`EngineEventCallbacks`)

`onQRCode`, `onReady`, `onMessage`, `onMessageCreate`, `onMessageAck`, `onMessageRevoked`, `onMessageReaction`, `onMessageEdited`, `onGroupEvent`, `onCall` / `onCallOutcome`, `onHistoryMessages`, `onDisconnected`, `onReconnecting`, `onStateChanged`, `onActionRequired`, `onAccountRestriction`, `onPresenceUpdate`, `onError`, credential-teardown hooks.

Neutral inbound types include `text|image|video|audio|voice|document|sticker|location|contact|poll|call|revoked|order|product|masked|unknown`.

`IncomingMessage` (`whatsapp-engine.interface.ts`) already carries `kind`, `fromMe`, `isLidSender`, `senderPhone`, `contact`, `quotedMessage: { id, body }`, `media`, `location`. Quoted payload does **not** currently include type / caption / media URL.

### Known engine asymmetries (messaging-adjacent)

| Method | wwjs | Baileys |
| --- | --- | --- |
| `votePoll` | supported | 501 (library: decrypt inbound votes only) |
| `clickButton` / list reply | 501 | supported (classic prompts) |
| `createGroup` | 501 (WhatsApp Web `findImpl` broken) | supported |
| `setGroupEphemeral` | 501 | supported |
| `upsertLabel` / `deleteLabel` | 501 | supported |
| `getChatsByLabel` | supported | 501 (no query API) |
| Catalog | 501 | supported |

Controllers must not import `IWhatsAppEngine` (`docs/08-development-guidelines.md`); they call module services.

---

## 2. Session lifecycle

**Controller / service / entity:** `src/modules/session/session.controller.ts`, `session.service.ts`, `entities/session.entity.ts`.

**Statuses (`SessionStatus`):** `created` | `initializing` | `qr_ready` | `authenticating` | `ready` | `disconnected` | `action_required` | `failed`.

| Method | Path |
| --- | --- |
| POST | `/api/sessions` |
| GET | `/api/sessions`, `/api/sessions/:sessionId` |
| DELETE | `/api/sessions/:sessionId` |
| POST | `/api/sessions/:sessionId/start` \| `stop` \| `logout` \| `force-kill` |
| GET | `/api/sessions/:sessionId/qr` |
| POST | `/api/sessions/:sessionId/pairing-code` |
| GET/PATCH | `/api/sessions/:sessionId/config`, `/proxy` |

Chats, presence, and group overview also hang off this controller (see §12).

---

## 3. Message module

**Controller:** `src/modules/message/message.controller.ts`  
**Services:** `MessageService`, `BulkMessageService`, `SendPacingService`, `PendingMessageReaperService`  
**Entities:** `Message` (`pending|sent|delivered|read|failed`), `MessageBatch`

Typed sends already cover WA-AKG's "universal send" *types* (text, image, video, audio/PTT, document, sticker, location, contact, poll) as **separate routes**. There is no single `POST .../send` mega-body.

| Method | Path |
| --- | --- |
| GET | `/api/sessions/:sessionId/messages` (DB; `chatId`, `from`, `limit`, `offset`, `after`, `inlineMedia`) |
| POST | `send-text`, `send-template`, `send-image`, `send-video`, `send-audio`, `send-document` |
| POST | `send-location`, `send-contact`, `send-sticker`, `send-poll` |
| POST | `reply`, `forward`, `react`, `delete`, `edit` |
| POST | `vote-poll` (wwjs), `click-button` (Baileys) |
| POST | `pin`, `unpin`, `star` |
| POST | `send-bulk` → 202; `GET/POST batch/:batchId` \| `batch/:batchId/cancel` |
| GET | `:chatId/history` (live engine history) |
| GET | `:chatId/:messageId/reactions` |
| GET | `:chatId/:messageId/media` (on-demand download) |

DTOs: `dto/send-message.dto.ts`, `dto/message-actions.dto.ts`, `dto/bulk-message.dto.ts`.

**Mentions + quoted reply** already exist on send/reply/media/location/contact/poll (`quotedMessageId`, `mentions`).

**Delete:** `forEveryone` defaults **true** (`DeleteMessageDto`).

**Forward:** one message, one destination (`fromChatId`, `toChatId`, `messageId`). Not 1:N.

**Poll:** `name`, `options` (2–12), `allowMultipleAnswers` (boolean). Not WA-AKG's integer `selectableCount`.

**Sticker:** send as media (URL/base64). Baileys converts non-WebP to WebP. **No pack name / author metadata** on the DTO.

**Bulk:** `BulkMessageService` — in-process loop (not BullMQ). Default delay **3000 ms** + optional 0–2 s jitter (`randomizeDelay`). Cancel exists. Auto-resume after process crash is **intentionally not** implemented (interrupted batch → FAILED). Cap `BULK_MAX_CONCURRENT_BATCHES` (default 50). Recipients go through `SendPacingService` (warmup schedule, cold-reachout cap, circuit breaker → 429 `SEND_PACING_LIMITED`).

**No** scheduled/delayed message table. **No** native interactive list **send**. **No** full-text `q=` search (filters are `chatId` / `from`).

Ack path: engine ack → `deliveryStatusToMessageStatus` → DB + `message.ack` / `message.failed` webhooks. Pending reaper fails stale `pending` rows.

---

## 4. Webhooks

**CRUD:** `POST/GET/PUT/DELETE /api/sessions/:sessionId/webhooks`  
**Test:** `POST /api/sessions/:sessionId/webhooks/:id/test` (event `test`)  
**Failures:** `GET /api/webhooks/delivery-failures` (ADMIN; exhausted retries, not a per-attempt log)

**Events** (`WEBHOOK_EVENTS` in `dto/webhook.dto.ts`):

```
message.received | message.sent | message.ack | message.failed
message.revoked | message.reaction | message.edited
status.received
session.status | session.qr | session.authenticated | session.disconnected
session.reconnect_loop | session.restriction
presence.update
group.join | group.leave | group.update | group.join_request
call.received | call.accepted | call.rejected | call.missed
```

Wildcard `*` allowed. HMAC: `X-OpenWA-Signature: sha256=<hex>`. Also `X-OpenWA-Event`, `X-OpenWA-Idempotency-Key`, `X-OpenWA-Delivery-Id`, `X-OpenWA-Retry-Count`. Default `retryCount` 3. Optional BullMQ when `QUEUE_ENABLED=true`. Smart filters share `WebhookFilters` with automation (`sender`, `recipient`, `chatId`, `body`, `type`, `isGroup`, `kind`, `fromMe`, `hasMedia`, `mentions`; operators `is|isNot|contains|equals`).

**Not in catalog:** poll-vote, contact.update, label events, a WA-AKG-style `connection.update` (OpenWA uses `session.*`).

Delivery records: outbox + failure table. There is **no** per-webhook attempt history API like WA-AKG `GET .../webhooks/:id/logs`.

---

## 5. Auth

API keys (`src/modules/auth/`): roles `admin` > `operator` > `viewer`. Guard `ApiKeyGuard`. Decorators `@RequireRole`, `@SessionScoped`, `@RequireUnscopedKey`, `@Public`. Optional `allowedIps`, `allowedSessions`, expiry, revoke.

Convention: reads VIEWER, writes OPERATOR, key/infra/audit ADMIN. New routes must use this, not a parallel user table.

---

## 6. Plugin hook system

`src/core/hooks/`. `PluginContext.registerHook(event, handler, priority?)`.

Message-related: `message:received|sending|sent|failed|ack|persisted|deleted`. `message:sending` is a **veto gate**. Session/webhook/ingress hooks also exist.

This is the extension point for bot commands / extra auto-reply behavior. Do not invent a second inbound pipeline.

---

## 7. Automation rules (existing auto-reply)

**Routes:** `/api/sessions/:sessionId/automation-rules` CRUD  
**Entity:** `automation_rules` — `name`, `enabled`, `conditions` (same filter shape as webhooks), `replyText`, `cooldownSeconds` (default 60).

`AutomationRulesService.evaluateInbound`: first matching enabled rule wins (order `createdAt`, `id`). Sends via the normal text send path (pacing + plugin veto). Skips messages older than 300 s. Cap `automation.maxPerSession` (default 32). Cooldown is in-memory per `(ruleId, chatId)`.

**Not present:** named EXACT/CONTAINS/REGEX match types (filters can approximate equals/contains; no regex), media replies, first-class group/private context (kind filter is possible), bot whitelist/blacklist modes, command prefix handler.

---

## 8. MCP

Mounted at `POST /mcp` when `MCP_ENABLED=true`. Tools in `src/core/agent-tools/tools/`. Messaging tools cover list/history/reactions and send text/image/video/audio/document/location/contact/sticker/template, reply, forward, react. **No** MCP tools for edit/delete/poll/bulk. Write tools gated by `MCP_READONLY` (default true).

---

## 9. Dashboard (`/dashboard`)

React + Vite, `dashboard/src/App.tsx` routes:

`/` Dashboard, `/sessions`, `/chats`, `/webhooks`, `/templates`, `/api-keys`, `/logs`, `/message-tester`, `/infrastructure`, `/plugins`.

Message tester already sends text, media, location, contact, sticker, poll, forward, bulk.

**No** dashboard pages for scheduler, auto-reply editor (beyond whatever chats/webhooks expose), bot config, sticker maker, or labels/group tools as dedicated hubs.

`/dashboard` is **frozen** for this port (`git diff -- dashboard` empty every WP). Additive UI is **`./frontend/`** (Q8). See [FRONTEND_MAP.md](./FRONTEND_MAP.md).

API client (dashboard, unused for WP7): `dashboard/src/services/api.ts`. Gateway client: `frontend/src/lib/openwa-api.ts`.

---

## 10. Persistence (TypeORM)

Two connections (`app.module.ts`):

| Name | Default | Contents |
| --- | --- | --- |
| default (`main`) | SQLite `./data/main.sqlite` | auth, audit |
| `data` | SQLite `./data/openwa.sqlite` or Postgres | sessions, webhooks, messages, templates, engine, automation, status-store |

`synchronize: false` on production paths. Migrations: `src/database/migrations/` (data) and `migrations-main/`. CLI: `src/database/data-source.ts` (`DATABASE_TYPE=sqlite|postgres`). New tables need **both** dialects, no dialect-specific types.

Engine extras: `lid_mappings`, Baileys stored messages, chat states.

---

## 11. Queue / scheduler

| Mechanism | Role |
| --- | --- |
| BullMQ (`QUEUE_ENABLED=true`) | Webhook + ingress queues; Bull Board `/admin/queues` |
| Redis | Optional; also throttler store when `REDIS_ENABLED=true` |
| `@nestjs/schedule` | **Not used.** In-process `setInterval` for ownership, webhook outbox, media purge, audit cleanup |
| Bulk | In-process `BulkMessageService` |

There is **no** delayed-job / cron table for outbound messages.

---

## 12. JID / LID

Canonical helpers: `src/engine/identity/wa-id.ts` (`parseWaId`, `toNeutralJid`, `toParticipantWid`, `chatKind`). Persist: `LidMappingStoreService` + `lid_mappings`.

| Wire form | Meaning |
| --- | --- |
| `@c.us` | Neutral user (API emit) |
| `@s.whatsapp.net` | Baileys wire; folded to `@c.us` on emit |
| `@lid` | Privacy id; resolved when mapping known |
| `@g.us` / `@newsletter` / `@broadcast` / `status@broadcast` | group / channel / list / status |

Baileys outbound: `BaileysSessionStore.toEngineJid` maps `@c.us` → `@s.whatsapp.net`. New endpoints should accept `@c.us`, `@s.whatsapp.net`, digits, and `@lid` through these helpers — **do not add a second normalizer**.

---

## 13. Chat, contacts, groups, labels, profile

### Chats (`SessionController`)

`GET /sessions/:sessionId/chats`  
`POST .../chats/read|unread|archive|mute|pin|delete`  
`DELETE .../chats/:chatId/messages` (clear)  
`POST .../chats/typing`  
`POST/PUT/GET .../presence...`

Mute: `muteUntil` is **epoch milliseconds** or `null` to unmute (`MuteChatDto`). No duration-seconds helper.

No `GET /chats/:chatId` resource; use list + message history.

### Contacts (`ContactController`)

`GET /`, `GET /profile-pictures`, `GET /blocked`, `GET /:contactId`, `GET /check/:number` (single), `GET /:contactId/profile-picture`, `GET /:contactId/phone`, PUT/DELETE contact, POST/DELETE `/:contactId/block`.

No bulk `onWhatsApp` check.

### Groups (`GroupController`)

join-info, get, **create** (Baileys), join, settings GET/PUT (announce/locked/**ephemeral**/memberAddMode), participants add/remove/promote/demote, membership requests, subject, description, leave, picture set/delete, invite-code **and revoke**.

List also via `GET /sessions/:sessionId/groups`.

### Labels (`LabelController`)

List/get, chats-by-label, PUT upsert (Baileys; caller-chosen id), DELETE, get/set/remove chat labels. Documented as WhatsApp Business.

### Profile (`ProfileController`)

PUT name / status (about text) / picture, DELETE picture. **No GET own profile.**

### Status / stories (`StatusController`)

`GET /sessions/:sessionId/status`, send-text/image/video/voice, get media, delete. This **works on at least wwjs** (capability matrix). Do not confuse with WA-AKG's missing Stories API.

### Media conversion (`MediaController`)

`GET /sessions/:sessionId/media/convert`  
`POST .../convert/voice` (Ogg/Opus)  
`POST .../convert/video` (H.264)  
`POST .../convert/sticker` (512 WebP, duration cap, optional remove.bg + pack EXIF)

ffmpeg-gated.

### Storage

`StorageService` (`src/common/storage/storage.service.ts`): local disk and optional S3, path-traversal guards. Inbound **chat** media is typically inline base64 (or omitted marker), not persisted as files. Status-store has its own TTL media persistence.

---

## 14. Audit and observability

`AuditService` / `GET /api/audit` (ADMIN). Structured `LoggerService`. Health/infra endpoints exist under settings/infra modules. New admin actions (bot config, rule changes, broadcast start/cancel) should write audit rows using the existing action enum — extend the enum additively if needed.

---

## 15. Env flags already relevant

`ENGINE_TYPE`, `QUEUE_ENABLED`, `REDIS_ENABLED`, `SEND_PACING_*`, `BULK_MAX_CONCURRENT_BATCHES`, `MCP_ENABLED`, `MCP_READONLY`, `MEDIA_DOWNLOAD_*`, `CHAT_HISTORY_MEDIA_BUDGET_BYTES`, storage/S3 vars. Full list: `.env.example`.
