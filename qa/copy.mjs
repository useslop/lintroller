// Q1: never-say grep over the visible text of each route (live) plus the review/summary dumps in qa/out,
// and over string literals in the live JS bundles. Prints hits only.
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const NEVER = /\b(every|overnight|in minutes|no humans|fully autonomous|guarantee[ds]?|ai-powered|insane|revolutionary|10x|magic|link in bio|we found all|all your subscriptions|save \$|you'll save|you could save|cancel for you|subscription found)\b/gi;
const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const b = await chromium.launch({ executablePath: exe, headless: true });
const page = await (await b.newContext()).newPage();
const texts = {};
for (const r of ['/', '/sweep', '/how-to-export', '/privacy', '/about', '/nope-404']) {
  await page.goto('https://lintroller.vercel.app' + r); await page.waitForTimeout(500);
  texts[r] = await page.evaluate(() => document.body.innerText + '\n' + [...document.querySelectorAll('[aria-label],[title],[alt]')].map((e) => [e.getAttribute('aria-label'), e.title, e.alt].join(' ')).join('\n') + '\n' + document.title + '\n' + (document.querySelector('meta[name=description]')?.content ?? ''));
  writeFileSync(`qa/out/route${r.replace(/\//g, '_') || '_'}.txt`, texts[r]);
}
for (const f of readdirSync('qa/out').filter((f) => /\.(review|summary|import)\.txt$/.test(f))) texts[f] = readFileSync('qa/out/' + f, 'utf8');
let hits = 0;
for (const [k, t] of Object.entries(texts)) for (const m of t.matchAll(NEVER)) { hits++; console.log(`TEXT ${k}: "${t.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\n/g, ' ')}"`); }
const html = execFileSync('curl', ['-s', 'https://lintroller.vercel.app/sweep']).toString();
const urls = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let js = urls.map((u) => execFileSync('curl', ['-s', 'https://lintroller.vercel.app' + u], { maxBuffer: 64e6 }).toString()).join('\n');
const w = js.match(/engine\.worker-[\w-]+\.js/); if (w) js += execFileSync('curl', ['-s', 'https://lintroller.vercel.app/assets/' + w[0]], { maxBuffer: 64e6 }).toString();
const lits = [...js.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n]){6,400})\1/g)].map((m) => m[2]).filter((s) => / /.test(s));
for (const s of lits) for (const m of s.matchAll(NEVER)) { hits++; console.log(`JS literal: "${s.slice(Math.max(0, m.index - 60), m.index + 60)}"`); }
console.log(`routes ${Object.keys(texts).length} texts, ${lits.length} JS string literals with a space; never-say hits: ${hits}`);
await b.close();
