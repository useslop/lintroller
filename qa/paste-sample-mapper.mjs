// Q1: pasted rows, the bundled sample (Low cards?), and the column mapper (re-run with another column).
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const b = await chromium.launch({ executablePath: exe, headless: true });
const line = (p) => p.evaluate(() => (document.body.innerText.match(/Read [\d,]+ rows? from[^\n]*/) || ['(no status line)'])[0]);
const errs = [];
// 1. Paste rows (tab-separated, no header).
{
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await p.goto('https://lintroller.vercel.app/sweep');
  await p.locator('textarea').fill(readFileSync('qa/files/pasted-rows.txt', 'utf8'));
  await p.getByRole('button', { name: /Use pasted rows/ }).click();
  await p.waitForTimeout(1000);
  console.log('paste (tab-separated, headerless):', await line(p), '|', (await p.evaluate(() => (document.body.innerText.match(/[^\n]*(couldn't|Choose|mapper|Looks like)[^\n]*/g) || []).slice(0, 2).join(' / '))).slice(0, 160));
}
// 2. The sample file: confidence mix and how Low cards read.
{
  const p = await (await b.newContext()).newPage();
  await p.goto('https://lintroller.vercel.app/sweep');
  await p.getByRole('button', { name: /Try the sample file/ }).click();
  await p.waitForTimeout(1200);
  console.log('sample:', await line(p));
  await p.getByRole('button', { name: /Next: review/ }).first().click();
  await p.waitForTimeout(600);
  const t = await p.evaluate(() => document.body.innerText);
  writeFileSync('qa/out/sample.review.txt', t);
  const c = (re) => (t.match(re) || []).length;
  console.log(`sample review: High ${c(/High confidence/g)}, Medium ${c(/Medium confidence/g)}, Low ${c(/Low confidence/g)}; groups: ${(t.match(/^(Subscriptions and memberships|Other repeating charges|Bills and fees|Payments to people|Possibly stopped) \(\d+\)/gm) || []).join(', ')}`);
  const i = t.indexOf('Low confidence');
  if (i > 0) console.log('first Low card:', t.slice(Math.max(0, t.lastIndexOf('\n\n', i - 60)), i + 160).replace(/\n+/g, ' | ').slice(0, 330));
}
// 3. Mapper on dup-headers.csv: pick the second Amount column, then a text column as the amount.
{
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 100)));
  await p.goto('https://lintroller.vercel.app/sweep');
  await p.setInputFiles('input[type=file]', 'qa/files/dup-headers.csv');
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /Choose the columns/ }).first().click().catch(() => {});
  await p.waitForTimeout(400);
  const selects = await p.locator('select').evaluateAll((s) => s.map((x) => `${x.labels?.[0]?.textContent?.trim() || x.name || x.id}=[${[...x.options].map((o) => o.textContent.trim()).join('|')}] sel=${x.selectedOptions[0]?.textContent}`));
  console.log('mapper selects:', selects.join(' ;; ').slice(0, 500));
  const amount = p.locator('select').filter({ has: p.locator('option') }).nth(2);
  const opts = await amount.evaluate((s) => [...s.options].map((o) => o.value));
  for (const v of opts.slice(-2)) {
    await amount.selectOption(v).catch((e) => errs.push('select ' + e.message.slice(0, 80)));
    await p.waitForTimeout(700);
    console.log(`  amount column -> ${v}:`, await line(p), '|', (await p.evaluate(() => (document.body.innerText.match(/[^\n]*(Skipped|couldn't|no readable)[^\n]*/g) || []).slice(0, 2).join(' / '))).slice(0, 160));
  }
}
console.log('page errors:', errs.length, errs.join(' ; '));
await b.close();
