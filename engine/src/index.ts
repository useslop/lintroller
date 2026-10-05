// @subsweep/engine: pure functions, no I/O (CONTRACT §3). The app's worker calls these.
export * from './types';
export * from './schema';
export { DEFAULT_PARAMS } from './params';
export { sniffFormat, suggestMapping } from './sniff';
export { parseRows, mergeRows, checkSign, flipSigns } from './parse';
export { buildAliasIndex, cleanDescriptor, normalizeMerchant, classifyRow } from './normalize';
export { detectRecurring } from './detect';
export { yearlyCost, totals } from './money';
export { lookupCancel } from './cancel';
export { findingsToCsv, buildIcs } from './export';
export { lintCopy, NEVER_SAY } from './copy-lint';
