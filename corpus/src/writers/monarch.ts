// monarch: ISO dates (YYYY-MM-DD), the one format that differs from MM/DD/YYYY. Single signed Amount,
// negative = money out. Merchant is the cleaned name; Original Statement is the raw bank descriptor.
import { LineBuffer, fileOrder, signed, textField, type Writer } from './common';

export const writeMonarch: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Date,Merchant,Category,Account,Original Statement,Amount,Notes,Tags');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    lines[i] = buf.push(
      `${t.date},${textField(t.merchant, opts.rng)},${t.category},${opts.account},${textField(t.descriptor, opts.rng)},${signed(t.cents)},,`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
