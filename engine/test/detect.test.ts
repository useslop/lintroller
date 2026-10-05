import { describe, expect, it } from 'vitest';
import { detectRecurring, type Txn } from '../src/index';
import { INDEX, addDays, charges, inflows, monthly, stepDays } from './helpers';

const run = (rows: Txn[], extra: Partial<Parameters<typeof detectRecurring>[1]> = {}) =>
  detectRecurring(rows, { aliasIndex: INDEX, ...extra });
/** A one-off row that only stretches the file's coverage. */
const filler = (date: string) => charges(`ONE OFF SHOP ${date}`, [date], 2345);

describe('detectRecurring: cadences', () => {
  const cases: [string, string[], string][] = [
    ['weekly', stepDays('2026-01-05', 8, 7), 'weekly'],
    ['biweekly', stepDays('2026-01-05', 6, 14), 'biweekly'],
    ['semimonthly', monthly('2026-01-01', 4).flatMap((d) => [d, d.slice(0, 8) + '16']), 'semimonthly'],
    ['monthly', monthly('2026-01-12', 6), 'monthly'],
    ['bimonthly', monthly('2026-01-12', 4, 2), 'bimonthly'],
    ['quarterly', monthly('2025-01-12', 4, 3), 'quarterly'],
    ['semiannual', monthly('2024-07-12', 3, 6), 'semiannual'],
  ];
  for (const [name, dates, cadence] of cases) {
    it(name, () => {
      const r = run(charges('ACME CLOUD BACKUP', dates, 1299));
      expect(r.findings.length).toBe(1);
      const f = r.findings[0]!;
      expect(f.cadence).toBe(cadence);
      expect(f.kind).toBe('unknown');
      expect(f.merchantKey).toBe('raw:acme cloud');
      expect(f.occurrences.length).toBe(dates.length);
      expect(f.activity).toBe('active');
      expect(f.reasons).toContain('regular-interval');
      expect(f.reasons).toContain('stable-amount');
    });
  }
});

describe('detectRecurring: yearly coverage boundary', () => {
  it('394 days: no; 395 days: yes', () => {
    const rows = charges('ACME DOMAINS', ['2025-03-01', '2026-03-01'], 2000);
    const r394 = run([...rows, ...filler('2026-03-29')]);
    expect(r394.coverage.days).toBe(394);
    expect(r394.coverage.canSeeYearly).toBe(false);
    expect(r394.findings.length).toBe(0);
    const r395 = run([...rows, ...filler('2026-03-30')]);
    expect(r395.coverage.days).toBe(395);
    expect(r395.findings[0]?.cadence).toBe('yearly');
    expect(r395.findings[0]!.confidence).toBeLessThanOrEqual(0.74);
  });
});

describe('detectRecurring: traps', () => {
  it('weekend drift stays monthly', () => {
    const dates = ['2026-01-15', '2026-02-16', '2026-03-16', '2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15', '2026-08-17'];
    const f = run(charges('NETFLIX.COM', dates, 1549)).findings[0]!;
    expect(f.cadence).toBe('monthly');
    expect(f.confidenceLabel).toBe('high');
  });
  it('Jan 31 → Feb 28 → Mar 31', () => {
    const dates = monthly('2026-01-31', 6);
    expect(dates.slice(0, 3)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    const f = run(charges('NETFLIX.COM', dates, 1549)).findings[0]!;
    expect(f.cadence).toBe('monthly');
    expect(f.nextExpected).toBe('2026-07-31');
    expect(f.intervalDays.min).toBe(28);
  });
  it('price rise (2 at the new price) is one series with a price change', () => {
    const dates = monthly('2026-01-03', 6);
    const r = run(charges('NETFLIX.COM', dates, [1549, 1549, 1549, 1549, 1799, 1799]));
    expect(r.findings.length).toBe(1);
    const f = r.findings[0]!;
    expect(f.priceChanges).toEqual([{ date: '2026-05-03', fromCents: 1549, toCents: 1799 }]);
    expect(f.amount.lastCents).toBe(1799);
    expect(f.anchorCents).toBe(1549);
    expect(f.reasons).toContain('price-change');
  });
  it('one odd charge is noise', () => {
    const dates = monthly('2026-01-03', 7);
    const r = run(charges('NETFLIX.COM', dates, [1549, 1549, 1549, 1999, 1549, 1549, 1549]));
    expect(r.findings.length).toBe(1);
    const f = r.findings[0]!;
    expect(f.priceChanges).toEqual([]);
    expect(f.amount.lastCents).toBe(1549);
    expect(f.occurrences.length).toBe(6);
  });
  it('trial: small first charge, then full price', () => {
    const rows = [...charges('SPOTIFY USA', ['2026-01-02'], 100), ...charges('SPOTIFY USA', monthly('2026-01-09', 5), 1199)];
    const f = run(rows).findings[0]!;
    expect(f.trial).toEqual({ date: '2026-01-02', cents: 100 });
    expect(f.reasons).toContain('trial-then-paid');
    expect(f.occurrences.every((o) => o.cents === 1199)).toBe(true);
  });
  it('ended and maybe-ended', () => {
    const ended = run([...charges('HULU', monthly('2026-01-05', 4), 1799), ...filler('2026-09-30')]).findings[0]!;
    expect(ended.activity).toBe('ended');
    expect(ended.reasons).toContain('ended');
    const maybe = run([...charges('HULU', monthly('2026-01-05', 6), 1799), ...filler('2026-07-20')]).findings[0]!;
    expect(maybe.activity).toBe('maybe-ended');
    expect(maybe.reasons).toContain('possibly-ended');
  });
  it('two Apple plans behind APPLE.COM/BILL stay separate', () => {
    const d = monthly('2026-01-07', 5);
    const r = run([...charges('APPLE.COM/BILL', d, 299), ...charges('APPLE.COM/BILL', d.map((x) => addDays(x, 3)), 1099)]);
    expect(r.findings.length).toBe(2);
    expect(r.findings.map((f) => f.amount.lastCents).sort()).toEqual([1099, 299].sort());
    for (const f of r.findings) {
      expect(f.merchantKey).toBe('apple');
      expect(f.billedThrough).toBe('apple');
      expect(f.kind).toBe('subscription');
      expect(f.reasons).toContain('platform-biller');
    }
    expect(new Set(r.findings.map((f) => f.id)).size).toBe(2);
  });
  it('missed one month lowers regularity but still finds it', () => {
    const dates = monthly('2026-01-10', 8).filter((_, i) => i !== 4);
    const f = run(charges('NETFLIX.COM', dates, 1549)).findings[0]!;
    expect(f.cadence).toBe('monthly');
    expect(f.reasons).toContain('missed-one');
  });
});

describe('detectRecurring: false-positive families', () => {
  it('weekly gas, groceries, Uber trips and Amazon retail are not findings', () => {
    const wk = stepDays('2026-01-03', 26, 7);
    const amt = (i: number) => 3000 + ((i * 3779) % 2900);
    const rows = [
      ...charges('SHELL OIL 57444 HOUSTON TX', wk, wk.map((_, i) => amt(i))),
      ...charges('FRESHMART #123 AUSTIN TX', wk.map((d) => addDays(d, 1)), wk.map((_, i) => 6000 + ((i * 5113) % 7000))),
      ...charges('UBER *TRIP HELP.UBER.COM', wk.map((d) => addDays(d, 2)), wk.map((_, i) => 900 + ((i * 1777) % 2500))),
      ...charges('AMZN Mktp US*2K4AB1', wk.map((d) => addDays(d, 3)), wk.map((_, i) => 1200 + ((i * 7919) % 9000))),
    ];
    const r = run(rows);
    expect(r.findings).toEqual([]);
    const vm = r.suppressed.filter((s) => s.reason === 'variable-merchant').map((s) => s.merchantKey).sort();
    expect(vm).toEqual(['amazon-retail', 'shell', 'uber']);
  });
  it('UBER *ONE is a membership', () => {
    const f = run(charges('UBER *ONE', monthly('2026-01-20', 4), 999)).findings[0]!;
    expect(f).toMatchObject({ merchantKey: 'uber-one', kind: 'membership', display: 'Uber One' });
  });
  it('card payments and transfers are ignored and counted; payroll ignored', () => {
    const m = monthly('2026-01-25', 6);
    const rows = [
      ...inflows('PAYMENT THANK YOU', m, 50000),
      ...charges('ONLINE TRANSFER TO SAV XXXX1234', m, 20000),
      ...inflows('ACME CORP PAYROLL DIR DEP', stepDays('2026-01-02', 13, 14), 250000),
    ];
    const r = run(rows, { accountKinds: ['bank'] });
    expect(r.findings).toEqual([]);
    const ig = Object.fromEntries(r.ignored.map((x) => [x.rowClass, x.count]));
    expect(ig).toEqual({ 'card-payment': 6, transfer: 6, income: 13 });
  });
  it('bills and fees are their own kinds', () => {
    const m = monthly('2026-01-20', 6);
    const r = run([
      ...charges('CITY POWER & LIGHT AUTOPAY', m, [8123, 9544, 7310, 6950, 8890, 10120]),
      ...charges('MONTHLY MAINTENANCE FEE', monthly('2026-01-31', 6), 1200),
    ]);
    const kinds = Object.fromEntries(r.findings.map((f) => [f.merchantKey, f.kind]));
    expect(kinds).toEqual({ 'city-power': 'bill', 'raw:monthly maintenance': 'fee' });
    expect(r.findings.every((f) => f.reasons.includes('bill-like'))).toBe(true);
  });
  it('Venmo-style payments are person findings even without accountKinds; transfers to the bank are ignored', () => {
    const rows = [
      ...charges('Jane Roommate', monthly('2026-01-01', 5), 60000).map((t) => ({ ...t, type: 'Payment' })),
      ...charges('', monthly('2026-01-03', 5), 20000).map((t) => ({ ...t, type: 'Standard Transfer' })),
    ];
    const r = run(rows);
    expect(r.findings.map((f) => f.kind)).toEqual(['person']);
    expect(r.ignored).toEqual([{ rowClass: 'transfer', count: 5 }]);
  });
  it('payments to people on a wallet file are person findings', () => {
    const rows = charges('Jane Roommate', monthly('2026-01-01', 5), 60000).map((t) => ({ ...t, type: 'Payment' }));
    const f = run(rows, { accountKinds: ['wallet'] }).findings[0]!;
    expect(f.kind).toBe('person');
    expect(f.reasons).toContain('payment-to-person');
  });
});

describe('detectRecurring: confidence, evidence, coverage', () => {
  it('n = 2 (known merchant) is capped at medium', () => {
    const r = run([...charges('NETFLIX.COM', ['2026-07-02', '2026-08-02'], 1549), ...filler('2026-05-01')]);
    const f = r.findings[0]!;
    expect(f.confidence).toBeLessThanOrEqual(0.74);
    expect(f.confidenceLabel).toBe('medium');
    expect(f.reasons).toContain('few-occurrences');
  });
  it('unknown merchant with 2 monthly charges is not a finding', () => {
    expect(run([...charges('ACME WIDGETS', ['2026-07-02', '2026-08-02'], 1549), ...filler('2026-05-01')]).findings).toEqual([]);
  });
  it('evidence keeps the raw descriptor and line numbers; id is stable', () => {
    const rows = charges('NETFLIX.COM 800-585-4219 CA', monthly('2026-01-02', 4), 1549);
    const a = run(rows).findings[0]!;
    expect(a.occurrences[0]).toMatchObject({ description: 'NETFLIX.COM 800-585-4219 CA', line: rows[0]!.line, cents: 1549 });
    expect(a.id).toMatch(/^[0-9a-f]{8}$/);
    expect(run(rows.map((t) => ({ ...t, line: t.line + 100, id: `0:${t.line + 100}` }))).findings[0]!.id).toBe(a.id);
  });
  it('coverage.showHistoryHint under 180 days', () => {
    const short = run(charges('NETFLIX.COM', monthly('2026-01-02', 4), 1549));
    expect(short.coverage.showHistoryHint).toBe(true);
    expect(short.findings[0]!.reasons).toContain('short-history');
    const long = run([...charges('NETFLIX.COM', monthly('2026-01-02', 7), 1549)]);
    expect(long.coverage.days).toBeGreaterThanOrEqual(180);
    expect(long.coverage.showHistoryHint).toBe(false);
  });
  it('sorted by yearly cost, high to low; inputs not mutated', () => {
    const rows = [...charges('NETFLIX.COM', monthly('2026-01-02', 4), 1549), ...charges('SPOTIFY USA', monthly('2026-01-05', 4), 1199), ...charges('HULU', monthly('2026-01-08', 4), 1799)];
    const copy = JSON.stringify(rows);
    const r = run(rows);
    expect(r.findings.map((f) => f.merchantKey)).toEqual(['hulu', 'netflix', 'spotify']);
    expect(JSON.stringify(rows)).toBe(copy);
  });
  it('today defaults to the latest row; an explicit today can end a series', () => {
    const rows = charges('NETFLIX.COM', monthly('2026-01-02', 4), 1549);
    expect(run(rows).findings[0]!.activity).toBe('active');
    expect(run(rows, { today: '2026-12-31' }).findings[0]!.activity).toBe('ended');
  });
});
