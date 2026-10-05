// F1b: live checks for the UI fixes Q1's scripts do not print: the mapper names the cause (#15) and ties it to
// the disabled button; checkbox/radio and sample-link target sizes (#14); "Delete it" beside "Open your saved
// review" (#14). One compact line per check. Run: node qa/f1b-live.mjs   (BASE=… to point elsewhere)
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE ?? 'https://lintroller.vercel.app';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const b = await chromium.launch({ executablePath: exe, headless: true });
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };

// 1. mapper: Description column chosen as the amount
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/sweep', { waitUntil: 'load' });
  await p.setInputFiles('input[type=file]', 'qa/files/dup-headers.csv');
  await p.getByRole('heading', { name: 'What we read' }).waitFor();
  const toggle = p.getByRole('button', { name: 'Not right? Choose the columns' });
  if (await toggle.count()) await toggle.first().click();
  const amount = p.getByLabel(/^Amount/).first();
  await amount.selectOption({ index: 1 }).catch(() => {});
  const labels = await amount.evaluate((s) => [...s.options].map((o) => o.textContent.trim()));
  // pick the first option whose label is a Description column
  const idx = labels.findIndex((l) => /description/i.test(l));
  if (idx >= 0) await amount.selectOption({ index: idx });
  await p.waitForTimeout(400);
  const button = p.getByRole('button', { name: 'Use these columns' });
  const disabled = await button.isDisabled();
  const describedBy = await button.getAttribute('aria-describedby');
  const text = describedBy ? (await p.locator(`#${describedBy}`).innerText()).trim() : '';
  check('#15 mapper hint', disabled && /amount column has no amounts/.test(text), `disabled=${disabled} aria-describedby=${describedBy} text="${text.slice(0, 110)}"`);
  await ctx.close();
}

// 2. target sizes: "Download the sample" on /sweep; checkboxes/radios on the summary
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/sweep', { waitUntil: 'load' });
  const link = await p.getByRole('link', { name: 'Download the sample' }).boundingBox();
  check('#14 sample link height', link && link.height >= 24, `${link?.width.toFixed(0)}x${link?.height.toFixed(0)} px`);
  await p.getByRole('button', { name: 'Try the sample file' }).click();
  await p.getByRole('button', { name: 'Next: review' }).click();
  await p.getByRole('link', { name: 'See your yearly summary' }).click();
  await p.getByRole('heading', { name: 'Your yearly summary' }).waitFor();
  const boxes = await p.locator('input[type=checkbox], input[type=radio]').evaluateAll((els) =>
    els.map((e) => { const r = e.getBoundingClientRect(); const l = e.closest('label')?.getBoundingClientRect(); return [r.width, r.height, l ? l.height : 0]; }));
  const small = boxes.filter(([w, h, lh]) => Math.min(w, h) < 24 && lh < 24);
  check('#14 checkbox/radio targets', boxes.length > 0 && small.length === 0, `${boxes.length} inputs, min ${Math.min(...boxes.map(([w, h]) => Math.min(w, h)))} px, label min ${Math.min(...boxes.map(([, , lh]) => lh)).toFixed(0)} px, under 24: ${small.length}`);

  // 3. "Delete it" beside the saved-review prompt
  await p.getByRole('checkbox', { name: 'Remember on this device' }).check();
  const before = await p.evaluate(() => localStorage.length);
  await p.goto(BASE + '/sweep', { waitUntil: 'load' });
  const open = await p.getByRole('button', { name: 'Open your saved review' }).count();
  await p.getByRole('button', { name: 'Delete it' }).click();
  const after = await p.evaluate(() => localStorage.length);
  const gone = await p.getByRole('button', { name: 'Open your saved review' }).count();
  check('#14 Delete it', before === 1 && open === 1 && after === 0 && gone === 0, `stored ${before} -> ${after}, prompt ${open} -> ${gone}`);
  await ctx.close();
}

await b.close();
console.log(`f1b-live: ${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
