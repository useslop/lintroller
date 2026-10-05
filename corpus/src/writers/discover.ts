// discover: Trans. Date, Post Date, Description, Amount, Category. Purchases POSITIVE (RESEARCH §1 row 11, forum-corroborated).
import { addDays, usDate } from '../dates';
import { LineBuffer, fileOrder, signed, textField, type Writer } from './common';

export const writeDiscover: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Trans. Date,Post Date,Description,Amount,Category');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    lines[i] = buf.push(
      `${usDate(t.date)},${usDate(addDays(t.date, 1))},${textField(t.descriptor, opts.rng)},${signed(-t.cents)},${t.category}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
