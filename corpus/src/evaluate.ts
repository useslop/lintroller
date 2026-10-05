// Scoring (SPEC §9). A finding matches a labelled series when the Jaccard overlap of their physical line
// sets is at least 0.5 (same case). Matching is one-to-one, taken greedily by overlap (ties: finding order,
// then series order), so one finding never counts for two series and one series never counts twice.
//   precision = TP / findings          recall = matched mustFind series / mustFind series
//   cadence accuracy = share of TPs with the labelled cadence
//   yearly-cost error = |yearlyCost(finding) - nominal × periods| / (nominal × periods), max over TPs
import { PERIODS_PER_YEAR, yearlyCost, type CaseLabels, type DetectResult, type FixedCadence, type Score } from '@subsweep/engine';

export const JACCARD_MIN = 0.5;

/** Raw counts behind a Score, kept beside it so aggregate() can re-weight exactly. */
interface Counts {
  mustFind: number;
  mustFindMatched: number;
  cadenceOk: number;
}
const countsOf = new WeakMap<Score, Counts>();

export function jaccard(a: ReadonlySet<number>, b: ReadonlySet<number>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface MatchResult {
  /** findingToSeries[i] = index of the series finding i matched, or -1. */
  findingToSeries: number[];
  /** seriesToFinding[j] = index of the finding that matched series j, or -1. */
  seriesToFinding: number[];
}

export function matchAll(result: DetectResult, labels: CaseLabels): MatchResult {
  const fSets = result.findings.map((f) => new Set(f.occurrences.map((e) => e.line)));
  const sSets = labels.recurring.map((s) => new Set(s.lines));
  const candidates: { fi: number; si: number; j: number }[] = [];
  fSets.forEach((fs, fi) => {
    sSets.forEach((ss, si) => {
      const j = jaccard(fs, ss);
      if (j >= JACCARD_MIN) candidates.push({ fi, si, j });
    });
  });
  candidates.sort((a, b) => b.j - a.j || a.fi - b.fi || a.si - b.si);
  const findingToSeries = new Array<number>(fSets.length).fill(-1);
  const seriesToFinding = new Array<number>(sSets.length).fill(-1);
  for (const c of candidates) {
    if (findingToSeries[c.fi] === -1 && seriesToFinding[c.si] === -1) {
      findingToSeries[c.fi] = c.si;
      seriesToFinding[c.si] = c.fi;
    }
  }
  return { findingToSeries, seriesToFinding };
}

/** Why a finding matched nothing: the distractor family it sits on, else partial overlap, else unlabelled. */
export function explainFp(lines: ReadonlySet<number>, labels: CaseLabels): string {
  let best: { family: string; n: number } | null = null;
  for (const d of labels.distractors) {
    const n = d.lines.filter((l) => lines.has(l)).length;
    if (n > 0 && (best === null || n > best.n)) best = { family: d.family, n };
  }
  if (best) return best.family;
  if (labels.recurring.some((s) => s.lines.some((l) => lines.has(l)))) return 'partial-overlap';
  return 'unlabelled';
}

export function evaluate(result: DetectResult, labels: CaseLabels): Score {
  const { findingToSeries, seriesToFinding } = matchAll(result, labels);
  const falsePositives: Score['falsePositives'] = [];
  let tp = 0;
  let cadenceOk = 0;
  let yearlyMax = 0;
  result.findings.forEach((f, fi) => {
    const si = findingToSeries[fi]!;
    if (si === -1) {
      const lines = new Set(f.occurrences.map((e) => e.line));
      falsePositives.push({ caseId: labels.caseId, findingId: f.id, display: f.display, why: explainFp(lines, labels) });
      return;
    }
    tp++;
    const s = labels.recurring[si]!;
    if (f.cadence === s.cadence) cadenceOk++;
    const expected = s.nominalCents * PERIODS_PER_YEAR[s.cadence as FixedCadence];
    yearlyMax = Math.max(yearlyMax, (Math.abs(yearlyCost(f).cents - expected) / expected) * 100);
  });
  const falseNegatives: Score['falseNegatives'] = [];
  let mustFind = 0;
  let mustFindMatched = 0;
  labels.recurring.forEach((s, si) => {
    if (!s.mustFind) return;
    mustFind++;
    if (seriesToFinding[si] !== -1) mustFindMatched++;
    else falseNegatives.push({ caseId: labels.caseId, merchantKey: s.merchantKey, cadence: s.cadence });
  });
  const fp = falsePositives.length;
  const fn = mustFind - mustFindMatched;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = mustFind === 0 ? 1 : mustFindMatched / mustFind;
  const score: Score = {
    tp,
    fp,
    fn,
    precision,
    recall,
    f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
    cadenceAccuracy: tp === 0 ? 1 : cadenceOk / tp,
    yearlyCostMaxErrorPct: yearlyMax,
    perFormat: { [labels.format]: { tp, fp, fn } },
    falsePositives,
    falseNegatives,
  };
  countsOf.set(score, { mustFind, mustFindMatched, cadenceOk });
  return score;
}

/** Pools case scores. Precision and recall are re-weighted from raw counts, not averaged. */
export function aggregate(scores: readonly Score[]): Score {
  let tp = 0;
  let fp = 0;
  let mustFind = 0;
  let mustFindMatched = 0;
  let cadenceOk = 0;
  let yearlyMax = 0;
  const perFormat: Score['perFormat'] = {};
  const falsePositives: Score['falsePositives'] = [];
  const falseNegatives: Score['falseNegatives'] = [];
  for (const s of scores) {
    const c = countsOf.get(s) ?? { mustFind: s.tp + s.fn, mustFindMatched: s.tp, cadenceOk: Math.round(s.cadenceAccuracy * s.tp) };
    tp += s.tp;
    fp += s.fp;
    mustFind += c.mustFind;
    mustFindMatched += c.mustFindMatched;
    cadenceOk += c.cadenceOk;
    yearlyMax = Math.max(yearlyMax, s.yearlyCostMaxErrorPct);
    for (const [fmt, v] of Object.entries(s.perFormat)) {
      const cur = perFormat[fmt as keyof Score['perFormat']] ?? { tp: 0, fp: 0, fn: 0 };
      perFormat[fmt as keyof Score['perFormat']] = { tp: cur.tp + v!.tp, fp: cur.fp + v!.fp, fn: cur.fn + v!.fn };
    }
    falsePositives.push(...s.falsePositives);
    falseNegatives.push(...s.falseNegatives);
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = mustFind === 0 ? 1 : mustFindMatched / mustFind;
  const out: Score = {
    tp,
    fp,
    fn: mustFind - mustFindMatched,
    precision,
    recall,
    f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
    cadenceAccuracy: tp === 0 ? 1 : cadenceOk / tp,
    yearlyCostMaxErrorPct: yearlyMax,
    perFormat,
    falsePositives,
    falseNegatives,
  };
  countsOf.set(out, { mustFind, mustFindMatched, cadenceOk });
  return out;
}

/** Fixture check (SPEC §9 "fixtures exact"): right format, every mustFind series found at its cadence, no extra finding. */
export function fixturePass(result: DetectResult, labels: CaseLabels, sniffedFormat: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (sniffedFormat !== labels.format) problems.push(`sniffed as ${sniffedFormat}, labelled ${labels.format}`);
  const { findingToSeries, seriesToFinding } = matchAll(result, labels);
  labels.recurring.forEach((s, si) => {
    if (!s.mustFind) return;
    const fi = seriesToFinding[si]!;
    if (fi === -1) problems.push(`missed ${s.merchantKey} (${s.cadence})`);
    else if (result.findings[fi]!.cadence !== s.cadence) problems.push(`${s.merchantKey}: cadence ${result.findings[fi]!.cadence}, labelled ${s.cadence}`);
  });
  result.findings.forEach((f, fi) => {
    if (findingToSeries[fi] === -1) problems.push(`extra finding ${f.display} (${f.cadence})`);
  });
  return { ok: problems.length === 0, problems };
}

/** Drops findings below "medium" confidence (the gate for precision at ≥ medium). */
export function atLeastMedium(result: DetectResult): DetectResult {
  return { ...result, findings: result.findings.filter((f) => f.confidenceLabel !== 'low') };
}
