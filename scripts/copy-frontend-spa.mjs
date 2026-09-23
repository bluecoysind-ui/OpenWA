#!/usr/bin/env node
/**
 * Copy the built SPA into frontend/dist so Nest ServeStatic (DASHBOARD_DIST)
 * can serve it on the API port. Nitro's vercel preset writes
 * frontend/.vercel/output/static; node-server writes frontend/.output/public.
 * Docker and `npm run prod` both need the same destination.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'frontend', 'dist');
const sources = [
  join(root, 'frontend', '.vercel', 'output', 'static'),
  join(root, 'frontend', '.output', 'public'),
];

const source = sources.find(dir => existsSync(join(dir, 'index.html')));
if (!source) {
  console.error(
    'copy-frontend-spa: no built SPA (looked for frontend/.vercel/output/static and frontend/.output/public)',
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(source, dest, { recursive: true });
console.log(`copy-frontend-spa: ${source} -> ${dest}`);
