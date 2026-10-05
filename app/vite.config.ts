import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// The shipped copy of the data keeps only what the app reads; provenance stays in the repo. Dropped:
// cancel.json check.*.finalUrl (redirect targets: sign-in pages with per-request tokens and state;
// lookupCancel reads only ok and checkedAt) and aliases.json source (the "how it appears on your
// statement" page each pattern came from; nothing renders it). Shipping them would put URLs in the
// bundle that are not links, which the outbound-link gate (gates.mjs b) rightly rejects.
const slimData: Plugin = {
  name: 'subsweep:slim-data',
  enforce: 'pre',
  transform(code, id) {
    const file = /[\\/]data[\\/](cancel|aliases)\.json$/.exec(id.split('?')[0] ?? '')?.[1];
    if (!file) return null;
    const rows = JSON.parse(code) as Record<string, unknown>[];
    for (const row of rows) {
      if (file === 'aliases') delete row.source;
      else for (const c of Object.values((row.check ?? {}) as Record<string, { finalUrl?: string } | undefined>)) if (c) delete c.finalUrl;
    }
    return { code: JSON.stringify(rows), map: null };
  },
};

export default defineConfig({
  plugins: [slimData, react()],
  worker: { format: 'es' },
  // No modulepreload polyfill: it calls fetch() for preloads on old browsers, which connect-src 'none' would block.
  build: { target: 'es2022', sourcemap: false, modulePreload: { polyfill: false } },
  test: { environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'] },
});
