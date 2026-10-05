// Regressions for Q1's F1b fix list, on Q1's own repro files (qa/files, REVIEW.md "Fix list").
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aliases } from '../src/data';
import { signFlipNote } from '../src/copy';
import { decodeBytes } from '../src/files';
import { runImportWithAliases } from '../src/pipeline';

// app tests run from app/ (npm test -w app); the jsdom environment has no file: import.meta.url
const QA = resolve(process.cwd(), '../qa/files');
const text = (name: string) => readFileSync(resolve(QA, name), 'utf8');
const run = (name: string, today = '2026-10-04') => runImportWithAliases([{ name, text: text(name) }], aliases, today);

describe('F1b #1: the sign note says what the file holds', () => {
  it('a Chase card file with negative purchases: flipped, and the note says negative', () => {
    const r = run('sign-negative-card.csv');
    const f = r.files[0]!;
    expect(f.format).toBe('chase-card');
    expect(f.flipSuggested && f.flipApplied).toBe(true);
    const note = signFlipNote(f.spec);
    expect(note).toMatch(/negative numbers/);
    expect(note).not.toMatch(/positive/);
  });

  it('the same card with positive purchases: no flip, no note', () => {
    const f = run('sign-positive-card.csv').files[0]!;
    expect(f.flipSuggested).toBe(false);
  });

  it('a debit-negative format that gets flipped says positive', () => {
    expect(signFlipNote({ signConvention: 'debit-negative' } as never)).toMatch(/positive numbers/);
    expect(signFlipNote({ signConvention: 'split-columns' } as never)).toBe('We read the signs the other way round for this file.');
  });
});

describe('F1b #2: future-dated rows do not move "today"', () => {
  it('dates-odd.csv: 2027 and 1985 rows skipped and counted; Netflix and Spotify stay active', () => {
    const r = run('dates-odd.csv');
    expect(r.files[0]!.skipped['future-date']).toBe(4);
    expect(r.files[0]!.skipped['before-1990']).toBe(4);
    expect(r.files[0]!.dateRange).toEqual({ from: '2026-01-03', to: '2026-09-12' });
    const byName = new Map(r.detect.findings.map((f) => [f.aliasId, f]));
    expect(byName.get('netflix')?.activity).toBe('active');
    expect(byName.get('spotify')?.activity).toBe('active');
    expect(r.detect.findings.some((f) => /future|oldtime/i.test(f.display))).toBe(false);
  });

  it('a file that ends before today keeps its own last date as the as-of date', () => {
    const r = run('honesty-life.csv', '2027-06-01');
    expect(r.detect.findings.filter((f) => f.activity === 'active').length).toBeGreaterThan(5);
  });
});

describe('F1b #3: "-1.234,56" reads as $1,234.56', () => {
  it('amounts-odd.csv: the euro-decimal series costs 1,234.56', () => {
    const r = run('amounts-odd.csv');
    const euro = r.detect.findings.find((f) => /euro/i.test(f.display));
    expect(euro?.amount.lastCents).toBe(123456);
  });
});

describe('F1b #4: no "Same amount each time" next to "Price changed"', () => {
  it('honesty-life.csv Netflix', () => {
    const netflix = run('honesty-life.csv').detect.findings.find((f) => f.aliasId === 'netflix')!;
    expect(netflix.reasons).toContain('price-change');
    expect(netflix.reasons).not.toContain('stable-amount');
  });
});

describe('F1b #5: UTF-16 files are decoded by their byte-order mark', () => {
  it('utf16le-bom.csv reads like its UTF-8 twin', () => {
    const decoded = decodeBytes(readFileSync(resolve(QA, 'utf16le-bom.csv')));
    expect(decoded.startsWith('Details,Posting Date')).toBe(true);
    const r = runImportWithAliases([{ name: 'u16', text: decoded }], aliases, '2026-10-04');
    expect(r.files[0]!.needsMapping).toBe(false);
    expect(r.files[0]!.format).toBe('chase-checking');
    expect(r.txnCount).toBeGreaterThan(10);
  });

  it('UTF-16BE with FE FF decodes too', () => {
    const s = 'Date,Description,Amount\n01/03/2026,NETFLIX,-15.49\n';
    const be = new Uint8Array(2 + s.length * 2);
    be[0] = 0xfe; be[1] = 0xff;
    for (let i = 0; i < s.length; i++) { be[2 + i * 2] = 0; be[3 + i * 2] = s.charCodeAt(i); }
    expect(decodeBytes(be)).toBe(s);
  });
});
