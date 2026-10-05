import { describe, expect, it } from 'vitest';
import { detectDelimiter, firstLines, readCsv } from '../src/csv';

describe('readCsv (RFC 4180)', () => {
  it('reads quotes and escaped quotes', () => {
    const r = readCsv('a,"b,c","say ""hi"""\n');
    expect(r).toEqual([{ line: 1, cells: ['a', 'b,c', 'say "hi"'] }]);
  });
  it('keeps embedded newlines and counts physical lines', () => {
    const r = readCsv('h1,h2\r\n"multi\r\nline",x\r\nlast,y\r\n');
    expect(r.map((x) => x.line)).toEqual([1, 2, 4]);
    expect(r[1]!.cells).toEqual(['multi\nline', 'x']);
  });
  it('handles CR-only line endings', () => {
    const r = readCsv('a,b\rc,d\re,f');
    expect(r.map((x) => x.cells)).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f']]);
    expect(r[2]!.line).toBe(3);
  });
  it('strips a UTF-8 BOM', () => {
    expect(readCsv('﻿Date,Amount\n')[0]!.cells[0]).toBe('Date');
  });
  it('reads semicolons and tabs', () => {
    expect(readCsv('01.09.2026;NETFLIX;-15,49\n', ';')[0]!.cells).toEqual(['01.09.2026', 'NETFLIX', '-15,49']);
    expect(readCsv('a\tb\tc\n', '\t')[0]!.cells).toEqual(['a', 'b', 'c']);
  });
  it('keeps ragged rows and blank lines', () => {
    const r = readCsv('a,b,c\n\nd\ne,f,g,h\n');
    expect(r.map((x) => x.cells.length)).toEqual([3, 1, 1, 4]);
    expect(r[1]!.cells).toEqual(['']);
  });
  it('keeps a trailing empty field', () => {
    expect(readCsv('a,b,\n')[0]!.cells).toEqual(['a', 'b', '']);
  });
  it('detects delimiters', () => {
    expect(detectDelimiter(firstLines('Date;Description;Amount\n01.09.2026;NETFLIX;-15,49\n', 30))).toBe(';');
    expect(detectDelimiter(firstLines('Date\tPayee\tAmount\n2026-09-01\tNetflix\t-15.49\n', 30))).toBe('\t');
    expect(detectDelimiter(firstLines('Date,Description,Amount\n09/01/2026,"A; B",-1.00\n', 30))).toBe(',');
  });
});

import { parseRows, sniffFormat } from '../src/index';
describe('hostile input never throws', () => {
  it('empty, header-only, binary-ish and huge-field files', () => {
    for (const text of ['', 'Date,Description,Amount\n', '\u0000\u0001��PK\u0003\u0004', '"unterminated,quote\n1,2', 'a'.repeat(100000)]) {
      const s = sniffFormat(text);
      expect(s.format).toBeTypeOf('string');
      const r = parseRows(text, s);
      expect(r.rows.length).toBe(0);
    }
  });
});
