// Q1: one big file in a fresh page: time to the status line, max main-thread lag, peak JS heap (page).
// Run: node qa/big.mjs qa/files/rows-299k.csv
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const b = await chromium.launch({ executablePath: exe, headless: true });
for (const f of process.argv.slice(2)) {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  await page.goto('https://lintroller.vercel.app/sweep', { waitUntil: 'load' });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  let peak = 0;
  await page.evaluate(() => { window.__lag = 0; let t = performance.now(); setInterval(() => { const n = performance.now(); window.__lag = Math.max(window.__lag, n - t - 50); t = n; }, 50); });
  const t0 = Date.now();
  await page.setInputFiles('input[type=file]', f);
  let s = '';
  while (Date.now() - t0 < 90000) {
    await page.waitForTimeout(100);
    const h = (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value;
    peak = Math.max(peak, h);
    s = await page.evaluate(() => (document.body.innerText.match(/(Read [\d,]+ rows? from[^\n]*|[^\n]*(over 25 MB|More than 300,000)[^\n]*)/) || [''])[0]);
    if (s) break;
  }
  const lag = await page.evaluate(() => Math.round(window.__lag));
  console.log(`${path.basename(f)} ${Date.now() - t0} ms | lag ${lag} ms | page heap peak ${Math.round(peak / 1e6)} MB | ${s.slice(0, 160)}`);
  await ctx.close();
}
await b.close();
