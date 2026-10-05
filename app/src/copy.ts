// Product copy and formatting. Wording follows SPEC §4; lintCopy in the tests checks every literal in src/.
import type { Cadence, Finding, FormatId, ParseSpec, PlatformId, ReasonCode } from './engine';

export const CADENCE_WORDS: Record<Cadence, string> = {
  weekly: 'once a week', biweekly: 'once per 2 weeks', semimonthly: 'twice a month', monthly: 'once a month',
  bimonthly: 'once per 2 months', quarterly: 'once a quarter', semiannual: 'twice a year', yearly: 'once a year',
  irregular: 'now and then',
};

export const CONFIDENCE_TEXT = { high: 'High', medium: 'Medium', low: 'Low' } as const;

export const PLATFORM_NAME: Record<PlatformId, string> = {
  apple: 'Apple', 'google-play': 'Google Play', amazon: 'Amazon', paypal: 'PayPal', roku: 'Roku',
};

export const FORMAT_LABEL: Record<FormatId, string> = {
  'boa-checking': 'Bank of America checking', 'boa-card': 'Bank of America credit card',
  'chase-checking': 'Chase checking', 'chase-card': 'Chase credit card', 'wells-fargo': 'Wells Fargo',
  'citi-card': 'Citi credit card', 'capitalone-card': 'Capital One credit card', amex: 'American Express',
  discover: 'Discover', usbank: 'U.S. Bank', 'apple-card': 'Apple Card', paypal: 'PayPal', venmo: 'Venmo',
  cashapp: 'Cash App', ynab: 'YNAB', monarch: 'Monarch', mint: 'Mint', generic: 'generic',
};

export const SKIP_LABEL: Record<string, [one: string, many: string]> = {
  blank: ['blank line', 'blank lines'], preamble: ['line above the header', 'lines above the header'],
  'summary-row': ['summary row', 'summary rows'],
  'unparseable-date': ['row with no readable date', 'rows with no readable date'],
  'unparseable-amount': ['row with no readable amount', 'rows with no readable amount'],
  'zero-amount': ['zero-amount row', 'zero-amount rows'], pending: ['pending row', 'pending rows'],
  'non-usd': ['row in another currency', 'rows in another currency'],
  'duplicate-across-files': ['row also in another file', 'rows also in another file'],
  'future-date': ['row dated after today', 'rows dated after today'],
  'before-1990': ['row dated before 1990', 'rows dated before 1990'],
};

/**
 * Shown when the sign self-check flipped a file (Q1 F1b #1): says what this file holds, read from the
 * convention the format expected, never the format's assumed default.
 */
export function signFlipNote(spec: ParseSpec | null): string {
  switch (spec?.signConvention) {
    case 'charge-positive': return 'Charges in this file are negative numbers, so we read them that way.';
    case 'debit-negative': return 'Charges in this file are positive numbers, so we read them that way.';
    default: return 'We read the signs the other way round for this file.';
  }
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatMoney = (cents: number): string => usd.format(cents / 100);

export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** SPEC §4 reason sentences, one per ReasonCode. */
export function reasonText(code: ReasonCode, f: Finding): string {
  switch (code) {
    case 'regular-interval': return `Charged about ${CADENCE_WORDS[f.cadence]}`;
    case 'interval-drifts': return 'Dates move around a bit';
    case 'stable-amount': return 'Same amount each time';
    case 'amount-varies': return 'Amount changes';
    case 'price-change': return 'Price changed';
    case 'known-merchant': return 'We know this company sells subscriptions';
    case 'platform-biller': return `Billed through ${f.billedThrough ? PLATFORM_NAME[f.billedThrough] : 'another company'}`;
    case 'few-occurrences': return `Only ${f.occurrences.length} charges so far`;
    case 'missed-one': return 'One expected charge is missing';
    case 'trial-then-paid': return 'Small first charge, then full price';
    case 'possibly-ended': return `No charge since ${formatDate(f.lastDate)}`;
    case 'ended': return 'Seems to have stopped';
    case 'variable-merchant': return 'A shop you buy from often';
    case 'bill-like': return 'Looks like a bill';
    case 'payment-to-person': return 'A payment to a person';
    case 'short-history': return 'Your file is short, so this is a guess';
  }
}

/** The three consumer-action sentences (RESEARCH §4d, Decision 1d), each with its official source. Nothing else about law. */
export const LAW_LINES: { text: string; href: string; source: string }[] = [
  {
    text: 'Cancel with the company first and keep proof, like a confirmation email or screenshot.',
    href: 'https://www.consumerfinance.gov/ask-cfpb/how-do-i-stop-automatic-payments-from-my-bank-account-en-2023/',
    source: 'CFPB: how to stop automatic payments',
  },
  {
    text: 'Bank autopay: under U.S. rules you can tell your bank to stop a preauthorized debit at least three business days before it is due (your bank may want it in writing and may charge a fee).',
    href: 'https://www.ecfr.gov/current/title-12/chapter-X/part-1005/subpart-A/section-1005.10',
    source: '12 CFR 1005.10 on eCFR',
  },
  {
    text: 'Credit-card charges: contact your card issuer quickly; billing-error disputes have a 60-day window from the statement.',
    href: 'https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-B/section-1026.13',
    source: '12 CFR 1026.13 on eCFR',
  },
];
export const LAW_NOTE = 'General information, not legal advice.';
