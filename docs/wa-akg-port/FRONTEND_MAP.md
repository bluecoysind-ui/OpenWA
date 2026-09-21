# Frontend map (`./frontend/`)

Source of truth for WP7. The OpenWA React app in `/dashboard` is **frozen**: do not add WA-AKG screens there. Additive UI lands in `./frontend/` only, following existing patterns. Touch existing frontend files only for minimal registration (nav, route, API-client export) and log each touch in [FRONTEND_CHANGES.md](./FRONTEND_CHANGES.md). Never hand-edit `frontend/src/routeTree.gen.ts`.

---

## Framework and router

- **App:** TanStack Start + Vite + React 19 (`frontend/package.json` name `app-builder-workspace`).
- **Router:** `@tanstack/react-router` via `frontend/src/router.tsx`. Route tree is **generated** (`frontend/src/routeTree.gen.ts`) from `frontend/src/routes/`. Let the generator update it.
- **File routes:**
  - `/` → `GatewayApp` (`src/routes/index.tsx`)
  - `/dashboard` → same `GatewayApp` (SPA shell when served under that path)
  - `/api/health`, `/api/whatsapp/$`, `/api/dashboard/login`, `/api/websocket/stats` — **frontend-local** Nitro/Start handlers, not OpenWA
- **Root:** `src/routes/__root.tsx` wraps `AuthProvider` (React Query client) + `PreviewHostBridge`.
- **Default error UI:** `src/lib/error-component.tsx`.

Gateway navigation is **not** URL-based. `GatewayApp` switches panes via Zustand `nav` (`chats` | `contacts` | `groups` | `broadcast` | `scrapers` | `tools` | `settings`).

---

## Build scripts

From `frontend/package.json`:

| Script | Command |
| --- | --- |
| `dev` | Vite on `0.0.0.0:8080` (strict port) |
| `build` | Vite build + `db:migrate` (PGLite/app-builder, not OpenWA) |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `test` | `node --test` on `scripts/**/*.test.mjs` plus a few `src/lib/**/*.test.ts` |
| `format` | Prettier |

After every WP that touches `frontend/`, run `lint`, `typecheck`, and `build` from `frontend/`.

---

## Folder layout (gateway-relevant)

```
frontend/
  src/
    routes/                 file routes (do not hand-edit routeTree.gen.ts)
    components/gateway/     GatewayApp, login, chats, broadcast, settings panels
    lib/openwa-api.ts       typed REST client
    lib/openwa-config.ts    URL + API key storage
    lib/openwa-query.ts     React Query hooks
    lib/openwa-socket.ts    socket.io /events
    lib/gateway-client.ts   session/chat/message adapter (ready → connected)
    lib/openwa/useToast.ts  toast helper over Zustand
    store/gateway-store.ts  app state
    styles.css              design tokens
  vite.config.ts            proxy + TanStack Start
```

Radix/shadcn-style packages exist for the app-builder shell. **Gateway UI does not use them.** New screens must copy `components/gateway/settings/ui.tsx` (`field`, `btn`, `ghost`, `danger`, `Card`, `ErrorLine`, `Toggle`) and `glass` / token classes.

---

## UI kit and design tokens

Defined in `frontend/src/styles.css` `@theme`:

`--color-ink`, `--color-muted`, `--color-dim`, `--color-night`, `--color-panel`, `--color-glass`, `--color-line`, `--color-wa` (`#25d366`), `--color-indigo`, `--color-violet`, `--color-danger`, `--color-bubble-in`, `--radius-xl`, `--shadow-glass`. Font: Inter.

Classes in use: `.glass`, `.app-bg`, `.scroll-thin`, `.wa-loadbar`. `cn()` is `clsx` + `tailwind-merge` (`src/lib/cn.ts`).

Do **not** restyle existing screens. Additive panels should look like Settings cards, not like `/dashboard`.

---

## Data-fetching layer

Two parallel styles (keep both; do not migrate one to the other):

1. **React Query** — `src/lib/openwa-query.ts` (`queryKeys.*`, `useSessionsQuery`, chats, contacts, groups, webhooks, templates, plugins, infra, batch status, profile pictures). Used by settings panels.
2. **Zustand gateway-store** — chats list, threads, composer send, bulk jobs, overlays. Talks to `gateway-client.ts` which wraps `openwa-api.ts`.

New WP7 screens: prefer React Query + `openwa-api.ts` like Settings, unless the screen is a chats-pane extension that already lives in the store.

---

## Forms

Gateway forms are local `useState` + submit handlers. `react-hook-form` and `zod` are in `package.json` for the app-builder/auth shell; **settings panels do not use them**. Follow the settings pattern (controlled inputs, `field` class, `ErrorLine`).

---

## Toast and error pattern

- **Toasts:** `useGateway().pushToast("success"|"error"|"info", message)` via `useAppToast()` (`success` / `error` / `warning`). Rendered by `Overlays.tsx` `Toasts`. Auto-dismiss ~3.8s.
- **Inline errors:** `ErrorLine` in settings; login form local `error` string.
- **HTTP:** `OpenWAError` (`status`, `code`, `message`) from `openwa-api.ts`. WP7 screens must treat **501** (engine-unsupported), **403** (viewer / read-only key), and **404** (flag-off route) as first-class UI states — not generic “Request failed”.
- **Sonner** is a dependency; gateway does not use it. Do not introduce a second toast system.

---

## Auth (API key)

OpenWA auth is **not** Better Auth. `AuthProvider` is only a `QueryClientProvider`.

| Piece | Where |
| --- | --- |
| Storage | `localStorage.openwa_url`, `localStorage.openwa_api_key` (+ sessionStorage copy of the key) |
| Env fallback | `VITE_OPENWA_URL`, `VITE_OPENWA_APIKEY` |
| Default origin | `http://localhost:2785` |
| Header | `X-API-Key` (`openWAAuthHeaders`) |
| Validate | `POST {origin}/api/auth/validate` (`validateApiKey`) |
| Role display | response `role` stored as `user` in the store / `sessionStorage.dashboard_user` |
| Gate | `authNeeded` → `OpenWALogin` |

Viewer keys must keep mutating controls disabled. Do not invent a second login.

Better Auth (`/auth/popup`, app-builder identity) is unrelated to the gateway. Do not mix it into OpenWA session screens.

---

## Session selection

Accounts rail in `GatewayApp` (`activeAccountId` / `selectAccount`). Sessions come from `GET /sessions`. Status `ready` is mapped to UI `connected` in `gateway-client.ts`. New screens must use the **already selected** session; do not add a second session picker unless the existing Settings panel pattern needs one (e.g. webhooks already have `webhookSessionId`).

---

## i18n

None. Copy is English strings in components. Keep it that way.

---

## Tests

Existing: Node’s test runner on scripts + a few auth/app-data units. **No gateway component tests yet.** WP7 adds tests with the same `node --test` / `node --experimental-strip-types --test` setup — new files under `frontend/src/.../*.test.ts` (or `.test.mjs` for scripts). Do not add Jest/Vitest.

---

## How the frontend reaches OpenWA

| Path | Behavior |
| --- | --- |
| REST | `getOpenWAApiBase()` = `{openwa_url}/api` → absolute `http://localhost:2785/api/...` |
| CORS | Dev OpenWA allows `*`. Production needs `CORS_ORIGINS` to include the frontend origin. |
| Vite proxy | `/api` → `:2785` **except** `/api/whatsapp`, `/api/dashboard`, `/api/websocket`. Gateway REST **does not use** the proxy; it talks to `:2785` directly. |
| Socket | `socket.io-client` to `{openwa_url}/events` with `auth: { apiKey }` and `X-API-Key`. Vite also proxies `/socket.io` → `:2785` if a same-origin client were used; the gateway client uses the API origin. |
| JSON body | Frontend media sends are **base64 JSON**. Client cap ~**18 MiB** (`MessageTesterPanel`). OpenWA `BODY_SIZE_LIMIT` default **25mb**. Multipart is unused. |

---

## Existing pages and their OpenWA API calls

All paths below are under `/api` on the OpenWA origin.

### Login (`OpenWALogin`)

- `POST /auth/validate`

### Chats (`GatewayApp` + `gateway-store` / `gateway-client`)

- `GET /sessions`, `POST /sessions`, `POST /sessions/:id/start|stop|logout`, `DELETE /sessions/:id`, `GET /sessions/:id/qr`, `POST /sessions/:id/pairing-code`
- `GET /sessions/:id/proxy`, `PUT /sessions/:id/proxy`
- `GET /sessions/:id/chats`
- `GET /sessions/:id/messages?chatId&limit&before`
- `GET /sessions/:id/messages/:chatId/history`
- `GET /sessions/:id/messages/:chatId/:messageId/media`
- `GET /sessions/:id/contacts/:id/profile-picture`
- `GET /sessions/:id/contacts/profile-pictures?ids=`
- `POST /sessions/:id/messages/send-text` (composer)
- `POST /sessions/:id/chats/read` (mark read)
- Socket subscribe: `session.status`, `session.qr`, `message.received`, `message.sent`, `message.ack`, plus unused `message.upsert` / `chat.upsert` / `contact.upsert`

**Not called from chats UI today:** archive, mute, pin, presence/typing, react, delete, edit, star, reply-as-quote (except if tester), labels, profile GET/PUT.

### Contacts / Groups panes (`Directory`)

- `GET /sessions/:id/contacts` or `GET /sessions/:id/groups` (via chats list + contacts)
- Profile pictures as above
- No bulk `contacts/check`, no group mutate UI

### Broadcast (`Broadcast.tsx`)

- `POST /sessions/:id/messages/send-bulk`
- `GET /sessions/:id/messages/batch/:batchId`
- `POST /sessions/:id/messages/batch/:batchId/cancel`

### Tools (`Overlays.tsx` ToolsPanel)

- Raw `runApi` helper (operator-typed method/path) — not a fixed catalog.

### Settings

| Panel | Calls |
| --- | --- |
| Overview | `GET /stats/overview`, `GET /stats/messages`, `GET /sessions/stats/overview`, `GET /health` |
| Sessions | list/start/stop/delete/logout/QR/pairing/proxy/config/`force-kill` |
| Webhooks | `GET /webhooks`, session CRUD + `POST .../test` |
| API keys | `GET/POST/PUT/DELETE /auth/api-keys`, revoke |
| Templates | session templates CRUD |
| Plugins | `/plugins`, catalog, install (JSON URL + **FormData** zip), config, sessions, health, integration instances |
| Infra | `/infra/status`, `/infra/config`, `/infra/restart`, `/infra/engines`, export/import, `/health/ready` |
| Logs | `GET /audit` |
| Message tester | `send-text`, `send-image`, `send-video`, `send-audio`, `send-document`, `send-location`, `send-contact`, `send-sticker`, `send-poll`, `forward` (single `toChatId`), `send-bulk` + batch get/cancel |

### Search overlay

- `GET /search?q=&sessionId=&chatId=...`

---

## WP7 additive surfaces (do not exist yet)

Composer extras (poll, contact, location, sticker pack/author, multi-forward, text list, message actions), bulk progress polish, scheduler, auto-reply editor, bot settings, sticker tool, chat actions, contacts bulk check, groups, labels, profile, webhook delivery history.

Every new screen: 501 / flag-off / viewer-key; pacing/ban-risk copy next to bulk and scheduler.
