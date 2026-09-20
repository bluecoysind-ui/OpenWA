# WA-AKG port — what shipped

Capability checklist against `_reference/WA-AKG`, implemented as additive OpenWA modules and `./frontend/` Gateway panes. `/dashboard` is unchanged.

## What shipped

- **Message extras:** poll `selectableCount`, sticker `packName`/`author`, multi-forward `toChatIds[]` (cap 10, 201/207/502), text-list helper (formatted text, not native `listMessage`).
- **Chat/contacts/profile:** mute `durationSec`, bulk number check (max 50, paced), GET own profile.
- **Scheduler:** one-shot delayed text or media URL; IANA timezone stored; `sendAt` is an ISO instant with offset; at-most-once claim; crash recovery never auto-resends.
- **Auto-reply:** `equals` / `contains` / `startsWith`; `regex` behind `AUTO_REPLY_REGEX`; `chatContext`; reply media URL; cooldown; enable toggle. Access lists first.
- **Bot config:** access mode + lists, prefix, commands on/off, `autoRead`, `alwaysOnline`, welcome on `group.join` (paced `sendText`). Commands are a core module (`BOT_COMMANDS` + per-session enabled).
- **Stickers:** convert endpoint; in-repo WebP EXIF; remove.bg only when `REMOVE_BG_API_KEY` is set.
- **Webhooks:** delivery history (status, HTTP code, duration, attempt, error snippet — no bodies); `scheduled.message.*`; `message.poll_vote` behind flag.
- **Media persist:** list/get/delete stored inbound files when `MEDIA_PERSIST=true`.
- **UI (`./frontend/`):** scheduler, auto-reply + bot settings, composer extras, message/chat/directory actions, bulk pacing note, sticker tool, webhooks deliveries, media files, own profile. Gated by `GET /api/features` and 501/404/429/viewer.
- **MCP:** read tools for scheduled messages, automation rules, bot-config, webhook deliveries. Write: create/cancel scheduled message only when `MCP_READONLY=false`. No spam or bulk-bomb tools.

## Flags and defaults

| Flag | Default | Notes |
| --- | --- | --- |
| `SCHEDULED_MESSAGES` | **on** | Inert until a job exists. `false` refuses scheduler routes. |
| `SCHEDULED_MESSAGES_MAX_PENDING` | 100 | Per session; `0` = unlimited. |
| `SCHEDULED_MESSAGES_MAX_HORIZON_HOURS` | 720 | 30 days; `0` = unlimited. |
| `SCHEDULED_MESSAGES_MAX_LATENESS_MS` | 21600000 | 6h; overdue after downtime is skipped. |
| `BOT_COMMANDS` | **off** | Also requires per-session `commandsEnabled`. |
| `AUTO_REPLY_REGEX` | **off** | Pattern length cap (`AUTO_REPLY_REGEX_MAX_PATTERN`, default 256). |
| `MEDIA_PERSIST` | **off** | List/delete only when on. `MEDIA_PERSIST_TTL_DAYS` default 30. |
| `POLL_VOTE_EVENTS` | **off** | Webhook-only; not socket-subscribable. Votes not decrypted. |
| `REMOVE_BG_API_KEY` | unset | Empty + `removeBg=true` → 400, never 500. Key never logged or returned. |
| `LIST_MESSAGES` | unused | Native listMessage not in this port. |
| `MCP_READONLY` | **true** (unset = read-only) | Write tools only when the literal `false`. |

`GET /api/features` (VIEWER) returns booleans only: `scheduler`, `botCommands`, `mediaPersist`, `removeBgConfigured`, `regexRules`, `pollVoteEvents`. No secrets.

## Migrations (data connection, SQLite + Postgres)

| Timestamp | Tables |
| --- | --- |
| `1786600000000` | `scheduled_messages` |
| `1786700000000` | `bot_configs`; match/chat/media columns on `automation_rules` |
| `1786800000000` | `webhook_deliveries`, `media_objects` |

`webhook_deliveries` and `media_objects` are excluded from backup. `scheduled_messages` and `bot_configs` cascade with the session and are in the data export.

## Skipped, and why

| Item | Why |
| --- | --- |
| Native `listMessage` | Q1 / D9 — text-list helper only. |
| Scheduler recurrence | Q2 — WP4b later. |
| Bulk crash-resume rewrite | Q3 — interrupted batches stay FAILED; cancel stays. |
| Universal `/send` | Q5. |
| Spam / bomb endpoint | D2 — uncapped loop; will not port. |
| Bot-as-plugin | D4 spike failed; core module instead. |
| Multipart media upload | D19 — base64 JSON still works (~18 MiB frontend cap). |
| GET `/chats/:chatId` | D24 — session chat list payload is enough. |
| WA-AKG Stories `/status/.../update` | D10 — OpenWA StatusController already exists. |
| Baileys rc.9 patch | Q7. |
| Poll-vote decryption | D29 — `selectedOptions` omitted. |
| MCP bulk / spam tools | Ban-risk. |
| `/dashboard` screens | Q8 / D15 — frozen. |

## Upgrade notes

- No existing REST body is required to change. New fields are optional.
- Default env is behaviour-preserving: scheduler flag on but idle; bot/regex/media-persist/poll-vote off.
- After migrate, `scheduled_messages` / `bot_configs` / `webhook_deliveries` / `media_objects` appear on the **data** DB.
- Compose already forwards the new env vars (`docker-compose.yml` and `docker-compose.dev.yml`).
- MCP counts become **29 read / 57 total** when this branch is on; set `MCP_READONLY=false` only if an agent must create/cancel scheduled jobs (or other existing writes).
- `GET /api/features` is VIEWER and deployment-wide (scoped keys see the same booleans).

## Manual-test pointers

See [MANUAL_TESTS.md](./MANUAL_TESTS.md). On a real number, at least: one scheduled send, one welcome on group join, one auto-reply, sticker convert ± remove-bg, bulk/check with the pacing copy visible, and a 501 on the other engine for each engine-split action.
