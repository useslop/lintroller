// Seeded case generator. generateCase() plants labelled recurring series (every cadence except irregular,
// the SPEC §9 traps) and distractor streams (SPEC §9 families) in one file, writes it in the format's
// exact shape, and returns the labels with the physical line of every occurrence.
// Same seed in, byte-identical CSV and labels out. Nothing here reads the clock or Math.random.
import { DEFAULT_PARAMS, type CaseLabels, type DistractorFamily, type FindingKind, type FixedCadence, type FormatId, type LabelledSeries, type Trap } from '@subsweep/engine';
import { addDays, addMonths, daysBetween, pad2, usShort, weekday } from './dates';
import { APPLE_PLANS, CITY_TAILS, ONE_OFF_NAMES, PERSON, RAW_MERCHANTS, SUBSCRIPTIONS, VOCAB, type MerchantSpec } from './catalog';
import { createRng, type Rng } from './rng';
import { WRITERS } from './writers';
import { randomDigits, type TxnKind, type WriteTxn } from './writers/common';

export const FIXED_CADENCES: FixedCadence[] = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly'];
const STEP_DAYS: Record<FixedCadence, number> = { weekly: 7, biweekly: 14, semimonthly: 15, monthly: 30, bimonthly: 61, quarterly: 91, semiannual: 182, yearly: 365 };
const STEP_MONTHS: Partial<Record<FixedCadence, number>> = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, yearly: 12 };

/** Who the account belongs to: decides descriptor wrappers and which distractor families make sense. */
type Flavour = 'bank' | 'card' | 'wallet' | 'budget';
const FLAVOUR: Record<FormatId, Flavour> = {
  'boa-checking': 'bank', 'chase-checking': 'bank', 'wells-fargo': 'bank', usbank: 'bank', generic: 'bank',
  'boa-card': 'card', 'chase-card': 'card', 'citi-card': 'card', 'capitalone-card': 'card', amex: 'card', discover: 'card', 'apple-card': 'card',
  paypal: 'wallet', venmo: 'wallet', cashapp: 'wallet',
  ynab: 'budget', monarch: 'budget', mint: 'budget',
};
const ACCOUNT_NAME: Record<Flavour, string> = { bank: 'Sample Checking', card: 'Sample Card', wallet: 'Sample Wallet', budget: 'Sample Checking' };

export interface GenerateOptions {
  seed: number;
  format: FormatId;
  months: number;          // 6..18
  series: number;          // 3..14 labelled recurring series
  caseId?: string;
  /** Pads the file with coffee-like noise rows until it has at least this many rows (performance cases). */
  targetRows?: number;
}

export interface GeneratedCase {
  csv: string;
  labels: CaseLabels;
}

interface SeriesMeta {
  role: 'series';
  aliasId: string | null;
  merchantKey: string;
  display: string;
  kind: FindingKind;
  cadence: FixedCadence;
  traps: Trap[];
  nominal: number;
  known: boolean;
  fullCount: number;
}
interface DistractorMeta {
  role: 'distractor';
  merchant: string;
  family: DistractorFamily;
}
interface Stream {
  meta: SeriesMeta | DistractorMeta;
  rows: number[];
}
interface Row {
  date: string;
  descriptor: string;
  merchant: string;
  cents: number;
  kind: TxnKind;
  category: string;
  stream: number;
}
interface Ctx {
  rng: Rng;
  flavour: Flavour;
  format: FormatId;
  from: string;
  to: string;
}

const BANK_WRAPS: ((t: string, d: string, rng: Rng) => string)[] = [
  (t, d) => `PURCHASE AUTHORIZED ON ${usShort(d)} ${t}`,
  (t, d) => `CHECKCARD ${usShort(d).replace('/', '')} ${t}`,
  (t) => `POS DEBIT ${t}`,
  (t) => `DEBIT CARD PURCHASE ${t}`,
  (t, d) => `RECURRING PAYMENT AUTHORIZED ON ${usShort(d)} ${t}`,
  (t, _d, rng) => `${t} WEB ID: ${randomDigits(rng, 10)}`,
];

/** Store-number, phone and city noise around a core. The core itself is never changed. */
function decorate(core: string, date: string, flavour: Flavour, rng: Rng): string {
  const tail = rng.pick([
    '',
    '',
    ` #${rng.int(1000, 9999)}`,
    ` 800-${rng.int(100, 999)}-${rng.int(1000, 9999)} ${rng.pick(['CA', 'NY', 'TX'])}`,
    ` ${rng.pick(CITY_TAILS)}`,
  ]);
  const text = core + tail;
  return flavour === 'bank' && rng.chance(0.5) ? rng.pick(BANK_WRAPS)(text, date, rng) : text;
}

function rawKey(core: string): string {
  return `raw:${core.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim().split(/\s+/).slice(0, 2).join(' ')}`;
}

function windowStart(rng: Rng): string {
  return `${rng.pick([2024, 2025])}-${pad2(rng.int(1, 12))}-01`;
}

/** Occurrence dates of one cadence inside [from, to]. Month-based cadences clamp the anchor to month end. */
function schedule(ctx: Ctx, cad: FixedCadence, anchorDay: number): string[] {
  const { from, to, rng } = ctx;
  const out: string[] = [];
  if (cad === 'weekly' || cad === 'biweekly') {
    const step = STEP_DAYS[cad];
    for (let d = addDays(from, rng.int(0, step - 1)); d <= to; d = addDays(d, step)) out.push(d);
    return out;
  }
  const firstOfMonth = `${from.slice(0, 8)}01`;
  if (cad === 'semimonthly') {
    const d1 = rng.int(1, 12);
    const d2 = d1 + rng.int(12, 15);
    for (let m = 0; ; m++) {
      const a = addMonths(firstOfMonth, m, d1);
      if (a > to) break;
      for (const d of [a, addMonths(firstOfMonth, m, d2)]) if (d >= from && d <= to) out.push(d);
    }
    return out;
  }
  const step = STEP_MONTHS[cad]!;
  const offset = rng.int(0, step - 1);
  for (let k = 0; ; k++) {
    const d = addMonths(firstOfMonth, offset + k * step, anchorDay);
    if (d > to) break;
    if (d >= from) out.push(d);
  }
  return out;
}

/** Saturday posts on Monday (+2), Sunday on Monday (+1). */
function shiftWeekends(dates: string[]): { dates: string[]; shifted: number } {
  let shifted = 0;
  const out = dates.map((d) => {
    const w = weekday(d);
    if (w === 6) { shifted++; return addDays(d, 2); }
    if (w === 0) { shifted++; return addDays(d, 1); }
    return d;
  });
  return { dates: out, shifted };
}

function addRow(rows: Row[], streams: Stream[], stream: number, row: Omit<Row, 'stream'>): void {
  rows.push({ ...row, stream });
  streams[stream]!.rows.push(rows.length - 1);
}

interface SeriesOpt {
  price?: number;
  display?: string;
  forceTraps?: Trap[];
}

/** Plants one labelled series. Returns false when the window is too short to hold two charges. */
function makeSeries(ctx: Ctx, cad: FixedCadence, spec: MerchantSpec, core: string, opt: SeriesOpt, rows: Row[], streams: Stream[]): boolean {
  const rng = ctx.rng;
  const bill = spec.bill === true;
  const monthBased = cad in STEP_MONTHS;
  const traps: Trap[] = [...(opt.forceTraps ?? [])];
  const price = opt.price ?? (spec.prices.length > 0 ? rng.pick(spec.prices) : rng.int(5, 80) * 100 + 99);

  let anchor = rng.int(1, 28);
  if (cad === 'monthly' && rng.chance(0.12)) {
    anchor = rng.pick([29, 30, 31]);
    traps.push('month-end');
  }
  let dates = schedule(ctx, cad, anchor);
  if (dates.length < 2) return false;
  if (monthBased && rng.chance(0.3)) {
    const s = shiftWeekends(dates);
    if (s.shifted > 0) { dates = s.dates; traps.push('weekend-shift'); }
  }
  if (dates.length >= 6 && rng.chance(0.12)) {
    dates = dates.filter((_, j) => j !== Math.floor(dates.length / 2));
    traps.push('missed-one');
  }
  if (rng.chance(0.12)) {
    const lim = addDays(ctx.to, -3 * STEP_DAYS[cad]);
    const kept = dates.filter((d) => d <= lim);
    if (kept.length >= 2 && kept.length < dates.length) { dates = kept; traps.push('ended'); }
  }
  if (dates.length < 2) return false;

  let rise = -1;
  let newPrice = price;
  if (cad === 'monthly' && !bill && dates.length >= 5 && rng.chance(0.2)) {
    rise = Math.min(Math.floor(dates.length / 2), dates.length - 3);
    newPrice = Math.round((price * (1.08 + rng.next() * 0.17)) / 100) * 100 + 99;
    traps.push('price-rise');
  }
  const drift = cad === 'monthly' && !bill && rng.chance(0.12);
  if (drift) traps.push('tax-drift');
  let trialDate: string | null = null;
  if (!bill && spec.kind !== 'person' && dates.length >= 3 && rng.chance(0.1)) {
    const t = addDays(dates[0]!, -rng.int(2, 6));
    if (t >= ctx.from) { trialDate = t; traps.push('trial'); }
  }

  const display = opt.display ?? spec.name;
  const meta: SeriesMeta = {
    role: 'series',
    aliasId: spec.aliasId,
    merchantKey: spec.aliasId ?? rawKey(core),
    display,
    kind: spec.kind,
    cadence: cad,
    traps: [...new Set(traps)],
    nominal: rise >= 0 ? newPrice : price,
    known: spec.aliasId !== null && spec.kind !== 'bill' && spec.kind !== 'person',
    fullCount: dates.length,
  };
  streams.push({ meta, rows: [] });
  const stream = streams.length - 1;
  const kind: TxnKind = spec.kind === 'bill' ? 'bill' : spec.kind === 'person' ? 'p2p' : 'subscription';
  dates.forEach((date, j) => {
    let cents = rise >= 0 && j >= rise ? newPrice : price;
    if (bill) cents = Math.round(price * (1 + (rng.next() * 0.24 - 0.12)));
    else if (drift) cents = Math.round(cents * (1 + (rng.next() * 0.04 - 0.02)));
    addRow(rows, streams, stream, { date, descriptor: decorate(core, date, ctx.flavour, rng), merchant: display, cents: -cents, kind, category: spec.category });
  });
  if (trialDate) {
    addRow(rows, streams, stream, { date: trialDate, descriptor: decorate(core, trialDate, ctx.flavour, rng), merchant: display, cents: -99, kind, category: spec.category });
  }
  return true;
}

function pickMerchant(ctx: Ctx, cad: FixedCadence, used: Set<string>): MerchantSpec {
  const rng = ctx.rng;
  const subs = SUBSCRIPTIONS.filter((s) => s.cadences.includes(cad) && !used.has(s.name));
  const raws = RAW_MERCHANTS.filter((s) => !used.has(s.name));
  const useSub = subs.length > 0 && (cad !== 'weekly' && cad !== 'biweekly' && cad !== 'semimonthly') && rng.chance(0.75);
  const spec = useSub ? rng.pick(subs) : rng.pick(raws.length > 0 ? raws : RAW_MERCHANTS);
  used.add(spec.name);
  return spec;
}

/** Plants the labelled recurring series, including the platform and same-merchant trap pairs. */
function planSeries(ctx: Ctx, count: number, rows: Row[], streams: Stream[]): void {
  const rng = ctx.rng.fork('series');
  const cadencePlan = rng.shuffle(FIXED_CADENCES);
  const used = new Set<string>();
  const seriesCount = () => streams.filter((s) => s.meta.role === 'series').length;
  let personDone = false;
  let appleDone = false;
  let slot = 0;
  for (let guard = 0; seriesCount() < count && guard < 400; guard++) {
    const remaining = count - seriesCount();
    const cad = cadencePlan[slot % cadencePlan.length]!;
    slot++;
    if ((ctx.format === 'venmo' || ctx.format === 'cashapp') && !personDone && cad === 'monthly' && rng.chance(0.7)) {
      personDone = true;
      makeSeries(ctx, 'monthly', PERSON, PERSON.cores[0]!, {}, rows, streams);
      continue;
    }
    if (cad === 'monthly' && remaining >= 2 && !appleDone && rng.chance(0.1)) {
      appleDone = true;
      const base: MerchantSpec = { aliasId: 'apple', name: 'Apple', kind: 'subscription', category: 'Platform', cores: ['APPLE.COM/BILL'], prices: [], cadences: ['monthly'] };
      for (const plan of APPLE_PLANS) {
        makeSeries(ctx, 'monthly', base, 'APPLE.COM/BILL', { price: plan.price, display: `Apple (${plan.name})`, forceTraps: ['platform-biller', 'same-merchant-two-plans'] }, rows, streams);
      }
      continue;
    }
    if (cad === 'monthly' && remaining >= 2 && rng.chance(0.1)) {
      const m = rng.pick(SUBSCRIPTIONS.filter((s) => s.cadences.includes('monthly') && !s.bill && s.kind === 'subscription' && s.prices.length > 0));
      const p1 = m.prices[0]!;
      const p2 = Math.round((p1 * 2) / 100) * 100 + 99;
      used.add(m.name);
      makeSeries(ctx, 'monthly', m, m.cores[0]!, { price: p1, forceTraps: ['same-merchant-two-plans'] }, rows, streams);
      makeSeries(ctx, 'monthly', m, m.cores[0]!, { price: p2, display: `${m.name} (family plan)`, forceTraps: ['same-merchant-two-plans'] }, rows, streams);
      continue;
    }
    const spec = pickMerchant(ctx, cad, used);
    makeSeries(ctx, cad, spec, rng.pick(spec.cores), {}, rows, streams);
  }
}

function emitVariable(ctx: Ctx, family: DistractorFamily, rows: Row[], streams: Stream[], daily: number): void {
  const vocab = VOCAB[family]!;
  const rng = ctx.rng.fork(`d:${family}`);
  streams.push({ meta: { role: 'distractor', merchant: vocab.cores[0]!, family }, rows: [] });
  const stream = streams.length - 1;
  const interval = family === 'gas' ? [5, 9] : family === 'groceries' ? [4, 8] : null;
  const amount = (): number => (vocab.amounts ? rng.pick(vocab.amounts) : rng.int(vocab.range[0], vocab.range[1]));
  const sign = family === 'payroll' || family === 'refund' ? 1 : -1;
  const emit = (date: string) => {
    const core = rng.pick(vocab.cores);
    addRow(rows, streams, stream, { date, descriptor: decorate(core, date, ctx.flavour, rng), merchant: core, cents: sign * amount(), kind: family === 'atm' ? 'atm' : 'purchase', category: vocab.category });
  };
  if (interval) {
    for (let d = addDays(ctx.from, rng.int(0, 4)); d <= ctx.to; d = addDays(d, rng.int(interval[0]!, interval[1]!))) emit(d);
    return;
  }
  for (let d = ctx.from; d <= ctx.to; d = addDays(d, 1)) if (rng.chance(daily)) emit(d);
}

function emitMonthly(ctx: Ctx, rows: Row[], streams: Stream[], family: DistractorFamily, core: string, day: number, cents: number, kind: TxnKind, category: string): void {
  streams.push({ meta: { role: 'distractor', merchant: core, family }, rows: [] });
  const stream = streams.length - 1;
  const firstOfMonth = `${ctx.from.slice(0, 8)}01`;
  for (let m = 0; ; m++) {
    const d = addMonths(firstOfMonth, m, day);
    if (d > ctx.to) break;
    if (d >= ctx.from) addRow(rows, streams, stream, { date: d, descriptor: decorate(core, d, ctx.flavour, ctx.rng), merchant: core, cents, kind, category });
  }
}

/** Distractor families a format plausibly carries (RESEARCH §2). */
function planDistractors(ctx: Ctx, rows: Row[], streams: Stream[]): void {
  const rng = ctx.rng.fork('noise');
  const families: DistractorFamily[] = ['gas', 'groceries', 'coffee', 'restaurant', 'rideshare', 'amazon-retail', 'refund', 'one-off'];
  if (ctx.flavour === 'bank' || ctx.flavour === 'budget') families.push('atm', 'payroll', 'transfer', 'card-payment');
  if (ctx.flavour === 'card') families.push('card-payment');
  for (const f of families) {
    if (!rng.chance(0.9)) continue;
    switch (f) {
      case 'gas': emitVariable(ctx, 'gas', rows, streams, 0); break;
      case 'groceries': emitVariable(ctx, 'groceries', rows, streams, 0); break;
      case 'coffee': emitVariable(ctx, 'coffee', rows, streams, 0.3); break;
      case 'restaurant': emitVariable(ctx, 'restaurant', rows, streams, 0.1); break;
      case 'rideshare': emitVariable(ctx, 'rideshare', rows, streams, 0.12); break;
      case 'amazon-retail': emitVariable(ctx, 'amazon-retail', rows, streams, 0.08); break;
      case 'atm': emitVariable(ctx, 'atm', rows, streams, 0.03); break;
      case 'refund': emitVariable(ctx, 'refund', rows, streams, 0.01); break;
      case 'payroll': {
        const fri = addDays(ctx.from, (5 - weekday(ctx.from) + 7) % 7);
        streams.push({ meta: { role: 'distractor', merchant: 'ACME PAYROLL DIR DEP', family: 'payroll' }, rows: [] });
        const stream = streams.length - 1;
        for (let d = fri; d <= ctx.to; d = addDays(d, 14)) addRow(rows, streams, stream, { date: d, descriptor: decorate('ACME PAYROLL DIR DEP', d, ctx.flavour, rng), merchant: 'Acme Payroll', cents: 185000, kind: 'payroll', category: 'Income' });
        break;
      }
      case 'transfer': {
        emitMonthly(ctx, rows, streams, 'transfer', 'ONLINE TRANSFER TO SAV XXXX1234', 3, -25000, 'transfer', 'Transfers');
        if (rng.chance(0.5)) emitMonthly(ctx, rows, streams, 'transfer', 'ZELLE PAYMENT TO JANE SMITH', 1, -145000, 'transfer', 'Rent');
        break;
      }
      case 'card-payment': {
        const card = ctx.flavour === 'card';
        const day = rng.int(18, 28);
        const amount = rng.int(40000, 90000);
        emitMonthly(ctx, rows, streams, 'card-payment', card ? 'PAYMENT THANK YOU' : 'AUTOPAY PYMT CARD SVCS', day, card ? amount : -amount, 'payment', 'Payment');
        break;
      }
      case 'one-off': {
        const names = rng.shuffle(ONE_OFF_NAMES).slice(0, rng.int(2, 4));
        for (const name of names) {
          const d = addDays(ctx.from, rng.int(0, daysBetween(ctx.from, ctx.to)));
          const cents = -rng.int(500, 20000);
          streams.push({ meta: { role: 'distractor', merchant: name, family: 'one-off' }, rows: [] });
          const stream = streams.length - 1;
          addRow(rows, streams, stream, { date: d, descriptor: decorate(name, d, ctx.flavour, rng), merchant: name, cents, kind: 'one-off', category: 'Other' });
          if (rng.chance(0.2)) {
            // An exact duplicate inside one file: both rows are kept (SPEC §5.2 step 9).
            const copy = rows[rows.length - 1]!;
            addRow(rows, streams, stream, { ...copy });
          }
        }
        break;
      }
    }
  }
}

/** Pads with coffee-like noise rows so the file reaches targetRows (performance cases only). */
function padRows(ctx: Ctx, rows: Row[], streams: Stream[], target: number): void {
  if (rows.length >= target) return;
  const rng = ctx.rng.fork('pad');
  const vocab = VOCAB.coffee!;
  streams.push({ meta: { role: 'distractor', merchant: 'STARBUCKS STORE 12345', family: 'coffee' }, rows: [] });
  const stream = streams.length - 1;
  const span = daysBetween(ctx.from, ctx.to);
  while (rows.length < target) {
    const d = addDays(ctx.from, rng.int(0, span));
    addRow(rows, streams, stream, { date: d, descriptor: decorate(rng.pick(vocab.cores), d, ctx.flavour, rng), merchant: 'Coffee', cents: -rng.int(vocab.range[0], vocab.range[1]), kind: 'purchase', category: vocab.category });
  }
}

export function generateCase(o: GenerateOptions): GeneratedCase {
  const root = createRng(o.seed);
  const from = windowStart(root.fork('window'));
  const to = addDays(addMonths(from, o.months), -1);
  const ctx: Ctx = { rng: root.fork('plan'), flavour: FLAVOUR[o.format], format: o.format, from, to };
  const rows: Row[] = [];
  const streams: Stream[] = [];
  planSeries(ctx, o.series, rows, streams);
  planDistractors(ctx, rows, streams);
  if (o.targetRows) padRows(ctx, rows, streams, o.targetRows);

  // Chronological order, ties by generation order, so the file is reproducible.
  const order = rows.map((_, i) => i).sort((a, b) => rows[a]!.date.localeCompare(rows[b]!.date) || a - b);
  const txns: WriteTxn[] = order.map((i) => {
    const r = rows[i]!;
    return { date: r.date, descriptor: r.descriptor, merchant: r.merchant, cents: r.cents, kind: r.kind, category: r.category };
  });
  const write = root.fork('write');
  const written = WRITERS[o.format](txns, {
    rng: write,
    crlf: write.chance(0.5),
    newestFirst: write.chance(0.3),
    account: ACCOUNT_NAME[ctx.flavour],
    startBalanceCents: write.int(100000, 900000),
  });
  const lineOfRow: number[] = new Array(rows.length);
  order.forEach((rowIdx, k) => { lineOfRow[rowIdx] = written.lines[k]!; });

  const first = txns[0]!.date;
  const last = txns[txns.length - 1]!.date;
  const coverage = daysBetween(first, last) + 1;
  const recurring: LabelledSeries[] = [];
  const distractors: CaseLabels['distractors'] = [];
  for (const s of streams) {
    const lines = s.rows.map((r) => lineOfRow[r]!).sort((a, b) => a - b);
    if (s.meta.role === 'series') {
      const m = s.meta;
      const minOcc = m.known ? DEFAULT_PARAMS.minOccurrencesKnownMerchant[m.cadence] : DEFAULT_PARAMS.minOccurrences[m.cadence];
      recurring.push({
        merchantKey: m.merchantKey,
        aliasId: m.aliasId,
        display: m.display,
        cadence: m.cadence,
        kind: m.kind,
        nominalCents: m.nominal,
        lines,
        traps: m.traps,
        mustFind: m.fullCount >= minOcc && coverage >= DEFAULT_PARAMS.minSpanDays[m.cadence],
      });
    } else if (lines.length > 0) {
      distractors.push({ merchant: s.meta.merchant, family: s.meta.family, lines });
    }
  }
  recurring.sort((a, b) => a.lines[0]! - b.lines[0]!);
  const labels: CaseLabels = {
    caseId: o.caseId ?? `${o.format}-${o.seed}`,
    format: o.format,
    seed: o.seed,
    from: first,
    to: last,
    recurring,
    distractors,
  };
  return { csv: written.text, labels };
}
