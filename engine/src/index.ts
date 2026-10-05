// @subsweep/engine: pure functions, no I/O (CONTRACT §3). The app's worker calls these.
export * from './types';
export * from './schema';
export { DEFAULT_PARAMS } from './params';
export { sniffFormat, suggestMapping } from './sniff';
export { parseRows, mergeRows, checkSign, flipSigns, FUTURE_GRACE_DAYS, EARLIEST_DATE, type ParseOptions } from './parse';
export { buildAliasIndex, cleanDescriptor, normalizeMerchant, classifyRow } from './normalize';
export { detectRecurring } from './detect';
export { yearlyCost, totals } from './money';
export { lookupCancel } from './cancel';
export { findingsToCsv, buildIcs, rollForward } from './export';
export { lintCopy, NEVER_SAY } from './copy-lint';
// Extras (not in CONTRACT §3; additive): format labels, SPEC §4 cadence words, periods per year, the CSV reader.
export { FORMATS } from './sniff';
export { CADENCE_WORDS } from './export';
export { PERIODS_PER_YEAR } from './money';
export { readCsv } from './csv';
export { etDate } from './values';
