import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// Ship cancel.json without the link checker's finalUrl values: they are redirect targets (sign-in pages
// with per-request tokens and state), the app never reads them (lookupCancel needs only ok and checkedAt),
// and the outbound-link gate (gates.mjs b) would rightly reject them as URLs that are not data links.
const slimCancelDirectory: Plugin = {
  name: 'subsweep:slim-cancel-directory',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]data[\\/]cancel\.json$/.test(id.split('?')[0] ?? '')) return null;
    const rows = JSON.parse(code) as { check?: Record<string, { finalUrl?: string } | undefined> }[];
    for (const row of rows) for (const c of Object.values(row.check ?? {})) if (c) delete c.finalUrl;
    return { code: JSON.stringify(rows), map: null };
  },
};

export default defineConfig({
  plugins: [slimCancelDirectory, react()],
  worker: { format: 'es' },
  // No modulepreload polyfill: it calls fetch() for preloads on old browsers, which connect-src 'none' would block.
  build: { target: 'es2022', sourcemap: false, modulePreload: { polyfill: false } },
  test: { environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'] },
});
