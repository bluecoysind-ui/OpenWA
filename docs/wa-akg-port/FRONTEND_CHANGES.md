# Frontend registration log

Every existing `frontend/` file touched for WA-AKG UI (nav entry, route registration, API-client export) is listed here. New files do not need a row.

Do not restyle, rename, move, delete, or reformat existing files. Do not hand-edit `routeTree.gen.ts` (generator only).

| WP | File | Why (minimal registration only) |
| --- | --- | --- |
| 7 | `frontend/src/lib/openwa-api.ts` | re-export `./openwa/akg-api` |
| 7 | `frontend/src/store/gateway-store.ts` | SettingsPanel union: scheduler, automation, media-files, profile |
| 7 | `frontend/src/components/gateway/Settings.tsx` | nav entries + panel mounts |
| 7 | `frontend/src/components/gateway/GatewayApp.tsx` | ComposerExtras, MessageActions, ChatHeaderActions, DirectoryActions slots; ChatHeaderActions owns the header overflow (replaces inert IconDots) |
| 7 | `frontend/src/components/gateway/Overlays.tsx` | StickerTool in Tools pane |
| 7 | `frontend/src/components/gateway/Broadcast.tsx` | AkgBulkNote (pacing / ban-risk) |
| 7 | `frontend/src/components/gateway/settings/WebhooksPanel.tsx` | extra event names + WebhookDeliveries |
| 7 | `frontend/package.json` | register akg unit tests in `test` script |
