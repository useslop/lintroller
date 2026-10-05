import type { ColumnMapping, SniffResult } from './types';

export function sniffFormat(_text: string): SniffResult {
  throw new Error('not yet');
}

export function suggestMapping(_columns: string[], _sample: string[][]): ColumnMapping | null {
  throw new Error('not yet');
}
