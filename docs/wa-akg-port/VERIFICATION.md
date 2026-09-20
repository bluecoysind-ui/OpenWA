# WA-AKG port verification

**Verdict: PASS**

Source: `_reference/WA-AKG` (package.json `1.6.4`), not OpenWA docs. Route inventory: 82 `route.ts` files. Cross-checked against `WA_AKG_MAP.md` §1–§14.

## Counts

| Status | Count |
| --- | ---: |
| EXISTED | 62 |
| IMPLEMENTED | 20 |
| EXTENDED | 7 |
| SKIPPED-INTENTIONAL | 13 |
| OUT-OF-SCOPE | 13 |
| MISSING | 0 |

Totals include every exported HTTP verb (and the NextAuth catch-all with no verbs), every messaging Prisma model, bot commands+aliases, autoreply modes, BotConfig fields, scheduler/broadcast extras, webhook events, LID, sticker/remove.bg, session actions/pair, and socket events.

## SKIPPED-INTENTIONAL

| Item | Decision | Reason |
| --- | --- | --- |
| `POST .../spam` | D2 | Uncapped bomb; ban-risk. |
| Universal `POST .../send` | Q5 | Typed send routes already exist. |
| Multipart `POST .../media` | Q5 / send-pacing | JSON typed sends + pacing; no second multipart pipeline. |
| Native `listMessage` / `LIST_MESSAGES` | Q1 | Text-list helper only; env stub unused/reserved. |
| Scheduler recurrence / `cronExpression` | Q2 | Daily/weekly/monthly on the same row (no cron). |
| Dual scheduler loops | D7 / D25 | Single 5s claim loop. |
| Broadcast pause/cancel worker flag | Q3 | Existing bulk cancel; no WA-AKG-style cancelled worker. |
| `GET /chat/:jid` | D24 | List + history already cover the pane. |
| Unscoped `GET/DELETE /api/media` | D12 | Session-scoped `.../media/files`. |
| Webhook request/response bodies | Q6 / D16 | Snippet + status only. |
| Stories / `POST /status/.../update` | D10 / map §12 | No route.ts in source; Story unused. |
| Baileys rc.9 newsletter patch | Q7 | OpenWA is rc14. |
| OWNER-as-fromMe / per-command enable* / per-session removeBgApiKey | D32, D13, D26 | Mapped to all/allow/block + commandsEnabled; env key; #sticker URL + caption/reply media (no remove.bg on inbound). |
| BotConfig anti-spam knobs | D19 | `SendPacingService` is the send gate. |
| `status.update` webhook | map §7 | WA-AKG never dispatches it. |

No unexplained skips.

## Unverified

- Postgres up/down of 178660–178690 (no local Postgres in this run). SQLite up+down + upgrade-from-main **verified**.
- Live Gateway panes with no session (backend+frontend not started together here).
- Real WhatsApp number-check / sticker/remove.bg against production APIs.
- Linux CI (this run is Windows). Jest name-fails vs BASELINE still Windows FS/chmod/symlink/patch/SIGKILL.

---

## A3 gates (executed)

| Gate | Proof |
| --- | --- |
| OpenAPI vs checklist | `openapi.json` 215 ops; new paths `/api/features`, `.../scheduled-messages`, `.../bot-config`, `.../media/files`, `.../media/convert/sticker`, `.../messages/send-text-list`, `.../webhooks/{id}/deliveries`, `POST .../contacts/check` present. |
| e2e new routes | 9 suites / 49 tests: `scheduled-messages`, `bot-config`, `media-persist`, `media-sticker`, `webhook-deliveries`, `wp3-session-contacts`, `automation-rules`, `app` (features). Full e2e: **31 passed / 243 tests** (3 skip, 3 todo). |
| Role / session-scope / audit | Fence: `features.controller.ts :: get`. Session-scoped controllers use existing session param guards. Scheduler audit: `scheduled_message_created/cancelled` with `jobId`+`chatId` only (D31). `test:docs` audit-coverage + fence coverage green (282). |
| Frontend ↔ OpenAPI | `npm run check:frontend-openapi` — **118 unique ops match**. |
| Frontend typecheck / node --test / build | `tsc --noEmit` pass; `npm test` 55 pass; `npm run build` pass. Live no-session panes: **unverified** (servers not co-started). |
| Frozen frontend | `git diff main --numstat -- frontend`: new `akg-*` files + registration-only rows in `FRONTEND_CHANGES.md`. `GatewayApp.tsx` slots only. |
| Dashboard | `git diff main -- dashboard` empty. |
| Flags default off / inert | `feature-flags.spec.ts`; `does not subscribe when BOT_COMMANDS is off`; `404s list/get/delete when the flag is off`; `does not start the tick loop when SCHEDULED_MESSAGES is off`. |
| Migrations | `port-migrations-upgrade-down.spec.ts` (SQLite: main tip 178650 → up 178660–690 → down ×4 → up). `sqlite-chain-boot.e2e-spec.ts` full chain. Postgres **unverified**. |
| Dependencies | `git diff main -- package.json package-lock.json frontend/package.json`: no new runtime packages (frontend `test` script only). |
| Env parity | `docs-env-example.spec.ts` + compose forwards. |
| Security | Media URL fetch uses `withSafeFetch` SSRF guard. Audit/logs omit message bodies and `REMOVE_BG_API_KEY`. Bulk check max 50 + `CONTACT_CHECK_RATE` 429. |
| Attribution | `ATTRIBUTION.md`: no WA-AKG code adapted. |
| Unit Jest vs BASELINE | 13 suites / 43 tests failed (BASELINE 48 Windows FS/chmod/symlink/patch/SIGKILL names). Subset. |

API-only (has backend, no dedicated pane): `GET .../messages?q=` (overlay Search uses `GET /api/search`); presence/typing (composer already); pairing (existing session QR/pair flow); `GET .../media/convert` without sticker (sticker tool uses `/sticker`); MCP tools (docs/24, not Gateway).

A4 this pass: command aliases `s`/`stiker`/`help`; `GET /api/features` e2e; scheduler loop-off test; frontend openapi checker; SQLite upgrade/down spec. No large/behavior-change gaps.

---

## Route checklist (source `src/app/api/**/route.ts`)

Columns: WA-AKG item | status | OpenWA | proof | frontend | notes

### Auth / users / system (OUT-OF-SCOPE)

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| POST `/api/auth/register` `auth/register/route.ts` | OUT-OF-SCOPE | OpenWA API keys | n/a | n/a | NextAuth/RBAC users |
| `/api/auth/[...nextauth]` (no verbs) | OUT-OF-SCOPE | — | n/a | n/a | NextAuth |
| GET+POST `/api/notifications` + PATCH read + DELETE delete | OUT-OF-SCOPE | — | n/a | n/a | in-app notifications |
| GET+POST `/api/settings/system` | OUT-OF-SCOPE | `/api/infra/config`, `/api/settings` | existing | Settings | WA-AKG SystemConfig UI |
| POST `/api/system/check-updates` | OUT-OF-SCOPE | — | n/a | n/a | updater |
| GET `/api/system/monitor` + `/:sessionId` | OUT-OF-SCOPE | `/api/health`, `/api/metrics` | existing | n/a | WA-AKG monitor |
| GET+POST+DELETE `/api/user/api-key` | OUT-OF-SCOPE | `/api/auth/api-keys` | existing | API keys pane | different auth model |
| GET+POST `/api/users` + PATCH+DELETE `/:id` | OUT-OF-SCOPE | — | n/a | n/a | STAFF/OWNER users |
| GET+POST+DELETE `/api/sessions/:id/access` | OUT-OF-SCOPE | session-scoped API keys | existing | n/a | SessionAccess RBAC |
| GET `/api/docs` | OUT-OF-SCOPE | `openapi.json` / docs/06 | `openapi:export` | n/a | WA-AKG swagger UI |

### Sessions / bot / pair

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| GET+POST `/api/sessions` | EXISTED | `SessionController` GET/POST `/api/sessions` | e2e sessions | session picker | |
| GET `/api/sessions/:id` | EXISTED | GET `/api/sessions/{sessionId}` | e2e | GatewayApp | |
| GET `/api/sessions/:id/qr` | EXISTED | GET `.../qr` | e2e | session QR | |
| GET+PATCH+DELETE `.../settings` | EXISTED | GET/PATCH `.../config` + DELETE session | e2e | session settings | |
| POST `.../:action` start\|stop\|restart\|logout\|pair | EXISTED | POST start/stop/logout + `requestPairingCode` | e2e; openapi pair | session actions | pair existed |
| GET+POST `.../bot-config` | IMPLEMENTED | GET/PUT `/api/sessions/{sessionId}/bot-config` `bot-config.controller.ts` | `bot-config.e2e-spec.ts`; openapi | `AutomationPanel` `getBotConfig`/`putBotConfig` | POST→PUT |

### Chat / contacts / presence

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| GET `/api/chat/:sessionId` | EXISTED | GET `.../chats` | e2e | chat list | |
| GET `/api/chat/:sessionId/:jid` | SKIPPED-INTENTIONAL | GET `.../messages?chatId=` + `.../messages/{chatId}/history` | D24; history e2e | transcript | no extra GET-by-jid |
| PUT `.../archive` | EXISTED | POST `.../chats/archive` | openapi | `ChatHeaderActions` `archiveChat` | |
| PUT `.../mute` | EXTENDED | POST `.../chats/mute` + `durationSec` | `wp3-session-contacts.e2e-spec.ts` | `muteChat` | |
| PUT `.../pin` | EXISTED | POST `.../chats/pin` | openapi | `pinChat` | |
| PUT `.../read` | EXISTED | POST `.../chats/read` | openapi | existing client | |
| POST `.../presence` | EXISTED | POST `.../chats/typing` + PUT `.../presence/{chatId}` | openapi | API-only (composer typing) | |
| POST `.../profile-picture` | EXISTED | GET `.../contacts/{id}/profile-picture` | openapi | chat avatars | GET not POST fetch |
| POST `/api/chat/:sessionId/check` | IMPLEMENTED | POST `.../contacts/check` (max 50) + GET `.../check/{number}` | `wp3-session-contacts.e2e-spec.ts`; `contact-check-rate.spec.ts` | `DirectoryActions` `checkNumbers` | rate 429 |
| GET `/api/contacts/:sessionId` | EXISTED | GET `.../contacts` | e2e | contacts | |
| POST `.../block` | EXISTED | POST `.../contacts/{id}/block` | openapi | `blockContact` | |
| POST `.../unblock` | EXISTED | DELETE `.../contacts/{id}/block` | openapi | `unblockContact` | |
| GET `.../chats/by-label/:labelId` | EXISTED | GET `.../labels/{labelId}/chats` | openapi | labels | |

### Groups / labels / profile

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| GET `/api/groups/:sessionId` | EXISTED | GET `.../groups` | e2e | groups | D24 |
| POST `.../create` | EXISTED | POST `.../groups` | openapi | API-only / existing | 501 wwjs create stays |
| GET `.../:jid` | EXISTED | GET `.../groups/{groupId}` | openapi | group pane | |
| POST `.../leave` | EXISTED | POST `.../leave` | openapi | `leaveGroup` | |
| GET+PUT `.../invite` | EXISTED | GET invite-code + POST revoke | `group-invite-code-role.e2e-spec.ts` | `listGroupInvite` | PUT regen = revoke+get |
| POST `.../invite/accept` | EXISTED | POST join / join-info | openapi | existing | |
| PUT `.../members` | EXISTED | POST/DELETE participants + promote/demote | openapi | existing | |
| PUT `.../subject` | EXISTED | PUT `.../subject` | openapi | `setGroupSubject` | |
| PUT `.../description` | EXISTED | PUT description | openapi | existing | |
| PUT+DELETE `.../picture` | EXISTED | PUT/DELETE picture | openapi | existing | |
| PUT `.../settings` | EXISTED | GET/PUT settings | openapi | existing | |
| PUT `.../ephemeral` | EXISTED | PUT ephemeral | openapi | existing | 501 wwjs documented |
| GET+POST `/api/labels/:sessionId` | EXISTED | GET/POST `.../labels` | openapi | `listLabels` | |
| PUT+DELETE `.../:labelId` | EXISTED | PUT/DELETE label | openapi | existing | |
| GET+PUT `.../chat/:jid/labels` | EXISTED | GET/POST/DELETE `.../labels/chat/{chatId}` | openapi | `addLabelToChat` | |
| GET `.../labels/:sessionId/chats` | EXISTED | GET chats-by-label | openapi | labels | Baileys 501 documented |
| GET `/api/profile/:sessionId` | EXISTED | GET `.../profile` | `wp3-session-contacts.e2e-spec.ts` | `ProfilePanel` `getOwnProfile` | |
| PUT `.../name` | EXISTED | PUT `.../profile/name` | openapi | `setProfileName` | |
| PUT `.../status` (About) | EXISTED | PUT `.../profile/status` | openapi | `setProfileStatus` | not Stories |
| PUT+DELETE `.../picture` | EXISTED | PUT/DELETE `.../profile/picture` | openapi | ProfilePanel | |

### Messages / media / search / broadcast

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| POST `.../send` (universal) | SKIPPED-INTENTIONAL | typed `send-text` etc. | Q5 | Composer | |
| POST `.../media` multipart | SKIPPED-INTENTIONAL | typed JSON + base64 | Q5 | Composer | |
| POST `.../reply` + `.../{id}/reply` | EXISTED | POST send with quote | `message-send.e2e-spec.ts` | composer reply | |
| POST `.../sticker` | EXTENDED | POST `.../messages/send-sticker` + `packName`/`author`/`removeBg` | `media-sticker.e2e-spec.ts` | `sendStickerAkg` `StickerTool` | D27 |
| POST `.../poll` | EXTENDED | POST `.../send-poll` + `selectableCount` | `message-send.e2e-spec.ts` | `sendPollAkg` ComposerExtras | |
| POST `.../location` | EXISTED | POST send-location | openapi | existing | |
| POST `.../contact` | EXISTED | POST send-contact | openapi | existing | |
| POST `.../list` (text helper) | IMPLEMENTED | POST `.../messages/send-text-list` | `message-send.e2e-spec.ts`; openapi | `sendTextList` ComposerExtras | Q1 |
| POST `.../{id}/react` | EXISTED | POST `.../messages/react` | openapi | `MessageActions` | |
| POST `.../{id}/star` | EXISTED | POST `.../messages/star` | openapi | `starMessage` | |
| DELETE `.../{id}` | EXISTED | POST `.../messages/delete` | openapi | `deleteMessage` | |
| PATCH `.../{id}` | EXISTED | POST `.../messages/edit` | openapi | `editMessage` | |
| POST `.../forward` | EXTENDED | POST `.../messages/forward` + `toChatIds` 207/502 | `message-send.e2e-spec.ts` | `forwardMany` | D23 |
| POST `.../broadcast` | EXISTED | POST bulk send | existing bulk e2e | Broadcast + `AkgBulkNote` | Q3 |
| GET `.../broadcast/history` + `/:logId` | EXISTED | GET `.../messages/batch/{batchId}` | openapi | Broadcast | |
| GET `.../search` | EXISTED | GET `/api/search` + GET `.../messages?q=` | `search.e2e-spec.ts` | SearchModal (`/search`) | `q` on messages is API-only |
| GET `.../download/:messageId/media` | EXISTED | GET `.../messages/{chatId}/{messageId}/media` | openapi | transcript | |
| POST `.../spam` | SKIPPED-INTENTIONAL | — | D2 | none | |
| GET+DELETE `/api/media` + GET `/api/media/:filename` | SKIPPED-INTENTIONAL | GET/DELETE `.../media/files[/{messageId}]` | D12; `media-persist.e2e-spec.ts` | `MediaFilesPanel` | flag off → 404 |

### Scheduler / autoreplies / webhooks

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| GET+POST `/api/scheduler/:sessionId` | IMPLEMENTED | GET/POST `.../scheduled-messages` `scheduler.controller.ts` | `scheduled-messages.e2e-spec.ts` | `SchedulerPanel` | D25 |
| PUT+DELETE `.../:scheduleId` | IMPLEMENTED | PATCH/DELETE `.../scheduled-messages/{jobId}` | same e2e | `updateScheduledMessage` `cancelScheduledMessage` | PUT→PATCH |
| GET+POST `/api/autoreplies/:sessionId` | IMPLEMENTED | GET/POST `.../automation-rules` | `automation-rules.e2e-spec.ts` | `AutomationPanel` | D3 columns |
| PUT+DELETE `.../:replyId` | IMPLEMENTED | PUT/DELETE `.../automation-rules/{ruleId}` | same | same | |
| GET+POST `/api/webhooks/:sessionId` | EXISTED | GET/POST `.../webhooks` | `webhooks.e2e-spec.ts` | WebhooksPanel | |
| PUT+DELETE `.../:id` | EXISTED | PUT/DELETE webhook | same | same | |
| POST `.../:id/test` | EXISTED | POST test | same | same | |
| GET `.../:id/logs` | IMPLEMENTED | GET `.../webhooks/{id}/deliveries` | `webhook-deliveries.e2e-spec.ts`; Q6 | `WebhookDeliveries` | no bodies |

---

## Non-route source items

### Prisma (`prisma/schema.prisma`)

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| User | OUT-OF-SCOPE | api_keys | n/a | n/a | |
| Session | EXISTED | `sessions` | migrations | | |
| Contact `lid` `remoteJidAlt` | EXISTED | `lid_mappings` + contact | `lid-mapping-store.spec.ts` | | map §11 |
| Message | EXISTED | `messages` | e2e | transcript | |
| Group | EXISTED | groups via engine | e2e | | |
| AutoReply + match/context | EXTENDED | `automation_rules` matchMode/chatContext/replyMediaUrl | 178670; automation e2e | AutomationPanel | equals/contains/startsWith/regex; all/private/group |
| ScheduledMessage | IMPLEMENTED | `scheduled_messages` | 178660+178690; scheduler e2e | SchedulerPanel | daily/weekly/monthly; paused |
| Webhook + WebhookLog bodies | SKIPPED-INTENTIONAL | `webhooks` + `webhook_deliveries` snippets | Q6; 178680 | WebhookDeliveries | |
| BotConfig fields | IMPLEMENTED / SKIPPED-INTENTIONAL | `bot_configs` | 178670; bot-config e2e; D32 | AutomationPanel | see field rows |
| Label / ChatLabel | EXISTED | labels | openapi | Directory/labels | |
| BroadcastLog / Recipient | EXISTED | bulk batches | existing | Broadcast | Q3 cancelled unused in WA-AKG too |
| Story | SKIPPED-INTENTIONAL | — | D10 | none | unused in source |
| AuthState | EXISTED | engine auth store | session e2e | | |
| SystemConfig.timezone | OUT-OF-SCOPE | per-job IANA `timezone` | D25 | SchedulerPanel | not a global app timezone |
| Notification / SessionAccess | OUT-OF-SCOPE | — | n/a | n/a | |

**BotConfig field map:** `prefix`, `welcomeMessage`, `autoRead`, `alwaysOnline`, `stickerPackName`, `stickerPackAuthor` IMPLEMENTED; `autoReplyMode`/`botAllowedJids`/`botBlockedJids` → `accessMode`/`allowList`/`blockList` IMPLEMENTED (D32); `enabled`/`enablePing`/`enableSticker`/`enableUptime` → `commandsEnabled` SKIPPED-INTENTIONAL D32; `removeBgApiKey` SKIPPED-INTENTIONAL D13; `antiSpam*` SKIPPED-INTENTIONAL D19; `botName`/`botMode` unused SKIPPED-INTENTIONAL D32; `enableVideoSticker`/`maxStickerDuration` SKIPPED-INTENTIONAL D26 (converter caps).

### Bot commands (`bot/command-handler.ts`)

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| `ping` `id` `uptime` `menu` `sticker` | IMPLEMENTED | `bot-commands.service.ts` | `bot-commands.service.spec.ts` | AutomationPanel enables | BOT_COMMANDS off: no subscribe |
| aliases `s` `stiker` `help` | IMPLEMENTED | ALIASES map | `accepts WA-AKG aliases` | n/a (inbound) | A4 |
| `sticker nobg/removebg` inbound media | SKIPPED-INTENTIONAL | no remove.bg on #sticker | D26 | StickerTool uses convert API | caption/reply convert has no nobg |
| OWNER fromMe macros | SKIPPED-INTENTIONAL | skip fromMe | spec `skips fromMe`; D32 | | loop protection |

### Autoreply (`store/autoreply.ts`)

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| EXACT / CONTAINS / REGEX | EXTENDED | equals/contains/startsWith/regex | automation e2e; AUTO_REPLY_REGEX flag | AutomationPanel | regex off → 400 |
| ALL / GROUP / PRIVATE | IMPLEMENTED | chatContext all/private/group | 178670 | same | |
| Access ALL / SPECIFIC / BLACKLIST | IMPLEMENTED | all/allow/block | bot-config e2e; D32 | AutomationPanel | |
| Access OWNER | SKIPPED-INTENTIONAL | D32 | | | |
| Media reply URL | IMPLEMENTED | replyMediaUrl | automation | AutomationPanel | |
| No cooldown in WA-AKG | EXISTED | cooldownSeconds (OpenWA extra) | | | additive |

### Scheduler / broadcast / webhooks / LID / sticker / sockets

| WA-AKG item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| node-cron recurrence + 30s dual loop | IMPLEMENTED | 5s claim loop; daily/weekly/monthly | scheduler-recurrence.spec; D25 Q2 | SchedulerPanel | skip-missed; pause; no cron |
| IANA tz at create | IMPLEMENTED | `timezone` on row | e2e | akg-datetime | naive refused |
| Broadcast delay/jitter | EXISTED | bulk pacing | send-pacing | AkgBulkNote | |
| Webhook events received/sent/status/connection/group/contact/deleted/edited/participant/test | EXISTED | SUBSCRIBABLE_EVENTS | webhooks e2e | WebhooksPanel | |
| `scheduled.message.sent/failed` | IMPLEMENTED | additive events | scheduler spec dispatch | AKG_WEBHOOK_EVENTS | D25 |
| `message.poll_vote` | IMPLEMENTED | webhook-only | D29; POLL_VOTE_EVENTS | extra event names | not in SUBSCRIBABLE list |
| `status.update` | SKIPPED-INTENTIONAL | — | map §7 | | never emitted upstream |
| Payload quoted.fileUrl | EXTENDED | quoted.fileUrl if MEDIA_PERSIST | D28 | | |
| HMAC secret | EXISTED | webhook secret | e2e | | |
| LID `@lid` / `@c.us`→`@s.whatsapp.net` | EXISTED | `lid-mapping-store` + jid helpers | `lid-mapping-store.spec.ts` | | |
| wa-sticker-formatter pack/author | IMPLEMENTED | in-repo WebP EXIF | `media-sticker.e2e-spec.ts`; D27 | StickerTool | no node-webpmux |
| remove.bg | IMPLEMENTED | `REMOVE_BG_API_KEY` env | media-sticker e2e; D27 | convertSticker removeBg | empty key + flag → 400 |
| Socket.IO session/message/broadcast.progress | EXISTED | EventsGateway | existing | Gateway sockets | |
| Baileys rc.9 patch | SKIPPED-INTENTIONAL | Q7 | | | |
| `LIST_MESSAGES` env | SKIPPED-INTENTIONAL | unused/reserved | Q1; `.env.example` comment | | |

### OpenWA-only (not a WA-AKG gap)

| Item | status | OpenWA | proof | frontend | notes |
| --- | --- | --- | --- | --- | --- |
| GET `/api/features` | IMPLEMENTED | `features.controller.ts` | `features.controller.spec.ts`; `app.e2e-spec.ts`; openapi | `getAkgFeatures` | D31 booleans only |

---

## Frontend screens vs operable APIs

Every WP7/WP8 user-operable route has a pane or slot: Scheduler, Automation (includes bot-config), MediaFiles, Profile, StickerTool, ComposerExtras (poll/list/sticker), MessageActions, ChatHeaderActions, DirectoryActions, WebhookDeliveries, Broadcast note. Frozen files only gained registration lines (`FRONTEND_CHANGES.md`).
