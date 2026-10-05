#!/usr/bin/env node
// Lintroller link check (SPEC §8). Manual or weekly; never part of the app build, never CI-blocking.
//
// Usage: node data/scripts/check-links.mjs [--only id,id] [--dry-run] [--save-bodies]
//   GETs each unique URL in cancel.json and formats-help.json (redirects followed), one request per second.
//   Writes check + verified back to cancel.json, verified back to formats-help.json, link-report.md and meta.json.
//   --only         check only these entry ids (cancel ids or format ids); other entries are left as they are.
//   --dry-run      run the checks and print counts, but write nothing.
//   --save-bodies  keep response bodies in data/tmp/bodies/ (git-ignored) so article text can be read.
//
// Rules: 403, 429, bot walls and timeouts are recorded as ok: false with a note and never retried.
// The user agent is fixed. A cancel entry is verified when the URL the app would link
// (helpUrl when stepsStated, else manageUrl) has an ok check; ok is 2xx, or a 3xx that ends on an entry domain.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const UA = 'Lintroller-linkcheck/1.0 (+https://lintroller.vercel.app/about)';
const TIMEOUT_MS = 20_000;
const GAP_MS = 1_000;
const HEADERS = {
  'user-agent': UA,
  accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.8',
};

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const SAVE = args.includes('--save-bodies');
const onlyAt = args.indexOf('--only');
if (onlyAt >= 0 && !args[onlyAt + 1]) {
  console.error('--only needs a comma-separated list of ids');
  process.exit(2);
}
const only = onlyAt >= 0 ? new Set(args[onlyAt + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null;
const inScope = (id) => !only || only.has(id);

const dataDir = fileURLToPath(new URL('..', import.meta.url));
const cancelPath = path.join(dataDir, 'cancel.json');
const formatsPath = path.join(dataDir, 'formats-help.json');
const reportPath = path.join(dataDir, 'link-report.md');
const metaPath = path.join(dataDir, 'meta.json');
const bodiesDir = path.join(dataDir, 'tmp', 'bodies');

const now = new Date();
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

const cancel = JSON.parse(await readFile(cancelPath, 'utf8'));
const formats = JSON.parse(await readFile(formatsPath, 'utf8'));

// ---- collect unique URLs, remembering who uses each one -------------------
const uses = new Map(); // url -> [owner label]
const addUse = (url, owner) => {
  if (!uses.has(url)) uses.set(url, []);
  uses.get(url).push(owner);
};
for (const e of cancel) {
  if (!inScope(e.id)) continue;
  if (e.manageUrl) addUse(e.manageUrl, `cancel:${e.id}:manage`);
  if (e.helpUrl) addUse(e.helpUrl, `cancel:${e.id}:help`);
}
for (const f of formats) {
  if (inScope(f.format) && f.helpUrl) addUse(f.helpUrl, `formats:${f.format}:help`);
}

// ---- fetch ----------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce(url) {
  const checkedAt = new Date().toISOString();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    let body = null;
    if (SAVE) body = await res.text();
    else if (res.body) await res.body.cancel();
    return { status: res.status, finalUrl: res.url || url, checkedAt, body, error: null };
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return {
      status: 0, finalUrl: url, checkedAt, body: null,
      error: timedOut ? 'timeout' : (err?.cause?.code || err?.name || 'error'),
    };
  }
}

const results = new Map();
const bodyIndex = {};
const started = Date.now();
let firstRequest = true;
for (const url of uses.keys()) {
  if (!firstRequest) await sleep(GAP_MS);
  firstRequest = false;
  const r = await fetchOnce(url);
  results.set(url, r);
  if (SAVE && r.body !== null) {
    const name = createHash('sha1').update(url).digest('hex').slice(0, 16) + '.html';
    await mkdir(bodiesDir, { recursive: true });
    await writeFile(path.join(bodiesDir, name), r.body);
    bodyIndex[url] = name;
  }
}
const elapsedS = Math.round((Date.now() - started) / 1000);

// ---- verdicts -------------------------------------------------------------
const hostOf = (url) => new URL(url).hostname;
const onDomains = (url, domains) => {
  const h = hostOf(url);
  return domains.some((d) => h === d || h.endsWith('.' + d));
};
const baseDomain = (url) => hostOf(url).split('.').slice(-2).join('.');

const NOTE_BY_STATUS = {
  403: '403 refused (possible bot wall); not retried',
  404: '404 not found',
  406: '406 not acceptable to this agent; not retried',
  429: '429 rate limited; not retried',
};

function verdict(r, domains) {
  if (r.status === 0) {
    return { ok: false, note: r.error === 'timeout' ? 'no response: timed out after 20 s' : `no response: ${r.error}` };
  }
  const onEntry = onDomains(r.finalUrl, domains);
  if (r.status >= 200 && r.status < 300) {
    if (!onEntry) return { ok: true, note: `ends on ${hostOf(r.finalUrl)}, not an entry domain` };
    if (/sign-?in|login/i.test(new URL(r.finalUrl).pathname)) return { ok: true, note: 'redirects to sign-in' };
    return { ok: true };
  }
  if (r.status >= 300 && r.status < 400 && onEntry) return { ok: true, note: 'redirects to sign-in' };
  return { ok: false, note: NOTE_BY_STATUS[r.status] ?? `${r.status} response` };
}

// ---- apply to the data files (keys in stable order) ------------------------
const changes = [];
const reviews = [];
let cancelVerified = 0;
const cancelOut = cancel.map((e) => {
  if (!inScope(e.id)) return e;
  const prev = e.check ?? {};
  const check = {};
  for (const kind of ['manage', 'help']) {
    const url = e[kind === 'manage' ? 'manageUrl' : 'helpUrl'];
    if (!url) continue;
    const r = results.get(url);
    const v = verdict(r, e.domains);
    const rec = { status: r.status, finalUrl: r.finalUrl, checkedAt: r.checkedAt, ok: v.ok };
    if (v.note) rec.note = v.note;
    check[kind] = rec;
    const old = prev[kind];
    if (old && (old.status !== rec.status || old.finalUrl !== rec.finalUrl || old.ok !== rec.ok)) {
      changes.push(`- CHANGED cancel:${e.id} ${kind}: ${old.status} ${old.ok ? 'ok' : 'failed'} -> ${rec.status} ${rec.ok ? 'ok' : 'failed'} (${rec.finalUrl})`);
    }
    if (!v.ok || v.note?.startsWith('ends on')) {
      reviews.push(`- REVIEW cancel:${e.id} ${kind}: ${v.ok ? 'ok' : 'failed'}, ${v.note ?? ''}`.replace(/, $/, ''));
    }
  }
  const linkKind = e.stepsStated ? 'help' : 'manage';
  const verified = check[linkKind]?.ok ? today : null;
  if (verified) cancelVerified += 1;
  const out = {
    id: e.id, name: e.name, category: e.category, domains: e.domains,
    manageUrl: e.manageUrl, helpUrl: e.helpUrl, stepsStated: e.stepsStated,
  };
  if (e.via) out.via = e.via;
  out.notes = e.notes;
  out.check = check;
  out.verified = verified;
  return out;
});

let formatsVerified = 0;
const formatsWithUrl = formats.filter((f) => f.helpUrl).length;
const formatsOut = formats.map((f) => {
  if (!inScope(f.format)) return f;
  let verified = null;
  if (f.helpUrl) {
    const r = results.get(f.helpUrl);
    const v = verdict(r, [baseDomain(f.helpUrl)]);
    if (r.status >= 200 && r.status < 300) verified = today;
    if (!v.ok || v.note?.startsWith('ends on')) {
      reviews.push(`- REVIEW formats:${f.format} help: ${v.ok ? 'ok' : 'failed'}, ${v.note ?? ''}`.replace(/, $/, ''));
    }
  }
  if (verified) formatsVerified += 1;
  return {
    format: f.format, institution: f.institution, product: f.product,
    steps: f.steps, helpUrl: f.helpUrl, verified,
  };
});

// ---- counts ----------------------------------------------------------------
let okCount = 0;
const failByKind = { 403: 0, 404: 0, none: 0, other: 0 };
for (const r of results.values()) {
  if (r.status >= 200 && r.status < 300) okCount += 1;
  else if (r.status === 403) failByKind[403] += 1;
  else if (r.status === 404) failByKind[404] += 1;
  else if (r.status === 0) failByKind.none += 1;
  else failByKind.other += 1;
}
const failCount = results.size - okCount;
const scope = only ? [...only].join(', ') : 'all entries';

console.log(`unique URLs ${results.size}; 2xx ${okCount}; not 2xx ${failCount} (403: ${failByKind[403]}, 404: ${failByKind[404]}, no response: ${failByKind.none}, other: ${failByKind.other}); ${elapsedS} s`);
console.log(`cancel entries ${cancelOut.length}; verified ${cancelVerified}; format helps with a URL ${formatsWithUrl}; verified ${formatsVerified}`);
console.log(`scope: ${scope}${DRY ? '; dry run, nothing written' : ''}`);

if (DRY) process.exit(0);

// ---- write ----------------------------------------------------------------
const stamp = now.toISOString();
const reportRows = [...uses.entries()].map(([url, owners]) => ({ url, owners, r: results.get(url) }));
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const tableLines = [
  '| URL | used by | status | ok | final URL | note |',
  '|---|---|---|---|---|---|',
];
for (const { url, owners, r } of reportRows) {
  const ownerIds = [...new Set(owners.map((o) => o.split(':').slice(0, 2).join(':')))].join(', ');
  const ownerChecks = owners.map((o) => {
    const [kindTag, id, kind] = o.split(':');
    const entry = kindTag === 'cancel' ? cancelOut.find((e) => e.id === id) : formatsOut.find((f) => f.format === id);
    if (!entry) return null;
    const domains = kindTag === 'cancel' ? entry.domains : [baseDomain(url)];
    return verdict(r, domains);
  }).filter(Boolean);
  const ok = ownerChecks.length ? ownerChecks.every((c) => c.ok) : false;
  const note = ownerChecks.map((c) => c.note).filter(Boolean)[0] ?? '';
  tableLines.push(`| ${cell(url)} | ${cell(ownerIds)} | ${r.status} | ${ok ? 'yes' : 'no'} | ${cell(r.finalUrl)} | ${cell(note)} |`);
}

const reportLines = [
  '# Link report: cancel directory and format help',
  '',
  `Checked ${stamp} (${today} ET). Scope: ${scope}. Unique URLs ${results.size}, one request per second, user agent \`${UA}\`.`,
  `Result: 2xx ${okCount}, not 2xx ${failCount} (403 ${failByKind[403]}, 404 ${failByKind[404]}, no response ${failByKind.none}, other ${failByKind.other}).`,
  `Cancel entries ${cancelOut.length}, verified ${cancelVerified}. Format helps with an official URL ${formatsWithUrl}, verified ${formatsVerified}.`,
  '',
  '403 and bot walls are recorded as failed and were not retried with another user agent.',
  '',
  '## REVIEW',
  '',
  ...(changes.length || reviews.length ? [...changes, ...reviews] : ['- none']),
  '',
  '## Checks',
  '',
  ...tableLines,
  '',
];

await writeFile(cancelPath, JSON.stringify(cancelOut, null, 2) + '\n');
await writeFile(formatsPath, JSON.stringify(formatsOut, null, 2) + '\n');
await writeFile(reportPath, reportLines.join('\n'));
if (!only) {
  await writeFile(metaPath, JSON.stringify({ generated: today, linkCheckRanAt: stamp }, null, 2) + '\n');
}
if (SAVE) {
  await writeFile(path.join(bodiesDir, 'index.json'), JSON.stringify(bodyIndex, null, 2) + '\n');
}
console.log(`wrote cancel.json, formats-help.json, link-report.md${only ? '' : ', meta.json'}`);
