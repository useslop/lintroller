// The friendly demo file for the app: one chase-card-style export, 12 months (Oct 2025 to Sep 2026), eight
// clear subscriptions (one price rise, one that stopped), and everyday purchases. Every row is invented.
// Written deterministically from a fixed seed; the labels say which lines are which.
import type { CaseLabels, DistractorFamily, LabelledSeries } from '@subsweep/engine';
import { addMonths } from './dates';
import { createRng } from './rng';
import { WRITERS } from './writers';
import type { WriteTxn } from './writers/common';

const FROM = '2025-10-01';
const TO = '2026-09-30';
const SEED = 20261004;

interface SampleSub {
  aliasId: string;
  display: string;
  kind: 'subscription' | 'membership';
  descriptor: string;
  category: string;
  day: number;
  /** [first date at this price, cents], in date order. */
  prices: [string, number][];
  /** Last charge date when the subscription stopped; null = still running. */
  stopsAfter: string | null;
  traps: LabelledSeries['traps'];
}

const SUBS: SampleSub[] = [
  { aliasId: 'netflix', display: 'Netflix', kind: 'subscription', descriptor: 'NETFLIX.COM', category: 'Entertainment', day: 9, prices: [['2025-10-01', 1549], ['2026-04-01', 1799]], stopsAfter: null, traps: ['price-rise'] },
  { aliasId: 'spotify', display: 'Spotify', kind: 'subscription', descriptor: 'SPOTIFY USA', category: 'Music', day: 14, prices: [['2025-10-01', 1199]], stopsAfter: null, traps: [] },
  { aliasId: 'hulu', display: 'Hulu', kind: 'subscription', descriptor: 'HULU', category: 'Entertainment', day: 22, prices: [['2025-10-01', 1799]], stopsAfter: null, traps: [] },
  { aliasId: 'dropbox', display: 'Dropbox', kind: 'subscription', descriptor: 'DROPBOX', category: 'Software', day: 3, prices: [['2025-10-01', 1199]], stopsAfter: null, traps: [] },
  { aliasId: 'google-one', display: 'Google One', kind: 'subscription', descriptor: 'GOOGLE *GOOGLE ONE', category: 'Cloud', day: 18, prices: [['2025-10-01', 299]], stopsAfter: null, traps: [] },
  { aliasId: 'nytimes', display: 'New York Times', kind: 'subscription', descriptor: 'NYTIMES*DIGITAL', category: 'News', day: 5, prices: [['2025-10-01', 2500]], stopsAfter: null, traps: [] },
  { aliasId: 'planet-fitness', display: 'Planet Fitness', kind: 'membership', descriptor: 'PLANET FITNESS', category: 'Fitness', day: 27, prices: [['2025-10-01', 2499]], stopsAfter: null, traps: [] },
  { aliasId: 'hbo-max', display: 'HBO Max', kind: 'subscription', descriptor: 'HBO MAX', category: 'Entertainment', day: 11, prices: [['2025-10-01', 1699]], stopsAfter: '2026-01-11', traps: ['ended'] },
];

interface SampleRow {
  date: string;
  descriptor: string;
  merchant: string;
  cents: number;
  kind: WriteTxn['kind'];
  category: string;
  owner: { role: 'series'; index: number } | { role: 'distractor'; family: DistractorFamily; merchant: string };
}

export function buildSample(): { csv: string; labels: CaseLabels } {
  const rng = createRng(SEED);
  const rows: SampleRow[] = [];

  SUBS.forEach((s, index) => {
    for (let m = 0; m < 12; m++) {
      const date = addMonths(FROM, m, s.day);
      if (s.stopsAfter && date > s.stopsAfter) break;
      const price = [...s.prices].reverse().find(([from]) => date >= from)![1];
      rows.push({ date, descriptor: s.descriptor, merchant: s.display, cents: -price, kind: 'subscription', category: s.category, owner: { role: 'series', index } });
    }
  });

  const monthly = (family: DistractorFamily, cores: string[], perMonth: number, range: [number, number], category: string, sign = -1) => {
    for (let m = 0; m < 12; m++) {
      for (let k = 0; k < perMonth; k++) {
        const date = addMonths(FROM, m, rng.int(1, 28));
        const core = rng.pick(cores);
        rows.push({ date, descriptor: core, merchant: core, cents: sign * rng.int(range[0], range[1]), kind: 'purchase', category, owner: { role: 'distractor', family, merchant: core } });
      }
    }
  };
  monthly('groceries', ["TRADER JOE'S #456", 'KROGER #123'], 3, [3500, 11000], 'Groceries');
  monthly('gas', ['SHELL OIL 57444', 'CHEVRON 00123456'], 2, [3200, 5600], 'Gas');
  monthly('coffee', ['STARBUCKS STORE 12345'], 6, [450, 1150], 'Coffee');
  monthly('restaurant', ['CHIPOTLE 1234'], 2, [1500, 4200], 'Restaurants');
  monthly('rideshare', ['UBER *TRIP HELP.UBER.COM'], 2, [1100, 2600], 'Transportation');
  monthly('amazon-retail', ['AMZN MKTP US*2K4AB'], 2, [1299, 8900], 'Shopping');
  for (let m = 0; m < 12; m++) {
    const date = addMonths(FROM, m, 25);
    rows.push({ date, descriptor: 'PAYMENT THANK YOU', merchant: 'Payment', cents: rng.int(45000, 62000), kind: 'payment', category: 'Payment', owner: { role: 'distractor', family: 'card-payment', merchant: 'PAYMENT THANK YOU' } });
  }
  rows.push({ date: '2025-12-12', descriptor: 'AMZN REFUND 2K4AB', merchant: 'Amazon refund', cents: 1898, kind: 'refund', category: 'Shopping', owner: { role: 'distractor', family: 'refund', merchant: 'AMZN REFUND 2K4AB' } });

  const order = rows.map((_, i) => i).sort((a, b) => rows[a]!.date.localeCompare(rows[b]!.date) || a - b);
  const txns: WriteTxn[] = order.map((i) => {
    const r = rows[i]!;
    return { date: r.date, descriptor: r.descriptor, merchant: r.merchant, cents: r.cents, kind: r.kind, category: r.category };
  });
  const written = WRITERS['chase-card'](txns, { rng: createRng(SEED + 1), crlf: false, newestFirst: false, account: 'Sample Card', startBalanceCents: 0 });
  const lineOf: number[] = new Array(rows.length);
  order.forEach((rowIdx, k) => { lineOf[rowIdx] = written.lines[k]!; });

  const series = SUBS.map((s, index): LabelledSeries => {
    const lines = rows.flatMap((r, i) => (r.owner.role === 'series' && r.owner.index === index ? [lineOf[i]!] : [])).sort((a, b) => a - b);
    const nominal = s.prices[s.prices.length - 1]![1];
    return {
      merchantKey: s.aliasId,
      aliasId: s.aliasId,
      display: s.display,
      cadence: 'monthly',
      kind: s.kind,
      nominalCents: nominal,
      lines,
      traps: s.traps,
      mustFind: lines.length >= 2,
    };
  }).sort((a, b) => a.lines[0]! - b.lines[0]!);

  const families = new Map<string, { family: DistractorFamily; merchant: string; lines: number[] }>();
  rows.forEach((r, i) => {
    if (r.owner.role !== 'distractor') return;
    const key = `${r.owner.family}|${r.owner.merchant}`;
    const entry = families.get(key) ?? { family: r.owner.family, merchant: r.owner.merchant, lines: [] };
    entry.lines.push(lineOf[i]!);
    families.set(key, entry);
  });

  const dates = rows.map((r) => r.date).sort();
  const labels: CaseLabels = {
    caseId: 'sample-statement',
    format: 'chase-card',
    seed: SEED,
    from: dates[0]!,
    to: dates[dates.length - 1]!,
    recurring: series,
    distractors: [...families.values()].map((e) => ({ merchant: e.merchant, family: e.family, lines: e.lines.sort((a, b) => a - b) })),
  };
  return { csv: written.text, labels };
}
