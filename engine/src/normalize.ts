// Merchant normalisation (SPEC §7) and row classification (RESEARCH §2 1.4 false-positive families).
import type {
  AliasEntry, AliasIndex, MerchantMatch, PlatformId, ProcessorId, RowClass, SniffResult, Txn,
} from './types';

export function buildAliasIndex(entries: AliasEntry[]): AliasIndex {
  const compiled: { id: string; re: RegExp }[] = [];
  for (const e of entries) {
    for (const p of e.patterns) compiled.push({ id: e.id, re: new RegExp(p, 'i') }); // throws on an invalid RegExp
  }
  return { entries: [...entries], compiled };
}

// ---------- rule 2: bank wrappers (RESEARCH §3 Part 1 rows 21-26; conventions, unverified) ----------
const BANK_WRAPPERS: RegExp[] = [
  /^PENDING\s*-?\s*/,
  /\bRECURRING (?:DEBIT CARD |CARD )?PAYMENT(?: AUTHORIZED ON \d{1,2}\/\d{1,2})?\b/,
  /\bPURCHASE AUTHORI[SZ]ED ON \d{1,2}\/\d{1,2}\b/,
  /\bPURCHASE INTL AUTHORI[SZ]ED ON \d{1,2}\/\d{1,2}\b/,
  /\bCHECKCARD \d{4}\b/,
  /\bPOS (?:DEBIT|PURCHASE|WITHDRAWAL|PUR)\b/,
  /\bDEBIT CARD (?:PURCHASE|PAYMENT|DEBIT)\b/,
  /\bDBT CRD \d{4}\b/,
  /\bCARD PURCHASE(?: WITH PIN)?\b/,
  /\bACH (?:DEBIT|WITHDRAWAL|PMT|PAYMENT)\b/,
  /\bELECTRONIC (?:WITHDRAWAL|PAYMENT)\b/,
  /\bPREAUTHORI[SZ]ED (?:DEBIT|WD|PAYMENT)\b/,
  /\b(?:PPD|WEB|CCD|CTX|TEL) ID:\s*\S*/g,
  /\bINDN:.*?(?=\bCO ID:|$)/,
  /\bCO ID:\s*\S*/g,
  /\bDES:\s*\S*/g,
  /\bID:\s*\S*/g,
  /\bCARD (?:NO\.? )?\d{4}\b/,
  /\bX{2,}\d{2,4}\b/g,
  /\*{2,}\d{4}\b/g,
  /\bENDING (?:IN )?\d{4}\b/,
  /\s(?:PPD|WEB|CCD|CTX)$/,
];

// ---------- rule 3: processor prefixes (RESEARCH §3 Part 1) ----------
// Sources: Square, Stripe, Apple HT201382, Google Play 2851610, Amazon charge-identifier, Paddle,
// FastSpring, Shopify official pages (VERIFIED); PayPal PAYPAL */PP*, DoorDash, Uber, Lyft, Venmo,
// Zelle, Cash App P2P are conventions (UNVERIFIED): matching heuristics only.
interface ProcessorRule {
  re: RegExp;                 // matched at the start of the (wrapper-stripped, uppercase) descriptor
  processor: ProcessorId;
  keep?: string;              // brand word kept in front of the remainder ('UBER *EATS' → 'uber eats')
  platform?: PlatformId;
}
const PROCESSORS: ProcessorRule[] = [
  { re: /^(?:APPLE\.COM\/BILL|APPLE\.COM BILL|APPLE COM BILL|ITUNES\.COM\/BILL|ITUNES\.COM)\b\s*/, processor: 'apple', keep: 'APPLE', platform: 'apple' },
  { re: /^GOOGLE\s*\*\s*/, processor: 'google', platform: 'google-play' },
  { re: /^(?:AMZN MKTP US|AMZN MKTP|AMAZON MKTPLACE PMTS|AMAZON MKTPL|AMAZON MARKETPLACE|AMZN MKTPLACE)\b\*?\s*/, processor: 'amazon', keep: 'AMAZON MARKETPLACE' },
  { re: /^(?:AMAZON\.COM|AMZN\.COM)\s*\*\s*/, processor: 'amazon', keep: 'AMAZON' },
  { re: /^AMZ\s*\*\s*/, processor: 'amazon', keep: 'AMAZON' },
  { re: /^SQC?\s*\*\s*/, processor: 'square' },
  { re: /^TST\s*\*\s*/, processor: 'toast' },
  { re: /^(?:PAYPAL|PP)\s*\*\s*/, processor: 'paypal', platform: 'paypal' },
  { re: /^PADDLE\.NET\s*\*\s*/, processor: 'paddle' },
  { re: /^(?:FSPRG|FS)\s*\*\s*/, processor: 'fastspring' },
  { re: /^SHOPIFY\s*\*\s*/, processor: 'shopify', keep: 'SHOPIFY' },
  { re: /^SP\s+(?=\S)/, processor: 'shopify' },
  { re: /^DD\s*\*\s*/, processor: 'doordash', keep: 'DOORDASH' },
  { re: /^DOORDASH\s*\*\s*/, processor: 'doordash', keep: 'DOORDASH' },
  { re: /^UBER\s*\*\s*/, processor: 'uber', keep: 'UBER' },
  { re: /^LYFT\s*\*\s*/, processor: 'lyft', keep: 'LYFT' },
  { re: /^(?:CASH ?APP|CASHAPP)\s*\*\s*/, processor: 'cashapp', keep: 'CASH APP' },
  { re: /^VENMO\s*\*\s*/, processor: 'venmo', keep: 'VENMO' },
  { re: /^2CO\.COM\s*\*\s*/, processor: 'other' },
];

const STATES = new Set(('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR').split(' '));
const SUPPORT_SUBDOMAINS = /^(HELP|SUPPORT|PAY|BILLING|BILL|ACCOUNT|ACCOUNTS|MY|WWW)$/;
const TLDS = 'COM|NET|ORG|IO|CO|TV|AI|APP|US|ME|FM|LY|GG|SO|DEV|XYZ|BIZ|INFO|CA|UK';
const DOMAIN_RE = new RegExp(`\\b(?:HTTPS?:\\/\\/)?((?:[A-Z0-9-]+\\.)*)([A-Z0-9-]+)\\.(?:${TLDS})\\b(?:\\/[A-Z0-9/._-]*)?`, 'g');

/** SPEC §7 rules, in order. Returns lowercase tokens and the processor that billed it, if any. */
export function cleanDescriptor(desc: string): { cleaned: string; processor: ProcessorId | null } {
  return cleanFull(desc).out;
}

interface CleanFull { out: { cleaned: string; processor: ProcessorId | null }; platform: PlatformId | null; remainderEmpty: boolean }

const cleanCache = new Map<string, CleanFull>();
/** U+200B-U+200F (zero-width, LRM/RLM), U+202A-U+202E (embeddings, overrides), U+2066-U+2069 (isolates), U+FEFF. */
export const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

function cleanFull(desc: string): CleanFull {
  const hit = cleanCache.get(desc);
  if (hit) return hit;
  // 1. bidi controls and zero-width characters out (an RLO can make a name read backwards: Q1 F1b #11), NFKC, uppercase, collapse whitespace
  let s = desc.replace(INVISIBLE_RE, '').normalize('NFKC').toUpperCase().replace(/\s+/g, ' ').trim();
  // 2. bank wrappers
  for (const re of BANK_WRAPPERS) s = s.replace(re, ' ').replace(/\s+/g, ' ').trim();
  // 3. processor prefixes (stacked ones too: 'PP*FS*ADOBE')
  let processor: ProcessorId | null = null;
  let platform: PlatformId | null = null;
  const kept: string[] = [];
  for (let guard = 0; guard < 3; guard++) {
    const rule = PROCESSORS.find((p) => p.re.test(s));
    if (!rule) break;
    s = s.replace(rule.re, '').trim();
    if (processor === null) { processor = rule.processor; platform = rule.platform ?? null; }
    if (rule.keep) kept.push(rule.keep);
  }
  if (processor === null) {
    if (/\bZELLE\b/.test(s)) processor = 'zelle';
    else if (/^VENMO\b/.test(s)) processor = 'venmo';
    else if (/^(?:CASH ?APP)\b/.test(s)) processor = 'cashapp';
  }
  // 4. phone numbers, URLs → domain stem, store numbers, dates, reference numbers, state/city tail
  s = s.replace(/\b(?:1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]?\d{4}\b/g, ' #NUM ');
  s = s.replace(/\b\d{3}-\d{3,4}-?[A-Z0-9]{3,4}\b/g, ' #NUM ');
  s = s.replace(DOMAIN_RE, (_m, subs: string, stem: string) => {
    const labels = subs ? subs.split('.').filter(Boolean) : [];
    if (labels.some((l) => SUPPORT_SUBDOMAINS.test(l))) return ` #SUP${stem} `;
    return ` ${stem} `;
  });
  s = s.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ').replace(/\b\d{1,2}-\d{1,2}-\d{2,4}\b/g, ' ');
  s = s.replace(/#\s*\d+/g, ' #NUM ').replace(/\b(?:STORE|STR|NO\.?|UNIT)\s*#?\s*\d+\b/g, ' #NUM ');
  s = s.replace(/\b(?=[A-Z]*\d)(?=\d*[A-Z])[A-Z0-9]{5,}\b/g, ' #NUM ');
  s = s.replace(/\b\d{3,}\b/g, ' #NUM ');
  // collapse punctuation: apostrophes vanish (JOE'S → JOES), other marks become spaces; keep + and &
  s = s.replace(/['’`]/g, '').replace(/[*.,\-/\\_:;"()[\]{}|!?~^=<>@$%]+/g, ' ');
  s = s.replace(/#(?!NUM|SUP)/g, ' ').replace(/\s+/g, ' ').trim();
  let toks = s.split(' ').filter(Boolean);
  // a support domain ('HELP.UBER.COM') is dropped when its stem is already a merchant word
  toks = toks.flatMap((t) => {
    if (!t.startsWith('#SUP')) return [t];
    const stem = t.slice(4);
    return toks.includes(stem) || kept.some((k) => k.split(' ').includes(stem)) ? [] : [stem];
  });
  // state code at the end, then city words after a store/phone number, then a country code
  let hadState = false;
  if (toks.length > 1 && STATES.has(toks[toks.length - 1]!)) { toks.pop(); hadState = true; }
  const numAt = toks.indexOf('#NUM');
  if (numAt > 0 && hadState) {
    const tail = toks.slice(numAt + 1);
    if (tail.length <= 3 && tail.every((t) => /^[A-Z]+$/.test(t))) toks = toks.slice(0, numAt);
  }
  // numbers left over (store numbers, '1 RIDE 09 14') go, except a leading one ('24 HOUR FITNESS')
  toks = toks.filter((t, i) => t !== '#NUM' && ((i === 0 && kept.length === 0) || !/^\d+$/.test(t)));
  if (toks.length > 1 && (toks[toks.length - 1] === 'US' || toks[toks.length - 1] === 'USA')) toks.pop();
  let body = toks.join(' ');
  if (kept.length) {
    const brand = kept[kept.length - 1]!;
    body = body.startsWith(brand) ? body : `${brand} ${body}`.trim();
  }
  const cleaned = body.toLowerCase().replace(/\s+/g, ' ').trim();
  const res: CleanFull = {
    out: { cleaned: cleaned || (processor ?? ''), processor },
    platform, remainderEmpty: toks.length === 0,
  };
  if (cleanCache.size > 20000) cleanCache.clear();
  cleanCache.set(desc, res);
  return res;
}

const STOPWORDS = new Set(['inc', 'llc', 'co', 'corp', 'the', 'svc', 'svcs', 'pmt', 'pmts', 'ltd', 'com', 'bill', 'payment', 'purchase', 'debit', 'to', 'from', 'for', 'of', 'and', 'on', 'online', 'www', 'recurring']);

const GOOGLE_OWNED = /\b(youtube|google one|google storage|google fi|google workspace|g suite|gsuite|nest|fitbit|google cloud|google play pass)\b/;

function titleCase(s: string): string {
  return s.replace(/\b([a-z])([a-z']*)/g, (_m, a: string, b: string) => a.toUpperCase() + b);
}

export function normalizeMerchant(desc: string, index: AliasIndex, merchantField?: string): MerchantMatch {
  const full = cleanFull(desc);
  const { cleaned, processor } = full.out;
  let alias: AliasEntry | null = null;
  const find = (text: string) => {
    if (!text) return null;
    const hit = index.compiled.find((c) => c.re.test(text));
    return hit ? index.entries.find((e) => e.id === hit.id) ?? null : null;
  };
  alias = find(cleaned);
  if (!alias && merchantField) alias = find(cleanDescriptor(merchantField).cleaned);
  let billedThrough: PlatformId | null = full.platform;
  if (processor === 'google' && (GOOGLE_OWNED.test(cleaned) || (alias && /^(youtube|google)/.test(alias.id)))) billedThrough = null;
  if (alias?.platform) billedThrough = alias.platform;
  let key: string;
  let display: string;
  if (alias) {
    key = alias.id;
    display = alias.name;
  } else {
    const sig = cleaned.split(' ').filter((t) => t && !STOPWORDS.has(t) && /[a-z]/.test(t) && t.length >= 2);
    key = 'raw:' + (sig.slice(0, 2).join(' ') || cleaned || 'unknown');
    const base = merchantField && merchantField.trim() ? cleanDescriptor(merchantField).cleaned : cleaned;
    display = titleCase(base || 'Unknown');
  }
  return {
    key, aliasId: alias?.id ?? null, display, cleaned, processor, billedThrough,
    category: alias?.category ?? null, kind: alias?.kind ?? null,
  };
}

// ---------- classification (RESEARCH §2 1.4) ----------
const CARD_PAYMENT_RE = [
  /\b(?:payment|pymt|pmt)\b.*\bthank\s*you\b/i,
  /\bthank\s*you\b.*\b(?:payment|pymt|pmt)\b/i,
  /\b(?:autopay|auto pay|automatic)\b.*\b(?:payment|pymt|pmt)\b.*\bthank/i,
  /\b(?:credit ?card|cr ?card|crd|card ?services|card ?member|cardmember|applecard|apple card gs|amex|american express|citi ?card|discover|capital ?one|chase card|chase credit|barclaycard|synchrony|card)\b.*\b(?:pay|payment|pymt|pmt|autopay|epay|e-payment|epayment)\b/i,
  /\b(?:epay|e-payment|epayment)\b.*\b(?:amex|discover|citi|chase|capital one|card)\b/i,
  /^(?:online|mobile|internet|electronic|autopay|automatic) (?:payment|pymt|pmt)\b/i,
  /^payment (?:received|- thank|thank)/i,
];
// The same phrases anywhere in the cleaned text: bank wrappers ('PURCHASE AUTHORIZED ON 10/15 …',
// 'POS DEBIT …') are stripped there, so a wrapped 'AUTOPAY PYMT CARD SVCS' is still a card payment.
const CARD_PAYMENT_CLEANED_RE = CARD_PAYMENT_RE.map((re) => new RegExp(re.source.replace(/^\^/, '\\b'), re.flags));

export function isCardPaymentText(desc: string): boolean {
  if (CARD_PAYMENT_RE.some((re) => re.test(desc))) return true;
  const { cleaned } = cleanDescriptor(desc);
  return CARD_PAYMENT_CLEANED_RE.some((re) => re.test(cleaned));
}

const TRANSFER_RE = /\b(?:transfer|xfer|trnsfr|tfr)\b|\b(?:to|from) (?:sav|savings|chk|checking|share|money market)\b|\boverdraft protection\b|\bzelle\b|\bvenmo\b|\bcash ?app\b|\bapple cash\b|\bpaypal transfer\b|\bwire (?:in|out|transfer)\b|\bquickpay\b/i;
const INCOME_RE = /\b(?:payroll|dir dep|direct dep|directdep|salary|paycheck|pay ?roll|ssa treas|irs treas|tax ref|unemployment|deposit)\b/i;
const ATM_RE = /\batm\b|\bcash withdrawal\b|\bwithdrwl\b|\bcash advance\b/i;
const FEE_RE = /\bfee\b|\bservice charge\b|\bmaint(?:enance)? (?:fee|chg)\b|\boverdraft\b|\bnsf\b|\binsufficient funds\b|\blate (?:fee|charge)\b|\breturned item\b/i;
const INTEREST_RE = /\binterest\b|\bint (?:charge|chg|pd|paid|earned)\b|\bfinance charge\b|\bdividend\b/i;
const REFUND_RE = /\brefund\b|\breturn\b|\breversal\b|\breversed\b|\bchargeback\b|\bcredit (?:adj|adjustment|voucher)\b|\bpurchase return\b/i;
const WALLET_TRANSFER_TYPE = /transfer|deposit|withdrawal|cash ?out|add(?:ed)? (?:funds|cash)|bank|conversion|hold|top ?up|instant/i;
const WALLET_P2P_TYPE = /^(?:payment|charge|p2p|sent|received|request|cash card|send|receive)/i;

/** True when a wallet row (Venmo, Cash App) is a payment to or from a person. */
export function isPersonPayment(t: Txn, m: MerchantMatch, accountKind: SniffResult['accountKind']): boolean {
  if (m.aliasId !== null || m.processor !== null) return false;
  const type = (t.type ?? '').trim();
  // without a known account kind, only Venmo-style exact types count ('Payment', 'Charge')
  if (accountKind === 'unknown') return /^(?:payment|charge)$/i.test(type) && t.amountCents < 0;
  if (accountKind !== 'wallet') return false;
  return t.amountCents < 0 && WALLET_P2P_TYPE.test(type) && !/merchant|subscription|purchase|express checkout|preapproved|pre-approved|bill/i.test(type);
}

export function classifyRow(t: Txn, m: MerchantMatch, accountKind: SniffResult['accountKind']): RowClass {
  const d = t.description;
  const type = t.type ?? '';
  const inflow = t.amountCents > 0;
  // explicit type columns first (Chase card, PayPal, Venmo, Cash App, Chase checking)
  if (/^payment$/i.test(type) && accountKind === 'card') return 'card-payment';
  if (/^(?:return|refund)$/i.test(type)) return 'refund';
  if (/^fee/i.test(type) || /FEE_TRANSACTION/i.test(type)) return 'fee';
  if (/ACCT_XFER|^transfer$/i.test(type)) return 'transfer';
  if (/^ATM/i.test(type)) return 'atm';
  if ((accountKind === 'wallet' || accountKind === 'unknown') && WALLET_TRANSFER_TYPE.test(type) && !/payment|purchase|checkout/i.test(type)) return 'transfer';
  if (isPersonPayment(t, m, accountKind)) return 'purchase';
  if (accountKind === 'wallet' && WALLET_P2P_TYPE.test(type) && inflow && m.aliasId === null) return 'income';
  if (isCardPaymentText(d)) return 'card-payment';
  if (INTEREST_RE.test(d)) return 'interest';
  if (ATM_RE.test(d)) return 'atm';
  if (m.aliasId === null && TRANSFER_RE.test(d)) return 'transfer';
  if (m.processor === 'zelle' || ((m.processor === 'venmo' || m.processor === 'cashapp') && m.aliasId === null)) return 'transfer';
  if (inflow) {
    if (REFUND_RE.test(d)) return 'refund';
    if (INCOME_RE.test(d)) return 'income';
    if (accountKind === 'card') return 'refund';
    if (m.aliasId !== null && m.kind !== 'variable-merchant') return 'refund';
    return 'income';
  }
  if (FEE_RE.test(d) && m.aliasId === null) return 'fee';
  return 'purchase';
}
