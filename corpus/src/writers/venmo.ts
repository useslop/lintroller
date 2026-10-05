// venmo: two title rows, then the header on row 3 (RESEARCH §1 row 15: "title rows" reported by third parties).
// Amounts are text: "- $25.00" for money out, "+ $50.00" for money in (RESEARCH §1, unverified detail).
import { randomDigits, fileOrder, LineBuffer, dollars, textField, withCommas, type Writer } from './common';

export const writeVenmo: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Account Statement - (@sample-user),,,,,,,,,,');
  buf.push('Account Activity,,,,,,,,,,');
  buf.push('ID,Datetime,Type,Status,Note,From,To,Amount (total),Amount (fee),Funding Source,Destination');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const out = t.cents < 0;
    const hh = String(opts.rng.int(7, 22)).padStart(2, '0');
    const mm = String(opts.rng.int(0, 59)).padStart(2, '0');
    const amount = `${out ? '- ' : '+ '}$${withCommas(dollars(t.cents))}`;
    const payee = textField(t.descriptor, opts.rng);
    const from = out ? 'Sample User' : payee;
    const to = out ? payee : 'Sample User';
    const note = t.kind === 'p2p' ? 'Rent split' : 'Subscription';
    lines[i] = buf.push(
      `3${randomDigits(opts.rng, 8)},${t.date}T${hh}:${mm}:00,Payment,Complete,${note},${from},${to},${textField(amount, opts.rng)},$0.00,Venmo balance,${out ? payee : ''}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
