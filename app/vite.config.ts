import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// The shipped copy of the data keeps only what the app reads; provenance stays in the repo. Dropped:
// cancel.json check.*.finalUrl (redirect targets: sign-in pages with per-request tokens and state;
// lookupCancel reads only ok and checkedAt) and aliases.json source (the "how it appears on your
// statement" page each pattern came from; nothing renders it), and every manageUrl/helpUrl whose own check
// did not pass. Shipping them would put URLs in the
// bundle that are not links, which the outbound-link gate (gates.mjs b) rightly rejects.
const SIGN_IN_RE = /^https:\/\/(accounts\.google\.com\/|login\.|[^/]+\/(.*\/)?(signin|sign-in|sign_in|login|log-in|newlogin)\b|[^/]+\/ax\/claim\b|[^/]+\/ap\/signin\b)/i;

const slimData: Plugin = {
  name: 'subsweep:slim-data',
  enforce: 'pre',
  transform(code, id) {
    const file = /[\\/]data[\\/](cancel|aliases)\.json$/.exec(id.split('?')[0] ?? '')?.[1];
    if (!file) return null;
    const rows = JSON.parse(code) as Record<string, unknown>[];
    for (const row of rows) {
      if (file === 'aliases') { delete row.source; continue; }
      const check = (row.check ?? {}) as Record<string, { ok?: boolean; finalUrl?: string } | undefined>;
      // keep one fact from the dropped redirect target: whether the checked link lands on a sign-in page (Q1 F1b #12)
      for (const c of Object.values(check)) if (c) { if (c.ok && c.finalUrl && SIGN_IN_RE.test(c.finalUrl)) (c as { signIn?: boolean }).signIn = true; delete c.finalUrl; }
      // A URL ships only when its own check passed (Q1 F1b #12): the 43 unverified entries keep their names
      // and notes but carry no URL, so no code path can ever render an unchecked link.
      const unverified = row.verified === null;
      if (unverified || !check.manage?.ok) row.manageUrl = null;
      if (unverified || !check.help?.ok) row.helpUrl = null;
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
