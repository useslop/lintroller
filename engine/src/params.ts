import type { DetectParams } from './types';

/** SPEC §5.3 defaults. B4's evaluator may tune; changes are listed in the B1/B4 SUMMARY. */
export const DEFAULT_PARAMS: DetectParams = {
  minConfidence: 0.35,
  amountTolPct: 7.5,
  amountTolFloorCents: 25,
  billsAmountTolPct: 35,
  dayTolerance: { weekly: 2, biweekly: 2, semimonthly: 3, monthly: 3, bimonthly: 4, quarterly: 5, semiannual: 7, yearly: 7 },
  minOccurrences: { weekly: 4, biweekly: 3, semimonthly: 4, monthly: 3, bimonthly: 3, quarterly: 3, semiannual: 2, yearly: 2 },
  minOccurrencesKnownMerchant: { weekly: 3, biweekly: 3, semimonthly: 3, monthly: 2, bimonthly: 2, quarterly: 2, semiannual: 2, yearly: 2 },
  minSpanDays: { weekly: 21, biweekly: 28, semimonthly: 45, monthly: 60, bimonthly: 120, quarterly: 180, semiannual: 210, yearly: 395 },
  minFitShort: 1.0,
  minFitLong: 0.75,
  priceStepMinRepeats: 2,
  priceStepMaxRatio: 1.5,
  graceMinDays: 5,
  graceFraction: 0.25,
  trialMaxCents: 100,
  trialWindowDays: 31,
  irregularMin: 4,
  irregularMaxCv: 0.10,
  irregularMinSpanDays: 90,
  minAmountCents: 50,
  weights: { reg: 0.35, amt: 0.25, cnt: 0.20, prior: 0.20 },
  historyHintDays: 180,
};
