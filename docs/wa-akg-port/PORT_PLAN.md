# Port plan

Phase 0 docs are approved. Formula: existing OpenWA + missing capabilities. Prefer new modules when that avoids touching working controllers. When a file must change, smallest additive patch.

**UI is `./frontend/`.** `/dashboard` is frozen: `git diff -- dashboard` must be empty after every WP. Existing frontend stays as-is except minimal registration logged in [FRONTEND_CHANGES.md](./FRONTEND_CHANGES.md). Never hand-edit `frontend/src/routeTree.gen.ts`. After each WP that can affect UI, run `frontend` `lint` / `typecheck` / `build`.

New entities/migrations go on the **`data` connection**, SQLite **and** Postgres, created in the WP that first reads the table.

---

## Baseline (quality gate)

**WP1 starts by recording** `BASELINE.md` in this folder:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:e2e
cd dashboard && npm run lint && npm run typecheck && npm run test:unit
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

Dashboard commands are **read-only checks**. Do not change dashboard sources.

After each WP: same commands plus `npm run openapi:export` when DTOs/routes changed. Confirm `git diff -- dashboard` is empty.

---

## WP1 — Foundations

**Goal:** flags, JID helper reuse, plugin spike recorded, no user-visible behavior except documented env defaults. **No `scheduled_messages` migration** (WP4).

- Record `BASELINE.md` first.
- Env stubs (wired in `configuration.ts` + `.env.example` + compose forwards so they are reachable): `MEDIA_PERSIST` off, `REMOVE_BG_API_KEY` empty, `BOT_COMMANDS` off, `AUTO_REPLY_REGEX` off, `SCHEDULED_MESSAGES` **on** (inert). Scheduler caps + regex pattern cap. `LIST_MESSAGES` documented unused, not wired.
- Confirm new DTOs will parse via `src/engine/identity/wa-id.ts` (no second identity module). No new DTOs in WP1.
- `MANUAL_TESTS.md` skeleton including a **UI** section for WP7.
- Plugin spike result in [DECISIONS.md](./DECISIONS.md) D4.

**Acceptance:** lint/typecheck/tests green vs baseline (or documented known-fail); no new public routes; `git diff -- dashboard` empty.

---

## WP2 — Message primitives (gaps only)

- Additive `selectableCount` on `SendPollDto` (compatible with `allowMultipleAnswers`).
- Additive `packName` / `author` on send-sticker.
- Additive `toChatIds[]` on forward (cap, pacing, audit if N>1). Keep `toChatId`.
- **Last:** `POST .../messages/send-text-list` (formatted text). **No native list.**
- Additive `q` on GET messages if cheap (skip if it needs a new FTS project). Frontend `GET /search` stays.
- Tests: DTO validation, mocked engine, 401/403/session-scope, 501 where relevant.
- Swagger + `docs/06-api-specification.md` + support matrix rows.

**Acceptance:** existing send-* contracts unchanged; new fields optional.

---

## WP3 — Chat, contacts, groups, labels, profile gap-fill

- `GET /sessions/:id/profile`.
- `POST /sessions/:id/contacts/check` bulk (max 50, paced). Keep GET single.
- Optional `durationSec` on mute DTO mapped to `muteUntil`.
- Groups/labels: documentation + 501 matrix only unless a real missing method is found.

**Acceptance:** existing mute/check routes still work; bulk check refuses >50.

---

## WP4 — Automation (scheduler, broadcast, auto-reply, bot)

Highest product value; highest risk.

1. **Scheduler module** (`src/modules/scheduler/`): CRUD, `sendAt`, text or media URL (SSRF allowlist), **IANA timezone per row**, status PENDING/SENDING/SENT/FAILED/CANCELLED/UNKNOWN. **At-most-once claim** (D6b). Webhook on send/fail, audit. One-shot only (recurrence WP4b).
2. **Broadcast:** extend `BulkMessageService` only — Q3 leave crash-resume as-is. Safer default delay (configurable, hard min). Pause only if it does not break cancel.
3. **Auto-reply:** columns on `automation_rules`; EXACT/CONTAINS/STARTS_WITH first; regex behind flag; evaluateInbound stays the single matcher; **access lists then rule conditions**.
4. **Bot config** table + `GET/PUT .../bot-config` including autoRead / alwaysOnline / welcome / command enable (D19).
5. **Commands:** core module, `BOT_COMMANDS=false` + per-session enabled (D4).

**Acceptance:** tests for claim (no double send), crash FAILED/UNKNOWN never resend, pacing backoff, cancel, fromMe skip, whitelist/blacklist precedence, bulk cancel still works. Migrations sqlite+pg.

---

## WP4b — Scheduler recurrence (later)

`cronExpression` / rrule. Not in WP4.

---

## WP5 — Sticker convert + remove.bg

- `POST .../media/convert/sticker`.
- Wire pack/author from WP2.
- `REMOVE_BG_API_KEY` empty → 400/503 with clear message, never throw 500.

---

## WP6 — Webhooks + optional media persist

- Additive quoted fields; LID alt ids.
- `GET .../webhooks/:id/deliveries` (Q6 fields only; 30 days or last 500).
- Optional `message.poll_vote` / `contact.update` if not redundant — behind flag.
- `MEDIA_PERSIST=false`; list/delete only when on; session-scoped serve path.

**Acceptance:** existing webhook payload fields remain; HMAC/retry/filters untouched.

---

## WP7 — Additive `./frontend/` screens

Follow [FRONTEND_MAP.md](./FRONTEND_MAP.md). Log every existing-file touch in [FRONTEND_CHANGES.md](./FRONTEND_CHANGES.md).

Screens:

- Composer additions: poll, contact, location, sticker pack/author, multi-forward, text list, message actions
- Bulk/broadcast progress
- Scheduler
- Auto-reply editor
- Bot settings
- Sticker tool
- Chat actions
- Contacts (bulk check)
- Groups, labels, profile
- Webhook delivery history

Every screen: **501** engine-unsupported, **disabled feature flags**, **read-only/viewer keys**. Pacing/ban-risk copy near bulk and scheduler.

Add frontend tests with the existing `node --test` setup. Add a UI section to `MANUAL_TESTS.md`. Run frontend lint/typecheck/build.

**Do not** add these pages to `/dashboard`.

---

## WP8 — Integrations and docs

- `openapi.json` snapshot, SDK shape check, MCP tools (read default; writes if `MCP_READONLY=false`): scheduled-messages list, automation extras.
- `.env.example`, `CHANGELOG.md` `[Unreleased]`, feature × engine matrix (`docs/29` or `docs/wa-akg-port/SUPPORT_MATRIX.md`).
- MCP: no spam tool, no bomb.

---

## Suggested commit style

`feat(message): add optional pack metadata on send-sticker`  
`feat(scheduler): add delayed message jobs`  
`feat(automation): add media replies to rules`  
`docs(wa-akg-port): ...`

One feature per commit. No drive-by refactors.

---

## Questions (locked)

| ID | Locked answer |
| --- | --- |
| **Q1** | Text-list helper only, last in WP2. No native list. |
| **Q2** | One-shot in WP4; IANA tz per row; recurrence WP4b. |
| **Q3** | Leave bulk crash-resume as-is. |
| **Q4** | Core module (plugin spike failed). `BOT_COMMANDS` + per-session. |
| **Q5** | No universal `/send`. |
| **Q6** | Delivery log: status, http code, duration, attempt, error snippet. 30 days or last 500. No bodies. |
| **Q7** | No rc.9 patch. |
| **Q8** | UI = `./frontend/`. Dashboard frozen. |

Ambiguous or anti-abuse conflicts will stop the WP and ask rather than guess.
