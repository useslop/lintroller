// Q1 (adversarial QA): writes synthetic hostile and honesty fixtures into qa/files/.
// Written from scratch (decision 1b: no reading of corpus/src). All merchants and people are made up.
// Run: node qa/make-files.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'files');
mkdirSync(out, { recursive: true });
const put = (name, data) => writeFileSync(path.join(out, name), data);

// Deterministic PRNG so the files are the same on each run.
let seed = 0x51a7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const CHASE_CHK = 'Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #';
const CHASE_CARD = 'Transaction Date,Post Date,Description,Category,Type,Amount,Memo';
const q = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const mdy = (d) => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`;
const day = (y, m, dd) => new Date(Date.UTC(y, m - 1, dd));
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const money = (c) => (c / 100).toFixed(2);
const clampDay = (y, m, dd) => day(y, m, Math.min(dd, new Date(Date.UTC(y, m, 0)).getUTCDate()));

/** monthly dates from (y,m) for n months on day dd (clamped to month end) */
function monthly(y, m, dd, n) {
  const res = [];
  for (let i = 0; i < n; i++) {
    const mm = ((m - 1 + i) % 12) + 1;
    const yy = y + Math.floor((m - 1 + i) / 12);
    res.push(clampDay(yy, mm, dd));
  }
  return res;
}

/** rows: {date, desc, cents (negative = money out), type} -> Chase checking CSV (newest first, like banks) */
function chaseChecking(rows, { eol = '\n' } = {}) {
  rows.sort((a, b) => b.date - a.date);
  const lines = [CHASE_CHK];
  for (const r of rows) {
    lines.push([r.cents < 0 ? 'DEBIT' : 'CREDIT', mdy(r.date), q(r.desc), money(r.cents), r.type ?? (r.cents < 0 ? 'DEBIT_CARD' : 'ACH_CREDIT'), '', ''].join(','));
  }
  return lines.join(eol) + eol;
}

// ---------- 1. Honesty file: 14 months of a made-up household (Chase checking shape) ----------
// Labels (what a careful human would say), recorded in honesty.labels.json.
const life = [];
const add = (dates, desc, centsFn, type) => dates.forEach((d, i) => life.push({ date: d, desc: typeof desc === 'function' ? desc(i) : desc, cents: centsFn(i), type }));
// Netflix: price rise from $15.49 to $17.99 in March 2026. 14 charges.
add(monthly(2025, 8, 12, 14), 'NETFLIX.COM', (i) => (i < 7 ? -1549 : -1799));
add(monthly(2025, 8, 3, 14), 'SPOTIFY USA', () => -1199);
// Two Apple plans behind one descriptor.
add(monthly(2025, 8, 5, 14), 'APPLE.COM/BILL 866-712-7753 CA', () => -299);
add(monthly(2025, 8, 19, 14), 'APPLE.COM/BILL 866-712-7753 CA', () => -1099);
// Hulu ended in March 2026 (8 charges, then nothing for 6 months).
add(monthly(2025, 8, 22, 8), 'HULU 877-8244858 CA', () => -799);
add(monthly(2025, 8, 17, 14), 'PLANET FITNESS #1234', () => -2499);
// Yearly renewal, 2 charges, file covers 14 months.
add([day(2025, 8, 20), day(2026, 8, 20)], 'AMAZON PRIME*2K4LL0AB2', () => -13900);
// Only 2 charges so far (new subscription).
add([day(2026, 8, 9), day(2026, 9, 9)], 'DISNEY PLUS', () => -1399);
// Distractors: weekly gas, groceries, Uber trips, Amazon retail, Zelle rent, card payments, payroll.
for (let d = day(2025, 8, 2); d < day(2026, 10, 1); d = addDays(d, 7)) life.push({ date: d, desc: 'SHELL OIL 57444212 CHARLOTTE NC', cents: -(3500 + Math.floor(rnd() * 2000)) });
for (let d = day(2025, 8, 4); d < day(2026, 10, 1); d = addDays(d, 3 + Math.floor(rnd() * 3))) life.push({ date: d, desc: `KROGER #${pick(['0123', '0456'])}`, cents: -(2000 + Math.floor(rnd() * 9000)) });
for (let d = day(2025, 8, 6); d < day(2026, 10, 1); d = addDays(d, 4 + Math.floor(rnd() * 6))) life.push({ date: d, desc: 'UBER *TRIP HELP.UBER.COM', cents: -(900 + Math.floor(rnd() * 3000)) });
for (let d = day(2025, 8, 9); d < day(2026, 10, 1); d = addDays(d, 5 + Math.floor(rnd() * 9))) life.push({ date: d, desc: `AMZN MKTP US*${pick(['2K1AB3', 'ZX9QQ1', 'M44TT0'])}`, cents: -(1200 + Math.floor(rnd() * 6000)) });
add(monthly(2025, 8, 1, 14), 'Zelle payment to QUINN MARLOWE JPM99ab12cd', () => -165000, 'QUICKPAY_DEBIT');
add(monthly(2025, 8, 25, 14), 'CHASE CREDIT CRD AUTOPAY PPD ID: 4760039224', () => -(30000 + Math.floor(rnd() * 40000)), 'ACH_DEBIT');
for (let d = day(2025, 8, 8); d < day(2026, 10, 1); d = addDays(d, 14)) life.push({ date: d, desc: 'NORTHWIND LLC PAYROLL PPD ID: 9000123456', cents: 234567, type: 'ACH_CREDIT' });
// A bill with a moving amount and a monthly bank fee.
add(monthly(2025, 8, 14, 14), 'DUKE ENERGY CAROLINAS', () => -(9000 + Math.floor(rnd() * 5000)), 'ACH_DEBIT');
add(monthly(2025, 8, 28, 14), 'MONTHLY SERVICE FEE', () => -1200, 'FEE_TRANSACTION');
put('honesty-life.csv', chaseChecking(life));
const labels = {
  subscriptions: {
    'NETFLIX.COM': { cadence: 'monthly', last: 17.99, yearly: 215.88, note: 'price change 15.49 -> 17.99 on Mar 12 2026' },
    'SPOTIFY USA': { cadence: 'monthly', last: 11.99, yearly: 143.88 },
    'APPLE.COM/BILL a': { cadence: 'monthly', last: 2.99, yearly: 35.88 },
    'APPLE.COM/BILL b': { cadence: 'monthly', last: 10.99, yearly: 131.88 },
    'PLANET FITNESS': { cadence: 'monthly', last: 24.99, yearly: 299.88 },
    'AMAZON PRIME': { cadence: 'yearly', last: 139.0, yearly: 139.0 },
    'DISNEY PLUS': { cadence: 'monthly', last: 13.99, yearly: 167.88, note: 'only 2 charges' },
  },
  possiblyStopped: { HULU: { last: 7.99, lastDate: '2026-03-22' } },
  bills: ['DUKE ENERGY', 'MONTHLY SERVICE FEE'],
  people: ['Zelle QUINN MARLOWE'],
  noFinding: ['SHELL', 'KROGER', 'UBER *TRIP', 'AMZN MKTP', 'CHASE CREDIT CRD AUTOPAY', 'PAYROLL'],
};
put('honesty-life.labels.json', JSON.stringify(labels, null, 2));

// ---------- 2. Sign check: a card file whose purchases are positive (Chase card header) ----------
{
  const rows = [];
  const card = (dates, desc, cents, cat = 'Entertainment') => dates.forEach((d) => rows.push({ d, desc, cents, cat, type: cents > 0 ? 'Sale' : 'Payment' }));
  card(monthly(2025, 9, 12, 12), 'NETFLIX.COM', 1549);
  card(monthly(2025, 9, 3, 12), 'Spotify USA', 1199);
  card(monthly(2025, 9, 7, 12), 'HBO MAX', 1699);
  card(monthly(2025, 9, 26, 12), 'Payment Thank You-Mobile', -50000, '');
  for (let d = day(2025, 9, 2); d < day(2026, 9, 1); d = addDays(d, 6)) rows.push({ d, desc: 'WAWA 8123', cents: 1000 + Math.floor(rnd() * 3000), cat: 'Gas', type: 'Sale' });
  rows.sort((a, b) => b.d - a.d);
  const lines = [CHASE_CARD, ...rows.map((r) => [mdy(r.d), mdy(addDays(r.d, 1)), q(r.desc), r.cat, r.type, money(r.cents), ''].join(','))];
  put('sign-positive-card.csv', lines.join('\n') + '\n');
}

// ---------- 3. Short history: 94 days (hint + medium cap + "guess" line) ----------
{
  const rows = [];
  [day(2026, 7, 1), day(2026, 8, 1), day(2026, 9, 1), day(2026, 10, 1)].forEach((d) => rows.push({ date: d, desc: 'NETFLIX.COM', cents: -1549 }));
  [day(2026, 7, 3), day(2026, 8, 3), day(2026, 9, 3)].forEach((d) => rows.push({ date: d, desc: 'SPOTIFY USA', cents: -1199 }));
  rows.push({ date: day(2026, 6, 29), desc: 'KROGER #0123', cents: -4512 });
  put('short-94days.csv', chaseChecking(rows));
}

// ---------- 4. Injection: monthly charges whose descriptors are payloads (6 months each) ----------
const payloads = [
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  'javascript:alert(1)',
  '=HYPERLINK("http://example.com","click")',
  "+cmd|' /C calc'!A0",
  '@SUM(1+1)',
  "-2+3+cmd|' /C calc'!A0",
  '\tTABLEAD=1+1',
  'EVIL‮GNP.EXE MOVIES',
  'SP‍OTI​FY ZWJ PLUS',
  '☕ COFFEE CLUB \u{1F369}\u{1F468}‍\u{1F469}‍\u{1F467}',
  'LINEBREAK CLUB\r\nBEGIN:VEVENT\r\nSUMMARY:pwned',
  'ACME, "QUOTED" INC; DROP TABLE',
];
{
  const rows = [];
  payloads.forEach((p, k) => monthly(2026, 4, 2 + k, 6).forEach((d) => rows.push({ date: d, desc: p, cents: -(901 + k) })));
  // One known subscription so the summary has a cancel link next to the hostile ones.
  monthly(2026, 4, 20, 6).forEach((d) => rows.push({ date: d, desc: 'NETFLIX.COM', cents: -1549 }));
  put('inject.csv', chaseChecking(rows));
  put('inject.payloads.json', JSON.stringify(payloads, null, 2));
}

// ---------- 5. Hostile files ----------
const base = [];
monthly(2026, 1, 12, 9).forEach((d) => base.push({ date: d, desc: 'NETFLIX.COM', cents: -1549 }));
monthly(2026, 1, 3, 9).forEach((d) => base.push({ date: d, desc: 'SPOTIFY USA', cents: -1199 }));
const baseCsv = chaseChecking([...base]);
put('empty.csv', '');
put('header-only.csv', CHASE_CHK + '\n');
put('one-row.csv', `${CHASE_CHK}\nDEBIT,09/12/2026,NETFLIX.COM,-15.49,DEBIT_CARD,,\n`);
put('utf16le-bom.csv', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(baseCsv.replace('NETFLIX.COM', 'CAFÉ NETFLIX.COM'), 'utf16le')]));
// windows-1252: é is 0xE9.
put('win1252.csv', Buffer.from(baseCsv.replaceAll('SPOTIFY USA', 'CAFÉ CRÈME CLUB'), 'latin1'));
put('semicolons.csv', baseCsv.split('\n').map((l) => l.replaceAll(',', ';')).join('\n'));
put('cr-only.csv', baseCsv.replaceAll('\n', '\r'));
put('long-descriptor.csv', chaseChecking(monthly(2026, 1, 12, 9).map((d) => ({ date: d, desc: 'NETFLIX.COM ' + 'X'.repeat(10000), cents: -1549 }))));
{
  const head = ['Date', 'Description', 'Amount', ...Array.from({ length: 497 }, (_, i) => `Col${i + 4}`)];
  const lines = [head.join(',')];
  monthly(2026, 1, 12, 9).forEach((d) => lines.push([mdy(d), 'NETFLIX.COM', '-15.49', ...Array.from({ length: 497 }, (_, i) => String(i))].join(',')));
  put('cols-500.csv', lines.join('\n') + '\n');
}
put('unbalanced-quotes.csv', `${CHASE_CHK}\nDEBIT,09/12/2026,"NETFLIX.COM,-15.49,DEBIT_CARD,,\nDEBIT,08/12/2026,NETFLIX.COM,-15.49,DEBIT_CARD,,\nDEBIT,07/12/2026,NETFLIX.COM,-15.49,DEBIT_CARD,,\n`);
put('dup-headers.csv', 'Date,Description,Amount,Amount,Description\n' + monthly(2026, 1, 12, 9).map((d) => `${mdy(d)},NETFLIX.COM,-15.49,99.99,OTHER THING`).join('\n') + '\n');
put('dates-odd.csv', chaseChecking([
  ...monthly(2027, 1, 12, 4).map((d) => ({ date: d, desc: 'FUTURE STREAMING', cents: -999 })),
  ...monthly(1985, 1, 12, 4).map((d) => ({ date: d, desc: 'OLDTIME CABLE', cents: -2999 })),
  ...base,
]));
put('amounts-odd.csv', [
  'Date,Description,Amount',
  '01/05/2026,COMMA THOUSANDS,"-1,234.56"',
  '02/05/2026,COMMA THOUSANDS,"-1,234.56"',
  '03/05/2026,COMMA THOUSANDS,"-1,234.56"',
  '01/06/2026,PAREN NEG,(12.00)',
  '02/06/2026,PAREN NEG,(12.00)',
  '03/06/2026,PAREN NEG,(12.00)',
  '01/07/2026,SPACE DOLLAR,- $5.00',
  '02/07/2026,SPACE DOLLAR,- $5.00',
  '03/07/2026,SPACE DOLLAR,- $5.00',
  '01/08/2026,DOLLAR MINUS,$-5',
  '02/08/2026,DOLLAR MINUS,$-5',
  '03/08/2026,DOLLAR MINUS,$-5',
  '01/09/2026,TRAILING MINUS,5-',
  '02/09/2026,TRAILING MINUS,5-',
  '03/09/2026,TRAILING MINUS,5-',
  '01/10/2026,EURO DECIMAL,"-1.234,56"',
  '02/10/2026,EURO DECIMAL,"-1.234,56"',
  '03/10/2026,EURO DECIMAL,"-1.234,56"',
].join('\n') + '\n');
{
  const H = '"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","From Email Address","To Email Address","Transaction ID","Balance"';
  const rows = [];
  monthly(2026, 1, 12, 9).forEach((d, i) => rows.push(`"${mdy(d)}","10:00:00","PST","Spotify USA Inc","PreApproved Payment Bill User Payment","Completed","USD","-11.99","0.00","-11.99","buyer@example.com","billing@example.org","1AB${i}CD","0.00"`));
  monthly(2026, 1, 15, 9).forEach((d, i) => rows.push(`"${mdy(d)}","10:00:00","PST","Le Monde Abonnement","PreApproved Payment Bill User Payment","Completed","EUR","-9.99","0.00","-9.99","buyer@example.com","abo@example.org","2EF${i}GH","0.00"`));
  put('paypal-nonusd.csv', [H, ...rows].join('\n') + '\n');
}
// Headerless (Wells Fargo-like shape: date, amount, *, empty, description) and pasted rows.
put('headerless.csv', base.sort((a, b) => b.date - a.date).map((r) => `"${mdy(r.date)}","${money(r.cents)}","*","","${r.desc}"`).join('\n') + '\n');
put('pasted-rows.txt', base.slice(0, 9).map((r) => `${mdy(r.date)}\t${r.desc}\t${money(r.cents)}`).join('\n'));
// A PNG renamed .csv (a minimal valid 1x1 PNG built here).
{
  const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  const idat = zlib.deflateSync(Buffer.from([0, 255, 0, 0]));
  put('png-renamed.csv', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]));
}

// ---------- 6. Scale ----------
function bulk(n, { padTo } = {}) {
  const lines = [CHASE_CHK];
  const start = day(2024, 1, 1).getTime();
  const merchants = ['KROGER #0123', 'SHELL OIL 57444212', 'TARGET T-1234', 'UBER *TRIP', 'AMZN MKTP US*2K1AB3', 'STARBUCKS STORE 0042', 'CVS/PHARMACY #0991'];
  for (let i = 0; i < n; i++) {
    const d = new Date(start + Math.floor((i / n) * 1000) * 86400000);
    lines.push(`DEBIT,${mdy(d)},${pick(merchants)},-${(1 + rnd() * 90).toFixed(2)},DEBIT_CARD,,`);
  }
  // A real monthly series hidden in the noise.
  monthly(2024, 1, 12, 30).forEach((d) => lines.push(`DEBIT,${mdy(d)},NETFLIX.COM,-15.49,DEBIT_CARD,,`));
  let s = lines.join('\n') + '\n';
  if (padTo) {
    const pad = `DEBIT,01/02/2025,PADDING ROW ${'Q'.repeat(60)},-1.00,DEBIT_CARD,,\n`;
    s += pad.repeat(Math.ceil(Math.max(0, padTo - s.length) / pad.length));
  }
  return s;
}
put('rows-50k.csv', bulk(50000));
put('rows-300001.csv', bulk(300001 - 30));
put('rows-299k.csv', bulk(299000));
put('size-26mb.csv', bulk(50000, { padTo: 26 * 1024 * 1024 + 4096 }));
// Repros added during the run: purchases-negative card (sign note) and the low-confidence/alias set.
put('sign-negative-card.csv', readFileSync(path.join(out, 'sign-positive-card.csv'), 'utf8').trim().split('\n')
  .map((l, i) => { if (!i) return l; const c = l.split(','); c[5] = c[5].startsWith('-') ? c[5].slice(1) : '-' + c[5]; return c.join(','); }).join('\n') + '\n');
{
  const L = [CHASE_CHK];
  const r = (d, desc, a) => L.push(`DEBIT,${d},${desc},${a},DEBIT_CARD,,`);
  r('08/14/2026', 'LUIGIS TRATTORIA 0042', '-41.20');
  r('09/13/2026', 'LUIGIS TRATTORIA 0042', '-57.85');
  ['04', '05', '06', '07', '08', '09'].forEach((m, i) => {
    r(`${m}/0${3 + (i % 3)}/2026`, 'BLUE HERON BISTRO', '-' + (38 + i * 7.3).toFixed(2));
    r(`${m}/10/2026`, 'MICROSOFT*MSBILL.INFO', '-9.99');
    r(`${m}/11/2026`, 'MICROSOFT*XBOX', '-16.99');
    r(`${m}/21/2026`, 'GOOGLE *Google One', '-1.99');
  });
  ['04/15', '04/30', '05/15', '05/31', '06/15', '06/30', '07/15', '07/31', '08/15', '08/31', '09/15', '09/30'].forEach((d) => r(`${d}/2026`, 'IRONCLAD GYM SEMI', '-20.00'));
  put('lowconf.csv', L.join('\n') + '\n');
}

console.log('wrote fixtures to', out);
