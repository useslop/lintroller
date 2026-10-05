// chase-checking: Details (DEBIT/CREDIT), Posting Date, Description, Amount, Type, Balance, Check or Slip #.
import { usDate } from '../dates';
import { LineBuffer, fileOrder, runningBalances, signed, textField, type Writer } from './common';

function chaseType(kind: string, cents: number): string {
  if (kind === 'purchase') return 'DEBIT_CARD';
  if (kind === 'atm') return 'ATM';
  if (kind === 'payroll') return 'ACH_CREDIT';
  if (kind === 'refund') return 'ACH_CREDIT';
  return cents < 0 ? 'ACH_DEBIT' : 'ACH_CREDIT';
}

export const writeChaseChecking: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #');
  const bal = runningBalances(txns, opts.startBalanceCents);
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const details = t.cents < 0 ? 'DEBIT' : 'CREDIT';
    lines[i] = buf.push(
      `${details},${usDate(t.date)},${textField(t.descriptor, opts.rng)},${signed(t.cents)},${chaseType(t.kind, t.cents)},${signed(bal[i]!)},`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
