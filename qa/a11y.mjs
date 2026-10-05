// Q1: axe with data loaded (390x844), keyboard-only import -> review -> summary -> download, aria-pressed,
// overflow at 390, 320 and 640 (200% zoom of 1280), reduced motion. Prints one line per check.
// axe needs bypassCSP (the page's CSP blocks injected scripts, as it should); the keyboard run does not.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const SHOTS = process.env.SHOTS ?? 'qa/out';
const FILE = path.resolve('qa/files/honesty-life.csv');
const axeSrc = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch({ executablePath: exe, headless: true });
const BASE = 'https://lintroller.vercel.app';

async function load(page) {
  await page.goto(BASE + '/sweep');
  await page.setInputFiles('input[type=file]', FILE);
  await page.getByRole('button', { name: /Next: review/ }).or(page.getByRole('link', { name: /Next: review/ })).first().waitFor();
}
// 1. axe at 390x844 on import (with data), review (evidence open), summary.
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, bypassCSP: true });
  const page = await ctx.newPage();
  await load(page);
  const run = async (label) => {
    await page.addScriptTag({ content: axeSrc });
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => `${v.impact}:${v.id}(${v.nodes.length})`));
    console.log(`axe ${label}: ${r.filter((x) => /^(serious|critical)/.test(x)).length} serious/critical | all: ${r.join(', ') || 'none'}`);
  };
  await run('/sweep with file');
  await page.getByRole('button', { name: /Next: review/ }).or(page.getByRole('link', { name: /Next: review/ })).first().click();
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await run('/sweep/review evidence open');
  await page.getByRole('button', { name: /Yes, it repeats/ }).first().click();
  await page.getByRole('button', { name: /Not a repeating charge/ }).nth(1).click();
  await run('/sweep/review after marking');
  await page.goto(BASE + '/sweep/summary').catch(() => {});
  await page.waitForTimeout(600);
  await run('/sweep/summary (after reload)');
  await ctx.close();
}
// 2. Keyboard only (no bypassCSP): Tab to the file control, Space opens the chooser, then Enter on links/buttons.
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/sweep');
  const focusName = () => page.evaluate(() => { const e = document.activeElement; return `${e.tagName.toLowerCase()}${e.type ? '[' + e.type + ']' : ''}:${(e.getAttribute('aria-label') || e.textContent || e.value || '').trim().slice(0, 40)}`; });
  const tabTo = async (re, max = 60) => { for (let i = 0; i < max; i++) { await page.keyboard.press('Tab'); const n = await focusName(); if (re.test(n)) return n; } return null; };
  const steps = [];
  const f1 = await tabTo(/input\[file\]|Choose CSV/i);
  steps.push(`file control focusable: ${f1 ?? 'NO'}`);
  if (f1) {
    const fc = page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null);
    await page.keyboard.press('Space');
    const chooser = await fc;
    steps.push(`Space opens chooser: ${chooser ? 'yes' : 'NO'}`);
    if (chooser) await chooser.setFiles(FILE);
    else await page.setInputFiles('input[type=file]', FILE);
  }
  await page.waitForTimeout(1200);
  const n = await tabTo(/Next: review/);
  steps.push(`Next: review reachable: ${n ? 'yes' : 'NO'}`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  steps.push(`focus after Enter: ${await focusName()} (url ${new URL(page.url()).pathname})`);
  const y = await tabTo(/Yes, it repeats/);
  if (y) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const pressed = await page.evaluate(() => document.activeElement.getAttribute('aria-pressed'));
    steps.push(`confirm by Space: aria-pressed=${pressed}`);
  } else steps.push('confirm button reachable: NO');
  const s = await tabTo(/^a:.*yearly summary/i, 200);
  steps.push(`summary link reachable: ${s ? 'yes' : 'NO'}`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  const d = await tabTo(/Download CSV/, 200);
  if (d) {
    const dl = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);
    await page.keyboard.press('Enter');
    steps.push(`Download CSV by Enter: ${(await dl) ? 'downloaded' : 'NO download'}`);
  } else steps.push('Download CSV reachable: NO');
  console.log('keyboard: ' + steps.join(' | '));
  // Focus visibility: outline on a focused button.
  const outline = await page.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.boxShadow.slice(0, 30)}`; });
  console.log('focus style on last focused element: ' + outline);
  await ctx.close();
}
// 3. Layout: overflow and screenshots at 390x844, 320x640, 640x900 (= 200% zoom of 1280), reduced motion.
for (const [w, h] of [[390, 844], [320, 640], [640, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await load(page);
  const res = [];
  for (const step of ['import', 'review', 'summary']) {
    if (step === 'review') { await page.getByRole('button', { name: /Next: review/ }).or(page.getByRole('link', { name: /Next: review/ })).first().click(); await page.waitForTimeout(500); }
    if (step === 'summary') { await page.getByRole('link', { name: /summary/i }).or(page.getByRole('button', { name: /summary/i })).first().click(); await page.waitForTimeout(500); }
    const m = await page.evaluate(() => {
      const over = document.scrollingElement.scrollWidth - window.innerWidth;
      const small = [...document.querySelectorAll('button,a,input,select,label')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44 && getComputedStyle(e).display !== 'inline'; }).length;
      const anim = [...document.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e); return parseFloat(cs.animationDuration) > 0.01 || parseFloat(cs.transitionDuration) > 0.01; }).length;
      const tiny = [...document.querySelectorAll('p,li,span,button,a,td,th,label')].filter((e) => e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length;
      return `overflow ${over}px, targets<44px ${small}, animated (reduce) ${anim}, text<14px ${tiny}`;
    });
    res.push(`${step}: ${m}`);
    await page.screenshot({ path: path.join(SHOTS, `layout-${w}x${h}-${step}.png`), fullPage: false });
  }
  console.log(`${w}x${h}: ${res.join(' | ')}`);
  await ctx.close();
}
await b.close();
