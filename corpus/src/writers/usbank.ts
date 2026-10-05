// usbank: Date, Transaction, Name, Memo, Amount. Debit negative (RESEARCH §1 row 12, best-known header).
import { usDate } from '../dates';
import { LineBuffer, fileOrder, signed, textField, type Writer } from './common';

export const writeUsBank: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Date,Transaction,Name,Memo,Amount');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const type = t.cents < 0 ? 'DEBIT' : 'CREDIT';
    const memo = t.kind === 'subscription' || t.kind === 'bill' ? 'RECURRING' : '';
    lines[i] = buf.push(`${usDate(t.date)},${type},${textField(t.descriptor, opts.rng)},${memo},${signed(t.cents)}`);
  }
  return { text: buf.render(opts.crlf), lines };
};
