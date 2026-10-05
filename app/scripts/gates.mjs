#!/usr/bin/env node
// Build gates (lane I1, SPEC §12). Run by `npm run build` after vite build and the prerender; each
// failing gate fails the build. Never loosen a gate to get a build through: fix the cause, or record it.
//   (a) copy lint (SPEC §4): string literals and JSX text in app/src/**/*.tsx, the prerendered HTML,
//       README.md, docs/RECEIPT-DRAFT.md and the data notes and steps;
//   (b) outbound links: each http(s) URL in dist/ HTML and JS is a cancel.json / formats-help.json URL on
//       its entry's domains, one of our hosts, or a law page that RESEARCH §4 cites;
//   (c) no fetch(, XMLHttpRequest, sendBeacon, WebSocket or EventSource in dist/assets/*.js;
//   (d) data schemas and B3's data rules (the data workspace's tests);
//   (e) vercel.json headers equal the SPEC §10 header block byte for byte;
//   (f) no dangerouslySetInnerHTML, eval(, new Function( or console.log in app/src or engine/src;
//   (g) the corpus evaluator passes the SPEC §9 gates (`npm run eval -w corpus`);
//   (h) JS ≤ 180 KB gzip in total.
//   node scripts/gates.mjs [--dist <dir>] [--only a,b,...]
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { lintCopy } from '../../engine/src/copy-lint.ts';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(appDir, '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const dist = resolve(arg('--dist') ?? join(appDir, 'dist'));
const only = arg('--only')?.split(',');
const run = (id) => !only || only.includes(id);

const failures = [];
const gate = (id, ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  (${id}) ${msg}`);
  if (!ok) failures.push(`(${id}) ${msg}`);
};

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`gates: ${dist}/index.html missing; run the build first`);
  process.exit(1);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') walk(p, out);
    } else out.push(p);
  }
  return out;
}
const distFiles = walk(dist);
const jsFiles = distFiles.filter((f) => ['.js', '.mjs'].includes(extname(f)));
const htmlFiles = distFiles.filter((f) => extname(f) === '.html');
const rel = (p) => relative(dist, p);
const read = (p) => readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const cancel = readJson(join(root, 'data/cancel.json'));
const formats = readJson(join(root, 'data/formats-help.json'));

// (a) copy lint.
if (run('a')) {
  const LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  const JSX_TEXT = />([^<>{}\n]+)</g;
  const hits = [];
  const check = (where, text) => {
    for (const h of lintCopy(text)) hits.push(`${where}: "${h.term}" in "${text.slice(Math.max(0, h.index - 30), h.index + 40).replace(/\s+/g, ' ')}"`);
  };
  const tsx = walk(join(appDir, 'src')).filter((f) => f.endsWith('.tsx'));
  let strings = 0;
  for (const f of tsx) {
    const text = read(f);
    for (const m of text.matchAll(LITERAL)) (strings++, check(relative(root, f), m[1] ?? m[2] ?? m[3] ?? ''));
    for (const m of text.matchAll(JSX_TEXT)) (strings++, check(relative(root, f), m[1] ?? ''));
  }
  for (const f of htmlFiles) {
    const html = read(f).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const attrs = [...html.matchAll(/\b(?:content|alt|title|aria-label|placeholder)="([^"]*)"/gi)].map((m) => m[1]);
    const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
    check(`dist/${rel(f)}`, `${text}\n${attrs.join('\n')}`);
  }
  const docs = ['README.md', 'docs/RECEIPT-DRAFT.md'].filter((p) => existsSync(join(root, p)));
  for (const p of docs) check(p, read(join(root, p)));
  let notes = 0;
  for (const e of cancel) for (const s of [e.notes].flat().filter(Boolean)) (notes++, check(`data/cancel.json ${e.id}`, String(s)));
  for (const e of formats) for (const s of [e.steps].flat().filter(Boolean)) (notes++, check(`data/formats-help.json ${e.format}`, String(s)));
  gate('a', hits.length === 0,
    `copy lint: ${strings} strings in ${tsx.length} .tsx files, ${htmlFiles.length} HTML pages, ${docs.join(' + ') || 'no docs'}, ${notes} data notes/steps: ${hits.length} never-say hits`);
  for (const h of hits.slice(0, 15)) console.log(`      ${h}`);
}

// (b) outbound links.
if (run('b')) {
  const OURS = ['lintroller.vercel.app', 'useslop.com', 'github.com/useslop/'];
  // Law pages: only the consumerfinance.gov / ecfr.gov / ftc.gov URLs that RESEARCH §4 cites (fragment dropped).
  const research = read(join(root, 'docs/RESEARCH.md'));
  const s4 = research.slice(research.indexOf('## §4.'), research.indexOf('## §5.'));
  const LAW = new Set([...s4.matchAll(/https:\/\/(?:www\.)?(?:consumerfinance|ecfr|ftc)\.gov\/[^\s)>"'`|]*/g)]
    .map((m) => m[0].replace(/[.,;:]+$/, '').split('#')[0]));
  // Strings that look like URLs but are never links: library constants, each with file, snippet and reason.
  const NOT_LINKS = [
    { file: /^assets\/index-[\w-]+\.js$/, url: 'http://www.w3.org/2000/svg', reason: 'React DOM: SVG namespace URI for createElementNS, not a link' },
    { file: /^assets\/index-[\w-]+\.js$/, url: 'http://www.w3.org/1998/Math/MathML', reason: 'React DOM: MathML namespace URI, not a link' },
    { file: /^assets\/index-[\w-]+\.js$/, url: 'http://www.w3.org/1999/xlink', reason: 'React DOM: xlink attribute namespace URI, not a link' },
    { file: /^assets\/index-[\w-]+\.js$/, url: 'http://www.w3.org/XML/1998/namespace', reason: 'React DOM: xml: attribute namespace URI, not a link' },
    { file: /^assets\/index-[\w-]+\.js$/, url: 'https://react.dev/errors/', reason: 'React: base of the minified error message text, never rendered as a link' },
  ];
  const within = (host, domain) => host === domain || host.endsWith(`.${domain}`);
  const dataUrl = new Map();
  for (const e of cancel) for (const u of [e.manageUrl, e.helpUrl].filter(Boolean)) {
    const host = new URL(u).hostname.toLowerCase();
    dataUrl.set(u, u.startsWith('https://') && (e.domains ?? []).some((d) => within(host, d.toLowerCase())) ? 'ok' : `cancel.json ${e.id}: host ${host} is not on its domains`);
  }
  for (const e of formats) if (e.helpUrl) dataUrl.set(e.helpUrl, e.helpUrl.startsWith('https://') ? 'ok' : `formats-help.json ${e.format}: not https`);
  const bad = [];
  let count = 0;
  for (const f of [...htmlFiles, ...jsFiles]) {
    const text = read(f);
    for (const m of text.matchAll(/https?:\/\/[^\s"'`<>\\]+/g)) {
      count++;
      const url = m[0].replace(/[.,;:)]+$/, '').replace(/&amp;/g, '&');
      const verdict = dataUrl.get(url) ?? dataUrl.get(m[0]);
      if (verdict === 'ok') continue;
      if (verdict) { bad.push(`${rel(f)}: ${verdict}`); continue; }
      if (OURS.some((o) => url.startsWith(`https://${o}`))) continue;
      if (LAW.has(url.split('#')[0])) continue;
      if (NOT_LINKS.some((n) => n.url === url && n.file.test(rel(f)))) continue;
      bad.push(`${rel(f)}: ${url.slice(0, 120)}`);
    }
  }
  gate('b', bad.length === 0,
    `outbound links: ${count} URLs in ${htmlFiles.length} HTML + ${jsFiles.length} JS files; ${dataUrl.size} data URLs, ${LAW.size} RESEARCH §4 law pages, ${NOT_LINKS.length} allowlisted library constants; ${bad.length} off the allowlist`);
  for (const b of [...new Set(bad)].slice(0, 15)) console.log(`      ${b}`);
}

// (c) network APIs in shipped JS. Allowlist entries (none needed today) must carry file, exact snippet and reason.
if (run('c')) {
  const ALLOW = [];
  const bad = [];
  for (const f of jsFiles.filter((f) => rel(f).startsWith('assets/'))) {
    const src = read(f);
    for (const m of src.matchAll(/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/g)) {
      const snippet = src.slice(Math.max(0, m.index - 30), m.index + 40);
      if (ALLOW.some((a) => a.file.test(rel(f)) && snippet.includes(a.snippet))) continue;
      bad.push(`${rel(f)}: …${snippet.replace(/\s+/g, ' ')}…`);
    }
  }
  gate('c', bad.length === 0, `network APIs in dist/assets/*.js (fetch(, XMLHttpRequest, sendBeacon, WebSocket, EventSource): ${bad.length} hits, ${ALLOW.length} allowlisted`);
  for (const b of bad.slice(0, 10)) console.log(`      ${b}`);
}

// (d) data schemas and B3's data rules: the data workspace's tests (zod schemas for all three files, unique ids,
// https + entry-domain URLs, the denylist, verified links only when checked, floors, dataMeta counts, copy lint).
if (run('d')) {
  const res = spawnSync('npm', ['test', '-w', 'data', '--silent'], { cwd: root, encoding: 'utf8' });
  const out = `${res.stdout}${res.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
  const tests = out.match(/Tests\s+(.+)/)?.[1]?.trim() ?? 'no vitest summary';
  gate('d', res.status === 0, `data schemas and rules (npm test -w data): ${tests}; ${cancel.length} cancel entries, ${cancel.filter((e) => e.verified).length} verified, ${formats.length} format guides`);
  if (res.status !== 0) for (const l of out.split('\n').filter((l) => /FAIL|✗|×|Error/.test(l)).slice(0, 10)) console.log(`      ${l.trim()}`);
}

// (e) headers: vercel.json's catch-all rule equals SPEC §10's header block, byte for byte and in order.
if (run('e')) {
  const spec = read(join(root, 'docs/SPEC.md'));
  const s10 = spec.slice(spec.indexOf('## 10.'), spec.indexOf('## 11.'));
  const block = s10.match(/\*\*Headers on every route\*\*[\s\S]*?```\n([\s\S]*?)```/)?.[1] ?? '';
  const want = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const cfg = readJson(join(root, 'vercel.json'));
  const rules = cfg.headers ?? [];
  const all = rules.find((r) => r.source === '/(.*)');
  const got = (all?.headers ?? []).map((h) => `${h.key}: ${h.value}`);
  const others = rules.filter((r) => r !== all).flatMap((r) => r.headers.map((h) => h.key.toLowerCase()))
    .filter((k) => want.some((w) => w.toLowerCase().startsWith(`${k}:`)));
  const same = want.length > 0 && want.length === got.length && want.every((w, i) => w === got[i]);
  gate('e', same && others.length === 0,
    `vercel.json headers vs SPEC §10: ${want.length} expected, ${got.length} on /(.*), ${same ? 'identical' : 'DIFFERENT'}; ${others.length} overriding rules`);
  if (!same) for (const [i, w] of want.entries()) if (w !== got[i]) console.log(`      want: ${w}\n      got:  ${got[i] ?? '(missing)'}`);
}

// (f) banned code in our sources.
if (run('f')) {
  const files = [...walk(join(appDir, 'src')), ...walk(join(root, 'engine/src'))].filter((f) => /\.(tsx?|mjs|js)$/.test(f));
  const bad = [];
  for (const f of files) {
    const lines = read(f).split('\n');
    lines.forEach((l, i) => {
      for (const m of l.matchAll(/dangerouslySetInnerHTML|\beval\(|new Function\(|console\.log/g)) bad.push(`${relative(root, f)}:${i + 1}: ${m[0]}`);
    });
  }
  gate('f', bad.length === 0, `dangerouslySetInnerHTML / eval( / new Function( / console.log in app/src + engine/src (${files.length} files): ${bad.length} hits`);
  for (const b of bad.slice(0, 10)) console.log(`      ${b}`);
}

// (g) corpus evaluator (lane B4). Enforced as soon as corpus/package.json with an "eval" script is committed;
// until then (B4 still writing, nothing in git) it reports PEND, and a deploy build from a clean worktree of
// main cannot see uncommitted corpus files anyway.
if (run('g')) {
  const pkgPath = join(root, 'corpus/package.json');
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', 'corpus/package.json'], { cwd: root }).status === 0;
  const evalScript = tracked && existsSync(pkgPath) ? readJson(pkgPath).scripts?.eval : undefined;
  if (!evalScript) {
    console.log(`PEND  (g) corpus evaluator: ${existsSync(pkgPath) ? 'corpus/package.json is not committed yet' : 'no corpus/package.json yet'} (lane B4); enforced once it is committed with an "eval" script`);
  } else {
    const res = spawnSync('npm', ['run', 'eval', '-w', 'corpus', '--silent'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const out = `${res.stdout}${res.stderr}`.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n');
    gate('g', res.status === 0, `corpus evaluator (npm run eval -w corpus): exit ${res.status}`);
    for (const l of out.slice(-12)) console.log(`      ${l}`);
  }
}

// (h) bundle budget.
if (run('h')) {
  const sizes = jsFiles.map((f) => ({ f: rel(f), gz: gzipSync(readFileSync(f), { level: 9 }).length }));
  const total = sizes.reduce((s, x) => s + x.gz, 0);
  gate('h', total <= 180 * 1024,
    `JS gzip total ${(total / 1024).toFixed(1)} KB ≤ 180 KB (${sizes.map((s) => `${s.f} ${(s.gz / 1024).toFixed(1)} KB`).join(', ')})`);
}

console.log(failures.length ? `\nGATES FAILED (${failures.length})` : '\nGATES PASSED');
process.exit(failures.length ? 1 : 0);
