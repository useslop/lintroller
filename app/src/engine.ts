// The one place the UI imports the engine from.
// Real from @subsweep/engine now: types, constants, sniff, parse, sign check, alias index (B1 commits d9c6a8a onward).
// Still dev-fixtures/engine.ts until B1 implements them: detectRecurring, yearlyCost, totals, lookupCancel, exports, lintCopy.
// Switch every name to '@subsweep/engine' and delete dev-fixtures/engine.ts when the stubs are gone.
export type * from '@subsweep/engine';
export {
  FORMAT_IDS, CATEGORIES, CADENCES, DEFAULT_PARAMS,
  sniffFormat, suggestMapping, parseRows, mergeRows, checkSign, flipSigns, buildAliasIndex,
} from '@subsweep/engine';
export { NEVER_SAY, detectRecurring, yearlyCost, totals, lookupCancel, findingsToCsv, buildIcs, lintCopy } from './dev-fixtures/engine';
