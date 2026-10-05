// paypal: the OFFICIAL column names and MM/DD/YYYY dates (RESEARCH §1 row 14). Sign direction is UNVERIFIED:
// money out is negative, as in the RESEARCH §7 sample. Name carries the merchant text.
import { usDate } from '../dates';
import { LineBuffer, fileOrder, signed, textField, type Writer } from './common';

export const writePayPal: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Date,Time,TimeZone,Name,Type,Status,Currency,Gross,Fee,Net');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const time = `${String(opts.rng.int(6, 22)).padStart(2, '0')}:${String(opts.rng.int(0, 59)).padStart(2, '0')}:${String(opts.rng.int(0, 59)).padStart(2, '0')}`;
    const type = t.kind === 'subscription' || t.kind === 'bill' ? 'Subscription Payment' : 'Express Checkout Payment';
    const gross = signed(t.cents);
    lines[i] = buf.push(
      `${usDate(t.date)},${time},PDT,${textField(t.descriptor, opts.rng)},${type},Completed,USD,${gross},0.00,${gross}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
