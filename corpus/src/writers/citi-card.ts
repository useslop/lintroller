// citi-card: Status, Date, Description, Debit, Credit. Purchases are positive under Debit; payments and
// refunds are positive under Credit (RESEARCH §1 row 7). An optional Member Name column is appended on some files.
import { usDate } from '../dates';
import { LineBuffer, dollars, fileOrder, textField, withCommas, type Writer } from './common';

export const writeCitiCard: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  const withMember = opts.rng.chance(0.5);
  buf.push(`Status,Date,Description,Debit,Credit${withMember ? ',Member Name' : ''}`);
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const debit = t.cents < 0 ? dollars(t.cents) : '';
    const credit = t.cents > 0 ? dollars(t.cents) : '';
    const member = withMember ? `,${opts.account.toUpperCase()}` : '';
    lines[i] = buf.push(`Cleared,${usDate(t.date)},${textField(t.descriptor, opts.rng)},${withCommas(debit)},${withCommas(credit)}${member}`);
  }
  return { text: buf.render(opts.crlf), lines };
};
