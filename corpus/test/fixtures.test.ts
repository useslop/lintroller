import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CaseLabelsSchema, FORMATS } from '@subsweep/engine';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const files = existsSync(FIXTURES) ? readdirSync(FIXTURES).filter((f) => f.endsWith('.expected.json')).sort() : [];

describe('hand fixtures', () => {
  it('there are at least 15, each with its CSV', () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
    for (const f of files) expect(existsSync(join(FIXTURES, f.replace(/\.expected\.json$/, '.csv')))).toBe(true);
  });

  it.each(files)('%s: labels pass CaseLabelsSchema and point at real lines', (file) => {
    const labels = CaseLabelsSchema.parse(JSON.parse(readFileSync(join(FIXTURES, file), 'utf8')));
    expect(labels.caseId).toBe(file.replace(/\.expected\.json$/, ''));
    expect(Object.keys(FORMATS)).toContain(labels.format);
    const text = readFileSync(join(FIXTURES, `${labels.caseId}.csv`), 'utf8').replace(/^﻿/, '');
    const lines = text.split(/\r?\n/);
    const check = (ln: number, name: string) => {
      expect(ln, `${name} line ${ln} exists`).toBeLessThanOrEqual(lines.length);
      const word = name.split(/\s+/).find((w) => w.length >= 4) ?? name;
      expect(lines[ln - 1]!.toUpperCase(), `${name} on line ${ln}`).toContain(word.toUpperCase().slice(0, 4));
    };
    for (const s of labels.recurring) for (const ln of s.lines) check(ln, s.display);
    for (const d of labels.distractors) for (const ln of d.lines) check(ln, d.merchant);
  });
});
