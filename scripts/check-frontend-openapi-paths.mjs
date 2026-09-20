#!/usr/bin/env node
/**
 * Assert every OpenWA HTTP call in the Gateway client files exists in openapi.json
 * with the same method. Scans frontend/src/lib/openwa-api.ts and
 * frontend/src/lib/openwa/akg-api.ts (the two clients the Gateway uses).
 *
 * Run: npm run check:frontend-openapi
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const openapi = JSON.parse(readFileSync(join(root, 'openapi.json'), 'utf8'));
const openapiPaths = openapi.paths ?? {};

const normalize = (path) =>
  path
    .split('?')[0]
    .replace(/\$\{[^}]*\}/g, '{param}')
    .replace(/\{[^}]*\}/g, '{param}')
    .replace(/\/+$/, '') || '/';

const openapiIndex = new Set();
for (const [p, ops] of Object.entries(openapiPaths)) {
  for (const method of Object.keys(ops).filter((k) => k !== 'parameters')) {
    openapiIndex.add(`${method.toUpperCase()} ${normalize(p)}`);
  }
}

const FILES = ['frontend/src/lib/openwa-api.ts', 'frontend/src/lib/openwa/akg-api.ts'];

const CALL =
  /(?:request(?:Blob|Text)?|akgRequest)(?:<[^>]*>)?\(\s*([`'"])(\/[^`'"]+)\1(?:\s*,\s*\{[\s\S]*?method:\s*['"](\w+)['"])?/g;

const FETCH_BASE =
  /fetch\(\s*`\$\{getOpenWAApiBase\(\)\}(\/[^`]+)`[\s\S]{0,200}?method:\s*['"](\w+)['"]/g;

/** Drop query-string glue (`/audit${qs`) and skip in-segment interpolations (`send-${type}`). */
const toApiPath = (raw) => {
  let p = raw.split('?')[0].replace(/\$\{[^}/]*$/, '');
  const leftover = p.replace(/\/\$\{[^}]+\}/g, '/_');
  if (leftover.includes('${')) return null;
  return `/api${p}`;
};

const hits = [];
for (const rel of FILES) {
  const src = readFileSync(join(root, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const m of src.matchAll(CALL)) {
    const path = toApiPath(m[2]);
    if (path) hits.push({ file: rel, method: (m[3] || 'GET').toUpperCase(), path });
  }
  for (const m of src.matchAll(FETCH_BASE)) {
    const path = toApiPath(m[1]);
    if (path) hits.push({ file: rel, method: m[2].toUpperCase(), path });
  }
}

const seen = new Set();
const unique = [];
for (const h of hits) {
  const key = `${h.method} ${normalize(h.path)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push({ ...h, key });
}

const missing = unique.filter((h) => !openapiIndex.has(h.key));
if (missing.length) {
  console.error('Frontend client paths missing from openapi.json:');
  for (const h of missing) console.error(`  ${h.key}  (${h.file})`);
  process.exit(1);
}
console.log(`ok: ${unique.length} unique frontend OpenWA client ops match openapi.json`);
for (const h of unique.sort((a, b) => a.key.localeCompare(b.key))) {
  console.log(`  ${h.key}`);
}
