import { describe, expect, it } from 'vitest';
import { checkSign, detectRecurring, flipSigns, mergeRows, parseRows, sniffFormat, totals, yearlyCost } from '../src/index';
import { INDEX, addDays, monthly, stepDays } from './helpers';

const us = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

/** A synthetic Chase-card-style file (purchases positive), 14 months, labelled by construction. */
function chaseCard(): string {
  const rows: [string, string, string][] = [];
  const add = (dates: string[], desc: string, amt: (i: number) => number) =>
    dates.forEach((d, i) => rows.push([d, desc, (amt(i) / 100).toFixed(2)]));
  add(monthly('2025-08-03', 14), 'NETFLIX.COM', () => 1549);
  add(monthly('2025-08-11', 14), 'SPOTIFY USA', (i) => (i < 10 ? 1199 : 1299));
  add(monthly('2025-08-07', 14), 'APPLE.COM/BILL', () => 299);
  add(monthly('2025-08-21', 14), 'APPLE.COM/BILL', () => 1099);
  add(monthly('2025-08-15', 14), 'POS PURCHASE PLANET GYM #0042 DENVER CO', () => 2499);
  add(['2025-08-25', '2026-08-25'], 'SQ *ACME DOMAINS', () => 2000);
  add(monthly('2025-08-28', 5), 'HULU 866-9977-BOX', () => 1799);                     // ended in Dec
  add(stepDays('2025-08-02', 60, 7), 'SHELL OIL 57444 HOUSTON TX', (i) => 3000 + ((i * 7919) % 3100));
  add(stepDays('2025-08-04', 60, 7), 'FRESHMART #123 AUSTIN TX', (i) => 5000 + ((i * 104729) % 9000));
  add(stepDays('2025-08-05', 40, 10), 'AMZN Mktp US*2K4AB1', (i) => 900 + ((i * 15485863) % 12000));
  add(monthly('2025-08-26', 14), 'PAYMENT THANK YOU', () => -150000);
  add(['2026-03-04'], 'NETFLIX.COM', () => -1549);                                    // a refund
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return ['Transaction Date,Post Date,Description,Category,Type,Amount,Memo',
    ...rows.map(([d, desc, amt]) => `${us(d)},${us(addDays(d, 1))},${desc},Shopping,${desc === 'PAYMENT THANK YOU' ? 'Payment' : amt.startsWith('-') ? 'Return' : 'Sale'},${amt},`)].join('\r\n') + '\r\n';
}

describe('end to end', () => {
  it('chase-card file: sniff → parse → sign check → merge → detect → totals', () => {
    const text = chaseCard();
    const s = sniffFormat(text);
    expect(s.format).toBe('chase-card');
    const parsed = parseRows(text, s);
    expect(checkSign(parsed.rows, INDEX).flip).toBe(false);
    const rows = mergeRows([parsed]);
    const r = detectRecurring(rows, { aliasIndex: INDEX, accountKinds: [s.accountKind] });
    const got = r.findings.map((f) => `${f.merchantKey}|${f.cadence}|${f.activity}|${f.amount.lastCents}`).sort();
    expect(got).toEqual([
      'apple|monthly|active|1099', 'apple|monthly|active|299', 'hulu|monthly|ended|1799', 'netflix|monthly|active|1549',
      'planet-gym|monthly|active|2499', 'raw:acme domains|yearly|active|2000', 'spotify|monthly|active|1299',
    ].sort());
    const spotify = r.findings.find((f) => f.merchantKey === 'spotify')!;
    expect(spotify.priceChanges.length).toBe(1);
    expect(yearlyCost(spotify).formula).toBe('$12.99 x 12 = $155.88');
    expect(r.findings.find((f) => f.merchantKey === 'netflix')!.refunds.length).toBe(1);
    expect(r.ignored).toEqual([{ rowClass: 'card-payment', count: 14 }]);
    expect(r.suppressed.map((x) => x.reason)).toContain('variable-merchant');
    const t = totals(r.findings, {}, r.coverage.to);
    expect(t.counts.ended).toBe(1);
    expect(t.unreviewedYearlyCents).toBe((1549 + 1299 + 299 + 1099 + 2499) * 12 + 2000);
  });
  it('the same file read with the wrong sign gets flipped by the self-check', () => {
    const text = chaseCard();
    const s = { ...sniffFormat(text), signConvention: 'debit-negative' as const };
    const parsed = parseRows(text, s);
    const c = checkSign(parsed.rows, INDEX);
    expect(c.flip).toBe(true);
    const r = detectRecurring(mergeRows([{ ...parsed, rows: flipSigns(parsed.rows) }]), { aliasIndex: INDEX });
    expect(r.findings.length).toBe(7);
  });
  it('semicolon file with decimal commas and day-first dates (generic mapper)', () => {
    const text = 'Datum;Omschrijving;Bedrag\n02-09-2026;NETFLIX.COM;-15,49\n15-09-2026;SPOTIFY USA;-11,99\n20-09-2026;SALARIS;1.234,56\n';
    const s = sniffFormat(text);
    expect(s).toMatchObject({ format: 'generic', delimiter: ';', dateOrder: 'DMY', headerLine: 0 });
    expect(s.mapping).toMatchObject({ date: 0, description: 1, amount: 2 });
    const r = parseRows(text, s);
    expect(r.rows.map((t) => [t.date, t.amountCents])).toEqual([['2026-09-02', -1549], ['2026-09-15', -1199], ['2026-09-20', 123456]]);
  });
});
