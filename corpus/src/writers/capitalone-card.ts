// capitalone-card: Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit.
// Debit/Credit split is open-source confirmed (csv2ofx); purchases go under Debit, unsigned (RESEARCH §1 row 8).
import { addDays, usDate } from '../dates';
import { LineBuffer, dollars, fileOrder, textField, withCommas, type Writer } from './common';

export const writeCapitalOneCard: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit');
  const card = String(opts.rng.int(1000, 9999));
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const debit = t.cents < 0 ? withCommas(dollars(t.cents)) : '';
    const credit = t.cents > 0 ? withCommas(dollars(t.cents)) : '';
    lines[i] = buf.push(
      `${usDate(t.date)},${usDate(addDays(t.date, 1))},${card},${textField(t.descriptor, opts.rng)},${t.category},${debit},${credit}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
