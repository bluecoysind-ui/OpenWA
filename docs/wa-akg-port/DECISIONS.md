# Decisions (Phase 0)

Living log. Update when a WP lands a trade-off.

Locked Q1–Q8 (2026-09-20):

| ID     | Decision                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** | Text-list helper only, last item in WP2. **No** native `listMessage`. `LIST_MESSAGES` stays unused.                                                                         |
| **Q2** | One-shot scheduler in WP4. IANA timezone stored per row. Recurrence = WP4b later.                                                                                           |
| **Q3** | Leave bulk crash-resume as-is (interrupted batches stay FAILED; cancel stays).                                                                                              |
| **Q4** | Intended plugin, **spike failed** — see D4. Core module behind `BOT_COMMANDS` + per-session enabled.                                                                        |
| **Q5** | No universal `/send`.                                                                                                                                                       |
| **Q6** | Yes: webhook delivery rows with status, HTTP code, duration, attempt, error snippet **only**. Never request/response bodies. Retention 30 days **or** last 500 per webhook. |
| **Q7** | No Baileys rc.9 patch.                                                                                                                                                      |
| **Q8** | Final UI is **`./frontend/`**, not `/dashboard`.                                                                                                                            |

---

## D1 — Not a rewrite

OpenWA stays NestJS + TypeORM + dual engines. WA-AKG is a **capability checklist**, not an architecture template. Next.js routes, Prisma, NextAuth, and React pages are not copied. `/dashboard` stays as-is (no WA-AKG screens). Additive UI is `./frontend/` (D15).

## D2 — Spam / bomb is skipped

`POST .../spam` in `_reference/WA-AKG` is an uncapped background loop. **Will not be ported**, even behind a flag, unless a future review explicitly asks for a hard-capped audited variant (then it would be bulk+pacing, not this handler).

## D3 — No second rules engine

Auto-reply lands as **additive columns and matching logic on `AutomationRulesService`**. Bot commands land as a **core module** (D4). Both read the same bot-config access lists. **Precedence:** bot-config access lists gate first, then rule conditions. Inbound messages still go Session projector → automation → webhooks as today.

## D4 — Bot commands: plugin spike failed → core module

**Spike (2026-09-20), no product code.** `PluginContext` vs required (a)(b)(c):

| Need                                                              | Result                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) send **text** via MessageService with pacing                  | **Yes.** `ctx.messages.sendText` → `PluginMessagePort.sendText` → `MessageService.sendText` (pacing on that path).                                                                                          |
| (a) send **sticker**                                              | **No.** `PluginMessagingCapability` is only `sendText`/`reply`. `conversation.send` media types are `image\|file\|audio\|video\|voice` — **not sticker**. Extending the plugin surface is out of WP1 scope. |
| (b) read bot-config                                               | **No.** `ctx.config` is the plugin’s own manifest config. There is no session `bot_configs` table or capability.                                                                                            |
| (c) run only when `BOT_COMMANDS=true` **and** per-session enabled | **No host hook.** Plugin enablement is plugin-session activation, not that pair of flags.                                                                                                                   |

**Decision:** implement commands as a **core module** (`src/modules/bot/` in WP4) behind `BOT_COMMANDS=false` default **and** per-session `bot-config.enabled`. Sends still go through `MessageService` (pacing). Do not widen `PluginMessagingCapability` for this port.

**Inbound cost:** when `BOT_COMMANDS=false` the module must cost **nothing** on the inbound path — no `message:received` subscription, no per-message parse. WP4 must register the hook only after the flag is true (and still skip sessions whose bot-config is disabled). A later first-party plugin remains possible once (a)(b)(c) are true.

## D5 — Broadcast extends bulk send

`BulkMessageService` already has delay, jitter, cancel, pacing, circuit breaker, and batch status. **Do not add `BroadcastLog` as a second mechanism.** Map "broadcast" UX to bulk batches.

## D6 — Scheduler is a new module

New `src/modules/scheduler/` + TypeORM entity + migrations on the **`data` connection** (SQLite + Postgres). Sends still go through `MessageService` + pacing. Create the migration in **WP4** (first WP that reads the table).

### D6b — Scheduler semantics (at-most-once)

- Mark `SENDING` **before** the send.
- Claim with an **atomic conditional `UPDATE ... WHERE status=PENDING AND sendAt<=now`** and check **affected rows** (SQLite has no row locks).
- Crash recovery: `SENDING` rows → `FAILED` or `UNKNOWN`. **Never auto-resend.**
- Overdue after downtime: skip (fail) if later than **max-lateness**; do not send silently late.
- On `SEND_PACING_LIMITED`: **reschedule with backoff**, do not fail the job.
- Caps: per-session **pending job** max and **max horizon** (how far ahead `sendAt` may be).
- `SCHEDULED_MESSAGES` **defaults on** but is **inert until a job exists**. Anything that auto-sends on inbound stays opt-in per session.

## D7 — Dual WA-AKG scheduler loops are a bug, not a feature

One claim loop (multi-instance safe via D6b). Recurrence is WP4b.

## D8 — Universal send is not duplicated

No mega-body `/send`. Clients call existing `send-*`.

## D9 — WA-AKG list ≠ WhatsApp listMessage

Text-list helper only, last in WP2. Native lists not in this port.

## D10 — Status/Stories

Keep OpenWA `StatusController`. Do not add WA-AKG's `/status/.../update`.

## D11 — LID

Reuse `src/engine/identity/wa-id.ts` and `lid_mappings`. New DTOs parse through these helpers.

## D12 — Media persist is opt-in

`MEDIA_PERSIST=false` default. When true, `StorageService` session-prefixed keys. **List/delete of stored media only with this flag.** Global unscoped `/api/media/:filename` is not the OpenWA shape.

## D13 — remove.bg

Env `REMOVE_BG_API_KEY` default unset. Do not log the key.

## D14 — Baileys patch

Do not vendor the rc.9 patch (Q7).

## D15 — UI is `./frontend/`, dashboard frozen

WP7 is additive screens in **`./frontend/`**. Existing frontend stays as-is except minimal registration (logged in FRONTEND_CHANGES.md). **`git diff -- dashboard` must be empty at every WP.** Do not add features to `/dashboard`.

## D16 — Webhook contract

Keep `X-OpenWA-Signature`, retries, filters, existing event names. Delivery history (Q6): metadata only, 30 days or last 500 per hook.

## D17 — Feature flags

| Flag                                    | Default            | Notes                                |
| --------------------------------------- | ------------------ | ------------------------------------ |
| `BOT_COMMANDS`                          | **off**            | inbound auto-send                    |
| `MEDIA_PERSIST`                         | **off**            |                                      |
| `AUTO_REPLY_REGEX`                      | **off**            | pattern length cap + truncated input |
| `LIST_MESSAGES`                         | unused             | native lists not shipped             |
| `SCHEDULED_MESSAGES`                    | **on**             | inert until a job exists             |
| Inbound auto-reply / welcome / commands | per-session opt-in | access lists first                   |

## D18 — Auth

Every new route uses `ApiKeyGuard`, `@RequireRole`, session scope. No WA-AKG user table.

## D19 — BotConfig fields that were omitted in first GAP

| WA-AKG field             | OpenWA decision                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `autoRead`               | Use existing `POST .../chats/:chatId/read` on inbound when bot-config says so. No second read API.                          |
| `alwaysOnline`           | Use existing `setOnlinePresence`. Session bot-config toggles it; respect engine 501.                                        |
| Welcome message          | Hook `group.join` → `MessageService.sendText` through pacing. Per-session opt-in.                                           |
| Anti-spam                | **Exists** via `SendPacingService`. Do not add a parallel limiter.                                                          |
| Multipart media upload   | **Skip** while base64 JSON works (frontend ~18 MiB cap, `BODY_SIZE_LIMIT` default 25mb). Ask if a needed file exceeds that. |
| List/delete stored media | Only when `MEDIA_PERSIST=true`.                                                                                             |

## D20 — Regex auto-replies

Behind `AUTO_REPLY_REGEX`. Pattern length cap, truncated input. Ship **EXACT / CONTAINS / STARTS_WITH** first (WP4). Regex later under the flag.

## D21 — Migrations

New entities live on the **`data` connection**. Each migration is created in the WP that first reads the table, and is tested on **SQLite and Postgres**.

## D22 — CORS already allows frontend methods (verified WP1, before WP4)

`configure-app.ts` enables `GET, POST, PUT, DELETE, PATCH, OPTIONS` and headers `Content-Type, X-API-Key, Authorization, X-Request-ID`. Do **not** change global CORS for the scheduler. Frontend origin still needs `CORS_ORIGINS` in production (dev allows `*`).

## D23 — WP2 engine approximations

- **Poll `selectableCount`:** Baileys passes the integer through (`0` = unlimited). whatsapp-web.js only has `allowMultipleAnswers`; `selectableCount !== 1` maps to that boolean. Conflict with `allowMultipleAnswers` is 400. `selectableCount: 3` with the flag omitted is multiple (OK); `1` + `allowMultipleAnswers: true` and `3` + `false` are 400.
- **Sticker packName/author:** wwjs native (`stickerName`/`stickerAuthor`). Baileys EXIF deferred to WP5 — no new dependency added (sharp does not write WhatsApp sticker EXIF). Fields are accepted; Baileys still sends the sticker without pack metadata.
- **GET messages `q`:** implemented only with `chatId`. The list endpoint has no `dateFrom`/`dateTo` (only `from`/`to` message-id cursors), so a time-window scope was not added. Unscoped `q` is 400. LIKE `%`/`_`/`\` escaped; page size capped at 50.
- **Audit `action`:** `audit_logs.action` on the **main** connection is `varchar(50)` (SQLite; main is always SQLite). No CHECK, no Postgres enum. Adding `MESSAGE_MULTI_FORWARD` needs no migration.
- **Multi-forward latency:** `SendPacingService` is a cap/breaker, not a sleep. Destinations run sequentially (engine RTT + persist). Typical ~0.3–2s each → ~6–40s for 20 dests. Worst-case is one engine hang × N (same class as a single forward). 202 + pollable would be a new batch pipeline (stop: big; send-bulk already does that). **Choice:** stay synchronous; lower unique dest cap **20 → 10** so typical totals stay near the ~20s HTTP budget.
- **Multi-forward HTTP:** N=1 unchanged (201 or thrown 4xx/501). N>1 with `results[]`: **201** all sent, **207** mixed, **502** all failed.
- **`toChatId`:** optional when `toChatIds` is non-empty; at least one dest required. `toChatId` alone is unchanged.

## D24 — WP3 chat GET skipped; groups/labels already covered

`GET /chats/:chatId` is **not** added. `GET /sessions/:id/chats` already returns `ChatSummary` (id, name, kind, unread, lastMessage, archived, pinned, muted, muteExpiration) which is enough for a WP7 chat header/actions pane. History is `GET .../messages?chatId=` / `.../messages/:chatId/history`.

Groups and labels: no new code. Inventory (list/get/join/leave/create, invite get+revoke, members, subject/description/picture, settings, ephemeral, label CRUD, chat labels, chats-by-label) is already on the existing controllers. Documented 501s stay: wwjs `createGroup`, wwjs group ephemeral, Baileys chats-by-label, wwjs label create/delete. See docs/29 and GAP 4.7–4.8.

## D25 — WP4a sendAt is an ISO instant (offset required); IANA timezone stored for display. Naive wall-clock conversion refused (no tz lib). Send/fail webhooks are additive `scheduled.message.*`; DELETE cancels the row.

## D26 — WP4b sticker command is `#{prefix}sticker <https-url>` only (no inbound media bytes on the hook). Commands that match set `_openwaCommandHandled` so automation skips that message. Welcome fires once per group.join event via BOT_INBOUND_PORT (SessionModule does not import BotModule). GET bot-config returns in-memory defaults without inserting a row. alwaysOnline is applied on PUT when a live engine exists, not on session:ready.

## D27 — WP5 sticker-pack EXIF is an in-repo WebP writer (no node-webpmux). Existing WebP stays byte-identical unless packName/packAuthor are set. Empty REMOVE_BG_API_KEY with removeBg=true is 400, never 500; the key is never logged.

## D28 — quoted.fileUrl is set only when MEDIA_PERSIST already stored that quoted message's bytes (no extra WhatsApp download). Stored files are addressed by messageId under `sessions/{id}/chat/`. GET/DELETE/list are OPERATOR and 404 when the flag is off. MEDIA_PERSIST_TTL_DAYS default 30. webhook_deliveries and media_objects are excluded from backup.

## D29 — message.poll_vote is webhook-only (not in SUBSCRIBABLE_EVENTS). Deliveries GET is OPERATOR. Poll votes are not decrypted (selectedOptions omitted).

## D30 — SDK coverage verb harvest includes request_bytes / requestBinary / doRaw so a binary GET on a GET+DELETE path is counted.
