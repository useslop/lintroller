// apple-card: Transaction Date, Clearing Date, Description, Merchant, Category, Type, Amount (USD), Purchased By.
// Purchases POSITIVE, payments and refunds negative. Merchant is a clean name (RESEARCH §1 row 13, best-known).
import { addDays, usDate } from '../dates';
import { LineBuffer, fileOrder, signed, textField, type Writer } from './common';

export const writeAppleCard: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD),Purchased By');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const type = t.kind === 'payment' ? 'Payment' : t.kind === 'refund' ? 'Refund' : 'Purchase';
    lines[i] = buf.push(
      `${usDate(t.date)},${usDate(addDays(t.date, 1))},${textField(t.descriptor, opts.rng)},${textField(t.merchant, opts.rng)},${t.category},${type},${signed(-t.cents)},Sample User`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
