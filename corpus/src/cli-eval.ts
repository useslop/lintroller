// npm run eval -w corpus: runs the real engine over the corpus, the hand fixtures and three 50,000-row
// performance cases, prints the scoreboard, writes out/scoreboard.json, and exits 1 below the SPEC §9 gates:
//   G1 corpus precision >= 0.90    G2 corpus recall >= 0.90    G3 precision at confidence >= medium >= 0.95
//   G4 every fixture exact         G5 50,000-row case parse + detect < 2 s
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaseLabelsSchema, type CaseLabels, type Score } from '@subsweep/engine';
import { aggregate, atLeastMedium, evaluate, fixturePass } from './evaluate';
import { generateCase } from './generate';
import { decodeCsv, runEngine } from './run';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out');
const CASES = join(OUT, 'cases');
const FIXTURES = join(ROOT, 'fixtures');

const GATES = { precision: 0.9, recall: 0.9, precisionMedium: 0.95, performanceMs: 2000 };

interface CaseRun {
  id: string;
  score: Score;
  medium: Score;
  findings: number;
  parseMs: number;
  detectMs: number;
}

function loadLabels(path: string): CaseLabels {
  return CaseLabelsSchema.parse(JSON.parse(readFileSync(path, 'utf8'))) as CaseLabels;
}

function runCase(id: string, csv: string, labels: CaseLabels): CaseRun & { sniffed: string; pass: boolean; problems: string[] } {
  const out = runEngine(csv);
  const fixture = fixturePass(out.result, labels, out.sniff.format);
  return {
    id,
    score: evaluate(out.result, labels),
    medium: evaluate(atLeastMedium(out.result), labels),
    findings: out.result.findings.length,
    parseMs: out.parseMs,
    detectMs: out.detectMs,
    sniffed: out.sniff.format,
    pass: fixture.ok,
    problems: fixture.problems,
  };
}

// 1. Corpus (generated, committed).
const caseRuns: CaseRun[] = [];
for (const file of readdirSync(CASES).filter((f) => f.endsWith('.labels.json')).sort()) {
  const labels = loadLabels(join(CASES, file));
  const csv = decodeCsv(readFileSync(join(CASES, file.replace(/\.labels\.json$/, '.csv'))));
  const r = runCase(labels.caseId, csv, labels);
  caseRuns.push({ id: r.id, score: r.score, medium: r.medium, findings: r.findings, parseMs: r.parseMs, detectMs: r.detectMs });
}
const corpus = aggregate(caseRuns.map((c) => c.score));
const corpusMedium = aggregate(caseRuns.map((c) => c.medium));

// 2. Hand fixtures: exact.
const fixtureFiles = existsSync(FIXTURES) ? readdirSync(FIXTURES).filter((f) => f.endsWith('.expected.json')).sort() : [];
const fixtures = fixtureFiles.map((file) => {
  const labels = loadLabels(join(FIXTURES, file));
  const csv = decodeCsv(readFileSync(join(FIXTURES, `${labels.caseId}.csv`)));
  const r = runCase(labels.caseId, csv, labels);
  return { name: labels.caseId, format: labels.format, sniffed: r.sniffed, pass: r.pass, problems: r.problems, score: r.score };
});

// 3. Performance: three 50,000-row files, generated in memory and never committed.
const large = [
  { seed: 9001, format: 'chase-card' as const },
  { seed: 9002, format: 'boa-checking' as const },
  { seed: 9003, format: 'amex' as const },
].map(({ seed, format }) => {
  const { csv, labels } = generateCase({ seed, format, months: 18, series: 14, targetRows: 50_000 });
  const r = runCase(labels.caseId, csv, labels);
  return { name: labels.caseId, lines: csv.split('\n').length, ms: r.parseMs + r.detectMs, parseMs: r.parseMs, detectMs: r.detectMs };
});

// Gates.
const gates = [
  { id: 'G1', name: 'corpus precision >= 0.90', value: corpus.precision, pass: corpus.precision >= GATES.precision },
  { id: 'G2', name: 'corpus recall >= 0.90', value: corpus.recall, pass: corpus.recall >= GATES.recall },
  { id: 'G3', name: 'precision at confidence >= medium >= 0.95', value: corpusMedium.precision, pass: corpusMedium.precision >= GATES.precisionMedium },
  { id: 'G4', name: 'fixtures exact (at least 15)', value: fixtures.filter((f) => f.pass).length, pass: fixtures.length >= 15 && fixtures.every((f) => f.pass) },
  { id: 'G5', name: 'performance: 50k-row parse + detect < 2 s', value: Math.max(...large.map((l) => l.ms)), pass: large.every((l) => l.ms < GATES.performanceMs) },
];

// Diagnostics: where the false positives and misses come from.
const countBy = <T>(xs: T[], key: (x: T) => string): [string, number][] => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const allFp = caseRuns.flatMap((c) => c.score.falsePositives);
const allFn = caseRuns.flatMap((c) => c.score.falseNegatives);
const worstFp = countBy(allFp, (f) => f.why).slice(0, 8);
const worstFnCadence = countBy(allFn, (f) => f.cadence).slice(0, 8);
const worstFnFormat = countBy(allFn, (f) => f.caseId.split('-')[0] ?? '?').slice(0, 8);

const scoreboard = {
  generated: 'npm run eval -w corpus',
  gates: gates.map((g) => ({ ...g, value: Number(g.value.toFixed(4)) })),
  corpus: {
    cases: caseRuns.length,
    tp: corpus.tp, fp: corpus.fp, fn: corpus.fn,
    precision: corpus.precision, recall: corpus.recall, f1: corpus.f1,
    precisionAtMedium: corpusMedium.precision,
    cadenceAccuracy: corpus.cadenceAccuracy,
    yearlyCostMaxErrorPct: corpus.yearlyCostMaxErrorPct,
    perFormat: corpus.perFormat,
    worstFpFamilies: worstFp,
    worstFnCadences: worstFnCadence,
  },
  fixtures: fixtures.map((f) => ({ name: f.name, format: f.format, sniffed: f.sniffed, pass: f.pass, problems: f.problems })),
  performance: large,
  // The first 200 of each list, for debugging; the totals above are complete.
  falsePositives: allFp.slice(0, 200),
  falseNegatives: allFn.slice(0, 200),
};
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'scoreboard.json'), `${JSON.stringify(scoreboard, null, 2)}\n`);

// Console summary (kept short on purpose).
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(`corpus: ${caseRuns.length} cases, ${corpus.tp} TP, ${corpus.fp} FP, ${corpus.fn} FN`);
console.log(`  precision ${pct(corpus.precision)}   recall ${pct(corpus.recall)}   precision>=medium ${pct(corpusMedium.precision)}   cadence ${pct(corpus.cadenceAccuracy)}   yearly max err ${corpus.yearlyCostMaxErrorPct.toFixed(1)}%`);
console.log(`fixtures: ${fixtures.filter((f) => f.pass).length}/${fixtures.length} exact`);
for (const f of fixtures.filter((x) => !x.pass)) console.log(`  FAIL ${f.name}: ${f.problems.slice(0, 3).join('; ')}`);
console.log(`performance: ${large.map((l) => `${l.name} ${l.ms.toFixed(0)} ms`).join(', ')}`);
console.log(`worst FP families: ${worstFp.map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
console.log(`FN by cadence: ${worstFnCadence.map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}   FN by format: ${worstFnFormat.map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
for (const g of gates) console.log(`${g.pass ? 'PASS' : 'FAIL'} ${g.id} ${g.name} (${Number(g.value.toFixed(4))})`);
process.exitCode = gates.every((g) => g.pass) ? 0 : 1;
