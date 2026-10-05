import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORMAT_IDS, checkSign, flipSigns, mergeRows, parseRows, sniffFormat, type FormatId, type Txn } from '../src/index';
import { FORMATS } from '../src/sniff';
import { parseAmountCents, parseDateIso } from '../src/values';
import { INDEX } from './helpers';

const fx = (name: string) => readFileSync(join(__dirname, 'fixtures/formats', `${name}.csv`), 'utf8');

// RESEARCH §1 samples: expected first row after normalisation (money out negative)
const EXPECT: Record<FormatId, { format: FormatId; date: string; cents: number; desc: string; n: number }> = {
  'boa-checking': { format: 'boa-checking', date: '2026-09-02', cents: -1549, desc: 'NETFLIX.COM 800-585-4219 CA', n: 2 },
  'boa-card': { format: 'boa-card', date: '2026-09-03', cents: -999, desc: 'APPLE.COM/BILL', n: 2 },
  'chase-checking': { format: 'chase-checking', date: '2026-09-05', cents: -1549, desc: 'NETFLIX.COM NETFLIX.COM CA', n: 2 },
  'chase-card': { format: 'chase-card', date: '2026-09-06', cents: -1399, desc: 'DISNEY PLUS', n: 2 },
  'wells-fargo': { format: 'wells-fargo', date: '2026-09-07', cents: -1549, desc: 'NETFLIX.COM 800-5854219 CA', n: 2 },
  'citi-card': { format: 'citi-card', date: '2026-09-08', cents: -1799, desc: 'HULU 866-9977-BOX', n: 2 },
  'capitalone-card': { format: 'capitalone-card', date: '2026-09-09', cents: -1549, desc: 'NETFLIX.COM', n: 2 },
  amex: { format: 'amex', date: '2026-09-10', cents: -1549, desc: 'NETFLIX.COM', n: 2 },
  discover: { format: 'discover', date: '2026-09-11', cents: -1199, desc: 'SPOTIFY USA', n: 2 },
  usbank: { format: 'usbank', date: '2026-09-12', cents: -1549, desc: 'NETFLIX.COM', n: 2 },
  'apple-card': { format: 'apple-card', date: '2026-09-13', cents: -999, desc: 'APPLE.COM/BILL', n: 2 },
  paypal: { format: 'paypal', date: '2026-09-14', cents: -1549, desc: 'Netflix Inc', n: 2 },
  venmo: { format: 'venmo', date: '2026-09-15', cents: -775, desc: 'Jane Roommate', n: 2 },
  cashapp: { format: 'generic', date: '2026-09-16', cents: -999, desc: '', n: 2 },
  ynab: { format: 'ynab', date: '2026-09-17', cents: -1549, desc: 'Netflix', n: 2 },
  monarch: { format: 'monarch', date: '2026-09-18', cents: -1549, desc: 'Netflix', n: 2 },
  mint: { format: 'mint', date: '2026-09-19', cents: -1549, desc: 'NETFLIX.COM 8005854219 CA', n: 2 },
  generic: { format: 'generic', date: '2026-09-20', cents: -1549, desc: 'NETFLIX.COM', n: 2 },
};

describe('FORMATS table', () => {
  it('has an entry for each FormatId', () => {
    for (const id of FORMAT_IDS) expect(FORMATS[id]?.id).toBe(id);
  });
});

describe('sniff + parse per format (RESEARCH §1 synthetic samples)', () => {
  for (const id of FORMAT_IDS) {
    it(id, () => {
      const text = fx(id);
      const s = sniffFormat(text);
      const e = EXPECT[id];
      expect(s.format).toBe(e.format);
      expect(s.mapping).not.toBeNull();
      const r = parseRows(text, s);
      expect(r.rows.length).toBe(e.n);
      const t = r.rows[0]!;
      expect(t.date).toBe(e.date);
      expect(t.amountCents).toBe(e.cents);
      if (e.desc) expect(t.description).toBe(e.desc);
      expect(t.line).toBe(s.headerLine + 2);
      if (FORMATS[id].verified === 'unverified' && id !== 'cashapp' && id !== 'generic') expect(s.confidence).toBe('medium');
    });
  }
  it('Wells Fargo is headerless: line 1 is a transaction', () => {
    const s = sniffFormat(fx('wells-fargo'));
    expect(s.headerLine).toBe(-1);
    expect(parseRows(fx('wells-fargo'), s).rows[0]!.line).toBe(1);
  });
  it('BoA preamble: header found below the summary block, balance row skipped', () => {
    const text = fx('boa-checking-preamble');
    const s = sniffFormat(text);
    expect(s.format).toBe('boa-checking');
    expect(s.headerLine).toBe(6);
    expect(s.notes.join(' ')).toMatch(/skipped 6 lines/);
    const r = parseRows(text, s);
    expect(r.rows.map((t) => t.amountCents)).toEqual([-1549, -1199]);
    expect(r.rows[0]!.line).toBe(9);
    expect(r.skipped.filter((k) => k.reason === 'preamble').length).toBe(6);
    expect(r.skipped.some((k) => k.reason === 'summary-row' && k.line === 8)).toBe(true);
  });
  it('Venmo title rows and "- $25.00" amounts', () => {
    const text = fx('venmo-preamble');
    const s = sniffFormat(text);
    expect(s.format).toBe('venmo');
    expect(s.headerLine).toBe(2);
    const r = parseRows(text, s);
    expect(r.rows.map((t) => t.amountCents)).toEqual([-775, -600, 5000]);
    expect(r.rows[0]!.date).toBe('2026-09-15');
  });
  it('YNAB "$0.00" sides and Monarch ISO dates', () => {
    const y = parseRows(fx('ynab'), sniffFormat(fx('ynab')));
    expect(y.rows.map((t) => t.amountCents)).toEqual([-1549, -1199]);
    const m = parseRows(fx('monarch'), sniffFormat(fx('monarch')));
    expect(m.rows.map((t) => t.date)).toEqual(['2026-09-18', '2026-10-03']);
  });
  it('card files with purchases positive come out money-out negative', () => {
    for (const id of ['chase-card', 'amex', 'discover', 'apple-card', 'citi-card', 'capitalone-card'] as const) {
      const r = parseRows(fx(id), sniffFormat(fx(id)));
      expect(r.rows.every((t) => t.amountCents < 0)).toBe(true);
    }
  });
});

describe('values', () => {
  it('parses amounts to integer cents without float error', () => {
    expect(parseAmountCents('$1,234.56')).toBe(123456);
    expect(parseAmountCents('(12.34)')).toBe(-1234);
    expect(parseAmountCents('- $12.34')).toBe(-1234);
    expect(parseAmountCents('-$12.34')).toBe(-1234);
    expect(parseAmountCents('+ $50.00')).toBe(5000);
    expect(parseAmountCents('12.34-')).toBe(-1234);
    expect(parseAmountCents('0.29')).toBe(29);
    expect(parseAmountCents('19.999')).toBe(2000);
    expect(parseAmountCents('1.234,56', true)).toBe(123456);
    expect(parseAmountCents('abc')).toBeNull();
    expect(parseAmountCents('')).toBeNull();
  });
  it('parses dates; two-digit years are 20xx', () => {
    expect(parseDateIso('09/02/26')).toBe('2026-09-02');
    expect(parseDateIso('2026-09-15T10:32:00')).toBe('2026-09-15');
    expect(parseDateIso('02/09/2026', 'DMY')).toBe('2026-09-02');
    expect(parseDateIso('Sep 2, 2026')).toBe('2026-09-02');
    expect(parseDateIso('02/30/2026')).toBeNull();
  });
});

describe('skips', () => {
  it('pending, non-USD, zero and unparseable rows are skipped with a reason', () => {
    const text = 'Date,Time,TimeZone,Name,Type,Status,Currency,Gross,Fee,Net\n' +
      '09/14/2026,08:02:11,PDT,Netflix Inc,Subscription Payment,Completed,USD,-15.49,0.00,-15.49\n' +
      '09/15/2026,08:02:11,PDT,Hulu,Subscription Payment,Pending,USD,-17.99,0.00,-17.99\n' +
      '09/16/2026,08:02:11,PDT,Shop EU,Express Checkout Payment,Completed,EUR,-20.00,0.00,-20.00\n' +
      '09/17/2026,08:02:11,PDT,Zero,General Payment,Completed,USD,0.00,0.00,0.00\n' +
      'not a date,08:02:11,PDT,X,General Payment,Completed,USD,-1.00,0.00,-1.00\n' +
      '09/18/2026,08:02:11,PDT,Y,General Payment,Completed,USD,abc,0.00,abc\n';
    const r = parseRows(text, sniffFormat(text));
    expect(r.rows.length).toBe(1);
    expect(r.skipped.map((s) => s.reason)).toEqual(['pending', 'non-usd', 'zero-amount', 'unparseable-date', 'unparseable-amount']);
    expect(r.stats).toMatchObject({ parsed: 1, skipped: 5, outflows: 1, inflows: 0 });
  });
});

describe('mergeRows', () => {
  const mk = (source: number, line: number, date: string): Txn =>
    ({ id: `${source}:${line}`, source, line, date, description: 'NETFLIX.COM', amountCents: -1549, currency: 'USD' });
  const res = (rows: Txn[]) => ({ rows, skipped: [], dateRange: null, stats: { lines: 0, parsed: 0, skipped: 0, outflows: 0, inflows: 0 } });
  it('drops identical rows only across files, and sorts by date', () => {
    const a = res([mk(0, 2, '2026-09-02'), mk(0, 3, '2026-09-02'), mk(0, 4, '2026-08-02')]);
    const b = res([mk(1, 2, '2026-09-02'), mk(1, 3, '2026-10-02')]);
    const m = mergeRows([a, b]);
    expect(m.map((t) => t.id)).toEqual(['0:4', '0:2', '0:3', '1:3']);
  });
});

describe('sign self-check (SPEC §6)', () => {
  it('flips a purchases-positive card file read as debit-negative', () => {
    const text = 'Date,Description,Amount\n' +
      '07/02/2026,NETFLIX.COM,15.49\n08/02/2026,NETFLIX.COM,15.49\n09/02/2026,NETFLIX.COM,15.49\n' +
      '09/05/2026,SPOTIFY USA,11.99\n09/10/2026,PAYMENT THANK YOU,-120.00\n';
    const s = sniffFormat(text);
    expect(s.format).toBe('generic');
    const r = parseRows(text, s);
    const c = checkSign(r.rows, INDEX);
    expect(c.flip).toBe(true);
    expect(c.votes).toEqual({ aliasIn: 4, aliasOut: 0, paymentsIn: 0, paymentsOut: 1 });
    const flipped = flipSigns(r.rows);
    expect(flipped[0]!.amountCents).toBe(-1549);
    expect(r.rows[0]!.amountCents).toBe(1549); // input not mutated
    expect(checkSign(flipped, INDEX).flip).toBe(false);
  });
  it('leaves a normal checking file alone', () => {
    const r = parseRows(fx('boa-checking'), sniffFormat(fx('boa-checking')));
    expect(checkSign(r.rows, INDEX).flip).toBe(false);
  });
});
