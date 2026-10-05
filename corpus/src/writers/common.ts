// Shared writer plumbing. A writer takes CHRONOLOGICAL canonical transactions and prints one file in
// its bank's exact shape (RESEARCH §1). It returns the 1-based physical line of each input
// transaction, so labels can point at real lines.
import type { Rng } from '../rng';

export type TxnKind = 'purchase' | 'subscription' | 'bill' | 'payment' | 'transfer' | 'payroll' | 'refund' | 'atm' | 'p2p' | 'one-off';

export interface WriteTxn {
  date: string;        // ISO transaction date
  descriptor: string;  // raw descriptor as the bank prints it
  merchant: string;    // clean merchant name (for formats with a merchant column)
  cents: number;       // canonical signed amount: money out < 0, money in > 0
  kind: TxnKind;
  category: string;
}

export interface WriteOptions {
  rng: Rng;
  crlf: boolean;
  newestFirst: boolean;
  account: string;
  startBalanceCents: number;
}

export interface WriteResult {
  text: string;
  /** lines[i] = 1-based physical line of input transaction i. */
  lines: number[];
}

export type Writer = (txns: WriteTxn[], opts: WriteOptions) => WriteResult;

/** Collects physical lines. push() returns the 1-based number of the line just added. */
export class LineBuffer {
  private readonly rows: string[] = [];

  push(line: string): number {
    this.rows.push(line);
    return this.rows.length;
  }

  render(crlf: boolean): string {
    const eol = crlf ? '\r\n' : '\n';
    return this.rows.join(eol) + eol;
  }
}

/** Input indexes in file order (newest first when asked). */
export function fileOrder(n: number, newestFirst: boolean): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  return newestFirst ? idx.reverse() : idx;
}

/** Running balance after each chronological transaction. */
export function runningBalances(txns: readonly WriteTxn[], start: number): number[] {
  let bal = start;
  return txns.map((t) => (bal += t.cents));
}

/** RFC 4180 text field: quoted when it must be (comma, quote, newline, edge spaces), sometimes at random. */
export function textField(v: string, rng: Rng): string {
  const must = /[",\r\n]/.test(v) || /^\s|\s$/.test(v);
  return must || rng.chance(0.2) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Unsigned decimal string for cents: 1549 -> "15.49", 145000 -> "1450.00". */
export function dollars(cents: number): string {
  const abs = Math.abs(cents);
  return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Signed decimal string: -1549 -> "-15.49", 1549 -> "15.49". */
export function signed(cents: number): string {
  return `${cents < 0 ? '-' : ''}${dollars(cents)}`;
}

/** 1450.00 -> 1,450.00 (the caller quotes the field). */
export function withCommas(s: string): string {
  const [int, frac] = s.split('.');
  return `${int!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${frac !== undefined ? `.${frac}` : ''}`;
}

export function randomDigits(rng: Rng, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += String(rng.int(0, 9));
  return s;
}

export function randomHex(rng: Rng, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += rng.int(0, 15).toString(16);
  return s.toUpperCase();
}
