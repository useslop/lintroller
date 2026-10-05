// wells-fargo: NO header row. Five fields: date, amount, "*" (posted), empty, quoted description (RESEARCH §1 row 5, §7).
import { usDate } from '../dates';
import { LineBuffer, fileOrder, signed, type Writer } from './common';

export const writeWellsFargo: Writer = (txns, opts) => {
  const buf = new LineBuffer();
  const lines: number[] = new Array(txns.length);
  for (const i of fileOrder(txns.length, opts.newestFirst)) {
    const t = txns[i]!;
    lines[i] = buf.push(`${usDate(t.date)},${signed(t.cents)},*,,"${t.descriptor.replace(/"/g, '""')}"`);
  }
  return { text: buf.render(opts.crlf), lines };
};
