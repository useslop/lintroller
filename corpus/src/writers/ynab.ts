// ynab: Outflow and Inflow columns, never a signed Amount. The unused side is the literal "$0.00", not blank
// (RESEARCH §1 row "ynab", export mechanism official, columns unverified).
import { usDate } from '../dates';
import { LineBuffer, dollars, fileOrder, textField, withCommas, type Writer } from './common';

export const writeYnab: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Date,Payee,Category,Memo,Outflow,Inflow');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const money = `$${withCommas(dollars(t.cents))}`;
    const outflow = t.cents < 0 ? money : '$0.00';
    const inflow = t.cents > 0 ? money : '$0.00';
    lines[i] = buf.push(
      `${usDate(t.date)},${textField(t.descriptor, opts.rng)},${t.category},,${textField(outflow, opts.rng)},${textField(inflow, opts.rng)}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
