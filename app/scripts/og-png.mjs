#!/usr/bin/env node
// Static 1200x630 OG image. Plain inline HTML, system fonts only, rendered once in the cached
// headless shell and screenshotted to app/public/og.png. No web fonts, no remote images, no
// merchant branding.
import path from 'node:path';
import { appDir, launch } from '../e2e/harness.mjs';

const WIDTH = 1200;
const HEIGHT = 630;
const OUT = path.join(appDir, 'public', 'og.png');

const BACKGROUND = '#F6F1E7';
const INK = '#1D2B2A';
const MUTED = '#44504E';
const ACCENT = '#1F6F5C';

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    background: ${BACKGROUND};
    color: ${INK};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    position: relative;
  }
  .wrap { height: 100%; padding: 90px; display: flex; flex-direction: column; justify-content: center; }
  h1 { font-size: 100px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 26px; }
  p.tag { font-size: 36px; font-weight: 600; margin-bottom: 22px; }
  p.sub { font-size: 27px; color: ${MUTED}; max-width: 880px; line-height: 1.45; }
  .bar { position: absolute; left: 0; bottom: 0; width: 100%; height: 14px; background: ${ACCENT}; }
</style></head>
<body>
  <div class="wrap">
    <h1>Lintroller</h1>
    <p class="tag">Find the charges that keep coming back.</p>
    <p class="sub">Drop in a CSV from your bank or card. It runs in your browser; the file never leaves your device.</p>
  </div>
  <div class="bar"></div>
</body></html>`;

const browser = await launch('http://localhost/');
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: OUT });
} finally {
  await browser.close();
}
console.log(`og.png written to ${OUT}`);
