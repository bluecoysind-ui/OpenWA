# OpenWA — Setup & Operations Guide (Windows + Docker)

A practical, copy-paste guide to install, run, and troubleshoot the **OpenWA** WhatsApp
gateway on a Windows laptop using Docker Desktop. Written for someone driving the project
for the first time.

> **What this project is:** OpenWA is a self-hosted WhatsApp HTTP API gateway (NestJS +
> Baileys / whatsapp-web.js engines). In our stack it backs the **WhatsApp login-reward
> flow** — the blue_coys app talks to this gateway to create WhatsApp login sessions.

- **Project folder:** `C:\PROJECTS\blue_coys\OpenWA`
- **Default URL once running:** http://localhost:2785

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [First-time setup](#2-first-time-setup)
3. [Ports used by the project](#3-ports-used-by-the-project)
4. [Starting & stopping](#4-starting--stopping-the-project)
5. [Using it (dashboard + API)](#5-using-it-dashboard--api)
6. ["A port is already in use" — how to fix](#6-a-port-is-already-in-use--how-to-fix)
7. [Docker won't start / "Virtualization not detected"](#7-docker-wont-start--virtualization-not-detected)
8. [Common errors & fixes](#8-common-errors--fixes)
9. [VPS / host sizing](#9-vps--host-sizing-when-you-deploy-for-real)
10. [Quick command cheat-sheet](#10-quick-command-cheat-sheet)
11. [Bluecoys integration — endpoints & ngrok wiring](#11-bluecoys-integration--endpoints--ngrok-wiring)

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| **Docker Desktop** | v4.9x+ with the **WSL 2** engine (Settings → General → "Use the WSL 2 based engine"). |
| **Hardware virtualization** | Must be **enabled in BIOS** (AMD `SVM Mode` / Intel `VT-x`). See [section 7](#7-docker-wont-start--virtualization-not-detected). |
| **WSL 2 + Virtual Machine Platform** | Windows features. Install with `wsl --install` (admin PowerShell), then **reboot**. |
| **RAM** | 4 GB free is comfortable on the Baileys engine; 2 GB minimum. |
| Node.js 22+ | Only needed if you run **bare-metal** instead of Docker. Not required for Docker. |

You do **not** need to install Node, Postgres, or Redis to run via Docker — the image
bundles everything and defaults to embedded SQLite + local file storage.

---

## 2. First-time setup

### 2.1 Create the `.env` file
Compose reads **`OpenWA\.env`**. Create it from the template:

```powershell
cd C:\PROJECTS\blue_coys\OpenWA
Copy-Item .env.example .env
```

> ⚠️ **Windows gotcha:** if you create it in Notepad, make sure it's saved as `.env`
> and **not** `.env.txt`. In the Save dialog set "Save as type" → *All Files*.

### 2.2 Set the required settings in `.env`
Because we run in **production mode**, the app refuses to boot with empty/placeholder
secrets. Set these four:

```dotenv
NODE_ENV=production
ENGINE_TYPE=baileys                 # lightweight, no Chromium; supports phone-number (pairing) login
API_MASTER_KEY=<64-hex-secret>      # your admin API key — must be >= 32 chars, not a placeholder
API_KEY_PEPPER=<64-hex-secret>      # server-side hashing secret
```

We run with the **built-in PostgreSQL + Redis** (to handle real traffic), so also set:

```dotenv
DATABASE_TYPE=postgres
DATABASE_HOST=postgres              # the compose service name — do not change
DATABASE_PORT=5432
DATABASE_NAME=openwa
DATABASE_USERNAME=openwa
DATABASE_PASSWORD=<strong-random>    # required: the postgres image refuses an empty password
REDIS_ENABLED=true
CACHE_ENABLED=true
REDIS_HOST=redis                    # the compose service name — do not change
REDIS_PORT=6379
```

Generate `DATABASE_PASSWORD` the same way as the secrets below. Storage stays local (no MinIO).

### 2.3 Generate the two secrets
Run this (Node is bundled with Docker Desktop's tooling, or use any machine with Node):

```bash
node -e "const c=require('crypto'); console.log('API_KEY_PEPPER='+c.randomBytes(32).toString('hex')); console.log('API_MASTER_KEY='+c.randomBytes(32).toString('hex'));"
```

**PowerShell alternative (no Node):**
```powershell
foreach ($k in 'API_KEY_PEPPER','API_MASTER_KEY') {
  $b = New-Object 'System.Byte[]' 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  "$k=" + (($b | ForEach-Object { $_.ToString('x2') }) -join '')
}
```

Paste the two lines into `.env`.

> 🔒 **Rules for the secrets:**
> - `API_MASTER_KEY` is your admin credential — send it as the `X-Api-Key` header to call the API. Treat it like a root password.
> - **Never change `API_KEY_PEPPER` after first boot** — rotating it invalidates every API key already issued.
> - `.env` holds secrets. It is git-ignored — never commit it.

---

## 3. Ports used by the project

| Port | Service | When it's published to the host |
|---|---|---|
| **2785** | OpenWA API + dashboard | **Always** (this is the one that matters) |
| 9000 / 9001 | MinIO S3 API / console | Only with `--profile minio` or `--profile full` |
| 5432 | PostgreSQL | **Not** exposed to host (internal Docker network only) |
| 6379 | Redis | **Not** exposed to host (internal Docker network only) |

So for a normal run, **only port 2785 must be free.**

### Check if the ports are free (PowerShell)
```powershell
2785, 9000, 9001 | ForEach-Object {
  $c = Get-NetTCPConnection -State Listen -LocalPort $_ -ErrorAction SilentlyContinue
  if ($c) {
    $procs = ($c.OwningProcess | Sort-Object -Unique | ForEach-Object {
      (Get-Process -Id $_ -ErrorAction SilentlyContinue).ProcessName
    }) -join ', '
    Write-Host ("Port {0,-5} : IN USE  (PID {1} - {2})" -f $_, (($c.OwningProcess | Sort-Object -Unique) -join ','), $procs) -ForegroundColor Red
  } else {
    Write-Host ("Port {0,-5} : FREE" -f $_) -ForegroundColor Green
  }
}
```
If OpenWA is already running, 2785 showing IN USE by a Docker process is expected.

---

## 4. Starting & stopping the project

Run everything from the project folder:
```powershell
cd C:\PROJECTS\blue_coys\OpenWA
```

### Start (production stack — Postgres + Redis, needs the settings from step 2)
```powershell
docker compose --profile postgres --profile redis up -d --build
```
This brings up **four** containers: `docker-proxy`, `api`, `postgres`, `redis`. Postgres and Redis
only start when their profile is named — a plain `docker compose up` would start the API on SQLite
with Redis off and it would then fail to reach the `postgres` host it is configured for.
**Always include both `--profile` flags** for this stack (including `down`, `restart`, `logs`).

> The webhook **queue** (BullMQ on Redis) is switched on from the dashboard, not `.env`:
> **Dashboard → Infrastructure → Redis & Queue → enable Queue.** Cache + WebSocket fan-out are
> already on via `REDIS_ENABLED` / `CACHE_ENABLED`.

### Start (dev stack — zero-config, SQLite, no secrets needed)
Use this if you just want it running fast without setting secrets:
```powershell
docker compose -f docker-compose.dev.yml up -d --build
```

> ⏳ The **first `--build` is heavy** (~2 GB image; it downloads Chrome + ffmpeg even on
> Baileys) and can take several minutes. Later starts are near-instant.

### Watch the logs (session QR / boot messages appear here)
```powershell
docker compose logs -f openwa-api
```

### Other profile combinations
```powershell
docker compose up -d --build                        # API only: SQLite, Redis off (needs DATABASE_TYPE unset)
docker compose --profile full up -d --build         # + PostgreSQL, Redis AND MinIO (S3 storage)
```

### Stop
```powershell
docker compose --profile postgres --profile redis down      # stop & remove containers, KEEP data
docker compose --profile postgres --profile redis down -v   # ALSO wipe volumes (DB, Redis, sessions — fresh start)
```

### Restart / rebuild after changes
```powershell
docker compose restart              # quick restart
docker compose up -d --build        # rebuild image and restart
```

---

## 5. Using it (dashboard + API)

Once the container is healthy:

| What | URL |
|---|---|
| Dashboard (web UI) | http://localhost:2785 |
| REST API base | http://localhost:2785/api |
| Swagger API docs | http://localhost:2785/api/docs |
| Health check | http://localhost:2785/api/health/ready |

**Authentication:** every API call needs your admin key as a header:
```
X-Api-Key: <your API_MASTER_KEY>
```

**Logging in a WhatsApp account:**
- **QR login:** create a session in the dashboard and scan the QR with WhatsApp →
  *Linked Devices* → *Link a Device*.
- **Phone-number (pairing-code) login:** supported by the Baileys engine — the account
  enters an 8-character code instead of scanning. (This is why we set `ENGINE_TYPE=baileys`.)

---

## 6. "A port is already in use" — how to fix

Symptom when starting: an error like
`Bind for 127.0.0.1:2785 failed: port is already allocated` or `address already in use`.

### Step 1 — Find what's holding the port
PowerShell:
```powershell
Get-NetTCPConnection -State Listen -LocalPort 2785 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <PID-from-above>
```
Or with classic tools:
```powershell
netstat -ano | findstr :2785
tasklist /FI "PID eq <PID>"
```

### Step 2 — Free the port (pick the case that applies)

**Case A — it's an old OpenWA / Docker container (most common).**
```powershell
cd C:\PROJECTS\blue_coys\OpenWA
docker compose down          # stops this project's containers
docker ps                    # list anything still running
docker stop <container-id>   # stop a stray one if needed
```

**Case B — it's another app on your machine (not Docker).**
Close that app, or stop the process (be sure you know what it is first):
```powershell
Stop-Process -Id <PID> -Force
```

**Case C — you can't/don't want to free it → change OpenWA's host port instead.**
The production compose maps `127.0.0.1:${API_PORT:-2785}:2785`, so just set a different
host port in `.env` and restart:
```dotenv
API_PORT=3785
```
```powershell
docker compose up -d
```
OpenWA is now on http://localhost:3785 (the container still listens on 2785 internally).
> Note: this `API_PORT` override works with the **production** compose. The **dev** compose
> hard-codes `2785:2785`, so to move the dev port you'd edit `docker-compose.dev.yml`.

### Step 3 — Verify it's free, then start again
Re-run the port check from [section 3](#check-if-the-ports-are-free-powershell), then
`docker compose up -d`.

---

## 7. Docker won't start / "Virtualization not detected"

Docker Desktop shows **"Virtualization support not detected"** and the engine is stopped.
This is a host/OS setting, not Docker itself.

### Diagnose (30 seconds)
**Task Manager** → **Performance** → **CPU** → look at the **Virtualization** line
(bottom-right):
- **Disabled** → fix in **BIOS** (Path A)
- **Enabled** → fix the **Windows feature** (Path B)

### Path A — enable virtualization in BIOS/UEFI
1. Reboot and tap the BIOS key: **Lenovo** `F2`/`Fn+F2` (or Novo button) · **HP** `Esc`→`F10` · **Dell** `F2` · **ASUS/Acer** `F2`/`Del`.
2. Under **Advanced / CPU Configuration**, enable:
   - **AMD:** `SVM Mode` → Enabled
   - **Intel:** `Intel Virtualization Technology` / `VT-x` → Enabled (also `VT-d` if present)
3. **Save & Exit** (`F10`) and boot into Windows.

### Path B — enable the Windows virtualization features
In **PowerShell (Administrator)**:
```powershell
wsl --install
```
If WSL is already installed, enable the features explicitly:
```powershell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
```
**Then reboot** (required — the features only take effect after a restart).

After reboot, open Docker Desktop → Settings → General → ensure **"Use the WSL 2 based
engine"** is checked, and wait for the green **Engine running**.

### Still failing?
- **Core isolation:** Windows Security → Device security → Core isolation → turn **Memory
  integrity** off, reboot.
- **Another hypervisor** (VirtualBox/VMware/anti-cheat) can block it.
- Update Windows and Docker Desktop.

---

## 8. Common errors & fixes

| Error / symptom | Cause | Fix |
|---|---|---|
| `Refusing to start in production: insecure or default value for API_MASTER_KEY` | Secret missing/too short/placeholder | Set `API_MASTER_KEY` (≥32 chars, random) and `API_KEY_PEPPER` in `.env`; restart. |
| Compose seems to ignore your `.env` | File saved as `.env.txt` or in the wrong folder | It must be exactly `OpenWA\.env`. Recreate it (section 2.1). |
| `port is already allocated` / `address already in use` | Something else on 2785 | [Section 6](#6-a-port-is-already-in-use--how-to-fix). |
| Docker Desktop: "Virtualization support not detected" | BIOS/WSL2 off | [Section 7](#7-docker-wont-start--virtualization-not-detected). |
| First `up --build` takes forever | Image downloads Chrome + ffmpeg (~2 GB) | Normal on first build; subsequent starts are fast. |
| Container keeps restarting / unhealthy | Check the reason in the logs | `docker compose logs -f openwa-api` |
| Changed `API_KEY_PEPPER` and all API keys broke | Pepper rotation invalidates issued keys | Restore the original pepper value, or re-issue keys. |

Handy diagnostics:
```powershell
docker compose ps                     # container status
docker compose logs --tail=100 openwa-api
docker inspect --format='{{.State.Health.Status}}' openwa-api
```

---

## 9. VPS / host sizing (when you deploy for real)

The container's own limits (from the compose files): memory ceiling **2 GB**
(`OPENWA_MEM_LIMIT`), PID limit 2048 (~8–10 whatsapp-web.js sessions). The Helm chart
requests 512 MiB / 0.25 vCPU and limits 2 GiB / 1 vCPU.

| Use case | vCPU | RAM | Disk |
|---|---|---|---|
| Minimum (Baileys, few sessions, SQLite) | 1 | **2 GB** | 20 GB SSD |
| **Recommended (login-reward flow)** | 2 | **4 GB** | 40 GB SSD |
| 8–10 concurrent whatsapp-web.js sessions (raise `OPENWA_MEM_LIMIT` to 4–6g) | 4 | **8 GB** | 60+ GB SSD |

**Engine matters most:** `whatsapp-web.js` runs a full headless **Chromium per session**
(RAM-heavy, OOM-loops if starved). **`baileys`** has no browser (tens of MB per session) —
use it unless you need a wwjs-only feature.

For public/internet exposure, put a TLS reverse proxy (nginx / Caddy / cloud LB) in front —
the API key travels in cleartext over plain HTTP, and port 2785 is bound to `127.0.0.1`
by default.

---

## 10. Quick command cheat-sheet

```powershell
# --- one-time setup ---
cd C:\PROJECTS\blue_coys\OpenWA
Copy-Item .env.example .env            # then set NODE_ENV, ENGINE_TYPE, API_MASTER_KEY, API_KEY_PEPPER

# generate secrets
node -e "const c=require('crypto');console.log('API_KEY_PEPPER='+c.randomBytes(32).toString('hex'));console.log('API_MASTER_KEY='+c.randomBytes(32).toString('hex'));"

# --- run ---
$p = '--profile','postgres','--profile','redis'   # this stack always names both profiles
docker compose @p up -d --build        # start (production: API + Postgres + Redis)
docker compose logs -f openwa-api      # watch API logs
docker compose @p ps                   # status (all four containers)
docker compose @p restart              # restart
docker compose @p down                 # stop (keep data)
docker compose @p down -v              # stop + wipe data

# --- ports ---
Get-NetTCPConnection -State Listen -LocalPort 2785 | Select OwningProcess
netstat -ano | findstr :2785
Stop-Process -Id <PID> -Force          # free a port held by a non-Docker app

# --- URLs ---
# Dashboard : http://localhost:2785
# API       : http://localhost:2785/api
# Swagger   : http://localhost:2785/api/docs
```

---

## 11. Bluecoys integration — endpoints & ngrok wiring

This is what the blue_coys app actually uses OpenWA for. The code lives in
`src/modules/bluecoys/` and is **always on with zero config** — every URL/tunable is a constant in
[`bluecoys.constants.ts`](src/modules/bluecoys/bluecoys.constants.ts) (the one file to edit if the
Bluecoys host ever changes). Both routes are public (no API key); the Bluecoys frontend reaches them
through its own server-side proxy.

### Endpoints OpenWA exposes

| Route | What it does |
|---|---|
| `GET /api/whatsapp/link-qr?username=<InvCode>&phone_number=<digits>` | **QR login.** Creates/resumes the user's session and returns `{ linked, sessionId, qrCodeBase64, qrExpiresAt }`. Poll it (QR rotates ~20s) until `linked: true`. |
| `GET /api/whatsapp/link-code?username=<InvCode>&phone_number=<digits>` | **Phone-number login.** Same, but returns `{ linked, sessionId, pairingCode, codeExpiresAt }` — an 8-char code the user types into WhatsApp (*Linked Devices → Link a Device → Link with phone number instead*). The **same code** comes back on every poll until it expires. Poll until `linked: true`. |

- `username` = the Bluecoys user id (their `InvCode`). `phone_number` = digits only, international
  (e.g. `919608079512`) — it must be the WhatsApp number being linked; linking a *different*
  number is rejected with **409** and not rewarded.
- Swagger shows both under the **whatsapp** tag at http://localhost:2785/api/docs.

### Callbacks OpenWA fires (hardcoded to `https://bluecoys.com`)
| When | Call |
|---|---|
| Account links (QR **or** code) | `POST /api/whatsapp-linked?phone_number=<n>` body `{ phone_number, username }` → Bluecoys credits the reward |
| Terminal unlink (device removed / logout) | `GET /api/whatsapp-disconnected?phone_number=<n>` → Bluecoys reverses the reward |

Transient network drops do **not** trigger the reverse — only a terminal unlink does.

### Wiring blue_coys to this laptop with ngrok (HTTPS)

**One-time ngrok setup**
1. Install: `winget install ngrok.ngrok` (then reopen the terminal), or unzip the download from
   https://ngrok.com/download onto your PATH.
2. Authenticate with the team's authtoken (from the ngrok dashboard → *Your Authtoken*):
   ```powershell
   ngrok config add-authtoken <TOKEN>
   ```
3. Claim the account's **free static domain** so the URL never changes: ngrok dashboard →
   **Domains** → **+ New Domain** → you get something like `your-name-abc123.ngrok-free.app`.

**Every time you run it**
1. Start OpenWA (section 4) and confirm http://localhost:2785/api/health/ready returns 200.
2. Open the tunnel and **leave the window open** (closing it takes the gateway offline):
   ```powershell
   ngrok http --url=your-name-abc123.ngrok-free.app 2785
   ```
   (older ngrok: use `--domain=` instead of `--url=`; without a static domain, plain
   `ngrok http 2785` works but the URL rotates on every restart.)
3. Verify from any device: `https://your-name-abc123.ngrok-free.app/api/health/ready` → 200.
4. In the **deployed** blue_coys environment (bluecoys.com's env vars, not a local file) set:
   ```dotenv
   WHATSAPP_GATEWAY_URL=https://your-name-abc123.ngrok-free.app/api/whatsapp
   ```
   The Next.js proxy `/api/whatsapp-gateway/<path>` forwards to `${WHATSAPP_GATEWAY_URL}/<path>`,
   so the frontend hits `/api/whatsapp-gateway/link-qr?...` / `link-code?...`. The proxy already
   sends `ngrok-skip-browser-warning`, so ngrok's free-tier interstitial page never gets in the way.
5. Smoke-test from anywhere:
   ```bash
   curl "https://your-name-abc123.ngrok-free.app/api/whatsapp/link-code?username=test&phone_number=919999999999"
   ```
   You should get JSON with a `pairingCode` (or `linked: true`).

> Callbacks travel OpenWA → `bluecoys.com`, which is public, so nothing extra is needed for them.

---

*This guide is specific to running OpenWA inside the blue_coys workspace on Windows. For the
full upstream documentation, see `README.md` and the `docs/` folder in this project.*
