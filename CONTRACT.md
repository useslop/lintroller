# CONTRACT.md: Subscription Sweep (working name Lintroller), shared shapes for every lane

Draft by R1, 2026-10-04. The scaffold copies this file to `CONTRACT.md at the repo root`. B1 pastes §2–§4 verbatim into `engine/src/types.ts` and `engine/src/schema.ts` as its first commit (`B1: types`). B2, B3 and B4 code against this file from minute 0. Change it only together with SPEC.md and `types.ts`, and say so in your SUMMARY.

## 1. Repo layout and package names

```
subsweep/                     npm workspaces, MIT, Node >= 22, "type": "module"
  package.json                workspaces: ["engine", "data", "corpus", "app"]; "test": "npm run test --workspaces --if-present"
  tsconfig.base.json          strict, ES2022, moduleResolution "bundler"
  CONTRACT.md  docs/SPEC.md  docs/RESEARCH.md
  engine/   @subsweep/engine  B1  pure TS, no I/O. exports "./src/index.ts"
  data/     @subsweep/data    B3  JSON + index.ts (typed re-export) + scripts/check-links.mjs
  corpus/   @subsweep/corpus  B4  synthetic generator, evaluator, hand fixtures
  app/      @subsweep/app     B2  Vite + React 19 static app
  vercel.json                 B2 writes, I1 owns after integration
```

Package scope `@subsweep/*` is internal and never changes. The product name lives in one constant (`app/src/product.ts`, `PRODUCT_NAME = 'Lintroller'`) so the owner can rename it.

Dependency direction: `app → engine, data`; `data → engine` (schemas, dev only); `corpus → engine, data`. The engine imports nothing from the other three. Nobody imports from `app`.

## 2. Types (`engine/src/types.ts`, normative)

```ts
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
```

## 3. Engine exports (`engine/src/index.ts`, normative signatures)

All functions are pure: no `fetch`, DOM, storage, clock or randomness. Inputs are never mutated.

| Function | Signature | Notes |
|---|---|---|
| sniffFormat | `(text: string) => SniffResult` | reads at most the first 30 lines; strips a UTF-8 BOM; never throws |
| suggestMapping | `(columns: string[], sample: string[][]) => ColumnMapping \| null` | generic files; header words + value shapes |
| parseRows | `(text: string, spec: ParseSpec, source?: number) => ParseResult` | source defaults to 0; amounts to integer cents, normalised sign |
| mergeRows | `(results: ParseResult[]) => Txn[]` | sorts by date; drops identical (date, cents, description) rows only when they come from different files |
| checkSign | `(rows: Txn[], index: AliasIndex) => { flip: boolean; votes: { aliasIn: number; aliasOut: number; paymentsIn: number; paymentsOut: number } }` | SPEC §6 sign self-check, per file, run after `parseRows` |
| flipSigns | `(rows: Txn[]) => Txn[]` | returns copies with `amountCents` negated (the app applies it when `checkSign` says so, and again for "Flip back") |
| buildAliasIndex | `(entries: AliasEntry[]) => AliasIndex` | compiles patterns once; throws on an invalid RegExp |
| cleanDescriptor | `(desc: string) => { cleaned: string; processor: ProcessorId \| null }` | SPEC §7 rules, exported for tests and the alias editor |
| normalizeMerchant | `(desc: string, index: AliasIndex, merchantField?: string) => MerchantMatch` | |
| classifyRow | `(t: Txn, m: MerchantMatch, accountKind: SniffResult['accountKind']) => RowClass` | |
| detectRecurring | `(rows: Txn[], opts: DetectOptions) => DetectResult` | |
| yearlyCost | `(f: Finding) => YearlyCost` | |
| totals | `(findings: Finding[], statuses: StatusMap, today: string) => Totals` | ended findings never count |
| lookupCancel | `(m: Pick<Finding, 'aliasId' \| 'billedThrough'>, dir: CancelEntry[], today: string) => CancelLink[]` | 0-2 links: platform first, then merchant; entries with `verified: null` are never returned |
| findingsToCsv | `(findings: Finding[], statuses: StatusMap) => string` | RFC 4180, CRLF; any cell starting with `= + - @ \t \r` gets a leading `'` |
| buildIcs | `(findings: Finding[], opts: IcsOptions) => string` | RFC 5545: CRLF, 75-octet folding, UID, DTSTAMP from `opts.now`, VALARM |
| lintCopy | `(text: string) => { term: string; index: number }[]` | `NEVER_SAY` list from SPEC §4 |
| DEFAULT_PARAMS | `DetectParams` | SPEC §5.3 |
| NEVER_SAY | `readonly string[]` | |
| schemas | `AliasEntrySchema, CancelEntrySchema, FormatHelpSchema, CaseLabelsSchema` (zod) | §4 |

```ts
export interface IcsOptions {
  daysBefore: number;          // 1..30, default 3
  includeAmounts: boolean;     // default true; off = the event title is only the merchant name
  productUrl: string;
  now: string;                 // ISO datetime, supplied by the caller (purity)
}
```

## 4. Data file schemas (`engine/src/schema.ts`, zod 3, normative)

```ts
import { z } from 'zod';
import { CATEGORIES, FORMAT_IDS, CADENCES } from './types';
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const httpsUrl = z.string().url().refine((u) => u.startsWith('https://'), 'https only');
const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const platform = z.enum(['apple', 'google-play', 'amazon', 'paypal', 'roku']);

export const AliasEntrySchema = z.object({
  id, name: z.string().min(1).max(60), category: z.enum(CATEGORIES),
  kind: z.enum(['subscription', 'membership', 'bill', 'platform', 'variable-merchant']),
  patterns: z.array(z.string().min(2)).min(1),
  platform: platform.optional(),
  source: z.object({ url: httpsUrl, fetched: isoDate }).nullable(),
  verified: z.boolean(),
}).strict().refine((a) => a.verified === (a.source !== null), 'verified iff source');

const linkCheck = z.object({
  status: z.number().int(), finalUrl: z.string().url(), checkedAt: z.string().datetime({ offset: true }),
  ok: z.boolean(), note: z.string().optional(),
}).strict();

export const CancelEntrySchema = z.object({
  id, name: z.string().min(1).max(60), category: z.enum(CATEGORIES),
  domains: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1),
  manageUrl: httpsUrl.nullable(), helpUrl: httpsUrl.nullable(), stepsStated: z.boolean(),
  via: z.array(platform).optional(), notes: z.array(z.string().max(200)),
  check: z.object({ manage: linkCheck.optional(), help: linkCheck.optional() }).strict(),
  verified: isoDate.nullable(),
}).strict()
  .refine((e) => e.manageUrl !== null || e.helpUrl !== null, 'needs a URL')
  .refine((e) => [e.manageUrl, e.helpUrl].every((u) => u === null ||
      e.domains.some((d) => { const h = new URL(u).hostname; return h === d || h.endsWith('.' + d); })),
    'every URL must be on an entry domain')
  .refine((e) => e.verified === null || Boolean(e.check.manage?.ok || e.check.help?.ok), 'verified needs an ok check')
  .refine((e) => !e.stepsStated || e.helpUrl !== null, 'stepsStated needs helpUrl');

export const FormatHelpSchema = z.object({
  format: z.enum(FORMAT_IDS), institution: z.string(), product: z.string(),
  steps: z.array(z.string().max(160)).max(5), helpUrl: httpsUrl.nullable(), verified: isoDate.nullable(),
}).strict();

export const CaseLabelsSchema = z.object({
  caseId: z.string(), format: z.enum(FORMAT_IDS), seed: z.number().int(), from: isoDate, to: isoDate,
  recurring: z.array(z.object({
    merchantKey: z.string(), aliasId: z.string().nullable(), display: z.string(),
    cadence: z.enum(CADENCES),
    kind: z.enum(['subscription', 'membership', 'bill', 'fee', 'person', 'unknown']),
    nominalCents: z.number().int().positive(), lines: z.array(z.number().int().positive()).min(1),
    traps: z.array(z.string()), mustFind: z.boolean(),
  }).strict()),
  distractors: z.array(z.object({ merchant: z.string(), family: z.string(),
    lines: z.array(z.number().int().positive()) }).strict()),
}).strict();
```

Data rules on top of the schemas (B3 tests them): ids unique per file; every `cancel.json` id that also exists in `aliases.json` has the same `category`; no URL on a third-party "how to cancel" domain (SPEC §8 denylist); `aliases.json` ≥ 60 entries; `cancel.json` ≥ 60 entries with `verified !== null`.

## 5. `@subsweep/data` exports (`data/index.ts`)

```ts
export const aliases: AliasEntry[];          // data/aliases.json
export const cancelDirectory: CancelEntry[]; // data/cancel.json
export const formatsHelp: FormatHelp[];      // data/formats-help.json
export const dataMeta: { generated: string; aliasCount: number; cancelCount: number; verifiedCount: number; linkCheckRanAt: string | null };
```
The app **bundles** these (static import). There is no runtime data fetch and no `/data/` route (SPEC §10: `connect-src 'none'`).

## 6. App routes (B2 builds, I1 and Q1 test)

| Route | Screen | Needs data in memory |
|---|---|---|
| `/` | landing | no |
| `/sweep` | import: drop, pick, paste, "try the sample file", column mapper for generic files | no |
| `/sweep/review` | review list with confirm/dismiss + evidence | yes, else redirect to `/sweep` with a note |
| `/sweep/summary` | yearly totals, cancel links, exports (CSV, ICS) | yes, else redirect |
| `/how-to-export` | per-bank download steps (`formatsHelp`) | no |
| `/privacy` | what runs where, the CSP text, the live proof (`/privacy-results.json`, static file) | no |
| `/about` | how it was built, Build Receipt link, licence | no |

Every route is served by the same static shell (`vercel.json` rewrite), plus prerendered HTML for `/`, `/how-to-export`, `/privacy`, `/about`. The only static non-HTML files are `/assets/*`, `/sample/sample-statement.csv` (synthetic, from B4: `corpus/out/sample-statement.csv`), `/privacy-results.json`, `/robots.txt`, `/favicon.svg`, `/og.png`. The app never fetches any of them (`connect-src 'none'`): it bundles the sample (`?raw` import) and the privacy results (`app/src/privacy-results.json`); the static copies exist only so people can download the sample and `curl` the proof.

## 7. Statuses and storage

- The engine emits `status: 'suggested'`. The app keeps `StatusMap` (`confirmed` | `dismissed`) in memory.
- "Remember on this device" is OFF by default. When ON, the app writes exactly one localStorage key, `subsweep:v1`, holding `{ savedAt, statuses, findings }` (findings only: never raw rows or file text). "Delete everything" removes the key and clears memory. No cookies, IndexedDB, sessionStorage or service worker in v1.

## 8. Commit and ownership rules

Write only inside your own workspace folder (plus the files your brief names). Read other workspaces only through their exports in this contract. Commit identity is preset by the scaffold (`Tanya <276445918+nickopenclawd-ctrl@users.noreply.github.com>`); do not change git config. Commit messages start with your lane id (`B1: …`).
