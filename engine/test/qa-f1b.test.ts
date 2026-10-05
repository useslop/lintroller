// Regressions for Q1's F1b fix list (reports/subscription-sweep-2026-10-04/lanes/Q1-qa/REVIEW.md "Fix list").
import { describe, expect, it } from 'vitest';
import { detectRecurring, parseRows, type ParseSpec } from '../src/index';
import { parseAmountCents } from '../src/values';
import { INDEX, charges } from './helpers';

describe('F1b #3: decimal-comma money is never cut short', () => {
  it.each([
    ['-1.234,56', false, -123456],
    ['1.234,56', false, 123456],
    ['-1.234.567,89', false, -123456789],
    ['-1,234.56', false, -123456],
    ['1,234.56', true, 123456],
    ['15,49', false, 1549],
    ['-15,5', false, -1550],
    ['1,234', false, 123400],
    ['12.34', false, 1234],
    ['12,34', true, 1234],
    ['(12.00)', false, -1200],
    ['- $5.00', false, -500],
    ['5-', false, -500],
  ] as const)('%s (decimalComma=%s) → %i cents', (raw, dc, cents) => {
    expect(parseAmountCents(raw, dc)).toBe(cents);
  });
});

const SPEC: ParseSpec = {
  format: 'generic', delimiter: ',', headerLine: 0, mapping: { date: 0, description: 1, amount: 2 },
  signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'unknown',
};

describe('F1b #2: rows after the real date or before 1990 are skipped and counted', () => {
  const text = [
    'Date,Description,Amount',
    '04/12/2027,FUTURE STREAMING,-9.99',
    '10/09/2026,SCHEDULED BILL,-50.00',
    '09/12/2026,NETFLIX.COM,-15.49',
    '01/12/1985,OLDTIME CABLE,-29.99',
    '',
  ].join('\n');

  it('with the real date: future (beyond 7 days) and pre-1990 rows are skipped', () => {
    const r = parseRows(text, SPEC, 0, { today: '2026-10-04' });
    expect(r.rows.map((t) => t.description)).toEqual(['SCHEDULED BILL', 'NETFLIX.COM']);
    expect(r.skipped.filter((s) => s.reason === 'future-date').length).toBe(1);
    expect(r.skipped.filter((s) => s.reason === 'before-1990').length).toBe(1);
    expect(r.dateRange).toEqual({ from: '2026-09-12', to: '2026-10-09' });
  });

  it('without a date (pure use) only the pre-1990 rule applies', () => {
    const r = parseRows(text, SPEC, 0);
    expect(r.rows.length).toBe(3);
    expect(r.skipped.map((s) => s.reason)).toEqual(['before-1990']);
  });
});

describe('F1b #4: a price change is not also "same amount each time"', () => {
  it('7 x 15.49 then 7 x 17.99: price-change without stable-amount', () => {
    const dates = Array.from({ length: 14 }, (_, i) => `${2025 + Math.floor((7 + i) / 12)}-${String(((7 + i) % 12) + 1).padStart(2, '0')}-12`);
    const amounts = dates.map((_, i) => (i < 7 ? 1549 : 1799));
    const r = detectRecurring(charges('NETFLIX.COM', dates, amounts), { aliasIndex: INDEX });
    const f = r.findings.find((x) => x.aliasId === 'netflix')!;
    expect(f.reasons).toContain('price-change');
    expect(f.reasons).not.toContain('stable-amount');
  });

  it('a flat series still says stable-amount', () => {
    const dates = Array.from({ length: 6 }, (_, i) => `2026-0${i + 1}-12`);
    const r = detectRecurring(charges('NETFLIX.COM', dates, 1549), { aliasIndex: INDEX });
    expect(r.findings[0]!.reasons).toContain('stable-amount');
    expect(r.findings[0]!.reasons).not.toContain('price-change');
  });
});
