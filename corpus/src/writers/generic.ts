// generic: no format signature matches, so the user maps the columns. Two shapes with odd names:
// (A) ISO dates, split Debit/Credit columns, a running balance; (B) MM/DD/YYYY, one signed "Amt" column.
import { usDate } from '../dates';
import { LineBuffer, dollars, fileOrder, runningBalances, signed, textField, withCommas, type Writer } from './common';

export const writeGeneric: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  const bal = runningBalances(txns, opts.startBalanceCents);
  const lines: number[] = new Array(txns.length);
  const split = opts.rng.chance(0.5);
  if (split) {
    buf.push('TransactionDate,Payee,Category,Debit,Credit,RunningBalance');
    for (const i of fileOrder(txns.length, opts.newestFirst)) {
      const t = txns[i]!;
      const debit = t.cents < 0 ? withCommas(dollars(t.cents)) : '';
      const credit = t.cents > 0 ? withCommas(dollars(t.cents)) : '';
      lines[i] = buf.push(
        `${t.date},${textField(t.descriptor, opts.rng)},${t.category},${textField(debit, opts.rng)},${textField(credit, opts.rng)},${signed(bal[i]!)}`,
      );
    }
  } else {
    buf.push('Posting Dt,Narrative,Amt,Bal');
    for (const i of fileOrder(txns.length, opts.newestFirst)) {
      const t = txns[i]!;
      lines[i] = buf.push(`${usDate(t.date)},${textField(t.descriptor, opts.rng)},${signed(t.cents)},${signed(bal[i]!)}`);
    }
  }
  return { text: buf.render(opts.crlf), lines };
};
