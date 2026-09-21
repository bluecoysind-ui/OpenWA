# WP1 baseline

Recorded on `feat/wa-akg-port` at commit `c1c0e957` (Phase 0 docs only) plus the WP1 env-flag work, host **Windows 10**, Node from repo engines (`>=22.19`). Dashboard sources were not modified.

These names are the **known-fail floor**. A later WP must not add failures on Linux CI beyond this set without a documented reason. Compare by **test name**, not suite count.

`extractTopLevelService` in `feature-flags.spec.ts` now normalises `\r\n` → `\n` before hunting service blocks. That test (added/edited in WP1) **passes** on this CRLF checkout. Pre-existing tests were not modified.

---

## Backend (`D:/OpenWA`)

| Command            | Result                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit` | **pass**                                                                                             |
| `npm test` (Jest)  | **13 suites failed / 364 passed / 6 skipped**; **48 tests failed / 6466 passed / 31 skipped** (~38s) |

`feature-flags.spec.ts` is **not** in the fail set (compose-extract CRLF normalised).

### Failing test names (exact set, 48)

Windows FS/chmod/symlink/`patch`/`SIGKILL` noise — not introduced by this port:

- `ensurePrivateDir › creates a fresh nested directory with owner-only permissions (0o700)`
- `ensurePrivateDir › tightens a pre-existing world-readable directory back to 0o700`
- `isStorageRootWritable › reports an EXISTING but unwritable root as not writable (the #1065 case existsSync misses)`
- `tightenSqliteFilePermissions › tightens an existing database file and its WAL/journal sidecars to owner-only`
- `SqlitePermissionsBoot › tightens both bundled files when the data connection is SQLite`
- `SqlitePermissionsBoot › skips the data file when the data connection is Postgres (no local file to tighten)`
- `SessionAuthDirMigration › renames a symlinked legacy directory, leaving its target where it is`
- `InfraStorageController.importStorage filePath validation › guards and opens the same cwd-resolved path returned by storage export`
- `InfraStorageController storage stream failures surface as request errors, not process crashes › importStorage maps an archive/stream failure to a 400 with the real reason`
- `InfraStorageController audit trail (light-dependency handlers) › importStorage emits INFRA_STORAGE_IMPORTED with the imported file count`
- `engine auth directory paths › readAuthDirEntries › lists directories and symlinked directories, not plain files`
- `StatusStoreService.sweepOrphanedMedia › reaps an orphan only after the grace window; never touches referenced or non-status files`
- `StatusStoreService.sweepOrphanedMedia › honors a configured status.orphanGraceMs override`
- `StatusStoreService.sweepOrphanedMedia › enumerates past the listFiles() cap so orphans beyond it are still reaped`
- `EngineFactory › create() makes the session credential directories owner-only › hardens both engine shapes on a false install`
- `EngineFactory › create() makes the session credential directories owner-only › hardens both engine shapes on a true install`
- `PluginsService — getConfigUiHtml (sandboxed config editor) › rejects a configUi entry that is a symlink escaping the plugin directory`
- `PluginsService — recovering a plugin whose code went missing › refuses a plugin path that is a symlink escaping the plugins directory`
- `StorageService local traversal (async + bounded) › lists files across nested subdirectories (async traversal)`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › self-removes (no-ops) once the installed dep normalizes ids itself`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › refuses to stand down when only the last-applied file is missing`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › refuses to stand down on a half-patched tree`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › fails with a curated version-skew error when Message.js is missing`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › applies the backport across every id-normalization site`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › leaves no patch artifacts in the image`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › normalizes a $1-only id while leaving a healthy id untouched`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › aborts loudly on unexpected version skew`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › --best-effort › still fails when the tree was already written`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › --best-effort › still fails on a tree an earlier run left half-patched`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › --best-effort › falls back to \`git apply\` when only \`patch\` is missing`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › --best-effort › degrades when neither \`patch\` nor git is installed, leaving the tree pristine`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › a Windows checkout of the patch file › applies even when the patch file was checked out with CRLF line endings`
- `patch-wwebjs-201832 (build-time backport of upstream #201832) › a Windows checkout of the patch file › degrades on an unparseable patch instead of failing the install`
- `WhatsAppWebJsAdapter orphaned Chromium sweep (pre-launch) › SIGKILLs a Chromium process carrying this session marker and logs the sweep`
- `WhatsAppWebJsAdapter orphaned Chromium sweep (pre-launch) › kills the orphan when the marker is the LAST token on the command line`
- `WhatsAppWebJsAdapter orphaned Chromium sweep (pre-launch) › runs the orphan sweep before the Singleton cleanup and client.initialize()`
- `ChatMediaArchiveService › archive › does not re-archive a row that already points at a file`
- `ChatMediaArchiveService › purgeExpired batching (backlog safety) › drains a backlog spanning many batches, and never exceeds the batch size in one statement`
- `ChatMediaArchiveService › purgeExpired batching (backlog safety) › stops instead of spinning when every delete in a batch fails`
- `ChatMediaArchiveService › sweepOrphanedMedia › deletes an unreferenced file only after the grace window has passed`
- `ChatMediaArchiveService › sweepOrphanedMedia › never reaps a file a row still references, however long it sits there`
- `ChatMediaArchiveService › sweepOrphanedMedia › reconciles in bounded chunks instead of loading the whole store into memory`
- `ChatMediaArchiveService › sweepOrphanedMedia › keeps referenced files across a chunk boundary`
- `ChatMediaArchiveService › sweepOrphanedMedia › never touches status media — the two sweeps share one bucket`
- `ChatMediaArchiveService › sweep scheduling › schedules both sweeps even while archiving is off`
- `ChatMediaArchiveService › sweep scheduling › still expires an archived file past its TTL while archiving is off`
- `ChatMediaArchiveService › sweep scheduling › still reaps an unreferenced archive file while archiving is off`
- `ChatMediaArchiveService › sweep scheduling › schedules both sweeps once archiving is on, and clears them on destroy`

| Command            | Result                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:e2e` | **pass on this Windows host** — 25 suites passed / 1 skipped; **206 tests passed** / 3 skipped / 3 todo (~60s). Nest sqlite harness; no Docker. WSL: **not installed**. Docker CLI: **not found**. Cannot re-run in WSL or `node:22`; this Windows e2e pass **is** the clean e2e baseline.

---

## Dashboard (`/dashboard`) — read-only check

| Command             | Result               |
| ------------------- | -------------------- |
| `npm run lint`      | **pass**             |
| `npm run typecheck` | **pass**             |
| `npm run test:unit` | **pass** (432 tests) |

`git diff -- dashboard` at WP1: **empty**.

---

## Frontend (`./frontend/`)

| Command             | Result                                                                                                                                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`      | **fail (known)** — 3276 problems (mostly `prettier/prettier` quote/`␍` on existing gateway files; ESLint project-service parse errors on `scripts/*.mjs` and `vite.config.ts`). **Do not auto-fix** (would reformat existing files, forbidden). |
| `npm run typecheck` | **pass**                                                                                                                                                                                                                                        |
| `npm test`          | **pass** (45 tests)                                                                                                                                                                                                                             |
| `npm run build`     | **pass** (Vite + Nitro; PGLite migrate skipped without `DATABASE_URL`)                                                                                                                                                                          |

---

## JID helper (no new DTOs in WP1)

`src/engine/identity/wa-id.ts` already classifies `@c.us`, `@s.whatsapp.net` (folds to user), `@lid`, `@g.us`, hosted dialects. WP2+ DTOs must call `parseWaId` / existing session JID pipes — no second identity module.

---

## WP1 after env stubs (this host)

Targeted Jest (config + compose-parity + docs-env-example + env-precedence): **pass** after CRLF-normalising compose extract. `npx tsc --noEmit` pass. `git diff -- dashboard` empty. No new public routes. No `scheduled_messages` migration.
