# Gap analysis

Legend for **OpenWA status:** `exists` (leave intact) | `partial` (add missing capability only) | `missing` | `skip` (will not port) | `n/a` (WA-AKG does not actually ship it).

Engine columns: what the **OpenWA** adapters can do today (or will be able to do for a new feature). `501` means the method already throws `EngineNotSupportedError`.

Proposed routes follow OpenWA's existing `/api/sessions/:sessionId/...` shape. They are **additive**. Existing URLs stay.

---

## Summary

| Bucket                                      | Exists                                                | Partial                                                      | Missing                          | Skip / n/a                                                 |
| ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------- |
| Messaging primitives                        | most typed sends, react, delete, edit, star, download | forward 1:N, sticker pack meta, poll selectableCount, search | text-list helper (WP2)           | spam; native listMessage                                   |
| Broadcast / scheduler                       | bulk send + cancel + pacing                           | safer delays, pause, restart-resume                          | delayed scheduler table          | —                                                          |
| Auto-reply / bot                            | automation-rules (text + filters + cooldown)          | media replies, match modes, context, access lists            | bot-config, commands, remove.bg  | —                                                          |
| Chat / contacts / groups / labels / profile | almost all                                            | —                                                            | —                                | GET `/chats/:chatId` (D24: list payload is enough for WP7) |
| Webhooks                                    | HMAC, retries, filters, test, session events          | payload richness, per-hook attempt log, extra events         | poll-vote event                  | —                                                          |
| Media persist                               | storage adapter; status-store TTL                     | —                                                            | optional chat-media persist flag | —                                                          |
| LID                                         | `wa-id.ts` + `lid_mappings`                           | expose both forms on more payloads                           | —                                | —                                                          |
| Status/stories                              | OpenWA already has working status APIs                | —                                                            | —                                | WA-AKG Stories API does not exist                          |

---

## 4.1 Messaging

| Feature                | WA-AKG (source)                                           | OpenWA status                                                                    | wwjs              | Baileys                              | Proposed OpenWA route                                                                                                 | DB                         | Risk |
| ---------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---- |
| Universal send         | `POST messages/{sid}/{jid}/send` — Baileys content object | **partial** — same types as typed routes; no mega-body                           | yes               | yes                                  | **Q5 locked: do not add `/send`.** Keep `POST .../messages/send-*`                                                    | none                       | —    |
| Multipart media upload | WA-AKG FormData                                           | **exists** as base64 JSON (`BODY_SIZE_LIMIT` default 25mb; frontend ~18 MiB cap) | yes               | yes                                  | **Skip multipart** while base64 works. Ask if a needed file exceeds the JSON cap                                      | none                       | low  |
| Mentions + quoted      | on universal send                                         | **exists** (`mentions`, `quotedMessageId`)                                       | yes               | yes (store required)                 | none                                                                                                                  | none                       | —    |
| Contact card           | `POST .../contact`                                        | **exists** `POST .../messages/send-contact`                                      | yes               | yes                                  | none                                                                                                                  | none                       | —    |
| Location               | `POST .../location`                                       | **exists** `POST .../messages/send-location`                                     | yes               | yes                                  | none                                                                                                                  | none                       | —    |
| Poll                   | `POST .../poll` `selectableCount`                         | **partial** `POST .../messages/send-poll` uses `allowMultipleAnswers`            | yes               | yes                                  | Additive optional `selectableCount` on existing DTO (map >1 → multiple)                                               | none                       | low  |
| Poll vote **send**     | not a dedicated route                                     | **exists** `POST .../vote-poll`                                                  | yes               | **501**                              | none                                                                                                                  | none                       | —    |
| Poll vote **event**    | not clearly emitted                                       | **missing**                                                                      | receive uncertain | Baileys `decryptPollVote`            | New webhook `message.poll_vote` behind flag                                                                           | none                       | med  |
| List                   | `POST .../list` = **formatted text**, not `listMessage`   | **missing** as helper; native list send also missing                             | native list: no   | native list: library yes, unverified | **Q1 locked:** text helper `POST .../messages/send-text-list` **last in WP2**. No native list. `LIST_MESSAGES` unused | none                       | low  |
| Sticker send           | pack/author via formatter                                 | **partial** `POST .../send-sticker` (WebP convert on Baileys)                    | yes               | yes                                  | Additive `packName`/`author` on existing DTO                                                                          | none                       | low  |
| React                  | `POST .../react`                                          | **exists** `POST .../messages/react` (empty emoji removes)                       | yes               | yes                                  | none                                                                                                                  | none                       | —    |
| Delete                 | DELETE for everyone                                       | **exists** `POST .../messages/delete` `forEveryone` default true                 | yes               | yes                                  | none                                                                                                                  | none                       | —    |
| Edit                   | PATCH text                                                | **exists** `POST .../messages/edit`                                              | yes               | yes                                  | none                                                                                                                  | none                       | —    |
| Star                   | `chatModify`                                              | **exists** `POST .../messages/star`                                              | yes               | yes                                  | none                                                                                                                  | none                       | —    |
| Forward                | one msg → `toJids[]`                                      | **partial** one → one                                                            | yes               | yes                                  | Additive `toChatIds?: string[]` on existing forward DTO (cap + pacing)                                                | none                       | low  |
| Download media         | GET download by DB id                                     | **exists** `GET .../messages/:chatId/:messageId/media`                           | yes               | yes                                  | none                                                                                                                  | none                       | —    |
| Search                 | GET `q`/`type`/`fromMe`                                   | **partial** GET messages by `chatId`/`from`                                      | n/a               | n/a                                  | Additive query `q` on existing GET (FTS if present)                                                                   | index if needed            | low  |
| Broadcast              | text worker, no cancel                                    | **partial** `POST .../send-bulk` + cancel + pacing                               | yes               | yes                                  | Extend bulk (see 4.2). No second worker                                                                               | existing `message_batches` | med  |
| Spam / bomb            | `POST .../spam` count×delay                               | **skip**                                                                         | —                 | —                                    | **Do not implement**                                                                                                  | —                          | ban  |

---

## 4.2 Broadcast and scheduler

| Feature           | WA-AKG                                             | OpenWA status                                                        | wwjs | Baileys | Proposed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | DB                                               | Risk |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------------- | ---- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---- |
| Safe broadcast    | 2s + 50% jitter, text only, no pause               | **partial** 3s + 0–2s, media/text, cancel, no pause, no crash-resume | yes  | yes     | Extend `BulkMessageService`: optional longer default, `POST .../batch/:id/pause` if missing, audit start/cancel. Hard caps stay                                                                                                                                                                                                                                                                                                                                                         | maybe `paused` status                            | med  |
| Scheduler         | `ScheduledMessage` + dual loops (double-send risk) | **missing**                                                          | yes  | yes     | New module `src/modules/scheduler/` (**data** connection). One-shot WP4; IANA tz per row. **At-most-once:** `UPDATE ... WHERE status=PENDING AND sendAt<=now` + affected-row check (SQLite has no row locks). Mark `SENDING` before send. Crash: `SENDING` → FAILED/UNKNOWN, **never auto-resend**. Max-lateness for overdue jobs. `SEND_PACING_LIMITED` → reschedule backoff. Caps: pending jobs / session, max horizon. `SCHEDULED_MESSAGES` default **on**, inert until a job exists | `scheduled_messages` sqlite+pg, migration in WP4 | med  |
| Recurrence / cron | `cronExpression`                                   | **missing**                                                          | —    | —       | **Q2 locked:** WP4b later. No cron in WP4                                                                                                                                                                                                                                                                                                                                                                                                                                               | none in WP4                                      | med  |

---

## 4.3 Auto-reply and bot

| Feature         | WA-AKG                                         | OpenWA status                                         | Engines                      | Proposed                                                                                                                                                                                                                                                                               | DB                                          | Risk              |
| --------------- | ---------------------------------------------- | ----------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------- |
| Keyword rules   | EXACT/CONTAINS/REGEX, ALL/GROUP/PRIVATE, media | **partial** filters + `replyText` + cooldown          | send path both               | **Extend `automation_rules`** additively: `matchMode` EXACT/CONTAINS/STARTS_WITH first; `chatContext`; `replyMediaUrl`/`replyMediaType`. **Regex behind `AUTO_REPLY_REGEX`**, pattern length cap, truncated input. Precedence: **bot-config access lists first**, then rule conditions | columns on `automation_rules` (`data` conn) | med               |
| Loop protection | ALL ignores fromMe; OWNER allows self          | **partial** (no fromMe skip documented as OWNER mode) | —                            | Skip `fromMe` unless `allowOwnMessages`. Never reply to automation-originated msgs (hook/metadata)                                                                                                                                                                                     | none                                        | low               |
| Bot config      | `BotConfig` modes, prefix, sticker flags       | **missing**                                           | —                            | `GET/PUT /sessions/:id/bot-config` on `bot_configs` (`data`). See omitted-field rows below                                                                                                                                                                                             | new table WP4                               | med               |
| autoRead        | BotConfig                                      | **partial** — `POST .../chats/:chatId/read` exists    | both                         | When bot-config.autoRead, call existing mark-read on inbound. No new read API                                                                                                                                                                                                          | bot_configs                                 | low               |
| alwaysOnline    | BotConfig                                      | **partial** — `setOnlinePresence` exists              | both (501 if engine refuses) | bot-config toggle → existing presence API                                                                                                                                                                                                                                              | bot_configs                                 | low               |
| Welcome message | BotConfig / group join                         | **missing** as productized hook                       | both                         | `group.join` → paced `sendText`. Per-session opt-in                                                                                                                                                                                                                                    | bot_configs                                 | med               |
| Anti-spam       | BotConfig                                      | **exists** `SendPacingService`                        | n/a                          | Do not add a second limiter                                                                                                                                                                                                                                                            | none                                        | —                 |
| Commands        | `#ping #id #uptime #sticker #menu`             | **missing**                                           | both                         | **Core module** (plugin spike failed — DECISIONS D4). `BOT_COMMANDS=false` + per-session enabled                                                                                                                                                                                       | bot_configs                                 | med               |
| remove.bg       | per-session key on BotConfig                   | **missing**                                           | n/a HTTP                     | Env `REMOVE_BG_API_KEY` default unset; optional per-session override. Fail closed                                                                                                                                                                                                      | optional column                             | low (SSRF/secret) |

---

## 4.4 Sticker maker

| Feature                    | WA-AKG                          | OpenWA status                                                                     | wwjs              | Baileys      | Proposed                                                                                 | DB   | Risk              |
| -------------------------- | ------------------------------- | --------------------------------------------------------------------------------- | ----------------- | ------------ | ---------------------------------------------------------------------------------------- | ---- | ----------------- |
| Image/video → WebP sticker | `wa-sticker-formatter` + ffmpeg | **partial** Baileys converts stills; `POST .../media/convert` is voice/video only | send yes          | convert+send | `POST .../media/convert/sticker` (ffmpeg/existing converter). Then existing send-sticker | none | med (ffmpeg load) |
| Pack/author                | formatter metadata              | **missing** on DTO                                                                | if engine accepts | yes          | Additive fields on send-sticker                                                          | none | low               |
| Animated                   | ffmpeg duration cap             | **partial**                                                                       | uncertain         | uncertain    | Cap duration; 501 if engine refuses                                                      | none | med               |
| remove.bg                  | `#sticker nobg`                 | **missing**                                                                       | n/a               | n/a          | Off by default; see 4.3                                                                  | none | low               |

---

## 4.5 Chat management

| Feature                     | WA-AKG                               | OpenWA status                                               | wwjs | Baileys | Proposed                                                                                | DB   | Risk      |
| --------------------------- | ------------------------------------ | ----------------------------------------------------------- | ---- | ------- | --------------------------------------------------------------------------------------- | ---- | --------- |
| List chats                  | GET chat list                        | **exists** `GET .../chats`                                  | yes  | yes     | none                                                                                    | none | —         |
| Get one chat                | GET chat/{jid} = history             | **exists** as history + DB messages                         | yes  | yes     | Optional `GET .../chats/:chatId` summary if needed                                      | none | low       |
| Archive / mute / pin / read | PUT                                  | **exists** POST archive/mute/pin/read/unread                | yes  | yes     | none                                                                                    | none | —         |
| Mute duration               | duration-style                       | **partial** absolute `muteUntil` ms                         | yes  | yes     | Optional convenience `durationSec` mapped to `muteUntil` (do not change existing field) | none | low       |
| Presence                    | composing/recording/paused/available | **exists** typing + presence subscribe/set                  | yes  | yes     | Align enum names additively if needed                                                   | none | low       |
| Chat profile picture        | POST fetch                           | **exists** `GET .../contacts/:id/profile-picture` (+ batch) | yes  | yes     | none                                                                                    | none | —         |
| Check number                | POST check max 50                    | **partial** `GET .../contacts/check/:number`                | yes  | yes     | `POST .../contacts/check` body `{ numbers[] }` cap 50, paced                            | none | med (ban) |
| Chats by label              | GET by-label                         | **exists** `GET .../labels/:labelId/chats`                  | yes  | **501** | none                                                                                    | none | —         |

---

## 4.6 Contacts

| Feature            | WA-AKG                           | OpenWA status                                                         | wwjs | Baileys | Proposed                                           | DB   | Risk |
| ------------------ | -------------------------------- | --------------------------------------------------------------------- | ---- | ------- | -------------------------------------------------- | ---- | ---- |
| List + rich fields | lid, verifiedName, pushName, pic | **partial** Contact has name/pushName/number/blocked; LID via mapping | yes  | yes     | Additive DTO fields when known; no breaking rename | none | low  |
| Block / unblock    | POST                             | **exists** POST/DELETE `.../block`                                    | yes  | yes     | none                                               | none | —    |
| Get one            | —                                | **exists** `GET .../contacts/:contactId`                              | yes  | yes     | none                                               | none | —    |

---

## 4.7 Groups

| Feature                           | WA-AKG | OpenWA status                                  | wwjs    | Baileys | Proposed | DB   | Risk |
| --------------------------------- | ------ | ---------------------------------------------- | ------- | ------- | -------- | ---- | ---- |
| List / get / join / leave         | yes    | **exists**                                     | yes     | yes     | none     | none | —    |
| Create                            | yes    | **exists**                                     | **501** | yes     | none     | none | —    |
| Invite get / **reset**            | regen  | **exists** get + `POST .../invite-code/revoke` | yes     | yes     | none     | none | —    |
| Members add/remove/promote/demote | yes    | **exists**                                     | yes     | yes     | none     | none | —    |
| Subject / description / picture   | yes    | **exists**                                     | yes     | yes     | none     | none | —    |
| Settings announce/locked          | yes    | **exists**                                     | yes     | yes     | none     | none | —    |
| Ephemeral                         | yes    | **exists** via group settings                  | **501** | yes     | none     | none | —    |

Fill gaps only: none required for the WA-AKG inventory except documenting 501s.

---

## 4.8 Labels

| Feature             | WA-AKG      | OpenWA status                                                                | wwjs        | Baileys         | Proposed | DB   | Risk |
| ------------------- | ----------- | ---------------------------------------------------------------------------- | ----------- | --------------- | -------- | ---- | ---- |
| CRUD                | POST create | **exists** PUT upsert (Baileys, caller-chosen id); wwjs cannot create/delete | read/assign | write+read gaps | none     | none | —    |
| Chat labels get/set | yes         | **exists**                                                                   | yes         | yes             | none     | none | —    |
| List chats by label | yes         | **exists**                                                                   | yes         | **501**         | none     | none | —    |

Business-account caveat already documented on the controller.

---

## 4.9 Profile and status

| Feature                | WA-AKG                      | OpenWA status                                      | wwjs         | Baileys      | Proposed                                                                      | DB   | Risk |
| ---------------------- | --------------------------- | -------------------------------------------------- | ------------ | ------------ | ----------------------------------------------------------------------------- | ---- | ---- |
| GET own profile        | GET profile                 | **missing**                                        | yes          | yes          | `GET /sessions/:id/profile` (phone, pushName, about, picture URL)             | none | low  |
| Name / about / picture | PUT                         | **exists** PUT name/status/picture, DELETE picture | yes          | yes          | none                                                                          | none | —    |
| Status / Stories       | README broken; **no route** | OpenWA **exists** `.../status/send-*`              | yes (matrix) | check matrix | **Do not port WA-AKG Stories.** Keep OpenWA status APIs. Mark WA-AKG item n/a | none | —    |

---

## 4.10 Webhooks and events

| Feature                  | WA-AKG                                            | OpenWA status                                               | Proposed                                                                                                                                                                                | DB                         | Risk |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---- |
| HMAC + retries + filters | HMAC, **no retry**                                | **exists** (stronger)                                       | none                                                                                                                                                                                    | none                       | —    |
| Test payload             | POST test                                         | **exists**                                                  | none                                                                                                                                                                                    | none                       | —    |
| Delivery history         | GET logs per hook                                 | **partial** exhausted `delivery-failures` only              | Additive `GET .../webhooks/:id/deliveries` (paginated). Store **status, HTTP code, duration, attempt, error snippet only**. Never bodies. Retention **30 days or last 500 per webhook** | new table on `data` in WP6 | med  |
| `quoted` richness        | type, caption, fileUrl                            | **partial** `{ id, body }`                                  | Additive optional fields on `quotedMessage`; do not remove `body`                                                                                                                       | none                       | low  |
| LID on payload           | from/sender resolved                              | **partial** `isLidSender`, `senderPhone`                    | Keep both `@c.us` and `@lid` when known (`remoteJidAlt`)                                                                                                                                | none                       | low  |
| Extra events             | contact.update, group.participant, message.status | **partial** OpenWA `message.ack`, `group.update/join/leave` | Map names in docs; add `contact.update` / `group.participant` only if not redundant. No breaking rename of existing events                                                              | none                       | med  |
| Poll votes               | not really                                        | **missing**                                                 | `message.poll_vote` behind flag                                                                                                                                                         | none                       | med  |

---

## 4.11 Media persistence

| Feature                    | WA-AKG                         | OpenWA status                               | Proposed                                                                                                                                                                                                            | DB                                 | Risk       |
| -------------------------- | ------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- |
| Persist inbound files      | disk + `/api/media/{filename}` | **missing** for chat media (inline/omitted) | `MEDIA_PERSIST=false` default. When true, write via `StorageService` session-prefixed keys, serve `GET /api/sessions/:id/media/files/:key` (not a global unscoped route). Retention env. Default behavior unchanged | optional `media_objects` on `data` | med (disk) |
| List / delete stored media | WA-AKG media index             | **missing**                                 | **Only when `MEDIA_PERSIST=true`.** No routes if the flag is off                                                                                                                                                    | same table                         | low        |

---

## 4.12 LID

| Feature                | WA-AKG              | OpenWA status         | Proposed                                  | DB                     | Risk |
| ---------------------- | ------------------- | --------------------- | ----------------------------------------- | ---------------------- | ---- |
| Accept mixed JID forms | jid-utils           | **exists** `wa-id.ts` | Use existing helpers on every **new** DTO | `lid_mappings` already | low  |
| Emit both forms        | webhook from/sender | **partial**           | Additive fields only                      | none                   | low  |

---

## Explicit skips (out of scope or hostile)

- WA-AKG users, NextAuth, `/api/users`, `/api/user/api-key`, `/api/settings/system`, update-check, in-app notifications, n8n node, Docker/PM2 tooling, its Swagger UI.
- **Spam/bomb endpoint.**
- Replacing OpenWA webhook HMAC/retry with WA-AKG's single-shot dispatcher.
- Applying the rc.9 newsletter patch onto OpenWA's rc14 without a spike.
- Dual undocumented scheduler loops.
- Native interactive lists (Q1 locked: text helper only).
- Universal `/send` (Q5).
- `/dashboard` UI work (Q8: `./frontend/` only).
- Plugin-based bot commands until PluginContext can send stickers, read bot-config, and honor `BOT_COMMANDS` + per-session enabled (D4: core module instead).
