// TEMPORARY stand-in for @subsweep/engine until B1's real package lands. Types copied from CONTRACT.md §2–§3.
// Behaviour is naive on purpose (no quotes, one alias rule, monthly-only detection). Delete this folder when the real engine is in.

export const FORMAT_IDS = [
  'boa-checking', 'boa-card', 'chase-checking', 'chase-card', 'wells-fargo', 'citi-card',
  'capitalone-card', 'amex', 'discover', 'usbank', 'apple-card',
  'paypal', 'venmo', 'cashapp', 'ynab', 'monarch', 'mint', 'generic',
] as const;
export type FormatId = (typeof FORMAT_IDS)[number];
export type SignConvention = 'debit-negative' | 'charge-positive' | 'split-columns' | 'type-column';
export type DateOrder = 'MDY' | 'YMD' | 'DMY';
export interface ColumnMapping {
  date: number; postedDate?: number; description: number; merchant?: number; amount?: number;
  debit?: number; credit?: number; type?: number; status?: number; currency?: number; bankCategory?: number;
}
export interface SniffResult {
  format: FormatId; confidence: 'high' | 'medium' | 'low'; delimiter: ',' | ';' | '\t'; headerLine: number;
  columns: string[]; mapping: ColumnMapping | null; signConvention: SignConvention; dateOrder: DateOrder;
  accountKind: 'bank' | 'card' | 'wallet' | 'budget-app' | 'unknown'; notes: string[];
}
export type ParseSpec = Pick<SniffResult,
  'format' | 'delimiter' | 'headerLine' | 'mapping' | 'signConvention' | 'dateOrder' | 'accountKind'>;
export interface Txn {
  id: string; source: number; line: number; date: string; postedDate?: string; description: string;
  merchantField?: string; amountCents: number; currency: string; type?: string; status?: string; bankCategory?: string;
}
export type SkipReason =
  | 'blank' | 'preamble' | 'summary-row' | 'unparseable-date' | 'unparseable-amount'
  | 'zero-amount' | 'pending' | 'non-usd' | 'duplicate-across-files';
export interface ParseResult {
  rows: Txn[]; skipped: { line: number; reason: SkipReason }[]; dateRange: { from: string; to: string } | null;
  stats: { lines: number; parsed: number; skipped: number; outflows: number; inflows: number };
}
export const CATEGORIES = [
  'video', 'music', 'audio-books', 'news', 'software', 'cloud', 'ai', 'security', 'fitness',
  'wellness', 'delivery', 'shopping-membership', 'dating', 'gaming', 'home-security',
  'protection', 'telecom', 'platform-biller', 'utilities', 'insurance', 'housing', 'loans',
  'charity', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];
export type PlatformId = 'apple' | 'google-play' | 'amazon' | 'paypal' | 'roku';
export type AliasKind = 'subscription' | 'membership' | 'bill' | 'platform' | 'variable-merchant';
export interface AliasEntry {
  id: string; name: string; category: Category; kind: AliasKind; patterns: string[]; platform?: PlatformId;
  source: { url: string; fetched: string } | null; verified: boolean;
}
export interface AliasIndex { readonly entries: readonly AliasEntry[]; readonly compiled: readonly { id: string; re: RegExp }[]; }
export type ProcessorId =
  | 'square' | 'toast' | 'paypal' | 'stripe' | 'apple' | 'google' | 'amazon' | 'doordash'
  | 'uber' | 'lyft' | 'cashapp' | 'venmo' | 'zelle' | 'shopify' | 'paddle' | 'fastspring' | 'other';
export interface MerchantMatch {
  key: string; aliasId: string | null; display: string; cleaned: string; processor: ProcessorId | null;
  billedThrough: PlatformId | null; category: Category | null; kind: AliasKind | null;
}
export type RowClass = 'purchase' | 'transfer' | 'card-payment' | 'income' | 'atm' | 'fee' | 'refund' | 'interest';
export const CADENCES = [
  'weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly', 'irregular',
] as const;
export type Cadence = (typeof CADENCES)[number];
export type FixedCadence = Exclude<Cadence, 'irregular'>;
export type FindingKind = 'subscription' | 'membership' | 'bill' | 'fee' | 'person' | 'unknown';
export type FindingStatus = 'suggested' | 'confirmed' | 'dismissed';
export type StatusMap = Record<string, Exclude<FindingStatus, 'suggested'>>;
export type ReasonCode =
  | 'regular-interval' | 'interval-drifts' | 'stable-amount' | 'amount-varies' | 'price-change'
  | 'known-merchant' | 'platform-biller' | 'few-occurrences' | 'missed-one' | 'trial-then-paid'
  | 'possibly-ended' | 'ended' | 'variable-merchant' | 'bill-like' | 'payment-to-person' | 'short-history';
export interface Evidence { txnId: string; source: number; line: number; date: string; cents: number; description: string; }
export interface Finding {
  id: string; merchantKey: string; aliasId: string | null; display: string; category: Category | null;
  kind: FindingKind; billedThrough: PlatformId | null; cadence: Cadence;
  intervalDays: { median: number; mad: number; min: number; max: number };
  amount: { lastCents: number; medianCents: number; minCents: number; maxCents: number; varies: boolean };
  anchorCents: number; priceChanges: { date: string; fromCents: number; toCents: number }[];
  trial: { date: string; cents: number } | null; occurrences: Evidence[]; refunds: Evidence[];
  firstDate: string; lastDate: string; nextExpected: string | null;
  activity: 'active' | 'maybe-ended' | 'ended'; confidence: number; confidenceLabel: 'high' | 'medium' | 'low';
  reasons: ReasonCode[]; status: 'suggested';
}
export interface DetectParams {
  minConfidence: number; amountTolPct: number; amountTolFloorCents: number; billsAmountTolPct: number;
  dayTolerance: Record<FixedCadence, number>; minOccurrences: Record<FixedCadence, number>;
  minOccurrencesKnownMerchant: Record<FixedCadence, number>; minSpanDays: Record<FixedCadence, number>;
  minFitShort: number; minFitLong: number; priceStepMinRepeats: number; priceStepMaxRatio: number;
  graceMinDays: number; graceFraction: number; trialMaxCents: number; trialWindowDays: number;
  irregularMin: number; irregularMaxCv: number; irregularMinSpanDays: number; minAmountCents: number;
  weights: { reg: number; amt: number; cnt: number; prior: number }; historyHintDays: number;
}
export interface DetectOptions { aliasIndex: AliasIndex; today?: string; includeInflows?: boolean; params?: Partial<DetectParams>; }
export interface DetectResult {
  findings: Finding[]; ignored: { rowClass: RowClass; count: number }[];
  suppressed: { merchantKey: string; display: string; count: number;
    reason: 'variable-merchant' | 'too-few' | 'irregular-amounts' | 'below-confidence' }[];
  coverage: { from: string; to: string; days: number; canSeeYearly: boolean; showHistoryHint: boolean };
}
export interface YearlyCost {
  cents: number; periodsPerYear: number | null; basis: 'last-amount-x-periods' | 'observed-last-365-days'; formula: string;
}
export interface Totals {
  confirmedYearlyCents: number; unreviewedYearlyCents: number; billsYearlyCents: number;
  byCategory: { category: Category | 'uncategorised'; yearlyCents: number; count: number }[];
  counts: { confirmed: number; unreviewed: number; dismissed: number; ended: number };
}
export interface LinkCheck { status: number; finalUrl: string; checkedAt: string; ok: boolean; note?: string; }
export interface CancelEntry {
  id: string; name: string; category: Category; domains: string[]; manageUrl: string | null; helpUrl: string | null;
  stepsStated: boolean; via?: PlatformId[]; notes: string[]; check: { manage?: LinkCheck; help?: LinkCheck };
  verified: string | null;
}
export interface CancelLink {
  entryId: string; name: string; url: string; kind: 'help' | 'manage'; badge: 'verified' | 'stale';
  checkedOn: string; route: 'merchant' | PlatformId; notes: string[];
}
export interface FormatHelp {
  format: FormatId; institution: string; product: string; steps: string[]; helpUrl: string | null; verified: string | null;
}
export interface IcsOptions { daysBefore: number; includeAmounts: boolean; productUrl: string; now: string; }

export const NEVER_SAY: readonly string[] = [
  'every', 'overnight', 'in minutes', 'no humans', 'fully autonomous', 'guarantee', 'guaranteed', 'AI-powered',
  'insane', 'revolutionary', '10x', 'magic', 'link in bio', 'we found all', 'all your subscriptions', 'save $',
  "you'll save", 'you could save', 'cancel for you', 'subscription found',
];

const FAKE_DEFAULT: DetectParams = {
  minConfidence: 0.35, amountTolPct: 7.5, amountTolFloorCents: 25, billsAmountTolPct: 35,
  dayTolerance: { weekly: 2, biweekly: 2, semimonthly: 3, monthly: 3, bimonthly: 4, quarterly: 5, semiannual: 7, yearly: 7 },
  minOccurrences: { weekly: 4, biweekly: 3, semimonthly: 4, monthly: 3, bimonthly: 3, quarterly: 3, semiannual: 2, yearly: 2 },
  minOccurrencesKnownMerchant: { weekly: 3, biweekly: 3, semimonthly: 3, monthly: 2, bimonthly: 2, quarterly: 2, semiannual: 2, yearly: 2 },
  minSpanDays: { weekly: 21, biweekly: 28, semimonthly: 45, monthly: 60, bimonthly: 120, quarterly: 180, semiannual: 210, yearly: 395 },
  minFitShort: 1, minFitLong: 0.75, priceStepMinRepeats: 2, priceStepMaxRatio: 1.5, graceMinDays: 5, graceFraction: 0.25,
  trialMaxCents: 100, trialWindowDays: 31, irregularMin: 4, irregularMaxCv: 0.1, irregularMinSpanDays: 90, minAmountCents: 50,
  weights: { reg: 0.35, amt: 0.25, cnt: 0.2, prior: 0.2 }, historyHintDays: 180,
};
export const DEFAULT_PARAMS: DetectParams = FAKE_DEFAULT;

const header = (line: string) => line.split(',').map((c) => c.trim().toLowerCase());

export function sniffFormat(text: string): SniffResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const cols = header(lines[0] ?? '');
  const d = cols.indexOf('date'), desc = cols.indexOf('description'), amt = cols.indexOf('amount');
  const mapped = d >= 0 && desc >= 0 && amt >= 0;
  return {
    format: 'generic', confidence: 'medium', delimiter: ',', headerLine: 0, columns: cols,
    mapping: mapped ? { date: d, description: desc, amount: amt } : null,
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'unknown', notes: [],
  };
}

export function suggestMapping(): ColumnMapping | null { return null; }

const isoOf = (raw: string): string | null => {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) return raw;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  return us ? `${us[3]}-${us[1]!.padStart(2, '0')}-${us[2]!.padStart(2, '0')}` : null;
};
const centsOf = (raw: string): number | null => {
  const s = raw.replace(/[$,\s]/g, '');
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const c = Number(m[2]) * 100 + Number((m[3] ?? '0').padEnd(2, '0'));
  return m[1] ? -c : c;
};

export function parseRows(text: string, spec: ParseSpec, source = 0): ParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const rows: Txn[] = [];
  const skipped: ParseResult['skipped'] = [];
  const m = spec.mapping;
  lines.forEach((raw, i) => {
    if (i === spec.headerLine || raw.trim() === '') return;
    if (!m || m.amount === undefined) return skipped.push({ line: i + 1, reason: 'unparseable-amount' });
    const cells = raw.split(spec.delimiter).map((c) => c.trim());
    const date = isoOf(cells[m.date] ?? '');
    const cents = centsOf(cells[m.amount] ?? '');
    if (!date) return skipped.push({ line: i + 1, reason: 'unparseable-date' });
    if (cents === null) return skipped.push({ line: i + 1, reason: 'unparseable-amount' });
    if (cents === 0) return skipped.push({ line: i + 1, reason: 'zero-amount' });
    const signed = spec.signConvention === 'charge-positive' ? -cents : cents;
    rows.push({ id: `${source}:${i + 1}`, source, line: i + 1, date, description: cells[m.description] ?? '', amountCents: signed, currency: 'USD' });
  });
  const dates = rows.map((r) => r.date).sort();
  return {
    rows, skipped,
    dateRange: dates.length ? { from: dates[0]!, to: dates[dates.length - 1]! } : null,
    stats: {
      lines: lines.length, parsed: rows.length, skipped: skipped.length,
      outflows: rows.filter((r) => r.amountCents < 0).length, inflows: rows.filter((r) => r.amountCents > 0).length,
    },
  };
}

export function mergeRows(results: ParseResult[]): Txn[] {
  return results.flatMap((r) => r.rows).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
}

export function checkSign(rows: Txn[], index: AliasIndex): { flip: boolean; votes: { aliasIn: number; aliasOut: number; paymentsIn: number; paymentsOut: number } } {
  const hits = rows.filter((r) => index.compiled.some((c) => c.re.test(r.description)));
  const aliasIn = hits.filter((r) => r.amountCents > 0).length;
  const aliasOut = hits.length - aliasIn;
  return { flip: aliasIn > aliasOut && aliasIn > 0, votes: { aliasIn, aliasOut, paymentsIn: 0, paymentsOut: 0 } };
}

export function flipSigns(rows: Txn[]): Txn[] { return rows.map((r) => ({ ...r, amountCents: -r.amountCents })); }

export function buildAliasIndex(entries: AliasEntry[]): AliasIndex {
  return { entries, compiled: entries.map((e) => ({ id: e.id, re: new RegExp(e.patterns.join('|'), 'i') })) };
}

const key = (desc: string) => desc.toUpperCase().replace(/[0-9#*].*$/, '').replace(/\s+/g, ' ').trim();
const fmtDay = (iso: string) => iso;

export function detectRecurring(rows: Txn[], opts: DetectOptions): DetectResult {
  const outs = rows.filter((r) => r.amountCents < 0);
  const groups = new Map<string, Txn[]>();
  for (const r of outs) groups.set(key(r.description), [...(groups.get(key(r.description)) ?? []), r]);
  const findings: Finding[] = [];
  for (const [k, list] of groups) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
    const cents = sorted.map((r) => -r.amountCents);
    const last = cents[cents.length - 1]!;
    const alias = opts.aliasIndex.compiled.find((c) => c.re.test(k));
    const occurrences: Evidence[] = sorted.map((r) => ({
      txnId: r.id, source: r.source, line: r.line, date: r.date, cents: -r.amountCents, description: r.description,
    }));
    findings.push({
      id: `fake-${k.toLowerCase().replace(/\s+/g, '-')}`, merchantKey: alias?.id ?? `raw:${k.toLowerCase()}`,
      aliasId: alias?.id ?? null, display: alias ? alias.id : k, category: null,
      kind: alias ? 'subscription' : 'unknown', billedThrough: null, cadence: 'monthly',
      intervalDays: { median: 30, mad: 1, min: 28, max: 31 },
      amount: { lastCents: last, medianCents: last, minCents: Math.min(...cents), maxCents: Math.max(...cents), varies: new Set(cents).size > 1 },
      anchorCents: cents[0]!, priceChanges: [], trial: null, occurrences, refunds: [],
      firstDate: sorted[0]!.date, lastDate: sorted[sorted.length - 1]!.date, nextExpected: null,
      activity: 'active', confidence: 0.8, confidenceLabel: 'high', reasons: ['regular-interval', 'stable-amount'], status: 'suggested',
    });
  }
  const dates = rows.map((r) => r.date).sort();
  const from = dates[0] ?? '1970-01-01', to = dates[dates.length - 1] ?? '1970-01-01';
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  findings.sort((a, b) => yearlyCost(b).cents - yearlyCost(a).cents);
  return {
    findings, ignored: [{ rowClass: 'transfer', count: rows.filter((r) => /TRANSFER/i.test(r.description)).length }],
    suppressed: [], coverage: { from, to, days, canSeeYearly: days >= 395, showHistoryHint: days < 180 },
  };
}

export function yearlyCost(f: Finding): YearlyCost {
  const cents = f.amount.lastCents * 12;
  const money = (c: number) => `$${(c / 100).toFixed(2)}`;
  return { cents, periodsPerYear: 12, basis: 'last-amount-x-periods', formula: `${money(f.amount.lastCents)} x 12 = ${money(cents)}` };
}

export function totals(findings: Finding[], statuses: StatusMap, today: string): Totals {
  void today;
  const counted = findings.filter((f) => f.activity === 'active' && (f.kind === 'subscription' || f.kind === 'membership' || f.kind === 'unknown'));
  const sum = (xs: Finding[]) => xs.reduce((n, f) => n + yearlyCost(f).cents, 0);
  const confirmed = counted.filter((f) => statuses[f.id] === 'confirmed');
  const unreviewed = counted.filter((f) => statuses[f.id] === undefined);
  const bills = findings.filter((f) => f.activity === 'active' && (f.kind === 'bill' || f.kind === 'fee') && statuses[f.id] !== 'dismissed');
  return {
    confirmedYearlyCents: sum(confirmed), unreviewedYearlyCents: sum(unreviewed), billsYearlyCents: sum(bills),
    byCategory: [], counts: {
      confirmed: confirmed.length, unreviewed: unreviewed.length,
      dismissed: findings.filter((f) => statuses[f.id] === 'dismissed').length,
      ended: findings.filter((f) => f.activity === 'ended').length,
    },
  };
}

export function lookupCancel(m: Pick<Finding, 'aliasId' | 'billedThrough'>, dir: CancelEntry[], today: string): CancelLink[] {
  void today;
  const e = dir.find((c) => c.id === m.aliasId && c.verified !== null);
  if (!e) return [];
  const url = e.helpUrl ?? e.manageUrl;
  if (!url) return [];
  return [{ entryId: e.id, name: e.name, url, kind: e.helpUrl ? 'help' : 'manage', badge: 'verified', checkedOn: e.verified!, route: 'merchant', notes: e.notes }];
}

const csvCell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export function findingsToCsv(findings: Finding[], statuses: StatusMap): string {
  const head = ['display', 'cadence', 'last_amount', 'yearly', 'status', 'first', 'last'];
  const body = findings.map((f) => [f.display, f.cadence, (f.amount.lastCents / 100).toFixed(2), (yearlyCost(f).cents / 100).toFixed(2), statuses[f.id] ?? 'suggested', f.firstDate, f.lastDate].map(csvCell).join(','));
  return [head.join(','), ...body].join('\r\n') + '\r\n';
}
export function buildIcs(findings: Finding[], opts: IcsOptions): string {
  const events = findings.filter((f) => f.nextExpected).map((f) => [
    'BEGIN:VEVENT', `UID:${f.id}@subsweep`, `DTSTAMP:${opts.now.replace(/[-:]|\.\d+/g, '')}`,
    `SUMMARY:${opts.includeAmounts ? `${f.display} ${fmtDay(f.nextExpected!)}` : f.display}`, `DTSTART;VALUE=DATE:${f.nextExpected!.replace(/-/g, '')}`, 'END:VEVENT',
  ].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${opts.productUrl}//EN`, ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

export function lintCopy(text: string): { term: string; index: number }[] {
  const hits: { term: string; index: number }[] = [];
  for (const term of NEVER_SAY) {
    const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[$.*+?^{}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'gi');
    for (const m of text.matchAll(re)) hits.push({ term, index: (m.index ?? 0) + m[1]!.length });
  }
  return hits;
}
