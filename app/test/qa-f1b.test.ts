// Regressions for Q1's F1b fix list, on Q1's own repro files (qa/files, REVIEW.md "Fix list").
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aliases } from '../src/data';
import { CATEGORY_LABEL, plural, signFlipNote } from '../src/copy';
import { CATEGORIES } from '../src/engine';
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

describe('F1b LOW copy and naming', () => {
  it('#6 singular and plural', () => {
    expect(plural(1, 'row', 'rows')).toBe('1 row');
    expect(plural(1, 'day', 'days')).toBe('1 day');
    expect(plural(12345, 'row', 'rows')).toBe('12,345 rows');
  });

  it('#7 every category id has a label, and no label is an id', () => {
    for (const c of [...CATEGORIES, 'uncategorised' as const]) {
      expect(CATEGORY_LABEL[c]).toBeTruthy();
      expect(CATEGORY_LABEL[c]).not.toMatch(/-/);
    }
  });

  it('#8 two Apple plans get two names with their amounts, without "platform biller"', () => {
    const apple = run('honesty-life.csv').detect.findings.filter((f) => f.aliasId === 'apple');
    expect(apple.length).toBe(2);
    expect(new Set(apple.map((f) => f.display)).size).toBe(2);
    for (const f of apple) expect(f.display).toMatch(/^Apple subscription, \$\d+\.\d\d$/);
  });

  it('#11 bidi overrides and zero-width characters never reach a name', () => {
    const r = run('inject.csv');
    expect(r.detect.findings.length).toBeGreaterThan(5);
    for (const f of r.detect.findings) expect(f.display).not.toMatch(/[​-‏‪-‮⁦-⁩﻿]/);
  });

  it('#13 weekly Target, Walmart, CVS and Walgreens runs are shops, not subscriptions', () => {
    const rows = ['Date,Description,Amount'];
    const shops = ['TARGET 00012345 MINNEAPOLIS MN', 'WAL-MART #1234 BENTONVILLE AR', 'CVS/PHARMACY #01234 BOSTON MA', 'WALGREENS #1234 CHICAGO IL'];
    for (let w = 0; w < 30; w++) {
      const d = new Date(Date.UTC(2026, 0, 2 + w * 7));
      const ds = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`;
      shops.forEach((s, i) => rows.push(`${ds},${s},-${(20 + i).toFixed(2)}`));
    }
    const r = runImportWithAliases([{ name: 'shops', text: rows.join('\n') }], aliases, '2026-10-04');
    expect(r.detect.findings.length).toBe(0);
    expect(r.detect.suppressed.filter((s) => s.reason === 'variable-merchant').length).toBe(4);
  });
});

describe('F1b #12: unverified cancel URLs are not in the bundle', () => {
  it('an entry ships a URL only when that URL passed its check; unverified entries keep their names', async () => {
    const { cancelDirectory } = await import('../src/data');
    const unverified = cancelDirectory.filter((e) => e.verified === null);
    expect(unverified.length).toBeGreaterThan(30);
    for (const e of unverified) {
      expect(e.name).toBeTruthy();
      expect(e.manageUrl).toBeNull();
      expect(e.helpUrl).toBeNull();
    }
    for (const e of cancelDirectory) {
      if (e.manageUrl) expect(e.check.manage?.ok).toBe(true);
      if (e.helpUrl) expect(e.check.help?.ok).toBe(true);
    }
  });
});

describe('F1b #10: plain causes for empty, non-text and open-quote files', () => {
  const report = (name: string) => runImportWithAliases([{ name, text: decodeBytes(readFileSync(resolve(QA, name))) }], aliases, '2026-10-04').files[0]!;
  it('empty.csv', () => expect(report('empty.csv').problem).toEqual({ kind: 'empty' }));
  it('png-renamed.csv', () => expect(report('png-renamed.csv').problem).toEqual({ kind: 'not-text' }));
  it('unbalanced-quotes.csv names the line the quote opens on', () => expect(report('unbalanced-quotes.csv').problem).toEqual({ kind: 'open-quote', line: 2 }));
  it('ordinary files have no problem', () => {
    expect(report('honesty-life.csv').problem).toBeUndefined();
    expect(report('amounts-odd.csv').problem).toBeUndefined();
  });
});

describe('F1b #15: the mapper names the real cause', () => {
  it('dup-headers.csv with the Description column as the amount: "amount" is the cause', async () => {
    const { previewProblem, specFromChoice } = await import('../src/pipeline');
    const t = text('dup-headers.csv');
    const cols = t.split('\n')[0]!.split(',');
    const spec = specFromChoice({
      delimiter: ',', headerLine: 0, date: 0, description: cols.indexOf('Description'), amount: cols.indexOf('Description'),
      sign: 'debit-negative', dateOrder: 'MDY',
    });
    expect(previewProblem(t, spec)).toBe('amount');
  });
});

describe('F1b #9: a past next date says so on the summary card', () => {
  it('honesty-life.csv Spotify (due Oct 3, file ends Sep 30) on Oct 4', async () => {
    const { nextLine } = await import('../src/pages/Summary');
    const spotify = run('honesty-life.csv').detect.findings.find((f) => f.aliasId === 'spotify')!;
    expect(spotify.nextExpected).toBe('2026-10-03');
    expect(nextLine(spotify, '2026-10-04')).toBe('Due Oct 3, 2026, after your file ends; the next one around Nov 3, 2026');
    expect(nextLine(spotify, '2026-10-02')).toBe('Next expected Oct 3, 2026');
  });
});
