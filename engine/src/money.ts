import type { Finding, StatusMap, Totals, YearlyCost } from './types';

export function yearlyCost(_f: Finding): YearlyCost {
  throw new Error('not yet');
}

export function totals(_findings: Finding[], _statuses: StatusMap, _today: string): Totals {
  throw new Error('not yet');
}
