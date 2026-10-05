// Shared shapes for every lane. CONTRACT.md §2, pasted verbatim (plus IcsOptions from §3).
// Change only together with CONTRACT.md and docs/SPEC.md.

// ---------- formats ----------
export const FORMAT_IDS = [
  'boa-checking', 'boa-card', 'chase-checking', 'chase-card', 'wells-fargo', 'citi-card',
  'capitalone-card', 'amex', 'discover', 'usbank', 'apple-card',
  'paypal', 'venmo', 'cashapp', 'ynab', 'monarch', 'mint', 'generic',
] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export type SignConvention =
  | 'debit-negative'   // money out is negative, money in positive (bank accounts)
  | 'charge-positive'  // purchases positive, payments/credits negative (many card exports)
  | 'split-columns'    // separate Debit and Credit columns, both unsigned
  | 'type-column';     // unsigned amount + a debit/credit type column (Mint)

export type DateOrder = 'MDY' | 'YMD' | 'DMY';

export interface ColumnMapping {          // 0-based column indexes
  date: number;                          // transaction date (or the only date)
  postedDate?: number;
  description: number;                   // raw descriptor
  merchant?: number;                     // a clean merchant column when the export has one (Apple Card "Merchant")
  amount?: number;                       // single signed/unsigned amount column
  debit?: number;                        // with credit: split-columns
  credit?: number;
  type?: number;                         // e.g. Mint "Transaction Type", Venmo "Type"
  status?: number;                       // e.g. PayPal "Status"; pending rows are skipped
  currency?: number;
  bankCategory?: number;                 // informational only, never trusted for detection
}

export interface SniffResult {
  format: FormatId;                      // 'generic' when no signature matched
  confidence: 'high' | 'medium' | 'low';
  delimiter: ',' | ';' | '\t';
  headerLine: number;                    // 0-based index of the header row; -1 = headerless (Wells Fargo)
  columns: string[];                     // header cells as found, or 'col1'.. when headerless
  mapping: ColumnMapping | null;         // null = generic and not auto-mappable: the app asks the user
  signConvention: SignConvention;
  dateOrder: DateOrder;
  accountKind: 'bank' | 'card' | 'wallet' | 'budget-app' | 'unknown';
  notes: string[];                       // e.g. 'skipped 6 summary lines above the header'
}

/** What parseRows needs: a SniffResult, or one the user corrected in the column mapper. */
export type ParseSpec = Pick<SniffResult,
  'format' | 'delimiter' | 'headerLine' | 'mapping' | 'signConvention' | 'dateOrder' | 'accountKind'>;

// ---------- rows ----------
export interface Txn {
  id: string;            // `${source}:${line}`, unique within a session
  source: number;        // 0-based index of the file in this session (several files can be merged)
  line: number;          // 1-based physical line number in that file (shown as evidence)
  date: string;          // ISO yyyy-mm-dd: transaction date, else posted date
  postedDate?: string;
  description: string;   // raw descriptor, trimmed, never rewritten
  merchantField?: string;
  amountCents: number;   // integer, NORMALISED: money out < 0, money in > 0, whatever the bank's convention
  currency: string;      // ISO 4217, default 'USD'
  type?: string;
  status?: string;
  bankCategory?: string;
}

export type SkipReason =
  | 'blank' | 'preamble' | 'summary-row' | 'unparseable-date' | 'unparseable-amount'
  | 'zero-amount' | 'pending' | 'non-usd' | 'duplicate-across-files';

export interface ParseResult {
  rows: Txn[];
  skipped: { line: number; reason: SkipReason }[];   // line numbers only, never row text
  dateRange: { from: string; to: string } | null;
  stats: { lines: number; parsed: number; skipped: number; outflows: number; inflows: number };
}

// ---------- merchants ----------
export const CATEGORIES = [
  'video', 'music', 'audio-books', 'news', 'software', 'cloud', 'ai', 'security', 'fitness',
  'wellness', 'delivery', 'shopping-membership', 'dating', 'gaming', 'home-security',
  'protection', 'telecom', 'platform-biller', 'utilities', 'insurance', 'housing', 'loans',
  'charity', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type PlatformId = 'apple' | 'google-play' | 'amazon' | 'paypal' | 'roku';
export type AliasKind = 'subscription' | 'membership' | 'bill' | 'platform' | 'variable-merchant';

export interface AliasEntry {             // data/aliases.json is AliasEntry[]
  id: string;                            // kebab-case; equals the CancelEntry id when both exist
  name: string;                          // canonical display name, e.g. 'Netflix'
  category: Category;
  kind: AliasKind;                       // variable-merchant = gas, groceries, rideshare, Amazon retail: down-weighted
  patterns: string[];                    // case-insensitive RegExp sources, tested against the CLEANED descriptor
  platform?: PlatformId;                 // set when this alias IS a platform biller (Apple, Google Play ...)
  source: { url: string; fetched: string } | null;   // official "how it appears on your statement" page, if any
  verified: boolean;                     // true only when source !== null
}

export interface AliasIndex {             // built once by buildAliasIndex(); opaque to callers
  readonly entries: readonly AliasEntry[];
  readonly compiled: readonly { id: string; re: RegExp }[];
}

export type ProcessorId =
  | 'square' | 'toast' | 'paypal' | 'stripe' | 'apple' | 'google' | 'amazon' | 'doordash'
  | 'uber' | 'lyft' | 'cashapp' | 'venmo' | 'zelle' | 'shopify' | 'paddle' | 'fastspring' | 'other';

export interface MerchantMatch {
  key: string;                // grouping key: the alias id, else 'raw:' + cleaned first two significant tokens
  aliasId: string | null;
  display: string;            // alias name, else the cleaned descriptor in Title Case
  cleaned: string;            // lowercase tokens after the SPEC §7 rules
  processor: ProcessorId | null;
  billedThrough: PlatformId | null;
  category: Category | null;
  kind: AliasKind | null;
}

export type RowClass =
  | 'purchase' | 'transfer' | 'card-payment' | 'income' | 'atm' | 'fee' | 'refund' | 'interest';

// ---------- detection ----------
export const CADENCES = [
  'weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly', 'irregular',
] as const;
export type Cadence = (typeof CADENCES)[number];

export type FindingKind = 'subscription' | 'membership' | 'bill' | 'fee' | 'person' | 'unknown';
export type FindingStatus = 'suggested' | 'confirmed' | 'dismissed';   // the engine only emits 'suggested'
export type StatusMap = Record<string, Exclude<FindingStatus, 'suggested'>>;   // keyed by Finding.id

export type ReasonCode =
  | 'regular-interval' | 'interval-drifts' | 'stable-amount' | 'amount-varies' | 'price-change'
  | 'known-merchant' | 'platform-biller' | 'few-occurrences' | 'missed-one' | 'trial-then-paid'
  | 'possibly-ended' | 'ended' | 'variable-merchant' | 'bill-like' | 'payment-to-person' | 'short-history';

export interface Evidence {
  txnId: string; source: number; line: number; date: string;
  cents: number;              // positive = money out (refunds: positive = money back)
  description: string;        // the raw descriptor from the user's file
}

export interface Finding {
  id: string;                 // fnv1a32 hex of `${merchantKey}|${cadence}|${anchorCents}`: stable across re-imports
  merchantKey: string;
  aliasId: string | null;
  display: string;
  category: Category | null;
  kind: FindingKind;
  billedThrough: PlatformId | null;
  cadence: Cadence;
  intervalDays: { median: number; mad: number; min: number; max: number };
  amount: { lastCents: number; medianCents: number; minCents: number; maxCents: number; varies: boolean };
  anchorCents: number;        // first amount of the series (id input)
  priceChanges: { date: string; fromCents: number; toCents: number }[];
  trial: { date: string; cents: number } | null;
  occurrences: Evidence[];    // every charge used, oldest first
  refunds: Evidence[];        // credits from the same merchant key inside the series window
  firstDate: string;
  lastDate: string;
  nextExpected: string | null;          // null for 'irregular'
  activity: 'active' | 'maybe-ended' | 'ended';
  confidence: number;                   // 0..1, rounded to 2 decimals
  confidenceLabel: 'high' | 'medium' | 'low';   // >= 0.75 / >= 0.5 / >= params.minConfidence
  reasons: ReasonCode[];
  status: 'suggested';
}

export type FixedCadence = Exclude<Cadence, 'irregular'>;

export interface DetectParams {           // defaults in SPEC §5.3; every field overridable for tests
  minConfidence: number;                // 0.35: below = suppressed
  amountTolPct: number;                 // 7.5 (% of the cluster's running mean)
  amountTolFloorCents: number;          // 25
  billsAmountTolPct: number;            // 35 (utilities, telecom, insurance only)
  dayTolerance: Record<FixedCadence, number>;
  minOccurrences: Record<FixedCadence, number>;
  minOccurrencesKnownMerchant: Record<FixedCadence, number>;
  minSpanDays: Record<FixedCadence, number>;
  minFitShort: number;                  // 1.0: share of on-cadence gaps required when n <= 4
  minFitLong: number;                   // 0.75: when n >= 5
  priceStepMinRepeats: number;          // 2
  priceStepMaxRatio: number;            // 1.5
  graceMinDays: number;                 // 5
  graceFraction: number;                // 0.25 of the cadence step
  trialMaxCents: number;                // 100
  trialWindowDays: number;              // 31
  irregularMin: number;                 // 4
  irregularMaxCv: number;               // 0.10
  irregularMinSpanDays: number;         // 90
  minAmountCents: number;               // 50
  weights: { reg: number; amt: number; cnt: number; prior: number };   // 0.35 / 0.25 / 0.20 / 0.20
  historyHintDays: number;              // 180
}

export interface DetectOptions {
  aliasIndex: AliasIndex;
  today?: string;             // ISO; default = latest row date (pure: never reads the clock)
  includeInflows?: boolean;   // default false
  params?: Partial<DetectParams>;
}

export interface DetectResult {
  findings: Finding[];                                  // sorted by yearly cost, high to low
  ignored: { rowClass: RowClass; count: number }[];     // transfers, card payments, income ... counts only
  suppressed: { merchantKey: string; display: string; count: number;
                reason: 'variable-merchant' | 'too-few' | 'irregular-amounts' | 'below-confidence' }[];
  coverage: { from: string; to: string; days: number;
              canSeeYearly: boolean;     // days >= minSpanDays.yearly (395)
              showHistoryHint: boolean }; // days < historyHintDays (180)
}

// ---------- money ----------
export interface YearlyCost {
  cents: number;
  periodsPerYear: number | null;        // 52, 26, 24, 12, 6, 4, 2, 1; null for irregular
  basis: 'last-amount-x-periods' | 'observed-last-365-days';
  formula: string;                      // "$15.49 x 12 = $185.88", printed next to the number
}

export interface Totals {                // headline numbers count kinds subscription | membership | unknown only
  confirmedYearlyCents: number;
  unreviewedYearlyCents: number;        // 'suggested' findings that are still active
  billsYearlyCents: number;             // active bill | fee findings, confirmed or unreviewed; shown separately, never added to the headline
                                        // 'person' findings and ended / maybe-ended findings never count anywhere
  byCategory: { category: Category | 'uncategorised'; yearlyCents: number; count: number }[];
  counts: { confirmed: number; unreviewed: number; dismissed: number; ended: number };
}

// ---------- cancel directory ----------
export interface LinkCheck {
  status: number;             // final HTTP status after redirects
  finalUrl: string;
  checkedAt: string;          // ISO datetime with offset
  ok: boolean;                // 2xx, or 3xx to the merchant's own sign-in on an entry domain
  note?: string;              // '403 bot wall', 'redirects to sign-in', 'JS-rendered, steps not checkable'
}

export interface CancelEntry {            // data/cancel.json is CancelEntry[]
  id: string;                             // same id as the alias
  name: string;
  category: Category;
  domains: string[];                      // official hosts; every URL below must be on one of them
  manageUrl: string | null;               // account page (often lands on sign-in)
  helpUrl: string | null;                 // official help article
  stepsStated: boolean;                   // the fetched help page states how to cancel
  via?: PlatformId[];                     // other ways people pay for it ('apple', 'google-play', ...)
  notes: string[];                        // our words, from the official page: phone-only, fee, in-person
  check: { manage?: LinkCheck; help?: LinkCheck };
  verified: string | null;                // ISO date of the last ok check; null = unverified, never linked
}

export interface CancelLink {
  entryId: string;
  name: string;
  url: string;                            // helpUrl when stepsStated, else manageUrl
  kind: 'help' | 'manage';
  badge: 'verified' | 'stale';            // stale = last ok check older than 90 days (today passed in)
  checkedOn: string;                      // ISO date shown as "checked Oct 4, 2026"
  route: 'merchant' | PlatformId;         // 'apple' = "billed by Apple: cancel in your Apple subscriptions"
  notes: string[];
}

export interface FormatHelp {             // data/formats-help.json is FormatHelp[]
  format: FormatId;
  institution: string;                    // 'Bank of America'
  product: string;                        // 'Checking and savings'
  steps: string[];                        // our words, <= 5 steps
  helpUrl: string | null;                 // official page only
  verified: string | null;
}

// ---------- corpus (B4) ----------
export type DistractorFamily =
  | 'gas' | 'groceries' | 'coffee' | 'restaurant' | 'rideshare' | 'transfer' | 'card-payment'
  | 'payroll' | 'amazon-retail' | 'atm' | 'refund' | 'one-off';
export type Trap =
  | 'price-rise' | 'trial' | 'weekend-shift' | 'month-end' | 'ended' | 'missed-one'
  | 'platform-biller' | 'tax-drift' | 'same-merchant-two-plans';

export interface LabelledSeries {
  merchantKey: string; aliasId: string | null; display: string;
  cadence: Cadence; kind: FindingKind; nominalCents: number;
  lines: number[];                        // 1-based lines of the occurrences in the case file
  traps: Trap[];
  mustFind: boolean;                      // false when the series is below min occurrences by design
}
export interface CaseLabels {
  caseId: string; format: FormatId; seed: number; from: string; to: string;
  recurring: LabelledSeries[];
  distractors: { merchant: string; family: DistractorFamily; lines: number[] }[];
}
export interface Score {
  tp: number; fp: number; fn: number; precision: number; recall: number; f1: number;
  cadenceAccuracy: number;                // share of TPs with the labelled cadence
  yearlyCostMaxErrorPct: number;
  perFormat: Partial<Record<FormatId, { tp: number; fp: number; fn: number }>>;
  falsePositives: { caseId: string; findingId: string; display: string; why: string }[];
  falseNegatives: { caseId: string; merchantKey: string; cadence: Cadence }[];
}

// ---------- export (CONTRACT §3) ----------
export interface IcsOptions {
  daysBefore: number;          // 1..30, default 3
  includeAmounts: boolean;     // default true; off = the event title is only the merchant name
  productUrl: string;
  now: string;                 // ISO datetime, supplied by the caller (purity)
}
