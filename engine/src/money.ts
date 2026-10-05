// Yearly cost (SPEC §5.4) and totals (CONTRACT Totals): integer cents, arithmetic shown.
import type { Category, Finding, FixedCadence, StatusMap, Totals, YearlyCost } from './types';
import { dayNum, formatUsd } from './values';

export const PERIODS_PER_YEAR: Record<FixedCadence, number> = {
  weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, bimonthly: 6, quarterly: 4, semiannual: 2, yearly: 1,
};

export function yearlyCost(f: Finding): YearlyCost {
  if (f.cadence === 'irregular') {
    const end = dayNum(f.lastDate);
    const cents = f.occurrences.filter((o) => end - dayNum(o.date) < 365).reduce((a, o) => a + o.cents, 0);
    return { cents, periodsPerYear: null, basis: 'observed-last-365-days', formula: `total of the last 12 months in your file: ${formatUsd(cents)}` };
  }
  const p = PERIODS_PER_YEAR[f.cadence];
  const cents = f.amount.lastCents * p;
  return { cents, periodsPerYear: p, basis: 'last-amount-x-periods', formula: `${formatUsd(f.amount.lastCents)} x ${p} = ${formatUsd(cents)}` };
}

/** Headline = subscription | membership | unknown. Bills and fees apart. Person, ended and maybe-ended never count. */
export function totals(findings: Finding[], statuses: StatusMap, _today: string): Totals {
  const t: Totals = {
    confirmedYearlyCents: 0, unreviewedYearlyCents: 0, billsYearlyCents: 0, byCategory: [],
    counts: { confirmed: 0, unreviewed: 0, dismissed: 0, ended: 0 },
  };
  const cats = new Map<Category | 'uncategorised', { yearlyCents: number; count: number }>();
  for (const f of findings) {
    const st = statuses[f.id] ?? 'suggested';
    if (st === 'dismissed') { t.counts.dismissed++; continue; }
    if (f.kind === 'person') continue;
    if (f.activity !== 'active') { t.counts.ended++; continue; }
    // irregular series stay outside the totals unless the user confirms them
    if (f.cadence === 'irregular' && st !== 'confirmed') { t.counts.unreviewed++; continue; }
    const y = yearlyCost(f).cents;
    if (st === 'confirmed') t.counts.confirmed++; else t.counts.unreviewed++;
    if (f.kind === 'bill' || f.kind === 'fee') { t.billsYearlyCents += y; continue; }
    if (st === 'confirmed') t.confirmedYearlyCents += y; else t.unreviewedYearlyCents += y;
    const c = f.category ?? 'uncategorised';
    const e = cats.get(c) ?? { yearlyCents: 0, count: 0 };
    e.yearlyCents += y; e.count++;
    cats.set(c, e);
  }
  t.byCategory = [...cats.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.yearlyCents - a.yearlyCents || String(a.category).localeCompare(String(b.category)));
  return t;
}
