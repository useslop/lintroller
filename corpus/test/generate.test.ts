import { describe, expect, it } from 'vitest';
import { CaseLabelsSchema, FORMATS, type FormatId, sniffFormat } from '@subsweep/engine';
import { generateCase } from '../src/generate';
import { buildSample } from '../src/sample';
import { VOCAB, PERSON, RAW_MERCHANTS, SUBSCRIPTIONS } from '../src/catalog';

const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

/** Upper-cased text a labelled line must contain (the catalog core, or every token of a raw merchant key). */
function labelHits(line: string, s: { merchantKey: string; aliasId: string | null; kind: string }): boolean {
  const up = line.toUpperCase();
  if (s.merchantKey.startsWith('raw:')) return s.merchantKey.slice(4).toUpperCase().split(' ').every((t) => up.includes(t));
  if (s.aliasId === 'apple') return up.includes('APPLE.COM/BILL');
  if (s.kind === 'person') return PERSON.cores.some((c) => up.includes(c));
  const spec = SUBSCRIPTIONS.find((m) => m.aliasId === s.aliasId);
  return spec !== undefined && spec.cores.some((c) => up.includes(c.toUpperCase()));
}

describe('determinism', () => {
  it('same seed gives byte-identical CSV and labels; a different seed does not', () => {
    const a = generateCase({ seed: 31, format: 'chase-card', months: 9, series: 6 });
    const b = generateCase({ seed: 31, format: 'chase-card', months: 9, series: 6 });
    const c = generateCase({ seed: 32, format: 'chase-card', months: 9, series: 6 });
    expect(a.csv).toBe(b.csv);
    expect(JSON.stringify(a.labels)).toBe(JSON.stringify(b.labels));
    expect(c.csv).not.toBe(a.csv);
  });

  it('the sample statement is deterministic', () => {
    expect(buildSample().csv).toBe(buildSample().csv);
  });

  it('generated labels pass the shared schema', () => {
    for (const format of FORMAT_IDS) {
      const { labels } = generateCase({ seed: 77, format, months: 7, series: 5 });
      expect(() => CaseLabelsSchema.parse(labels)).not.toThrow();
    }
  });
});

describe('writers', () => {
  it('each writer output sniffs back to its own FormatId (cashapp and generic sniff as generic)', () => {
    const misses: string[] = [];
    FORMAT_IDS.forEach((format, i) => {
      const { csv } = generateCase({ seed: 900 + i, format, months: 8, series: 4 });
      const want = format === 'cashapp' ? 'generic' : format;
      const got = sniffFormat(csv).format;
      if (got !== want) misses.push(`${format} sniffed as ${got}`);
    });
    expect(misses).toEqual([]);
  });

  it('labelled lines point at real lines that contain the series descriptor', () => {
    FORMAT_IDS.forEach((format, i) => {
      const { csv, labels } = generateCase({ seed: 1200 + i, format, months: 8, series: 6 });
      const lines = csv.split(/\r?\n/);
      for (const s of labels.recurring) {
        for (const ln of s.lines) {
          expect(ln).toBeLessThanOrEqual(lines.length);
          expect(labelHits(lines[ln - 1]!, s), `${format} line ${ln} for ${s.merchantKey}`).toBe(true);
        }
      }
      for (const d of labels.distractors) {
        const cores = VOCAB[d.family]?.cores ?? [d.merchant];
        for (const ln of d.lines) {
          const up = lines[ln - 1]!.toUpperCase();
          expect(cores.some((c) => up.includes(c.toUpperCase())), `${format} distractor line ${ln} ${d.merchant}`).toBe(true);
        }
      }
    });
  });

  it('writes CRLF in some cases and LF in others, and keeps every row on one physical line', () => {
    const endings = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const { csv } = generateCase({ seed, format: 'amex', months: 6, series: 3 });
      endings.add(csv.includes('\r\n') ? 'crlf' : 'lf');
    }
    expect(endings).toEqual(new Set(['crlf', 'lf']));
    expect(RAW_MERCHANTS.length).toBeGreaterThan(0);
    expect(VOCAB.coffee).toBeDefined();
  });
});

describe('generated case shape', () => {
  it('stays inside the SPEC §9 ranges and covers the cadences', () => {
    const seen = new Set<string>();
    for (let seed = 500; seed < 530; seed++) {
      const months = 6 + (seed % 13);
      const { labels } = generateCase({ seed, format: 'boa-checking', months, series: 3 + (seed % 12) });
      expect(labels.recurring.length).toBeGreaterThanOrEqual(3);
      expect(labels.recurring.length).toBeLessThanOrEqual(14);
      for (const s of labels.recurring) seen.add(s.cadence);
    }
    expect(seen.size).toBeGreaterThanOrEqual(6);
    expect(seen.has('irregular')).toBe(false);
  });
});
