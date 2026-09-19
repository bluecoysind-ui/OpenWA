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
- [ ] Webhook delivery history

- [ ] `git diff -- dashboard` empty
- [ ] `frontend`: lint, typecheck, build
