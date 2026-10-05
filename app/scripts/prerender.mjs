// Writes static HTML for the four static routes into dist/, using the built shell as the template.
// The client still mounts with createRoot, so the prerendered markup is replaced on load (no hydration).
// Vercel's cleanUrls serves flat files (dist/about.html at /about) but not dir/index.html at /about,
// and it can't serve a rewrite destination that ends in .html: so pages are flat files and the
// client routes (/sweep, /sweep/review, /sweep/summary, 404) rewrite to dist/shell.html as /shell.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['/', '/how-to-export', '/privacy', '/about'];
const EMPTY_ROOT = '<div id="root"></div>';

const vite = await createServer({
  root: app,
  configFile: resolve(app, 'vite.config.ts'),
  appType: 'custom',
  logLevel: 'warn',
  server: { middlewareMode: true, hmr: false },
});
try {
  const { renderPage } = await vite.ssrLoadModule('/src/prerender.tsx');
  const template = readFileSync(resolve(app, 'dist/index.html'), 'utf8');
  if (!template.includes(EMPTY_ROOT)) throw new Error('prerender: empty root not found in dist/index.html');
  writeFileSync(resolve(app, 'dist/shell.html'), template);
  console.log(`shell /shell (${template.length} bytes)`);
  for (const path of PAGES) {
    const html = template.replace(EMPTY_ROOT, `<div id="root">${renderPage(path)}</div>`);
    const out = path === '/' ? resolve(app, 'dist/index.html') : resolve(app, 'dist', `${path.slice(1)}.html`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`prerendered ${path} (${html.length} bytes)`);
  }
} finally {
  await vite.close();
}
