// chase-card: purchases POSITIVE, payments and returns negative (RESEARCH §1 row 4: "purchases often positive").
import { usDate, addDays } from '../dates';
import { LineBuffer, fileOrder, signed, textField, type Writer } from './common';

export const writeChaseCard: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Transaction Date,Post Date,Description,Category,Type,Amount,Memo');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const type = t.kind === 'payment' ? 'Payment' : t.kind === 'refund' ? 'Return' : 'Sale';
    const post = addDays(t.date, opts.rng.chance(0.7) ? 1 : 2);
    lines[i] = buf.push(
      `${usDate(t.date)},${usDate(post)},${textField(t.descriptor, opts.rng)},${t.category},${type},${signed(-t.cents)},`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
