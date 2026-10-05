import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildIcs, findingsToCsv, lintCopy, NEVER_SAY } from '../src/index';
import { readCsv } from '../src/csv';
import { fakeFinding } from './helpers';

describe('findingsToCsv', () => {
  it('escapes formula injection and round-trips through the reader', () => {
    const evil = '=HYPERLINK("http://x","click")';
    const f = fakeFinding({ display: evil, occurrences: [{ txnId: '0:2', source: 0, line: 2, date: '2026-09-02', cents: 1549, description: '+SUM(A1:A9), "quoted"\nnext' }] });
    const csv = findingsToCsv([f, fakeFinding({ id: 'f2', display: '@cmd', kind: 'bill' })], { f1: 'confirmed' });
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.split('\r\n').length).toBeGreaterThanOrEqual(4);
    const rows = readCsv(csv);
    expect(rows.length).toBe(3);
    expect(rows[1]!.cells[0]).toBe(`'${evil}`);
    expect(rows[1]!.cells[1]).toBe('confirmed');
    expect(rows[1]!.cells[15]).toBe(`'+SUM(A1:A9), "quoted"\nnext`);
    expect(rows[2]!.cells[0]).toBe("'@cmd");
    expect(rows[2]!.cells[1]).toBe('not reviewed');
    expect(rows[1]!.cells[5]).toBe('185.88');
    expect(rows[1]!.cells[6]).toBe('$15.49 x 12 = $185.88');
    for (const r of rows) for (const c of r.cells) expect(/^[=+\-@\t\r]/.test(c)).toBe(false);
  });
});

function unfold(ics: string): string[] {
  return ics.replace(/\r\n[ \t]/g, '').split('\r\n').filter((l) => l !== '');
}

describe('buildIcs', () => {
  const long = 'A very long merchant name that keeps going and going — with ünïcödé — to force folding of the summary line';
  const fs = [
    fakeFinding({ id: 'aaaa1111', display: long }),
    fakeFinding({ id: 'bbbb2222', display: 'Spotify', cadence: 'yearly', nextExpected: '2027-01-15' }),
    fakeFinding({ id: 'cccc3333', display: 'Gone', activity: 'ended' }),
    fakeFinding({ id: 'dddd4444', display: 'Odd', cadence: 'semimonthly', nextExpected: '2026-10-16' }),
  ];
  const opts = { daysBefore: 3, includeAmounts: true, productUrl: 'https://lintroller.vercel.app', now: '2026-10-04T21:30:00-04:00' };
  it('CRLF, 75-octet folding, one VEVENT per active finding, RRULE, VALARM', () => {
    const ics = buildIcs(fs, opts);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(/(?<!\r)\n/.test(ics)).toBe(false);
    for (const raw of ics.split('\r\n')) expect(new TextEncoder().encode(raw).length).toBeLessThanOrEqual(75);
    const lines = unfold(ics);
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.filter((l) => l === 'BEGIN:VEVENT').length).toBe(3);
    expect(lines).toContain('UID:aaaa1111@lintroller.vercel.app');
    expect(lines).toContain('DTSTAMP:20261005T013000Z');
    expect(lines).toContain('DTSTART;VALUE=DATE:20260929');
    expect(lines).toContain('RRULE:FREQ=MONTHLY');
    expect(lines).toContain('RRULE:FREQ=YEARLY');
    expect(lines.filter((l) => l.startsWith('RRULE:')).length).toBe(2);
    expect(lines.filter((l) => l === 'BEGIN:VALARM').length).toBe(3);
    expect(lines.find((l) => l.startsWith('SUMMARY:') && l.includes('ünïcödé'))).toContain('$15.49');
  });
  it('no amounts when includeAmounts is off', () => {
    const ics = buildIcs(fs, { ...opts, includeAmounts: false });
    const lines = unfold(ics);
    expect(lines.some((l) => /\$\d/.test(l))).toBe(false);
    expect(lines).toContain('SUMMARY:Spotify');
  });
});

describe('lintCopy', () => {
  it('whole words and phrases, case-insensitive', () => {
    expect(lintCopy('Every charge, overnight!').map((h) => h.term)).toEqual(['every', 'overnight']);
    expect(lintCopy('everything Evergreen everyone')).toEqual([]);
    expect(lintCopy('You could SAVE $12 a month')).toEqual([{ term: 'save $', index: 10 }, { term: 'you could save', index: 0 }].sort((a, b) => a.index - b.index));
    expect(lintCopy('AI-powered and AI powered, a 10x tool')).toHaveLength(3);
    expect(lintCopy('Guaranteed. We guarantee it.').map((h) => h.term)).toEqual(['guaranteed', 'guarantee']);
    expect(lintCopy("you’ll save")[0]?.term).toBe("you'll save");
    expect(lintCopy('Looks like a repeating charge, about $185.88 a year if it keeps going. You decide.')).toEqual([]);
  });
  it('NEVER_SAY has the SPEC §4 list', () => {
    for (const t of ['every', 'in minutes', 'no humans', 'fully autonomous', 'magic', 'link in bio', 'we found all', 'all your subscriptions', 'cancel for you', 'subscription found', 'insane', 'revolutionary']) {
      expect(NEVER_SAY).toContain(t);
    }
  });
});

describe('purity: no I/O, clock or randomness in engine/src', () => {
  const dir = join(__dirname, '../src');
  const BANNED: [string, RegExp][] = [
    ['fetch', /\bfetch\s*\(/], ['XMLHttpRequest', /XMLHttpRequest/], ['localStorage', /localStorage/], ['sessionStorage', /sessionStorage/],
    ['document.', /\bdocument\./], ['window.', /\bwindow\./], ['Date.now', /Date\.now/], ['new Date()', /new Date\(\s*\)/],
    ['Math.random', /Math\.random/], ['console.', /\bconsole\./], ['import node:', /from ['"]node:/], ['eval', /\beval\(|new Function\(/],
  ];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    it(file, () => {
      const src = readFileSync(join(dir, file), 'utf8');
      for (const [name, re] of BANNED) expect(re.test(src), `${file} uses ${name}`).toBe(false);
    });
  }
});
