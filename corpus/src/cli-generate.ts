// npm run generate -w corpus: writes the committed, deterministic corpus to corpus/out/.
//   out/cases/<caseId>.csv + .labels.json   40 cases: 2 per FormatId, plus 4 extra (6 to 18 months, 3 to 14 series)
//   out/sample-statement.csv (+ .labels.json)  the friendly demo file the app bundles
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaseLabelsSchema, FORMATS, type FormatId } from '@subsweep/engine';
import { buildSample } from './sample';
import { generateCase } from './generate';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
const CASES = join(OUT, 'cases');

interface Plan {
  format: FormatId;
  seed: number;
}

// Two cases per format (seeds 4000..) plus four extras on the common formats.
const plans: Plan[] = [];
const formats = Object.keys(FORMATS) as FormatId[];
formats.forEach((format, fi) => {
  for (let k = 0; k < 2; k++) plans.push({ format, seed: 4000 + fi * 10 + k });
});
for (const format of ['chase-card', 'amex', 'boa-checking', 'paypal'] as FormatId[]) {
  plans.push({ format, seed: 4900 + plans.length });
}

rmSync(CASES, { recursive: true, force: true });
mkdirSync(CASES, { recursive: true });

let rows = 0;
for (const { format, seed } of plans) {
  const months = 6 + ((seed * 7) % 13);
  const series = 3 + ((seed * 5) % 12);
  const { csv, labels } = generateCase({ seed, format, months, series });
  CaseLabelsSchema.parse(labels);
  const base = join(CASES, labels.caseId);
  writeFileSync(`${base}.csv`, csv);
  writeFileSync(`${base}.labels.json`, `${JSON.stringify(labels, null, 2)}\n`);
  rows += csv.split('\n').length;
}

const sample = buildSample();
CaseLabelsSchema.parse(sample.labels);
writeFileSync(join(OUT, 'sample-statement.csv'), sample.csv);
writeFileSync(join(OUT, 'sample-statement.labels.json'), `${JSON.stringify(sample.labels, null, 2)}\n`);

const files = readdirSync(CASES).filter((f) => f.endsWith('.csv')).length;
console.log(`cases: ${files} (formats: ${new Set(plans.map((p) => p.format)).size}), about ${rows} lines`);
console.log(`sample-statement.csv: ${sample.labels.recurring.length} recurring series, ${sample.labels.distractors.length} distractor streams`);
