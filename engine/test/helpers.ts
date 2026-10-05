import { buildAliasIndex, type AliasEntry, type Finding, type Txn } from '../src/index';

const a = (id: string, name: string, category: AliasEntry['category'], kind: AliasEntry['kind'], patterns: string[], platform?: AliasEntry['platform']): AliasEntry =>
  ({ id, name, category, kind, patterns, ...(platform ? { platform } : {}), source: null, verified: false });

/** Synthetic alias table for tests (order = priority: specific before generic). */
export const TEST_ALIASES: AliasEntry[] = [
  a('netflix', 'Netflix', 'video', 'subscription', ['\\bnetflix']),
  a('spotify', 'Spotify', 'music', 'subscription', ['\\bspotify']),
  a('hulu', 'Hulu', 'video', 'subscription', ['\\bhulu\\b']),
  a('disney-plus', 'Disney+', 'video', 'subscription', ['disney ?(plus|\\+)']),
  a('youtube-premium', 'YouTube Premium', 'video', 'subscription', ['youtube']),
  a('amazon-prime', 'Amazon Prime', 'shopping-membership', 'membership', ['amazon prime']),
  a('amazon-retail', 'Amazon', 'other', 'variable-merchant', ['^amazon marketplace', '^amazon$']),
  a('uber-one', 'Uber One', 'delivery', 'membership', ['^uber one\\b']),
  a('uber', 'Uber', 'other', 'variable-merchant', ['^uber\\b']),
  a('apple', 'Apple', 'platform-biller', 'platform', ['^apple$', '^itunes'], 'apple'),
  a('shell', 'Shell', 'other', 'variable-merchant', ['^shell\\b']),
  a('planet-gym', 'Planet Gym', 'fitness', 'membership', ['planet gym']),
  a('city-power', 'City Power', 'utilities', 'bill', ['city power']),
];
export const INDEX = buildAliasIndex(TEST_ALIASES);

let line = 1;
/** Rows for one merchant: money out, file 0, unique line numbers. */
export function charges(desc: string, dates: string[], cents: number | number[], source = 0): Txn[] {
  return dates.map((date, i) => {
    const l = line++;
    const c = Array.isArray(cents) ? cents[i]! : cents;
    return { id: `${source}:${l}`, source, line: l, date, description: desc, amountCents: -c, currency: 'USD' };
  });
}
export function inflows(desc: string, dates: string[], cents: number): Txn[] {
  return charges(desc, dates, -cents);
}

const pad = (n: number) => String(n).padStart(2, '0');
export function addDays(iso: string, n: number): string {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
/** Month steps keeping the anchor day, clamped to the month's end. */
export function monthly(start: string, count: number, stepMonths = 1, anchor = +start.slice(8, 10)): string[] {
  const y0 = +start.slice(0, 4); const m0 = +start.slice(5, 7) - 1;
  return Array.from({ length: count }, (_, i) => {
    const mi = m0 + i * stepMonths;
    const y = y0 + Math.floor(mi / 12); const m = mi % 12;
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return `${y}-${pad(m + 1)}-${pad(Math.min(anchor, dim))}`;
  });
}
export function stepDays(start: string, count: number, n: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i * n));
}

export function fakeFinding(o: Partial<Finding> = {}): Finding {
  return {
    id: 'f1', merchantKey: 'netflix', aliasId: 'netflix', display: 'Netflix', category: 'video', kind: 'subscription',
    billedThrough: null, cadence: 'monthly', intervalDays: { median: 30, mad: 0, min: 28, max: 31 },
    amount: { lastCents: 1549, medianCents: 1549, minCents: 1549, maxCents: 1549, varies: false },
    anchorCents: 1549, priceChanges: [], trial: null,
    occurrences: [{ txnId: '0:2', source: 0, line: 2, date: '2026-09-02', cents: 1549, description: 'NETFLIX.COM' }],
    refunds: [], firstDate: '2026-01-02', lastDate: '2026-09-02', nextExpected: '2026-10-02', activity: 'active',
    confidence: 0.9, confidenceLabel: 'high', reasons: ['regular-interval'], status: 'suggested', ...o,
  };
}

