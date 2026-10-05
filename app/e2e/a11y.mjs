#!/usr/bin/env node
// axe-core on the main screens at iPhone size (390x844), plus full-page screenshots.
//   node app/e2e/a11y.mjs [--url https://lintroller.vercel.app] [--shots <dir>]
// Fails on any serious or critical violation. Outside hosts are unresolvable (harness DNS rule)
// and every outside navigation is also aborted here in the page's own route handler.
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { appDir, launch, serveDist } from './harness.mjs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const detailDir = '/tmp/i1-a11y';

const urlArg = process.argv.indexOf('--url');
const live = urlArg > -1 ? process.argv[urlArg + 1].replace(/\/$/, '') : null;
const shotsArg = process.argv.indexOf('--shots');
const shots = shotsArg > -1 ? path.resolve(process.argv[shotsArg + 1]) : path.join(appDir, 'shots');

const results = [];
async function audit(page, name) {
  await page.evaluate(axeSource); // CDP evaluation: not an inline script, so the CSP stays as shipped
  const r = await page.evaluate(async () =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
  );
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  results.push({ screen: name, bad: bad.length });
  console.log(`${name} violations serious/critical: ${bad.length}${bad.length ? ` (${bad.map((v) => v.id).join(', ')})` : ''}`);
  await writeFile(path.join(detailDir, `axe-${name}.json`), JSON.stringify(r.violations, null, 2));
  await page.screenshot({ path: path.join(shots, `${String(results.length).padStart(2, '0')}-${name}.png`), fullPage: true });
}

await mkdir(detailDir, { recursive: true });
await mkdir(shots, { recursive: true });
const server = live ? null : await serveDist();
const base = live ?? server.url;
const browser = await launch(base);
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const origin = new URL(base).origin;
  await context.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient')));
  const page = await context.newPage();

  await page.goto(`${base}/`);
  await page.getByRole('link', { name: 'Start', exact: true }).first().waitFor();
  await audit(page, 'landing');

  await page.goto(`${base}/sweep`);
  await page.getByRole('button', { name: 'Try the sample file' }).waitFor();
  await audit(page, 'sweep-empty');

  await page.getByRole('button', { name: 'Try the sample file' }).click();
  await page.getByText('like they repeat.').waitFor();
  await audit(page, 'sweep-sample');

  await page.getByRole('button', { name: 'Next: review' }).click();
  await page.getByRole('heading', { name: 'Review what repeats' }).waitFor();
  await audit(page, 'sweep-review');

  const cards = page.locator('section.group article.card');
  await cards.nth(0).getByRole('button', { name: 'Yes, it repeats' }).click();
  await cards.nth(1).getByRole('button', { name: 'Not a repeating charge' }).click();
  await page.getByText('Marked: not a repeating charge.').waitFor();
  await audit(page, 'sweep-review-actioned');

  await page.getByRole('link', { name: 'See your yearly summary' }).click();
  await page.getByRole('heading', { name: 'Your yearly summary' }).waitFor();
  await audit(page, 'sweep-summary');

  await page.goto(`${base}/how-to-export`);
  await page.locator('h1').first().waitFor();
  await audit(page, 'how-to-export');

  await page.goto(`${base}/privacy`);
  await page.locator('h1').first().waitFor();
  await audit(page, 'privacy');

  await page.goto(`${base}/about`);
  await page.locator('h1').first().waitFor();
  await audit(page, 'about');

  await context.close();
} finally {
  await browser.close();
  await server?.close();
}

const zero = results.filter((r) => r.bad === 0).length;
console.log(`\naxe: ${zero}/${results.length} screens with 0 serious/critical`);
process.exit(zero === results.length ? 0 : 1);
