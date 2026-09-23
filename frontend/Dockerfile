# OpenWA frontend (WA Gateway UI) — TanStack Start + Vite, served by its Nitro node server.
#
# Mirrors the Railway recipe in railway.json:
#   build : NITRO_PRESET=node-server npm run build   → .output/
#   start : node .output/server/index.mjs             → listens on $PORT (we pin 8080)
#
# Started by the `frontend` service in ../docker-compose.yml. Reaches the API two ways:
#   - browser → API directly at VITE_OPENWA_URL (baked in at BUILD time; the user can still
#     override URL/key in the UI's settings), and
#   - the UI's own server-side proxy routes (/api/whatsapp, /api/dashboard, …) → WA_GATEWAY_URL,
#     a RUNTIME env that compose points at the api container over the internal Docker network.

# ===== Stage 1: build =====
FROM docker.io/node:22-slim AS builder
WORKDIR /app

# Install everything INCLUDING devDependencies — vite/nitro live there (frontend/.npmrc says the
# same for Railway). --include=dev guards against a NODE_ENV=production leaking into the build env.
#
# `npm install`, not `npm ci`: this app's package-lock.json is not kept in sync with package.json
# (npm ci aborts with "Missing: lru-cache@… from lock file"), and Railway builds it with
# `npm install` too (see .npmrc). install resolves the lock in-image instead of refusing.
COPY package*.json .npmrc ./
RUN npm install --include=dev --no-audit --no-fund

COPY . .

# Browser-facing API origin baked into the bundle. Default = the API on the same machine, which is
# right when you open the UI at http://localhost:8080 on the laptop running the stack. Override
# from .env via FRONTEND_OPENWA_URL when the API is reached through a public host (e.g. ngrok).
ARG VITE_OPENWA_URL=http://localhost:2785
ENV VITE_OPENWA_URL=${VITE_OPENWA_URL}
# Never bake an API key into the browser bundle — the user enters it in the UI's settings.
ENV VITE_OPENWA_APIKEY=
ENV NITRO_PRESET=node-server
RUN npm run build

# ===== Stage 2: runtime =====
FROM docker.io/node:22-slim AS production
ENV NODE_ENV=production
WORKDIR /app

# Nitro's node-server output is self-contained (bundled deps) — nothing else from node_modules.
COPY --from=builder /app/.output ./.output

RUN groupadd -r app && useradd -r -g app app
USER app

ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
