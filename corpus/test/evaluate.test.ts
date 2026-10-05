import { describe, expect, it } from 'vitest';
import type { CaseLabels, DetectResult, Finding } from '@subsweep/engine';
import { aggregate, atLeastMedium, evaluate, explainFp, fixturePass, jaccard } from '../src/evaluate';

/** A minimal Finding: evaluate() only reads id, display, cadence, amount, and occurrence lines. */
function finding(id: string, lines: number[], cadence: Finding['cadence'] = 'monthly', confidenceLabel: Finding['confidenceLabel'] = 'high'): Finding {
  return {
    id,
    display: `F${id}`,
    cadence,
    amount: { lastCents: 1000, medianCents: 1000, minCents: 1000, maxCents: 1000, varies: false },
    occurrences: lines.map((line) => ({ txnId: `0:${line}`, source: 0, line, date: '2026-01-01', cents: 1000, description: 'X' })),
    confidenceLabel,
    confidence: confidenceLabel === 'low' ? 0.4 : 0.9,
  } as unknown as Finding;
}

function result(findings: Finding[]): DetectResult {
  return { findings, ignored: [], suppressed: [], coverage: { from: '2026-01-01', to: '2026-12-31', days: 365, canSeeYearly: false, showHistoryHint: false } };
}

function labels(recurring: CaseLabels['recurring'], distractors: CaseLabels['distractors'] = []): CaseLabels {
  return { caseId: 'toy', format: 'chase-card', seed: 1, from: '2026-01-01', to: '2026-12-31', recurring, distractors };
}

const series = (lines: number[], extra: Partial<CaseLabels['recurring'][number]> = {}): CaseLabels['recurring'][number] => ({
  merchantKey: 'netflix', aliasId: 'netflix', display: 'Netflix', cadence: 'monthly', kind: 'subscription',
  nominalCents: 1000, lines, traps: [], mustFind: true, ...extra,
});

describe('jaccard and the match threshold', () => {
  it('is exactly 0.5 at the edge, and a match', () => {
    const s = new Set(Array.from({ length: 10 }, (_, i) => i + 1));
    const f = new Set([...s, ...Array.from({ length: 10 }, (_, i) => 20 + i)]);
    expect(jaccard(s, f)).toBe(0.5);
    const scores = evaluate(result([finding('a', [...f])]), labels([series([...s])]));
    expect(scores.tp).toBe(1);
  });

  it('just under 0.5 is not a match', () => {
    const s = new Set(Array.from({ length: 10 }, (_, i) => i + 1));
    const f = new Set([...s, ...Array.from({ length: 11 }, (_, i) => 20 + i)]);
    expect(jaccard(s, f)).toBeLessThan(0.5);
    const scores = evaluate(result([finding('a', [...f])]), labels([series([...s])]));
    expect(scores.tp).toBe(0);
    expect(scores.fp).toBe(1);
    expect(scores.fn).toBe(1);
  });
});

describe('evaluate on toy inputs', () => {
  it('counts exact TP, FP and FN', () => {
    const r = result([finding('a', [1, 2, 3]), finding('b', [50, 51, 52])]);
    const l = labels([series([1, 2, 3]), series([10, 11, 12], { merchantKey: 'hulu', display: 'Hulu', aliasId: 'hulu' })]);
    const s = evaluate(r, l);
    expect([s.tp, s.fp, s.fn]).toEqual([1, 1, 1]);
    expect(s.precision).toBe(0.5);
    expect(s.recall).toBe(0.5);
    expect(s.falseNegatives).toEqual([{ caseId: 'toy', merchantKey: 'hulu', cadence: 'monthly' }]);
    expect(s.falsePositives[0]!.why).toBe('unlabelled');
  });

  it('matches one-to-one: a second finding on the same series is an FP', () => {
    const r = result([finding('a', [1, 2, 3, 4]), finding('b', [1, 2, 3, 4, 5])]);
    const s = evaluate(r, labels([series([1, 2, 3, 4])]));
    expect(s.tp).toBe(1);
    expect(s.fp).toBe(1);
    expect(s.fn).toBe(0);
  });

  it('explains an FP that sits on a distractor by its family', () => {
    const l = labels([series([1, 2, 3])], [{ merchant: 'SHELL OIL', family: 'gas', lines: [20, 21, 22, 23] }]);
    expect(explainFp(new Set([20, 21, 22, 23]), l)).toBe('gas');
    const s = evaluate(result([finding('g', [20, 21, 22, 23])]), l);
    expect(s.falsePositives[0]!.why).toBe('gas');
  });

  it('does not count a non-mustFind series that is missed', () => {
    const s = evaluate(result([]), labels([series([1, 2], { mustFind: false })]));
    expect(s.fn).toBe(0);
    expect(s.recall).toBe(1);
  });

  it('computes cadence accuracy and the yearly error on matched findings', () => {
    const r = result([finding('a', [1, 2, 3], 'weekly')]);
    const s = evaluate(r, labels([series([1, 2, 3])]));
    expect(s.cadenceAccuracy).toBe(0);
    // lastCents 1000 x 4 weekly periods? no: yearlyCost uses the finding's cadence (weekly = 52), nominal 1000 x monthly 12 = 12000.
    expect(s.yearlyCostMaxErrorPct).toBeGreaterThan(0);
  });

  it('applies the medium filter by dropping low-confidence findings', () => {
    const r = result([finding('a', [1, 2, 3], 'monthly', 'low'), finding('b', [7, 8, 9])]);
    expect(atLeastMedium(r).findings.map((f) => f.id)).toEqual(['b']);
  });
});

describe('aggregate and fixtures', () => {
  it('pools counts and re-weights precision and recall', () => {
    const a = evaluate(result([finding('a', [1, 2, 3]), finding('x', [90])]), labels([series([1, 2, 3])]));
    const b = evaluate(result([]), labels([series([5, 6, 7], { merchantKey: 'hulu', aliasId: 'hulu', display: 'Hulu' })]));
    const pooled = aggregate([a, b]);
    expect([pooled.tp, pooled.fp, pooled.fn]).toEqual([1, 1, 1]);
    expect(pooled.precision).toBe(0.5);
    expect(pooled.recall).toBe(0.5);
    expect(pooled.perFormat['chase-card']).toEqual({ tp: 1, fp: 1, fn: 1 });
  });

  it('fixturePass demands the format, every mustFind series at its cadence, and no extra finding', () => {
    const l = labels([series([1, 2, 3])]);
    expect(fixturePass(result([finding('a', [1, 2, 3])]), l, 'chase-card').ok).toBe(true);
    expect(fixturePass(result([finding('a', [1, 2, 3])]), l, 'amex').ok).toBe(false);
    expect(fixturePass(result([finding('a', [1, 2, 3], 'weekly')]), l, 'chase-card').ok).toBe(false);
    expect(fixturePass(result([finding('a', [1, 2, 3]), finding('z', [60])]), l, 'chase-card').ok).toBe(false);
  });
});
