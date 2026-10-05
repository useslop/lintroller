// Alias patterns are tested against the CLEANED descriptor (engine cleanDescriptor), so a pattern
// written for raw text ('MAX\.COM', 'PAYPAL\s?\*') can never fire. These tests pin that every pattern
// matches at least one realistic example after cleaning, and that every example resolves to its own
// alias (array order catches a generic row swallowing a specific one, e.g. YOUTUBE vs YOUTUBE MUSIC).
import { describe, expect, it } from 'vitest';
import { buildAliasIndex, cleanDescriptor, normalizeMerchant } from '@subsweep/engine';
import { aliases } from '../index';
import { ALIAS_EXAMPLES } from './alias-examples';

// Aliases whose real descriptors the cleaner deletes, so no pattern can match the cleaned text.
// Kept out of the strict checks until the engine owner changes the cleaner (do not grow this list).
const CLEANER_GAPS: Record<string, string> = {
  // 'LIFE360' is a 5+ char letter+digit token (removed as a reference number) and 'LIFE 360'
  // loses '360' (3+ digit numbers are removed), so only 'life' or nothing is left.
  'life360': 'LIFE360 / LIFE 360 are stripped by the reference-number and 3+ digit rules',
};

const index = buildAliasIndex(aliases);

describe('alias examples (data/test/alias-examples.ts)', () => {
  it('every alias has at least one example and every example key is a real alias', () => {
    const ids = new Set(aliases.map((a) => a.id));
    expect(aliases.filter((a) => !(ALIAS_EXAMPLES[a.id]?.length)).map((a) => a.id)).toEqual([]);
    expect(Object.keys(ALIAS_EXAMPLES).filter((id) => !ids.has(id))).toEqual([]);
    expect(Object.keys(CLEANER_GAPS).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('every alias pattern matches at least one of its own examples after cleanDescriptor', () => {
    const dead: string[] = [];
    for (const a of aliases) {
      if (a.id in CLEANER_GAPS) continue;
      const cleaned = (ALIAS_EXAMPLES[a.id] ?? []).map((d) => cleanDescriptor(d).cleaned);
      for (const p of a.patterns) {
        const re = new RegExp(p, 'i');
        if (!cleaned.some((c) => re.test(c))) dead.push(`${a.id} /${p}/ vs ${JSON.stringify(cleaned)}`);
      }
    }
    expect(dead).toEqual([]);
  });

  it('every example normalises to its own alias id', () => {
    const wrong: string[] = [];
    for (const a of aliases) {
      if (a.id in CLEANER_GAPS) continue;
      for (const d of ALIAS_EXAMPLES[a.id] ?? []) {
        const m = normalizeMerchant(d, index);
        if (m.aliasId !== a.id) wrong.push(`${a.id}: ${JSON.stringify(d)} -> ${JSON.stringify(m.cleaned)} -> ${m.aliasId ?? m.key}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('CLEANER_GAPS aliases still cannot match (remove the entry once the cleaner keeps the token)', () => {
    for (const id of Object.keys(CLEANER_GAPS)) {
      for (const d of ALIAS_EXAMPLES[id] ?? []) expect(normalizeMerchant(d, index).aliasId, `${id}: ${d}`).not.toBe(id);
    }
  });
});
