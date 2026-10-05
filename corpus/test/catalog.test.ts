import { describe, expect, it } from 'vitest';
import { buildAliasIndex, normalizeMerchant } from '@subsweep/engine';
import { aliases } from '@subsweep/data';
import { PERSON, SUBSCRIPTIONS } from '../src/catalog';

// Every catalog core must resolve, through the real normaliser and alias table, to the alias the label
// claims. Otherwise the labels would name an alias the engine never assigns to that line.
describe('catalog cores resolve to their labelled alias', () => {
  const index = buildAliasIndex(aliases);
  const cases = SUBSCRIPTIONS.flatMap((s) => s.cores.map((core) => [s.aliasId, core] as const));

  it.each(cases)('%s <- %s', (aliasId, core) => {
    expect(normalizeMerchant(core, index).aliasId).toBe(aliasId);
  });

  it('the person core is not an alias (Venmo and Cash App rent stay person rows)', () => {
    expect(normalizeMerchant(PERSON.cores[0]!, index).aliasId).toBeNull();
  });
});
