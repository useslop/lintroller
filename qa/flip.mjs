// Q1: sign self-check. Imports a card file, reads the status line, clicks "Flip the signs", reads it again,
// clicks the flip control again, reads it again. Run: node qa/flip.mjs qa/files/x.csv
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const b = await chromium.launch({ executablePath: exe, headless: true });
for (const file of process.argv.slice(2)) {
  const page = await (await b.newContext()).newPage();
  await page.goto('https://lintroller.vercel.app/sweep');
  await page.setInputFiles('input[type=file]', file);
  await page.waitForTimeout(1200);
  const read = async () => page.evaluate(() => {
    const t = document.body.innerText;
    return [t.match(/Read \d+ rows? from[^\n]*/)?.[0], (t.match(/[^\n]*(flipped|positive|Flip back)[^\n]*/gi) || []).join(' / ')].join(' || ');
  });
  console.log(path.basename(file), '| initial:', await read());
  const flip = page.getByRole('button', { name: /Flip/ }).first();
  console.log('  flip control:', JSON.stringify(await flip.textContent()), 'aria-pressed=', await flip.getAttribute('aria-pressed'));
  await flip.click(); await page.waitForTimeout(1000);
  console.log('  after click 1:', await read(), '| control now:', JSON.stringify(await page.getByRole('button', { name: /Flip/ }).first().textContent()));
  await page.getByRole('button', { name: /Flip/ }).first().click(); await page.waitForTimeout(1000);
  console.log('  after click 2:', await read());
}
await b.close();
