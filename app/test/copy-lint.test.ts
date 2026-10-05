// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { lintCopy } from '../src/engine';
import { sourceFiles } from './sources';

// String literals and JSX text on one line each: enough to catch product copy without reading code identifiers.
const LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const JSX_TEXT = />([^<>{}\n]+)</g;

function copyStrings(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(LITERAL)) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  for (const m of text.matchAll(JSX_TEXT)) out.push(m[1] ?? '');
  return out;
}

describe('copy lint (SPEC §4)', () => {
  it('finds no never-say terms in any string or JSX text under src/', () => {
    // dev-fixtures/ holds the temporary engine stand-in, which carries the list itself; it is deleted with the fake.
    const hits = sourceFiles()
      .filter((file) => !file.path.startsWith("dev-fixtures/"))
      .flatMap((file) =>
      copyStrings(file.text).flatMap((s) => lintCopy(s).map((h) => ({ file: file.path, term: h.term, text: s }))),
    );
    expect(hits).toEqual([]);
  });
});
