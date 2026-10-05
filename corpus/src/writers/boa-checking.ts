// boa-checking: BoA summary block above the header, debit negative, running balance (RESEARCH §1 row 1, §7).
import { usDate } from '../dates';
import { LineBuffer, dollars, fileOrder, runningBalances, signed, textField, withCommas, type Writer } from './common';

export const writeBoaChecking: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  const bal = runningBalances(txns, opts.startBalanceCents);
  const credits = txns.filter((t) => t.cents > 0).reduce((s, t) => s + t.cents, 0);
  const debits = txns.filter((t) => t.cents < 0).reduce((s, t) => s + t.cents, 0);
  const end = bal[bal.length - 1] ?? opts.startBalanceCents;
  buf.push('Description,,,');
  buf.push(`Beginning balance as of ${usDate(txns[0]!.date)},"${withCommas(dollars(opts.startBalanceCents))}",,`);
  buf.push(`Total credits,"${withCommas(dollars(credits))}",,`);
  buf.push(`Total debits,"-${withCommas(dollars(debits))}",,`);
  buf.push(`Ending balance as of ${usDate(txns[txns.length - 1]!.date)},"${withCommas(dollars(end))}",,`);
  buf.push('');
  buf.push('Date,Description,Amount,Running Bal.');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    lines[i] = buf.push(`${usDate(t.date)},${textField(t.descriptor, opts.rng)},${signed(t.cents)},${signed(bal[i]!)}`);
  }
  return { text: buf.render(opts.crlf), lines };
};
