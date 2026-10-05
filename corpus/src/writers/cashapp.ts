// cashapp: a LOW-CONFIDENCE GUESS (RESEARCH §1 row 16). Columns are guessed, dates are ISO, Notes holds the
// merchant text. The engine sniffs it as generic with a preset mapping; the guess is shown to the user.
import { LineBuffer, fileOrder, randomHex, signed, textField, type Writer } from './common';

export const writeCashApp: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Transaction ID,Date,Transaction Type,Currency,Amount,Fee,Net Amount,Status,Notes');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const type = t.cents < 0 ? 'Payment' : 'Deposit';
    lines[i] = buf.push(
      `C${randomHex(opts.rng, 6)},${t.date},${type},USD,${signed(t.cents)},0.00,${signed(t.cents)},Completed,${textField(t.descriptor, opts.rng)}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
