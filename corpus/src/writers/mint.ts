// mint (defunct, pre-2024 exports only): Amount is always a positive magnitude; the direction lives in
// Transaction Type (debit/credit). Column set is open-source confirmed (csv2ofx mint.py).
import { usDate } from '../dates';
import { LineBuffer, dollars, fileOrder, textField, withCommas, type Writer } from './common';

export const writeMint: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Date,Description,Original Description,Amount,Transaction Type,Category,Account Name,Labels,Notes');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const amount = textField(withCommas(dollars(t.cents)), opts.rng);
    lines[i] = buf.push(
      `${usDate(t.date)},${textField(t.merchant, opts.rng)},${textField(t.descriptor, opts.rng)},${amount},${t.cents < 0 ? 'debit' : 'credit'},${t.category},${opts.account},,`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
