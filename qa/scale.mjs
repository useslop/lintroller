// Q1: scale on the long-lived worker, all in ONE page: 50k rows (time), 300,001 rows (limit message),
// 26 MB (size message), 299k rows (time, heap, main-thread lag), then a small file (worker still alive),
// then privacy spot checks in the same page (fetch('/x') blocked, storage, cookies, service worker).
// Run: node qa/scale.mjs
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const b = await chromium.launch({ executablePath: exe, headless: true });
const ctx = await b.newContext();
const page = await ctx.newPage();
const after = [];
const errs = [];
let loaded = false;
ctx.on('request', (r) => { if (loaded) after.push(r.url().slice(0, 100)); });
page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
await page.goto('https://lintroller.vercel.app/sweep', { waitUntil: 'load' });
await page.waitForTimeout(500);
loaded = true;
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
const heap = async () => Math.round((await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1e6);
const status = () => page.evaluate(() => (document.body.innerText.match(/Read [\d,]+ rows? from[^\n]*/) || [''])[0] + ' || ' + (document.body.innerText.match(/[^\n]*(too big|too large|limit|MB|300,000|rows in total|couldn't|could not)[^\n]*/gi) || []).slice(0, 2).join(' / '));
for (const f of ['rows-50k.csv', 'rows-300001.csv', 'size-26mb.csv', 'rows-299k.csv', 'short-94days.csv']) {
  // Remove earlier files so each run stands alone.
  for (let i = 0; i < 5; i++) { const rm = page.getByRole('button', { name: /^Remove/ }); if (!(await rm.count())) break; await rm.first().click(); await page.waitForTimeout(150); }
  await page.evaluate(() => { window.__lag = 0; let t = performance.now(); window.__lagTimer = setInterval(() => { const n = performance.now(); window.__lag = Math.max(window.__lag, n - t - 50); t = n; }, 50); });
  const before = await status();
  const t0 = Date.now();
  await page.setInputFiles('input[type=file]', path.resolve('qa/files', f));
  let s = before;
  while (Date.now() - t0 < 60000) { await page.waitForTimeout(100); s = await status(); if (s !== before && !/Reading|Working/i.test(s)) break; }
  const ms = Date.now() - t0;
  const lag = await page.evaluate(() => { clearInterval(window.__lagTimer); return Math.round(window.__lag); });
  console.log(`${f.padEnd(18)} ${String(ms).padStart(6)} ms | max main-thread lag ${lag} ms | heap ${await heap()} MB | ${s.slice(0, 260)}`);
}
// Privacy spot checks in the same page.
const probe = await page.evaluate(async () => {
  let fetchResult;
  try { await fetch('/x'); fetchResult = 'NOT BLOCKED'; } catch (e) { fetchResult = 'blocked: ' + e.name; }
  const regs = navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 'n/a';
  const dbs = indexedDB.databases ? (await indexedDB.databases()).length : 'n/a';
  return { fetchResult, regs, ls: localStorage.length, ss: sessionStorage.length, dbs, cookie: document.cookie };
});
console.log('privacy:', JSON.stringify(probe), '| cookies', (await ctx.cookies()).length, '| requests after load', after.length, after.slice(0, 5).join(' ; '), '| errors', errs.length, errs.slice(0, 3).join(' ; '));
await b.close();
