import type { AliasIndex, ParseResult, ParseSpec, Txn } from './types';

export function parseRows(_text: string, _spec: ParseSpec, _source = 0): ParseResult {
  throw new Error('not yet');
}

export function mergeRows(_results: ParseResult[]): Txn[] {
  throw new Error('not yet');
}

export function checkSign(_rows: Txn[], _index: AliasIndex): {
  flip: boolean; votes: { aliasIn: number; aliasOut: number; paymentsIn: number; paymentsOut: number };
} {
  throw new Error('not yet');
}

export function flipSigns(_rows: Txn[]): Txn[] {
  throw new Error('not yet');
}
