// boa-card: Posted Date, Reference Number, Payee, Address, Amount. Purchases negative (RESEARCH §1 row 2, §7).
import { usDate } from '../dates';
import { LineBuffer, fileOrder, randomDigits, signed, textField, type Writer } from './common';

const CITIES = ['CUPERTINO CA', 'LOS GATOS CA', 'SAN JOSE CA', 'AUSTIN TX', 'DENVER CO', 'NEW YORK NY'];

export const writeBoaCard: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  buf.push('Posted Date,Reference Number,Payee,Address,Amount');
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    const ref = `${randomDigits(opts.rng, 8)}${t.merchant.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase()}`;
    lines[i] = buf.push(
      `${usDate(t.date)},${ref},${textField(t.descriptor, opts.rng)},${opts.rng.pick(CITIES)},${signed(t.cents)}`,
    );
  }
  return { text: buf.render(opts.crlf), lines };
};
