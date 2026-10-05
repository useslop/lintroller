#!/usr/bin/env node
// Privacy proof (SPEC §10 steps 1–8), repeatable, published on /privacy (lane I1; Coatpocket's privacy.mjs is the model):
//   npm run build && node app/e2e/privacy.mjs                                   (local dist, vercel.json headers)
//   node app/e2e/privacy.mjs --url https://lintroller.vercel.app [--no-write]   (live)
//
//  1. A canary CSV written by this test from a seeded generator (12 months, Chase card layout; merchants
//     QUOKKA STREAMING and ZEBRAFISH GYM 7781, both $77.77, plus Netflix, Spotify and an Apple-billed plan) walks the
//     whole flow: / → /sweep → import → review (confirm 2, dismiss 1) → summary → each cancel link clicked →
//     CSV and ICS downloads → "Remember on this device" → "Delete everything". Every request in the browser
//     context is recorded, workers included.
//  2. Zero requests of any kind after the initial page load, except the cancel-link clicks. Every request to
//     another host is ABORTED (route.abort) and Chromium can't resolve outside hosts at all, so no merchant
//     site is ever contacted; each aborted URL's host must be on the clicked entry's domains.
//  3. No canary token in any request URL, header or body, the initial load included.
//  4. The request list to our origin is identical for a second, different CSV.
//  5. Storage: no cookies; local/session storage and IndexedDB empty before the opt-in, exactly subsweep:v1
//     after it, empty after "Delete everything".
//  6. CSP: 0 securitypolicyviolation events in the flow, and enforcement proved: an injected fetch('/x') is
//     blocked and reported as a violation.
//  7. Offline after the first load (context.setOffline): import, review, summary and both downloads still work.
//  8. HEAD on every route and static file: the exact SPEC §10 headers. Local runs also re-run build gate (c),
//     the dist/ grep for fetch(, XMLHttpRequest, sendBeacon, WebSocket and EventSource.
// Results go to app/src/privacy-results.json (bundled into /privacy at the next build) unless --no-write.
import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { appDir, distDir, launch, requiredHeaders, rootDir, serveDist, sleep } from './harness.mjs';

const ROUTES = ['/', '/sweep', '/sweep/review', '/sweep/summary', '/how-to-export', '/privacy', '/about',
  '/privacy-results.json', '/robots.txt', '/favicon.svg', '/og.png', '/sample/sample-statement.csv'];
const CANCEL = JSON.parse(readFileSync(path.join(rootDir, 'data/cancel.json'), 'utf8'));
const within = (host, domains) => domains.some((d) => host === d || host.endsWith(`.${d}`));

// Seeded generator (mulberry32): a Chase card file, purchases negative, MM/DD/YYYY, 12 months to 2026-09-28.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeCsv({ seed, series }) {
  const rand = mulberry32(seed);
  const rows = [];
  const day = (y, m, d) => new Date(Date.UTC(y, m, d));
  const fmt = (dt) => `${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${String(dt.getUTCDate()).padStart(2, '0')}/${dt.getUTCFullYear()}`;
  const add = (dt, desc, cat, type, amount) => {
    const post = new Date(dt.getTime() + 86400000);
    rows.push({ dt, line: `${fmt(dt)},${fmt(post)},${desc},${cat},${type},${amount.toFixed(2)},` });
  };
  for (let k = 0; k < 12; k++) {
    const y = 2025 + Math.floor((9 + k) / 12);
    const m = (9 + k) % 12;
    for (const s of series) add(day(y, m, s.day), s.desc, s.cat, 'Sale', -s.amount);
    for (let g = 0; g < 4; g++) add(day(y, m, 2 + g * 7 + Math.floor(rand() * 3)), `TRADER JOE S #${500 + Math.floor(rand() * 90)}`, 'Groceries', 'Sale', -(18 + Math.round(rand() * 7000) / 100));
    add(day(y, m, 9 + Math.floor(rand() * 10)), `SHELL OIL ${57440000 + Math.floor(rand() * 9999)}`, 'Gas', 'Sale', -(25 + Math.round(rand() * 3000) / 100));
    add(day(y, m, 27), 'Payment Thank You-Mobile', '', 'Payment', 300 + Math.round(rand() * 20000) / 100);
  }
  rows.sort((a, b) => b.dt - a.dt);
  return `Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n${rows.map((r) => r.line).join('\n')}\n`;
}
const SHARED = [
  { desc: 'NETFLIX.COM', cat: 'Entertainment', day: 18, amount: 15.49 },
  { desc: 'SPOTIFY USA', cat: 'Entertainment', day: 20, amount: 11.99 },
  { desc: 'APPLE.COM/BILL', cat: 'Shopping', day: 23, amount: 2.99 },
];
const CANARY = {
  label: 'canary', file: 'canary-statement.csv', confirm: [/quokka/i, /zebrafish/i], dismiss: /apple/i,
  tokens: ['QUOKKA', 'ZEBRAFISH', '7781', '77.77', '7777'],
  csv: makeCsv({ seed: 7777, series: [
    { desc: 'QUOKKA STREAMING', cat: 'Entertainment', day: 5, amount: 77.77 },
    { desc: 'ZEBRAFISH GYM 7781', cat: 'Health & Wellness', day: 12, amount: 77.77 },
    ...SHARED] }),
};
const OTHER = {
  label: 'second file', file: 'other-statement.csv', confirm: [/pelican/i, /otter/i], dismiss: /apple/i,
  tokens: ['PELICAN', 'OTTER', '2345', '23.45'],
  csv: makeCsv({ seed: 2345, series: [
    { desc: 'PELICAN NEWS', cat: 'Entertainment', day: 6, amount: 23.45 },
    { desc: 'OTTER CLIMBING 1234', cat: 'Health & Wellness', day: 14, amount: 23.45 },
    ...SHARED] }),
};

const checks = [];
const check = (ok, name, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
  checks.push({ ok: Boolean(ok), name, detail });
};

async function quiet(requests, ms = 800) {
  for (let last = -1, since = Date.now(); Date.now() - since < ms; await sleep(100)) {
    if (requests.length !== last) [last, since] = [requests.length, Date.now()];
  }
}
const storageState = (page) => page.evaluate(async () => ({
  local: Object.keys(localStorage),
  session: Object.keys(sessionStorage),
  idb: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : [],
}));

async function recordRun(browser, base, input, { offline = false, cspProbe = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, serviceWorkers: 'allow' });
  await context.addInitScript(() => {
    window.__cspv = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__cspv.push(`${e.effectiveDirective} ${e.blockedURI}`));
  });
  const origin = new URL(base).origin;
  const requests = [];
  const pending = [];
  const aborted = [];
  let clicking = null;
  await context.route('**/*', (route) => {
    const req = route.request();
    if (new URL(req.url()).origin === origin) return route.continue();
    aborted.push({ url: req.url(), type: req.resourceType(), clicked: clicking });
    return route.abort('blockedbyclient');
  });
  context.on('request', (req) => {
    const entry = { method: req.method(), url: req.url(), type: req.resourceType(), body: req.postData() ?? null, headers: {} };
    requests.push(entry);
    pending.push(req.allHeaders().then((h) => (entry.headers = h)).catch(() => {}));
  });
  const errors = [];
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const out = { origin, requests, aborted, errors, opened: [] };

  // Initial load: the landing page, then the import screen; wait until nothing has started for 800 ms.
  await page.goto(`${base}/`);
  await page.getByRole('link', { name: 'Start', exact: true }).first().click();
  await page.waitForURL(/\/sweep$/);
  await page.locator('input[type=file]').waitFor({ state: 'attached' });
  await quiet(requests);
  out.loadCount = requests.length;
  if (offline) await context.setOffline(true);
  out.before = await storageState(page);
  out.cookiesBefore = (await context.cookies()).length;

  await page.locator('input[type=file]').setInputFiles({ name: input.file, mimeType: 'text/csv', buffer: Buffer.from(input.csv) });
  const next = page.getByRole('button', { name: 'Next: review' });
  await next.waitFor({ timeout: 15000 });
  out.readLine = (await page.locator('[aria-live="polite"]').first().innerText()).trim();
  await next.click();
  await page.waitForURL(/\/sweep\/review$/);
  const cards = page.locator('article.card');
  await cards.first().waitFor();
  out.cards = await cards.count();
  const titles = await cards.locator('h3').allInnerTexts();
  const pick = (re) => titles.findIndex((t) => re.test(t));
  out.marked = [];
  for (const re of input.confirm) {
    const i = pick(re);
    if (i < 0) continue;
    await cards.nth(i).getByRole('button', { name: 'Yes, it repeats' }).click();
    out.marked.push(`confirmed ${titles[i]}`);
  }
  const d = pick(input.dismiss);
  if (d >= 0) {
    await cards.nth(d).getByRole('button', { name: 'Not a repeating charge' }).click();
    out.marked.push(`dismissed ${titles[d]}`);
  }
  await page.getByRole('link', { name: 'See your yearly summary' }).click();
  await page.waitForURL(/\/sweep\/summary$/);
  out.headline = (await page.locator('main').innerText()).split('\n').find((l) => /^Confirmed:/.test(l.trim()))?.trim() ?? '';

  if (!offline) {
    const links = page.locator('p.cancel a');
    for (let i = 0; i < (await links.count()); i++) {
      const text = await links.nth(i).innerText();
      const entry = CANCEL.find((e) => text.startsWith(`${e.name}:`));
      clicking = entry?.id ?? text;
      const before = aborted.length;
      const popupP = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      await links.nth(i).click();
      const popup = await popupP;
      for (let t = 0; t < 40 && aborted.length === before; t++) await sleep(50);
      await popup?.close().catch(() => {});
      out.opened.push({ text, id: entry?.id ?? null, domains: entry?.domains ?? [], aborted: aborted.slice(before) });
      clicking = null;
    }
  }

  const download = async (name) => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.getByRole('button', { name }).click()]);
    return { url: dl.url(), text: await readFile(await dl.path(), 'utf8') };
  };
  out.csv = await download('Download CSV');
  out.ics = await download('Calendar reminders (.ics)');

  await page.getByLabel('Remember on this device').check();
  await sleep(200);
  out.afterOptIn = await storageState(page);
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.waitForURL((u) => new URL(u).pathname === '/');
  await sleep(200);
  out.afterDelete = await storageState(page);
  out.cookiesAfter = (await context.cookies()).length;
  out.violations = await page.evaluate(() => window.__cspv.slice());

  if (cspProbe) {
    out.probeCount = requests.length;
    out.probe = await page.evaluate(() => fetch('/x').then(() => 'sent', () => 'blocked'));
    await sleep(300);
    out.probeViolations = (await page.evaluate(() => window.__cspv.slice())).slice(out.violations.length);
    out.probeRequests = requests.slice(out.probeCount).map((r) => r.url);
  }
  await quiet(requests, 400);
  await Promise.all(pending);
  out.serviceWorkers = context.serviceWorkers().length;
  await context.close();
  return out;
}

const ours = (run) => run.requests.filter((r) => new URL(r.url).origin === run.origin);
const signature = (run) => ours(run).map((r) => `${r.method} ${new URL(r.url).pathname}${new URL(r.url).search}`);
const afterLoad = (run) => run.requests.slice(run.loadCount, run.probeCount ?? run.requests.length);
function leaks(run, tokens) {
  const hits = [];
  for (const r of run.requests) {
    let decoded = r.url;
    try { decoded = decodeURIComponent(r.url); } catch {}
    const hay = [r.url, decoded, r.body ?? '', ...Object.entries(r.headers).flat()].join('\n').toUpperCase();
    for (const t of tokens) if (hay.includes(t.toUpperCase())) hits.push(`${t} in ${r.method} ${r.url}`);
  }
  return hits;
}

async function headerChecks(base) {
  const want = requiredHeaders();
  const assets = readdirSync(path.join(distDir, 'assets')).map((f) => `/assets/${f}`);
  const rows = [];
  for (const route of [...ROUTES, ...assets]) {
    let res;
    let target = route;
    if (route.startsWith('/assets/')) {
      // A live run checks the live asset names (read from the live shell), not this checkout's.
      if (base.startsWith('https://')) continue;
    }
    res = await fetch(`${base}${target}`, { method: 'HEAD', redirect: 'manual' });
    const wrong = Object.entries(want).filter(([k, v]) => res.headers.get(k) !== v).map(([k]) => k);
    rows.push({ route: target, status: res.status, wrong });
  }
  if (base.startsWith('https://')) {
    const shell = await (await fetch(`${base}/sweep`)).text();
    const live = [...shell.matchAll(/\/assets\/[\w.-]+\.(?:js|css)/g)].map((m) => m[0]);
    const main = live.find((a) => a.endsWith('.js'));
    if (main) {
      const js = await (await fetch(`${base}${main}`)).text();
      live.push(...[...js.matchAll(/assets\/engine\.worker-[\w-]+\.js/g)].map((m) => `/${m[0]}`));
    }
    for (const a of [...new Set(live)]) {
      const res = await fetch(`${base}${a}`, { method: 'HEAD', redirect: 'manual' });
      rows.push({ route: a, status: res.status, wrong: Object.entries(want).filter(([k, v]) => res.headers.get(k) !== v).map(([k]) => k) });
    }
  }
  for (const r of rows) {
    check(r.status === 200 && r.wrong.length === 0, `exact SPEC §10 headers on ${r.route}`, `HTTP ${r.status}${r.wrong.length ? `; wrong: ${r.wrong.join(', ')}` : ''}`);
  }
  return rows;
}

async function main() {
  const urlArg = process.argv.indexOf('--url');
  const live = urlArg > -1 ? process.argv[urlArg + 1].replace(/\/$/, '') : null;
  const write = !process.argv.includes('--no-write');
  const server = live ? null : await serveDist();
  const base = live ?? server.url;
  console.log(`Privacy e2e against ${base}${live ? ' (live)' : ' (local dist with vercel.json headers)'}`);
  const browser = await launch(base);
  let a;
  let b;
  let headerRows = [];
  try {
    a = await recordRun(browser, base, CANARY, { cspProbe: true });
    b = await recordRun(browser, base, OTHER);
    for (const run of [a, b]) {
      check(run.cards >= 4 && run.marked.length === 3 && run.headline,
        `flow walked with the ${run === a ? 'canary' : 'second'} file: import, review (confirm 2, dismiss 1), summary`,
        `${run.readLine.replace(/\s+/g, ' ')} ${run.marked.join('; ')}; ${run.headline}`);
    }
    const extraA = afterLoad(a).filter((r) => !a.opened.some((o) => o.aborted.some((x) => x.url === r.url)));
    const extraB = afterLoad(b).filter((r) => !b.opened.some((o) => o.aborted.some((x) => x.url === r.url)));
    check(extraA.length === 0 && extraB.length === 0, 'zero requests after the initial page load, other than the cancel-link clicks',
      `canary: ${afterLoad(a).length} after load (${a.loadCount} during load), second: ${afterLoad(b).length}${[...extraA, ...extraB].length ? `; unexpected: ${[...extraA, ...extraB].slice(0, 3).map((r) => r.url).join(', ')}` : ''}`);
    const opened = [...a.opened, ...b.opened];
    const offDomain = opened.filter((o) => o.aborted.length !== 1 || o.aborted[0].type !== 'document' || !within(new URL(o.aborted[0].url).hostname, o.domains));
    check(a.opened.length >= 2 && opened.length >= 4 && offDomain.length === 0, "each cancel-link click: one navigation, aborted, on the clicked entry's domains",
      `${opened.length - offDomain.length}/${opened.length}: ${a.opened.map((o) => `${o.id} → ${o.aborted[0] ? new URL(o.aborted[0].url).hostname : 'none'}`).join(', ')}`);
    const outside = [...a.requests, ...b.requests].filter((r) => new URL(r.url).origin !== a.origin);
    const notClicked = outside.filter((r) => !opened.some((o) => o.aborted.some((x) => x.url === r.url)));
    check(notClicked.length === 0, 'no request to any other host, the initial load included (no fonts, scripts, analytics, beacons)',
      `${outside.length} outside requests, all cancel-link clicks`);
    const hits = [...leaks(a, CANARY.tokens), ...leaks(b, OTHER.tokens)];
    check(hits.length === 0, 'no canary token (QUOKKA, ZEBRAFISH, 7781, 77.77) in any request URL, header or body', hits.slice(0, 3).join('; '));
    const withBody = [...a.requests, ...b.requests].filter((r) => r.body || !['GET', 'HEAD'].includes(r.method));
    check(withBody.length === 0, 'all requests are GETs with no body', `${withBody.length} others`);
    const sa = signature(a);
    const sb = signature(b);
    check(JSON.stringify(sa) === JSON.stringify(sb), 'request list to our origin is identical for a second, different file', `${sa.length} requests: ${sa.join(', ')}`);
    for (const run of [a, b]) {
      const blob = run.csv.url.startsWith('blob:') && run.ics.url.startsWith('blob:');
      const csvOk = run === a ? /QUOKKA|Quokka|quokka/.test(run.csv.text) : /PELICAN|Pelican|pelican/.test(run.csv.text);
      const icsOk = run.ics.text.startsWith('BEGIN:VCALENDAR') && run.ics.text.includes('END:VCALENDAR');
      if (run === a) check(blob && csvOk && icsOk, 'CSV and ICS are built in the browser and saved from blob: URLs', `CSV ${run.csv.text.length} chars, ICS ${run.ics.text.length} chars`);
    }
    const empty = (s) => s.local.length === 0 && s.session.length === 0 && s.idb.length === 0;
    check(empty(a.before) && a.cookiesBefore === 0, 'before the opt-in: no cookies, local/session storage and IndexedDB empty', JSON.stringify(a.before));
    check(a.afterOptIn.local.length === 1 && a.afterOptIn.local[0] === 'subsweep:v1' && a.afterOptIn.session.length === 0 && a.afterOptIn.idb.length === 0,
      'after "Remember on this device": exactly one key, subsweep:v1', JSON.stringify(a.afterOptIn));
    check(empty(a.afterDelete) && a.cookiesAfter === 0, 'after "Delete everything": storage empty, no cookies', JSON.stringify(a.afterDelete));
    check(a.serviceWorkers === 0 && b.serviceWorkers === 0, 'no service worker registered');
    check(a.violations.length === 0 && b.violations.length === 0, '0 securitypolicyviolation events during the flow', [...a.violations, ...b.violations].slice(0, 3).join('; '));
    check(a.probe === 'blocked' && a.probeViolations.some((v) => v.startsWith('connect-src')) && a.probeRequests.length === 0,
      "CSP enforced: a request to /x made by script in the page is blocked and reported (connect-src 'none')",
      `probe → ${a.probe}; violations: ${a.probeViolations.join(', ') || 'none'}; requests sent: ${a.probeRequests.length}`);
    const errs = [...a.errors, ...b.errors].filter((e) => !/Content Security Policy|ERR_BLOCKED_BY_CLIENT|net::ERR_/.test(e));
    check(errs.length === 0, 'no console errors', errs.slice(0, 2).join(' | '));

    const off = await recordRun(browser, base, CANARY, { offline: true });
    check(off.marked.length === 3 && off.headline && off.csv.text.length > 0 && off.ics.text.startsWith('BEGIN:VCALENDAR') && afterLoad(off).length === 0,
      'offline after the first load: import, review, summary, CSV and ICS still work',
      `${off.readLine.replace(/\s+/g, ' ')}; ${afterLoad(off).length} requests attempted while offline`);

    headerRows = await headerChecks(base);
    if (!live) {
      const res = spawnSync(process.execPath, [path.join(appDir, 'scripts/gates.mjs'), '--only', 'c'], { encoding: 'utf8' });
      const line = res.stdout.split('\n').find((l) => l.includes('(c)')) ?? '';
      // Published text stays plain: the bundle carries these names, and gate (c) greps the bundle for API names.
      check(line.startsWith('PASS'), 'shipped JS has no network API calls (build gate c, a grep of dist/)', line.match(/: (\d+ hits)/)?.[1] ?? line.slice(0, 20));
    }
  } finally {
    await browser.close();
    await server?.close();
  }

  const passed = checks.filter((c) => c.ok).length;
  const commit = spawnSync('git', ['-C', rootDir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const record = {
    status: `${passed === checks.length ? 'passed' : 'FAILED'} ${passed} of ${checks.length} checks on ${live ? live.replace(/^https:\/\//, '') : 'a local build'}`,
    ranAt: new Date().toISOString(),
    target: live ?? 'local build (dist/ served with vercel.json headers)',
    commit,
    canary: 'QUOKKA STREAMING and ZEBRAFISH GYM 7781 at $77.77, 12 months, seeded generator (seed 7777); second file seed 2345',
    passed,
    total: checks.length,
    checks: checks.map((c) => ({ name: c.name, result: `${c.ok ? 'pass' : 'FAIL'}${c.detail ? ` (${c.detail.slice(0, 220)})` : ''}` })),
    requestsDuringLoad: a ? signature(a) : [],
    requestsAfterLoad: a ? afterLoad(a).length : null,
    cancelLinksClicked: a ? a.opened.map((o) => ({ entry: o.id, host: o.aborted[0] ? new URL(o.aborted[0].url).hostname : null, aborted: true })) : [],
    headers: headerRows.map((r) => ({ route: r.route, status: r.status, exact: r.wrong.length === 0 })),
  };
  if (write) {
    await writeFile(path.join(appDir, 'src/privacy-results.json'), `${JSON.stringify(record, null, 2)}\n`);
    console.log('wrote app/src/privacy-results.json (published on /privacy at the next build)');
  }
  console.log(`\nPRIVACY E2E ${passed === checks.length ? 'PASSED' : 'FAILED'}: ${passed}/${checks.length}`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
