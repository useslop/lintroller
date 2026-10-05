// The one place the UI imports the engine from.
// Types: the real @subsweep/engine (type-only, erased at build). Values and behaviour: dev-fixtures/engine.ts until B1's
// implementations replace the "not yet" stubs. Then re-export everything from '@subsweep/engine' and delete dev-fixtures/engine.ts.
export type * from '@subsweep/engine';
export {
  FORMAT_IDS, CATEGORIES, CADENCES, NEVER_SAY, DEFAULT_PARAMS,
  sniffFormat, suggestMapping, parseRows, mergeRows, checkSign, flipSigns, buildAliasIndex, detectRecurring,
  yearlyCost, totals, lookupCancel, findingsToCsv, buildIcs, lintCopy,
} from './dev-fixtures/engine';
