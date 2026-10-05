// Q1: imports each file into the live /sweep in a fresh headless context and records what happened:
// time to a settled screen, URL, alerts, console errors, page errors, requests after load, a screenshot,
// and the visible text (to qa/out/<file>.txt; never printed). One compact line per file on stdout.
// Run: node qa/drive.mjs qa/files/a.csv [qa/files/b.csv ...]   (BASE=… to point elsewhere)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE ?? 'https://lintroller.vercel.app';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const outDir = path.resolve('qa/out');
const shots = process.env.SHOTS ?? outDir;
mkdirSync(outDir, { recursive: true });
mkdirSync(shots, { recursive: true });

const b = await chromium.launch({ executablePath: exe, headless: true });
for (const file of process.argv.slice(2)) {
  const name = path.basename(file);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  const after = [];
  let loaded = false;
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));
  page.on('dialog', async (d) => { errors.push(`DIALOG ${d.type()}: ${d.message()}`); await d.dismiss(); });
  ctx.on('request', (r) => { if (loaded) after.push(`${r.method()} ${r.url().slice(0, 120)}`); });
  await page.goto(BASE + '/sweep', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  loaded = true;
  const t0 = Date.now();
  await page.setInputFiles('input[type=file]', file);
  // Settled = the visible text stops changing for 1 s, or 30 s pass.
  let last = '';
  let stableSince = Date.now();
  let settledAt = null;
  while (Date.now() - t0 < 30000) {
    await page.waitForTimeout(200);
    const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
    if (txt !== last) { last = txt; stableSince = Date.now(); }
    else if (Date.now() - stableSince > 1000 && txt.length) { settledAt = stableSince - t0; break; }
  }
  const state = await page.evaluate(() => ({
    url: location.pathname,
    h: [...document.querySelectorAll('h1,h2,h3')].map((e) => e.textContent.trim().slice(0, 70)),
    alert: [...document.querySelectorAll('[role=alert],[role=status],[aria-live]')].map((e) => e.textContent.trim().slice(0, 200)).filter(Boolean),
    blank: document.body.innerText.trim().length < 20,
  })).catch((e) => ({ err: String(e) }));
  writeFileSync(path.join(outDir, name + '.txt'), last);
  await page.screenshot({ path: path.join(shots, name + '.png'), fullPage: false }).catch(() => {});
  const rec = { file: name, settledMs: settledAt, ...state, errors, after };
  appendFileSync(path.join(outDir, 'drive.jsonl'), JSON.stringify(rec) + '\n');
  console.log(`${name} | settled ${settledAt ?? '>30000'} ms | ${state.url} | alerts: ${JSON.stringify(state.alert).slice(0, 300)} | errors ${errors.length}${errors.length ? ' ' + JSON.stringify(errors).slice(0, 240) : ''} | after-load requests ${after.length}${after.length ? ' ' + after.slice(0, 3).join(' ; ') : ''}`);
  await ctx.close();
}
await b.close();
