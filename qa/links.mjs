// Q1: cancel-directory spot check. (1) Which unverified entries' URLs ship in the live bundle;
// (2) 15 random verified entries fetched with curl, honest UA, 1 per second: status, final host,
// final host on the entry's domains, sign-in/claim landing. Writes qa/out/links-check.json; prints a table.
// Run: node qa/links.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const UA = 'LintrollerQA/1.0 (link check for lintroller.vercel.app; one request per second)';
const entries = JSON.parse(readFileSync('data/cancel.json', 'utf8'));
const html = execFileSync('curl', ['-s', 'https://lintroller.vercel.app/sweep']).toString();
const js = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => execFileSync('curl', ['-s', 'https://lintroller.vercel.app' + m[1]], { maxBuffer: 64e6 }).toString()).join('\n');
const unverified = entries.filter((e) => !e.verified);
const shipped = unverified.filter((e) => [e.manageUrl, e.helpUrl].some((u) => u && js.includes(u)));
console.log(`unverified entries: ${unverified.length}; their URLs present in live JS: ${shipped.length}${shipped.length ? ' -> ' + shipped.map((e) => e.id).join(', ') : ''}`);
const onDomains = (host, e) => e.domains.some((d) => host === d || host.endsWith('.' + d));
let s = 7;
const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);
const verified = entries.filter((e) => e.verified);
const sample = [];
for (const id of ['amazon-prime', 'amazon-channels', 'paypal']) { const e = verified.find((x) => x.id === id); if (e) sample.push(e); }
while (sample.length < 18) { const e = verified[Math.floor(rnd() * verified.length)]; if (!sample.includes(e)) sample.push(e); }
const rows = [];
for (const e of sample) {
  const url = e.manageUrl ?? e.helpUrl;
  let out = '';
  try {
    out = execFileSync('curl', ['-s', '-o', '/dev/null', '-L', '--max-time', '15', '-A', UA, '-w', '%{http_code} %{url_effective}', url]).toString();
  } catch (err) { out = 'ERR ' + String(err.status); }
  const [code, finalUrl = ''] = out.split(' ');
  let host = '';
  try { host = new URL(finalUrl).hostname; } catch {}
  const signin = /signin|sign-in|login|\/ax\/claim|\/ap\/|accounts\.|auth/i.test(finalUrl);
  rows.push({ id: e.id, url, code, finalHost: host, onDomains: host ? onDomains(host, e) : false, signin, stepsStated: e.stepsStated, finalPath: finalUrl.replace(/^https?:\/\/[^/]+/, '').split('?')[0].slice(0, 60) });
  await new Promise((r) => setTimeout(r, 1000));
}
writeFileSync('qa/out/links-check.json', JSON.stringify({ unverifiedShipped: shipped.map((e) => e.id), rows }, null, 1));
for (const r of rows) console.log(`${r.id.padEnd(22)} ${r.code} ${r.onDomains ? 'on-domain' : 'OFF-DOMAIN'} ${r.signin ? 'SIGN-IN' : '       '} steps=${r.stepsStated} ${r.finalHost}${r.finalPath}`);
