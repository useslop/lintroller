import type { AliasEntry, AliasIndex, MerchantMatch, ProcessorId, RowClass, SniffResult, Txn } from './types';

export function buildAliasIndex(_entries: AliasEntry[]): AliasIndex {
  throw new Error('not yet');
}

export function cleanDescriptor(_desc: string): { cleaned: string; processor: ProcessorId | null } {
  throw new Error('not yet');
}

export function normalizeMerchant(_desc: string, _index: AliasIndex, _merchantField?: string): MerchantMatch {
  throw new Error('not yet');
}

export function classifyRow(_t: Txn, _m: MerchantMatch, _accountKind: SniffResult['accountKind']): RowClass {
  throw new Error('not yet');
}
