# WA-AKG → OpenWA port (Phase 0)

Discovery docs plus WP baselines.

| Document                                     | Contents                                                          |
| --- | --- |
| [OPENWA_MAP.md](./OPENWA_MAP.md)             | How OpenWA works today                                            |
| [WA_AKG_MAP.md](./WA_AKG_MAP.md)             | How WA-AKG implements messaging (source paths kept as history)    |
| [GAP_ANALYSIS.md](./GAP_ANALYSIS.md)         | Feature-by-feature gap table                                      |
| [PORT_PLAN.md](./PORT_PLAN.md)               | Work packages, acceptance criteria, locked Q1–Q8                  |
| [DECISIONS.md](./DECISIONS.md)               | Assumptions, skips, plugin spike, scheduler semantics             |
| [FRONTEND_MAP.md](./FRONTEND_MAP.md)         | `./frontend/` stack, pages, API calls                             |
| [FRONTEND_API_GAP.md](./FRONTEND_API_GAP.md) | Frontend calls vs OpenWA routes                                   |
| [FRONTEND_CHANGES.md](./FRONTEND_CHANGES.md) | Log of existing frontend files touched                            |
| [ATTRIBUTION.md](./ATTRIBUTION.md)           | MIT snippets adapted from WA-AKG (none)                           |
| [BASELINE.md](./BASELINE.md)                 | WP1 quality-gate numbers (known Windows fails)                    |
| [MANUAL_TESTS.md](./MANUAL_TESTS.md)         | Manual checklist including UI                                     |
| [VERIFICATION.md](./VERIFICATION.md)         | Phase A source checklist, statuses, gates, PASS/FAIL              |

The working formula:

```
EXISTING OPENWA + MISSING WA-AKG CAPABILITIES = UPGRADED OPENWA
```

Not a rewrite of OpenWA as WA-AKG.

## Reference source

Checklist taken from [WA-AKG](https://github.com/mrifqidaffaaditya/WA-AKG) **1.6.4** (MIT). Paths like `_reference/WA-AKG/src/app/api/...` in these docs are historical; the tree is not kept in this repo.

Re-clone:

```
git clone --depth 1 --branch v1.6.4 https://github.com/mrifqidaffaaditya/WA-AKG.git
```

If that tag is missing, clone `https://github.com/mrifqidaffaaditya/WA-AKG.git` and check `package.json` `"version": "1.6.4"`.
