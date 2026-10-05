// amex: purchases POSITIVE, payments and credits negative. Column set from RESEARCH §7 (best-known, unverified).
import { usDate } from '../dates';
import { LineBuffer, fileOrder, signed, textField, type Writer } from './common';

export const writeAmex: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Date,Description,Card Member,Account #,Amount,Extended Details,Appears On Your Statement As,City/State,Category');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const shown = textField(t.descriptor, opts.rng);
    lines[i] = buf.push(
      `${usDate(t.date)},${textField(t.merchant, opts.rng)},J SAMPLE,-21002,${signed(-t.cents)},,${shown},SAN JOSE CA,${t.category}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
