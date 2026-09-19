# Frontend ↔ OpenWA API gap

Inventory of **calls the frontend already makes** vs routes OpenWA actually exposes. **Do not change existing frontend call shapes** to “fix” a gap. New WP7 screens add **new** client functions next to `openwa-api.ts` exports.

No mismatch in this file needs a product decision before WP1. Optional notes are recorded, not asked.

Base: frontend `GET/POST {openwa_url}/api/...` with `X-API-Key`. OpenWA global prefix is `/api`. Match unless noted.

---

## Calls that already match

| Frontend function | Method + path | OpenWA | Notes |
| --- | --- | --- | --- |
| `validateApiKey` | `POST /auth/validate` | yes | |
| `listSessions` / `getSessionStatus` | `GET /sessions`, `GET /sessions/:id` | yes | UI maps `ready` → `connected` locally |
| create / start / stop / delete / logout | matching session routes | yes | |
| QR / pairing-code | matching | yes | |
| proxy GET/PUT, config GET/PUT, force-kill | matching | yes | |
| `getSessionStats` | `GET /sessions/stats/overview` | yes | |
| `sendText` | `POST .../messages/send-text` | yes | |
| `sendImage/Video/Audio/Document` | `POST .../send-{type}` | yes | JSON `{ media, mimetype, filename, caption }` base64 |
| `sendLocation` / `sendContact` / `sendSticker` / `sendPoll` | matching `send-*` | yes | Sticker pack/author **not sent** (WP2 additive DTO, then WP7 fields) |
| `sendForward` | `POST .../messages/forward` | yes | Single `toChatId` only (WP2 `toChatIds[]` additive) |
| `sendBulk` / batch GET / cancel | matching | yes | |
| `listMessages` | `GET .../messages?chatId&limit&before` | yes | |
| `getChatHistory` | `GET .../messages/:chatId/history` | yes | |
| `getMessageMedia` | `GET .../messages/:chatId/:messageId/media` | yes | |
| `listChats` | `GET .../chats` | yes | |
| `markChatsRead` | `POST .../chats/read` | yes | |
| `listContacts` / `getContact` | matching | yes | |
| `checkNumber` | `GET .../contacts/check/:number` | yes | Single only; bulk is WP3 + WP7 |
| `getProfilePicture` / `getProfilePictures` | matching | yes | |
| `listGroups` / `getGroup` / participants POST | matching | yes | |
| `listWebhooks` | `GET /webhooks` | yes (`WebhooksListController`) | |
| session webhook CRUD + test | matching | yes | |
| templates CRUD | matching | yes | |
| API keys CRUD / revoke | `/auth/api-keys` | yes | |
| `listAuditLogs` | `GET /audit` | yes | |
| infra status/config/restart/engines/export/import | matching | yes | |
| `getHealth` / `getReady` | `/health`, `/health/ready` | yes | |
| `getOverviewStats` / `getMessageStats` | `/stats/*` | yes | |
| `searchMessages` | `GET /search?q=...` | yes (`SearchController`) | 501 if search provider off — already possible |
| plugins + catalog + install URL + zip FormData | matching | yes | |
| integration plugin instances | `/integration/plugins/...` | yes | |

Media upload: **base64 JSON**, not multipart. OpenWA `BODY_SIZE_LIMIT` default 25mb; frontend client cap ~18 MiB. **Skip WA-AKG multipart** unless a future file exceeds that (then stop and ask). Verified: frontend never sends `multipart/form-data` except plugin zip install.

---

## Frontend listens; OpenWA may not emit

Socket `DEFAULT_EVENTS` includes `message.upsert`, `chat.upsert`, `contact.upsert`. OpenWA’s documented webhook/socket catalog uses `message.received` / `message.sent` / `message.ack` / `chat`/`contact` variants that already fan out in `openwa-socket.ts`. Extra upsert names are **harmless no-ops**. Do not rename frontend listeners.

---

## OpenWA routes the frontend does not call (yet)

These are **not mismatches**. WP7 may add **new** client wrappers. Existing functions stay.

| Area | OpenWA (exists) | Frontend today |
| --- | --- | --- |
| Message actions | react, delete, edit, star, reply, vote-poll, pin | unused |
| Chat actions | archive, mute, pin, unread, typing, presence | unused |
| Contacts | block/unblock; POST bulk check **missing** (WP3) | unused / missing |
| Groups | subject, description, picture, invite, leave, settings, ephemeral | mostly unused |
| Labels | CRUD, chat labels, chats-by-label | unused |
| Profile | PUT name/status/picture; **GET profile missing** (WP3) | unused |
| Automation | `/sessions/:id/automation-rules` | unused |
| Media convert | voice/video convert; sticker convert **missing** (WP5) | unused |
| Status/stories | OpenWA status send | unused (keep OpenWA; do not port WA-AKG stories) |
| Webhook deliveries | delivery-failures only; per-attempt log **missing** (WP6) | unused |

---

## Backend missing for planned WP7 screens

| WP7 screen | Needed OpenWA | Status | Frontend proposal (additive) |
| --- | --- | --- | --- |
| Poll / contact / location / sticker from composer | existing `send-*` | exists | New composer controls calling **existing** client fns; sticker pack/author after WP2 |
| Multi-forward | `toChatIds[]` | WP2 | New optional field on `sendForward`; keep current single-id callers |
| Text list | `send-text-list` | WP2 last | New fn; no native list |
| Message actions | existing react/delete/edit/star/reply | exists | New `openwa-api` exports + chat menu |
| Bulk progress | existing batch GET | exists | Enhance Broadcast; pacing copy |
| Scheduler | scheduled-messages CRUD | WP4 | New module + client |
| Auto-reply editor | automation-rules (+ extra columns WP4) | partial | New settings panel |
| Bot settings | bot-config GET/PUT | WP4 | New settings panel |
| Sticker tool | convert/sticker + remove.bg | WP5 | New tools panel |
| Chat actions | existing archive/mute/pin/presence | exists | New chat menu |
| Contacts bulk check | `POST .../contacts/check` | WP3 | New fn; keep GET single |
| Groups / labels / profile | mostly exists; GET profile WP3 | partial | New panes |
| Webhook delivery history | `GET .../webhooks/:id/deliveries` | WP6 | New list on WebhooksPanel |

---

## Documented non-issues (no decision)

1. **Vite `/api` proxy vs absolute URL.** Gateway uses absolute `:2785/api`. Changing to relative `/api` would hit the proxy (and Better Auth bypass exceptions). Leave as-is.
2. **`GET /search` vs chat-scoped search.** Frontend already uses the global search module. WP2 “additive `q` on GET messages” is backend-only; do not retarget `searchMessages`.
3. **Plugin install FormData** vs JSON media sends — different endpoints; both valid.
4. **Viewer role** is stored as `user` string; mutating buttons should check it. Not an API mismatch.

---

## Stop-and-ask triggers (none open)

Ask before WP7 only if a new screen would need to **change** an existing `openwa-api.ts` signature or an existing call site’s path/body. Additive exports and unused optional DTO fields are fine.
