import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Hand the local `data/.api-key` to the Vite UI so Connect is skipped in `npm run dev`.
 * Must run before the `/api` proxy, otherwise Nest (or a 401) answers this path.
 */
function openwaUiConnectPlugin(): Plugin {
  return {
    name: "openwa-ui-connect",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathOnly = (req.url ?? "").split("?", 1)[0] ?? "";
        if (pathOnly !== "/api/auth/ui-connect") {
          next();
          return;
        }
        if ((req.method ?? "GET").toUpperCase() !== "GET") {
          res.statusCode = 405;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("Method Not Allowed");
          return;
        }
        const file = join(server.config.root, "..", "data", ".api-key");
        let key = "";
        try {
          key = readFileSync(file, "utf8").trim();
        } catch {
          /* Nest has not written the first-boot key yet */
        }
        if (!key) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ message: "No local OpenWA key yet" }));
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.end(JSON.stringify({ apiKey: key }));
      });
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:2785",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

// Public dev URL :2785 (UI + proxied /api). Nest listens on :2786 during root `npm run dev`.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see AGENTS.md § "First scaffold".
const DEV_UI_PORT = 2785;
const DEV_API_PORT = 2786;
const devApiTarget = `http://localhost:${DEV_API_PORT}`;

export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: DEV_UI_PORT,
    strictPort: true,
    proxy: {
      "/socket.io": { target: devApiTarget, ws: true, changeOrigin: true },
      "/api": {
        target: devApiTarget,
        changeOrigin: true,
        bypass(req) {
          const url = req.url ?? "";
          if (
            url.startsWith("/api/whatsapp") ||
            url.startsWith("/api/dashboard") ||
            url.startsWith("/api/websocket") ||
            url.startsWith("/api/auth/ui-connect")
          ) {
            return url;
          }
        },
      },
    },
  },
  // Without this, Vite 6 can 504 `/node_modules/.vite/deps/react.js` while SSR crawls,
  // so the client never hydrates and the UI stays a blank white page.
  optimizeDeps: {
    holdUntilCrawlEnd: false,
    include: ["react", "react-dom", "react-dom/client", "react/jsx-dev-runtime", "react/jsx-runtime"],
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    pgliteBootstrapPlugin(),
    openwaUiConnectPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart({
      // SPA + prerendered shell so Nest can serve the UI as static files
      // from frontend/dist on the API port (no second Node process).
      spa: {
        enabled: true,
        prerender: { enabled: true, outputPath: "/index.html", crawlLinks: false },
      },
    }),
    ...(command === "build" || isPreview
      ? [
          nitro({
            // Default "vercel" (the backend-embedded build copies .vercel/output/static).
            // Set NITRO_PRESET=node-server to build a standalone Node server for
            // Railway/Render/Fly (.output/server/index.mjs, run with `node`).
            preset: process.env.NITRO_PRESET || "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
