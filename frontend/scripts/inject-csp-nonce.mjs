#!/usr/bin/env node
/**
 * Stamp the Nest CSP nonce placeholder onto the prerendered SPA document so
 * configure-app.ts can inject a per-response nonce (same contract as the old dashboard).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PLACEHOLDER = "__OPENWA_CSP_NONCE__";
const META = `<meta name="openwa-csp-nonce" content="${PLACEHOLDER}">`;
const root = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(root, "..", ".vercel", "output", "static", "index.html"),
  join(root, "..", ".output", "public", "index.html"),
  join(root, "..", "dist", "index.html"),
];

const target = candidates.find((p) => existsSync(p));
if (!target) {
  console.error("inject-csp-nonce: no prerendered index.html found");
  process.exit(1);
}

let html = readFileSync(target, "utf8");
if (!html.includes('name="openwa-csp-nonce"') && !html.includes("name='openwa-csp-nonce'")) {
  html = html.replace(/<head([^>]*)>/i, `<head$1>${META}`);
}
html = html.replace(/<script(?![^>]*\bnonce=)/gi, `<script nonce="${PLACEHOLDER}"`);
writeFileSync(target, html);
console.log(`inject-csp-nonce: patched ${target}`);
