# Manual tests (WA-AKG port)

Run after the matching WP. Check **viewer** keys, **501** on the other engine, and feature-flag **off** as well as the happy path.

Ban-risk: any bulk or scheduled send must show pacing copy in the UI (WP7) and must go through `SendPacingService` on the server.

---

## WP1 — Foundations

- [ ] Fresh boot with no new env vars: behavior unchanged (no new routes in `/api/docs`).
- [ ] `SCHEDULED_MESSAGES` unset: config reports enabled (inert — no jobs, no sends).
- [ ] `SCHEDULED_MESSAGES=false`: config reports disabled.
- [ ] `BOT_COMMANDS` / `MEDIA_PERSIST` / `AUTO_REPLY_REGEX` unset: off.
- [ ] Invalid bool (`BOT_COMMANDS=yes`) refuses boot.
- [ ] `git diff -- dashboard` empty.

## WP2 — Message primitives

- [ ] Existing send-* bodies still work without new fields.
- [ ] Poll `selectableCount`, sticker pack/author, forward `toChatIds[]` (cap + pacing).
- [ ] Text-list helper sends numbered text (not a native list).
- [ ] Viewer key: 403 on writes.

## WP3 — Chat / contacts / profile

- [ ] GET profile (501 if engine cannot).
- [ ] Bulk number check max 50, paced; GET single still works.
- [ ] Mute `durationSec` maps to `muteUntil`; old field still works.

## WP4 — Scheduler / auto-reply / bot

- [ ] One-shot job: PENDING → SENDING → SENT; timezone stored.
- [ ] Two nodes: only one claim (affected rows = 1).
- [ ] Kill during SENDING: recovery marks FAILED/UNKNOWN, **no auto-resend**.
- [ ] Overdue beyond max-lateness: not sent.
- [ ] `SEND_PACING_LIMITED`: job rescheduled, not FAILED.
- [ ] Pending-job cap and max-horizon rejected with 400.
- [ ] Auto-reply EXACT/CONTAINS/STARTS_WITH; regex off unless flagged; access lists first.
- [ ] Commands silent unless `BOT_COMMANDS=true` **and** session enabled.
- [ ] Welcome / autoRead / alwaysOnline use existing APIs; inbound auto-send is per-session opt-in.

## WP5 — Stickers

- [ ] Convert endpoint; missing ffmpeg → clear 503.
- [ ] Empty `REMOVE_BG_API_KEY` → 400/503, never 500, key not logged.

## WP6 — Webhooks / media persist

- [ ] Delivery list: status, HTTP code, duration, attempt, error snippet only — **no bodies**.
- [ ] Retention 30 days or last 500 per hook.
- [ ] HMAC / retries / filters unchanged.
- [ ] MEDIA_PERSIST off: no list/delete routes (or 404). On: session-scoped keys.

## WP7 — UI (`./frontend/` only)

Every new screen:

- [ ] 501 engine-unsupported shown, not a generic crash.
- [ ] Feature flag off: disabled/empty state, not a 500 toast loop.
- [ ] Viewer / read-only key: controls disabled.
- [ ] Bulk + scheduler: pacing / ban-risk copy visible.

Screens:

- [ ] Composer: poll, contact, location, sticker pack/author, multi-forward, text list, message actions
- [ ] Bulk/broadcast progress
- [ ] Scheduler
- [ ] Auto-reply editor
- [ ] Bot settings
- [ ] Sticker tool
- [ ] Chat actions (archive/mute/pin/presence)
- [ ] Contacts bulk check
- [ ] Groups / labels / profile
- [ ] Webhook delivery history + send-test; new event names (`scheduled.message.*`, `message.poll_vote` when flagged)
- [ ] Media files pane only when `mediaPersist` is true (hidden/disabled otherwise)

Per engine (same screens on a **whatsapp-web.js** session and a **Baileys** session):

- [ ] 501 “not supported by this engine” for cells that docs/29 marks engine-split (create group on wwjs, chats-by-label on Baileys, poll vote send on Baileys, …)
- [ ] Sticker pack/author visible on wwjs; Baileys still sends the sticker (EXIF when convert ran)
- [ ] Welcome on `group.join` fires once, paced; autoRead marks inbound seen; alwaysOnline after PUT
- [ ] Viewer key: writes hidden/disabled; `GET /api/features` still 200

- [ ] `git diff -- dashboard` empty
- [ ] `frontend`: typecheck, unit tests (`akg-datetime`, `akg-builders`), build; lint on changed files only

## WP8 — MCP, docs, security

Backend (both engines, viewer + operator keys):

- [ ] MCP read: scheduled list/get, automation rules, bot-config, webhook deliveries (no bodies)
- [ ] `MCP_READONLY` unset: create/cancel scheduled tools absent
- [ ] `MCP_READONLY=false`: create + cancel one scheduled job; no spam/bulk tool names
- [ ] `GET /api/features` booleans only; blank `REMOVE_BG_API_KEY` → `removeBgConfigured: false`
- [ ] Flag off: scheduler 400/404; media files 404; regex rule 400
- [ ] 429 on bulk number check / paced send surfaces Retry-After
- [ ] Audit: scheduled create/cancel/sent/failed rows have jobId/chatId, **not** text or media URL

UI (both engines):

- [ ] Every new pane: loading, empty, error, 501, 404-flag-off, 429, viewer
- [ ] Destructive confirm on cancel scheduled, delete rule, delete stored media, leave group, delete-for-everyone
- [ ] Media upload still base64 and the existing size cap

- [ ] Compose env parity: `SCHEDULED_MESSAGES`, `BOT_COMMANDS`, `MEDIA_PERSIST`, `AUTO_REPLY_REGEX`, `POLL_VOTE_EVENTS`, `REMOVE_BG_API_KEY`, `MCP_READONLY` forwarded in both compose files
