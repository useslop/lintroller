import { describe, expect, it } from 'vitest';
import { lookupCancel, totals, yearlyCost, type CancelEntry, type Finding } from '../src/index';
import { fakeFinding } from './helpers';

describe('yearlyCost', () => {
  const per: [Finding['cadence'], number][] = [
    ['weekly', 52], ['biweekly', 26], ['semimonthly', 24], ['monthly', 12], ['bimonthly', 6], ['quarterly', 4], ['semiannual', 2], ['yearly', 1],
  ];
  for (const [cadence, p] of per) {
    it(cadence, () => {
      const y = yearlyCost(fakeFinding({ cadence }));
      expect(y).toMatchObject({ cents: 1549 * p, periodsPerYear: p, basis: 'last-amount-x-periods' });
    });
  }
  it('formula string', () => {
    expect(yearlyCost(fakeFinding()).formula).toBe('$15.49 x 12 = $185.88');
    expect(yearlyCost(fakeFinding({ cadence: 'weekly', amount: { lastCents: 123456, medianCents: 0, minCents: 0, maxCents: 0, varies: false } })).formula)
      .toBe('$1,234.56 x 52 = $64,197.12');
  });
  it('irregular: total of the last 365 days of the series', () => {
    const occ = (date: string, cents: number) => ({ txnId: date, source: 0, line: 1, date, cents, description: 'X' });
    const y = yearlyCost(fakeFinding({ cadence: 'irregular', lastDate: '2026-09-01', nextExpected: null,
      occurrences: [occ('2025-08-01', 5000), occ('2025-10-01', 4000), occ('2026-03-01', 4100), occ('2026-09-01', 3900)] }));
    expect(y).toMatchObject({ cents: 12000, periodsPerYear: null, basis: 'observed-last-365-days' });
    expect(y.formula).toBe('total of the last 12 months in your file: $120.00');
  });
});

describe('totals', () => {
  it('excludes ended, maybe-ended, dismissed and person; bills apart', () => {
    const fs = [
      fakeFinding({ id: 'a' }),
      fakeFinding({ id: 'b', category: 'music', amount: { lastCents: 1000, medianCents: 1000, minCents: 1000, maxCents: 1000, varies: false } }),
      fakeFinding({ id: 'c', activity: 'ended' }),
      fakeFinding({ id: 'd', activity: 'maybe-ended' }),
      fakeFinding({ id: 'e' }),
      fakeFinding({ id: 'f', kind: 'person' }),
      fakeFinding({ id: 'g', kind: 'bill', category: 'utilities', amount: { lastCents: 9000, medianCents: 9000, minCents: 9000, maxCents: 9000, varies: true } }),
      fakeFinding({ id: 'h', kind: 'fee', category: null, amount: { lastCents: 1200, medianCents: 1200, minCents: 1200, maxCents: 1200, varies: false } }),
    ];
    const t = totals(fs, { a: 'confirmed', e: 'dismissed', c: 'confirmed' }, '2026-09-30');
    expect(t.confirmedYearlyCents).toBe(18588);
    expect(t.unreviewedYearlyCents).toBe(12000);
    expect(t.billsYearlyCents).toBe(108000 + 14400);
    expect(t.counts).toEqual({ confirmed: 1, unreviewed: 3, dismissed: 1, ended: 2 });
    expect(t.byCategory).toEqual([{ category: 'video', yearlyCents: 18588, count: 1 }, { category: 'music', yearlyCents: 12000, count: 1 }]);
  });
});

const entry = (o: Partial<CancelEntry>): CancelEntry => ({
  id: 'netflix', name: 'Netflix', category: 'video', domains: ['netflix.com'],
  manageUrl: 'https://www.netflix.com/account', helpUrl: 'https://help.netflix.com/en/node/407', stepsStated: true,
  notes: [], check: { help: { status: 200, finalUrl: 'https://help.netflix.com/en/node/407', checkedAt: '2026-10-04T21:00:00-04:00', ok: true } },
  verified: '2026-10-04', ...o,
});

describe('lookupCancel', () => {
  const dir: CancelEntry[] = [
    entry({}),
    entry({ id: 'apple', name: 'Apple subscriptions', category: 'platform-biller', domains: ['apple.com'], manageUrl: null,
      helpUrl: 'https://support.apple.com/118428', check: { help: { status: 200, finalUrl: 'https://support.apple.com/118428', checkedAt: '2026-10-04T21:00:00-04:00', ok: true } } }),
    entry({ id: 'hulu', name: 'Hulu', domains: ['hulu.com'], manageUrl: 'https://secure.hulu.com/account', helpUrl: null, stepsStated: false, verified: null, check: {} }),
    entry({ id: 'spotify', name: 'Spotify', domains: ['spotify.com'], manageUrl: 'https://www.spotify.com/account', helpUrl: null, stepsStated: false,
      check: { manage: { status: 200, finalUrl: 'https://www.spotify.com/account', checkedAt: '2026-05-01T10:00:00-04:00', ok: true } }, verified: '2026-05-01' }),
  ];
  it('platform route first, then the merchant', () => {
    const links = lookupCancel({ aliasId: 'netflix', billedThrough: 'apple' }, dir, '2026-10-04');
    expect(links.map((l) => [l.entryId, l.route, l.kind])).toEqual([['apple', 'apple', 'help'], ['netflix', 'merchant', 'help']]);
    expect(links[0]!.badge).toBe('verified');
    expect(links[0]!.checkedOn).toBe('2026-10-04');
  });
  it('unverified entries are never returned', () => {
    expect(lookupCancel({ aliasId: 'hulu', billedThrough: null }, dir, '2026-10-04')).toEqual([]);
  });
  it('stale badge after 90 days; manage URL when steps are not stated', () => {
    const [l] = lookupCancel({ aliasId: 'spotify', billedThrough: null }, dir, '2026-10-04');
    expect(l).toMatchObject({ badge: 'stale', kind: 'manage', url: 'https://www.spotify.com/account', checkedOn: '2026-05-01' });
    expect(lookupCancel({ aliasId: 'spotify', billedThrough: null }, dir, '2026-07-01')[0]!.badge).toBe('verified');
  });
  it('no alias and no platform: nothing', () => {
    expect(lookupCancel({ aliasId: null, billedThrough: null }, dir, '2026-10-04')).toEqual([]);
  });
});
