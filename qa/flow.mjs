// Q1: full flow per file on the live preview: import -> review (text + buttons) -> summary (text + links)
// -> download CSV and ICS. Writes qa/out/<file>.review.txt, .summary.txt, .links.json, .findings.csv, .ics
// and prints one compact line per file. Any dialog (alert) or request after load is reported.
// Run: node qa/flow.mjs qa/files/a.csv ...   (CONFIRM=1 confirms the first two findings, DISMISS=1 one)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE ?? 'https://lintroller.vercel.app';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const outDir = path.resolve('qa/out');
const shots = process.env.SHOTS ?? outDir;
mkdirSync(outDir, { recursive: true });

const b = await chromium.launch({ executablePath: exe, headless: true });
for (const file of process.argv.slice(2)) {
  const name = path.basename(file);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const notes = [];
  const after = [];
  let loaded = false;
  page.on('console', (m) => { if (m.type() === 'error') notes.push(`console.error: ${m.text().slice(0, 140)}`); });
  page.on('pageerror', (e) => notes.push(`pageerror: ${String(e).slice(0, 140)}`));
  page.on('dialog', async (d) => { notes.push(`DIALOG ${d.type()}: ${d.message()}`); await d.dismiss(); });
  ctx.on('request', (r) => { if (loaded) after.push(`${r.method()} ${r.url().slice(0, 120)}`); });
  await page.goto(BASE + '/sweep', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  loaded = true;
  const t0 = Date.now();
  await page.setInputFiles('input[type=file]', file);
  await page.getByRole('button', { name: /Next: review/ }).or(page.getByRole('link', { name: /Next: review/ })).first().waitFor({ timeout: 30000 });
  const tImport = Date.now() - t0;
  writeFileSync(path.join(outDir, name + '.import.txt'), await page.evaluate(() => document.body.innerText));
  await page.getByRole('button', { name: /Next: review/ }).or(page.getByRole('link', { name: /Next: review/ })).first().click();
  await page.waitForTimeout(800);
  const review = await page.evaluate(() => document.body.innerText);
  writeFileSync(path.join(outDir, name + '.review.txt'), review);
  const pressed = await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].length);
  // Expand all evidence (details/summary or buttons with aria-expanded) to read it.
  await page.evaluate(() => { document.querySelectorAll('details').forEach((d) => (d.open = true)); });
  writeFileSync(path.join(outDir, name + '.review-open.txt'), await page.evaluate(() => document.body.innerText));
  await page.screenshot({ path: path.join(shots, name + '.review.png'), fullPage: true }).catch(() => {});
  if (process.env.CONFIRM) {
    const yes = page.getByRole('button', { name: /Yes, it repeats/ });
    const n = await yes.count();
    for (let i = 0; i < Math.min(n, Number(process.env.CONFIRM)); i++) await yes.nth(i).click();
  }
  if (process.env.DISMISS) await page.getByRole('button', { name: /Not a repeating charge/ }).first().click().catch(() => {});
  // To the summary.
  const toSummary = page.getByRole('link', { name: /summary/i }).or(page.getByRole('button', { name: /summary/i })).first();
  await toSummary.click({ timeout: 5000 }).catch(() => page.goto(BASE + '/sweep/summary'));
  await page.waitForTimeout(800);
  const summary = await page.evaluate(() => document.body.innerText);
  writeFileSync(path.join(outDir, name + '.summary.txt'), summary);
  await page.screenshot({ path: path.join(shots, name + '.summary.png'), fullPage: true }).catch(() => {});
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="http"]')].map((a) => ({ text: a.textContent.trim().slice(0, 80), href: a.href, rel: a.rel, target: a.target })));
  writeFileSync(path.join(outDir, name + '.links.json'), JSON.stringify(links, null, 1));
  for (const [re, ext] of [[/Download CSV/i, '.findings.csv'], [/\.ics|Calendar/i, '.ics']]) {
    try {
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), page.getByRole('button', { name: re }).or(page.getByRole('link', { name: re })).first().click()]);
      await dl.saveAs(path.join(outDir, name + ext));
      notes.push(`downloaded ${ext} (${dl.url().slice(0, 12)}…)`);
    } catch (e) { notes.push(`no ${ext}: ${String(e).slice(0, 80)}`); }
  }
  console.log(`${name} | import ${tImport} ms | review ${review.length} chars, aria-pressed buttons ${pressed} | summary ${summary.length} chars | ext links ${links.length} | after-load requests ${after.length}${after.length ? ' ' + after.slice(0, 4).join(' ; ') : ''} | ${notes.join(' | ').slice(0, 400)}`);
  await ctx.close();
}
await b.close();
