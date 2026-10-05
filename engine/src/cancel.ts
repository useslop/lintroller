import type { CancelEntry, CancelLink, Finding } from './types';

export function lookupCancel(_m: Pick<Finding, 'aliasId' | 'billedThrough'>, _dir: CancelEntry[], _today: string): CancelLink[] {
  throw new Error('not yet');
}
