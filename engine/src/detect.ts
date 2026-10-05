// Recurrence detection, SPEC §5.2 with DEFAULT_PARAMS (SPEC §5.3). Pure: `today` defaults to the
// latest row date and the clock is never read. Precision over recall (PLAN decision 1b).
import { yearlyCost } from './money';
import { classifyRow, isPersonPayment, normalizeMerchant } from './normalize';
import { DEFAULT_PARAMS } from './params';
import type {
  Cadence, DetectOptions, DetectParams, DetectResult, Evidence, Finding, FindingKind, FixedCadence,
  MerchantMatch, ReasonCode, RowClass, SniffResult, Txn,
} from './types';
import { dayNum, fromDayNum, gridDay, monthIndexOf } from './values';

const FIXED: FixedCadence[] = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly'];
export const STEP_DAYS: Record<FixedCadence, number> = {
  weekly: 7, biweekly: 14, semimonthly: 15, monthly: 30, bimonthly: 61, quarterly: 91, semiannual: 182, yearly: 365,
};
const MONTHS: Partial<Record<FixedCadence, number>> = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, yearly: 12 };
const IGNORED: RowClass[] = ['transfer', 'card-payment', 'income', 'atm', 'interest'];
/** Ours (not in SPEC): an irregular series needs a median gap of at least 20 days, so daily coffee never qualifies. */
const IRREGULAR_MIN_MEDIAN_GAP = 20;
const BILL_HINT = /\b(?:mortgage|mtg|loan|ln pmt|rent|hoa|insurance|ins prem|insur|utilit(?:y|ies)|electric|water|sewer|power|energy|gas & electric|wireless|cable|internet|phone bill|student ln|tuition|daycare)\b/;

function mergeParams(p?: Partial<DetectParams>): DetectParams {
  const d = DEFAULT_PARAMS;
  if (!p) return d;
  return {
    ...d, ...p,
    dayTolerance: { ...d.dayTolerance, ...p.dayTolerance },
    minOccurrences: { ...d.minOccurrences, ...p.minOccurrences },
    minOccurrencesKnownMerchant: { ...d.minOccurrencesKnownMerchant, ...p.minOccurrencesKnownMerchant },
    minSpanDays: { ...d.minSpanDays, ...p.minSpanDays },
    weights: { ...d.weights, ...p.weights },
  };
}

interface Charge { t: Txn; day: number; cents: number }   // cents > 0 = money out
interface Cluster { charges: Charge[]; mean: number; steps: { date: string; fromCents: number; toCents: number }[] }
interface Fit {
  cadence: FixedCadence; fit: number; missed: number; errors: number[]; medErr: number;
  lastSlot: number; anchor: number; anchor2: number;
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const cv = (xs: number[]) => {
  const m = mean(xs);
  if (xs.length < 2 || m === 0) return 0;
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
};

export function fnv1a32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function modeDay(days: number[], fallback: number): number {
  const f = new Map<number, number>();
  for (const d of days) f.set(d, (f.get(d) ?? 0) + 1);
  let best = fallback; let n = 0;
  for (const [d, k] of f) if (k > n || (k === n && d === fallback)) { best = d; n = k; }
  return best;
}

function fitCadence(ch: Charge[], cad: FixedCadence, tol: number): Fit | null {
  const n = ch.length;
  if (n < 2) return null;
  let on = 0; let missed = 0;
  const errors: number[] = [];
  let lastSlot = 0; let anchor = 0; let anchor2 = 0;
  if (cad === 'weekly' || cad === 'biweekly') {
    const step = STEP_DAYS[cad];
    for (let i = 1; i < n; i++) {
      const g = ch[i]!.day - ch[i - 1]!.day;
      const k = Math.min(3, Math.max(1, Math.round(g / step)));
      const e = Math.abs(g - k * step);
      errors.push(e);
      if (e <= tol && g > 0) { on++; missed += k - 1; }
    }
    lastSlot = ch[n - 1]!.day;
  } else {
    const dom = ch.map((c) => Number(c.t.date.slice(8, 10)));
    let slotOf: (c: Charge) => { slot: number; err: number };
    let step = 1;
    if (cad === 'semimonthly') {
      const lo = dom.filter((d) => d <= 15); const hi = dom.filter((d) => d > 15);
      if (lo.length === 0 || hi.length === 0) return null;
      anchor = modeDay(lo, lo[0]!); anchor2 = modeDay(hi, hi[0]!);
      slotOf = (c) => {
        const mi = monthIndexOf(c.t.date);
        let best = { slot: 0, err: Infinity };
        for (let m = mi - 1; m <= mi + 1; m++) {
          for (const [half, a] of [[0, anchor], [1, anchor2]] as const) {
            const err = Math.abs(c.day - gridDay(m, a));
            if (err < best.err) best = { slot: m * 2 + half, err };
          }
        }
        return best;
      };
    } else {
      step = MONTHS[cad]!;
      anchor = modeDay(dom, dom[0]!);
      slotOf = (c) => {
        const mi = monthIndexOf(c.t.date);
        let best = { slot: mi, err: Infinity };
        for (let m = mi - 1; m <= mi + 1; m++) {
          const err = Math.abs(c.day - gridDay(m, anchor));
          if (err < best.err) best = { slot: m, err };
        }
        return best;
      };
    }
    const slots = ch.map(slotOf);
    for (let i = 1; i < n; i++) {
      const dm = slots[i]!.slot - slots[i - 1]!.slot;
      const e = slots[i]!.err;
      errors.push(e);
      if (dm > 0 && dm % step === 0 && dm / step <= 3 && e <= tol) { on++; missed += dm / step - 1; }
    }
    if (slots[0]!.err > tol) errors.push(slots[0]!.err);
    lastSlot = slots[n - 1]!.slot;
  }
  const fit = on / (n - 1 + missed);
  return { cadence: cad, fit, missed, errors, medErr: median(errors), lastSlot, anchor, anchor2 };
}

function nextExpectedDay(f: Fit, lastDay: number): number {
  if (f.cadence === 'weekly' || f.cadence === 'biweekly') return lastDay + STEP_DAYS[f.cadence];
  if (f.cadence === 'semimonthly') {
    const s = f.lastSlot + 1;
    return gridDay(Math.floor(s / 2), s % 2 === 0 ? f.anchor : f.anchor2);
  }
  return gridDay(f.lastSlot + MONTHS[f.cadence]!, f.anchor);
}

function clusterByAmount(charges: Charge[], tolPct: number, floor: number): Cluster[] {
  const clusters: Cluster[] = [];
  for (const c of charges) {
    let best: Cluster | null = null; let bestD = Infinity;
    for (const k of clusters) {
      const d = Math.abs(c.cents - k.mean);
      if (d <= Math.max((tolPct / 100) * k.mean, floor) && d < bestD) { best = k; bestD = d; }
    }
    if (best) {
      best.charges.push(c);
      best.mean += (c.cents - best.mean) / best.charges.length;
    } else clusters.push({ charges: [c], mean: c.cents, steps: [] });
  }
  return clusters;
}

interface Group {
  key: string; m: MerchantMatch; person: boolean; fee: boolean;
  out: Charge[]; small: Charge[]; refunds: Charge[]; outRows: number; displays: Map<string, number>;
}

export function detectRecurring(rows: Txn[], opts: DetectOptions): DetectResult {
  const p = mergeParams(opts.params);
  const ignoredCounts = new Map<RowClass, number>();
  const groups = new Map<string, Group>();
  let minDay = Infinity; let maxDay = -Infinity;
  const cache = new Map<string, MerchantMatch>();

  for (const t of rows) {
    const day = dayNum(t.date);
    if (day < minDay) minDay = day;
    if (day > maxDay) maxDay = day;
    const ck = `${t.description}\u0000${t.merchantField ?? ''}`;
    let m = cache.get(ck);
    if (!m) { m = normalizeMerchant(t.description, opts.aliasIndex, t.merchantField); cache.set(ck, m); }
    const kind: SniffResult['accountKind'] = opts.accountKinds?.[t.source] ?? 'unknown';
    const cls = classifyRow(t, m, kind);
    if (IGNORED.includes(cls)) { ignoredCounts.set(cls, (ignoredCounts.get(cls) ?? 0) + 1); continue; }
    let g = groups.get(m.key);
    if (!g) {
      g = { key: m.key, m, person: false, fee: true, out: [], small: [], refunds: [], outRows: 0, displays: new Map() };
      groups.set(m.key, g);
    }
    const ch: Charge = { t, day, cents: -t.amountCents };
    if (cls === 'refund') { g.refunds.push({ t, day, cents: t.amountCents }); continue; }
    if (t.amountCents >= 0) continue;
    g.outRows++;
    if (cls !== 'fee') g.fee = false;
    if (isPersonPayment(t, m, kind)) g.person = true;
    g.displays.set(m.display, (g.displays.get(m.display) ?? 0) + 1);
    if (ch.cents < p.minAmountCents) g.small.push(ch); else g.out.push(ch);
    if (ch.cents <= p.trialMaxCents && ch.cents >= p.minAmountCents) g.small.push(ch);
  }

  const hasRows = rows.length > 0;
  const coverageDays = hasRows ? maxDay - minDay + 1 : 0;
  const today = opts.today ?? (hasRows ? fromDayNum(maxDay) : '1970-01-01');
  const todayDay = dayNum(today);
  const coverage = {
    from: hasRows ? fromDayNum(minDay) : today, to: hasRows ? fromDayNum(maxDay) : today, days: coverageDays,
    canSeeYearly: coverageDays >= p.minSpanDays.yearly,
    showHistoryHint: coverageDays < p.historyHintDays,
  };

  const findings: Finding[] = [];
  const suppressed: DetectResult['suppressed'] = [];
  const usedIds = new Set<string>();

  for (const g of groups.values()) {
    if (g.outRows === 0) continue;
    const m = g.m;
    const display = m.aliasId ? m.display : [...g.displays.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? m.display;
    if (m.kind === 'variable-merchant') {
      if (g.outRows >= 2) suppressed.push({ merchantKey: g.key, display, count: g.outRows, reason: 'variable-merchant' });
      continue;
    }
    const known = m.kind === 'subscription' || m.kind === 'membership' || m.kind === 'platform';
    const billish = m.kind === 'bill' || (!m.aliasId && BILL_HINT.test(m.cleaned));
    const wideTol = m.category === 'utilities' || m.category === 'telecom' || m.category === 'insurance' || (!m.aliasId && billish);
    g.out.sort((a, b) => a.day - b.day || a.t.line - b.t.line);
    let clusters = clusterByAmount(g.out, wideTol ? p.billsAmountTolPct : p.amountTolPct, p.amountTolFloorCents);
    for (const k of clusters) k.charges.sort((a, b) => a.day - b.day);

    const span = (c: Charge[]) => c[c.length - 1]!.day - c[0]!.day;
    const tolFor = (cad: FixedCadence) => p.dayTolerance[cad];
    const bestFit = (ch: Charge[]): Fit | null => {
      const n = ch.length;
      let best: Fit | null = null;
      for (const cad of FIXED) {
        const need = known ? p.minOccurrencesKnownMerchant[cad] : p.minOccurrences[cad];
        if (n < need || coverageDays < p.minSpanDays[cad]) continue;
        const f = fitCadence(ch, cad, tolFor(cad));
        if (!f) continue;
        if (f.fit < (n <= 4 ? p.minFitShort : p.minFitLong) - 1e-9) continue;
        if (!best || f.fit > best.fit + 1e-9 || (Math.abs(f.fit - best.fit) <= 1e-9 &&
          (f.missed < best.missed || (f.missed === best.missed && f.medErr < best.medErr)))) best = f;
      }
      return best;
    };

    // price changes: a later cluster repeating >= priceStepMinRepeats times, within the ratio, same cadence
    let merged = true;
    while (merged) {
      merged = false;
      clusters.sort((a, b) => a.charges[0]!.day - b.charges[0]!.day);
      outer: for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const A = clusters[i]!; const B = clusters[j]!;
          const aLast = A.charges[A.charges.length - 1]!;
          if (aLast.day >= B.charges[0]!.day || B.charges.length < p.priceStepMinRepeats) continue;
          const ratio = B.mean / A.mean;
          if (ratio > p.priceStepMaxRatio || ratio < 1 / p.priceStepMaxRatio) continue;
          const all = [...A.charges, ...B.charges];
          const f = bestFit(all);
          if (!f) continue;
          const gap = B.charges[0]!.day - aLast.day;
          if (gap > STEP_DAYS[f.cadence] * 1.5 + p.dayTolerance[f.cadence]) continue;
          A.steps.push(...[{ date: B.charges[0]!.t.date, fromCents: aLast.cents, toCents: B.charges[0]!.cents }], ...B.steps);
          A.charges = all;
          A.mean = B.mean;
          clusters.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }

    let produced = false; let belowConf = false;
    for (const k of clusters) {
      const ch = k.charges;
      if (ch.length < 2) continue;
      const n = ch.length;
      const fit = bestFit(ch);
      const amounts = ch.map((c) => c.cents);
      // amount stability within price segments
      const segs: number[][] = [];
      let segStart = 0;
      for (const s of k.steps) {
        const idx = ch.findIndex((c) => c.t.date === s.date && c.cents === s.toCents);
        if (idx > segStart) { segs.push(amounts.slice(segStart, idx)); segStart = idx; }
      }
      segs.push(amounts.slice(segStart));
      const segCv = segs.length ? Math.sqrt(mean(segs.map((s) => cv(s) ** 2))) : 0;
      const varies = segs.some((s) => s.some((x) => x !== s[0]));
      const prior = known ? 1 : m.kind === 'bill' ? 0 : 0.5;
      const w = p.weights;
      let cadence: Cadence;
      let reg = 0;
      let nextDay: number | null = null;
      let missed = 0;
      let medErr = 0;
      if (fit) {
        cadence = fit.cadence;
        reg = fit.fit * (1 - Math.min(1, fit.medErr / (tolFor(fit.cadence) + 1)) / 2);
        nextDay = nextExpectedDay(fit, ch[n - 1]!.day);
        missed = fit.missed;
        medErr = fit.medErr;
      } else {
        const gaps = ch.slice(1).map((c, i) => c.day - ch[i]!.day);
        if (n >= p.irregularMin && cv(amounts) <= p.irregularMaxCv && span(ch) >= p.irregularMinSpanDays &&
            median(gaps) >= IRREGULAR_MIN_MEDIAN_GAP) {
          cadence = 'irregular';
        } else continue;
      }
      const amt = 1 - Math.min(1, segCv / (p.amountTolPct / 100));
      const cnt = Math.min(1, (n - 1) / 3);
      let conf = w.reg * reg + w.amt * amt + w.cnt * cnt + w.prior * prior;
      if (n === 2) conf = Math.min(conf, 0.74);
      if (cadence === 'irregular') conf = Math.min(conf, 0.49);
      conf = Math.round(conf * 100) / 100;
      if (conf < p.minConfidence) { belowConf = true; continue; }

      // trial: a small charge 1..trialWindowDays before the first full-price charge
      let trial: Finding['trial'] = null;
      const first = ch[0]!;
      for (const s of g.small) {
        const d = first.day - s.day;
        if (d >= 1 && d <= p.trialWindowDays && s.cents <= p.trialMaxCents && !ch.includes(s)) {
          if (!trial || s.day > dayNum(trial.date)) trial = { date: s.t.date, cents: s.cents };
        }
      }
      const last = ch[n - 1]!;
      let activity: Finding['activity'] = 'active';
      if (nextDay !== null && cadence !== 'irregular') {
        const step = STEP_DAYS[cadence as FixedCadence];
        const grace = Math.max(p.graceMinDays, p.graceFraction * step);
        if (todayDay > nextDay + grace + step) activity = 'ended';
        else if (todayDay > nextDay + grace) activity = 'maybe-ended';
      } else {
        const gaps = ch.slice(1).map((c, i) => c.day - ch[i]!.day);
        const mg = mean(gaps);
        const since = todayDay - last.day;
        if (since > 3 * mg + p.graceMinDays) activity = 'ended';
        else if (since > 1.5 * mg + p.graceMinDays) activity = 'maybe-ended';
      }
      const kind: FindingKind = g.person ? 'person'
        : m.kind === 'subscription' || m.kind === 'platform' ? 'subscription'
        : m.kind === 'membership' ? 'membership'
        : m.kind === 'bill' || billish ? 'bill'
        : g.fee ? 'fee' : 'unknown';
      const reasons: ReasonCode[] = [];
      if (cadence !== 'irregular') reasons.push('regular-interval');
      if (medErr >= 2 || (fit && fit.fit < 1 && missed === 0)) reasons.push('interval-drifts');
      reasons.push(varies ? 'amount-varies' : 'stable-amount');
      if (k.steps.length) reasons.push('price-change');
      if (m.kind === 'subscription' || m.kind === 'membership') reasons.push('known-merchant');
      if (m.billedThrough) reasons.push('platform-biller');
      if (n === 2) reasons.push('few-occurrences');
      if (missed > 0) reasons.push('missed-one');
      if (trial) reasons.push('trial-then-paid');
      if (activity === 'maybe-ended') reasons.push('possibly-ended');
      if (activity === 'ended') reasons.push('ended');
      if (kind === 'bill' || kind === 'fee') reasons.push('bill-like');
      if (kind === 'person') reasons.push('payment-to-person');
      if (coverage.showHistoryHint) reasons.push('short-history');

      const ev = (c: Charge): Evidence => ({
        txnId: c.t.id, source: c.t.source, line: c.t.line, date: c.t.date, cents: c.cents, description: c.t.description,
      });
      const winEnd = (nextDay ?? last.day) + 7;
      const refunds = g.refunds.filter((r) => r.day >= first.day && r.day <= winEnd);
      const gaps = ch.slice(1).map((c, i) => c.day - ch[i]!.day);
      const med = median(gaps);
      let id = fnv1a32(`${g.key}|${cadence}|${first.cents}`);
      for (let s = 2; usedIds.has(id); s++) id = fnv1a32(`${g.key}|${cadence}|${first.cents}|${s}`);
      usedIds.add(id);
      findings.push({
        id, merchantKey: g.key, aliasId: m.aliasId, display, category: m.category, kind,
        billedThrough: m.billedThrough, cadence,
        intervalDays: { median: med, mad: median(gaps.map((x) => Math.abs(x - med))), min: Math.min(...gaps), max: Math.max(...gaps) },
        amount: { lastCents: last.cents, medianCents: Math.round(median(amounts)), minCents: Math.min(...amounts), maxCents: Math.max(...amounts), varies },
        anchorCents: first.cents, priceChanges: k.steps, trial,
        occurrences: ch.map(ev), refunds: refunds.map(ev),
        firstDate: first.t.date, lastDate: last.t.date,
        nextExpected: cadence === 'irregular' || nextDay === null ? null : fromDayNum(nextDay),
        activity, confidence: conf,
        confidenceLabel: conf >= 0.75 ? 'high' : conf >= 0.5 ? 'medium' : 'low',
        reasons, status: 'suggested',
      });
      produced = true;
    }
    if (!produced && g.outRows >= 2) {
      const biggest = Math.max(0, ...clusters.map((k) => k.charges.length));
      const reason = belowConf ? 'below-confidence' : biggest < 2 && g.out.length >= 3 ? 'irregular-amounts' : 'too-few';
      suppressed.push({ merchantKey: g.key, display, count: g.outRows, reason });
    }
  }

  const cost = new Map(findings.map((f) => [f.id, yearlyCost(f).cents]));
  findings.sort((a, b) => cost.get(b.id)! - cost.get(a.id)! || a.display.localeCompare(b.display) || a.id.localeCompare(b.id));
  suppressed.sort((a, b) => b.count - a.count || a.display.localeCompare(b.display));
  const ignored = IGNORED.filter((c) => ignoredCounts.has(c)).map((c) => ({ rowClass: c, count: ignoredCounts.get(c)! }));
  return { findings, ignored, suppressed, coverage };
}
