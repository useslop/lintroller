// Shared e2e harness (lane I1, adapted from Coatpocket's): a static server for dist/ that behaves like
// Vercel with the repo's vercel.json (filesystem first, cleanUrls, the rewrites, header rules), the
// cached headless Chromium from a local playwright-core install (never a personal browser profile),
// and a DNS rule that makes every outside host unresolvable, so no test can reach a merchant site.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
export const appDir = path.resolve(here, '..');
export const rootDir = path.resolve(appDir, '..');
export const distDir = path.join(appDir, 'dist');

const HEADLESS_SHELL = path.join(
  os.homedir(),
  'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell',
);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.ics': 'text/calendar',
  '.csv': 'text/csv; charset=utf-8',
};

export const vercelConfig = () => JSON.parse(readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
const asRegex = (source) => new RegExp(`^${source}$`);

/** The headers vercel.json gives a path (every matching rule, later rules win). */
export function headersFor(pathname) {
  const out = {};
  for (const rule of vercelConfig().headers ?? []) {
    if (asRegex(rule.source).test(pathname)) for (const h of rule.headers) out[h.key] = h.value;
  }
  return out;
}

/** The headers every route must carry (SPEC §10), straight from vercel.json's catch-all rule. */
export function requiredHeaders() {
  return Object.fromEntries(vercelConfig().headers.find((r) => r.source === '/(.*)').headers.map((h) => [h.key, h.value]));
}

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

/** Resolves a request path like Vercel: the file, then cleanUrls (.html, /index.html), then rewrites. */
async function resolvePath(pathname) {
  const clean = decodeURIComponent(pathname);
  const base = path.join(distDir, clean);
  if (!base.startsWith(distDir)) return null;
  for (const candidate of [base, `${base}.html`, path.join(base, 'index.html')]) {
    if (await isFile(candidate)) return candidate;
  }
  // A rewrite lands on a clean URL too (with cleanUrls, Vercel finds "/shell" as shell.html and does
  // not serve a "/shell.html" destination), so the destination goes through the same file lookup.
  for (const rw of vercelConfig().rewrites ?? []) {
    if (!asRegex(rw.source).test(clean)) continue;
    const dest = path.join(distDir, rw.destination);
    if (vercelConfig().cleanUrls && rw.destination.endsWith('.html')) return null;
    for (const candidate of [`${dest}.html`, path.join(dest, 'index.html')]) if (await isFile(candidate)) return candidate;
    return null;
  }
  return null;
}

export async function serveDist() {
  if (!existsSync(path.join(distDir, 'index.html'))) throw new Error('dist/ missing: run `npm run build -w app` first');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const file = await resolvePath(url.pathname);
    const headers = headersFor(url.pathname);
    if (!file) {
      res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : 'Not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

/** Headless shell with every outside host unresolvable (our own host excluded). */
export async function launch(base) {
  if (!existsSync(HEADLESS_SHELL)) throw new Error(`headless shell not found at ${HEADLESS_SHELL}`);
  const ours = new URL(base).hostname;
  return chromium.launch({
    executablePath: HEADLESS_SHELL,
    headless: true,
    args: [
      `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE ${ours}`,
      '--disable-background-networking',
      '--dns-prefetch-disable',
      '--no-pings',
    ],
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
