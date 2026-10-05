import { describe, expect, it } from 'vitest';
import { detectRecurring, mergeRows, parseRows, sniffFormat } from '../src/index';
import { INDEX } from './helpers';

/** Deterministic synthetic BoA-style file: 20 monthly subscriptions over 2 years + noise up to `total` rows. */
function bigFile(total: number): string {
  let seed = 42;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const lines: string[] = ['Date,Description,Amount,Running Bal.'];
  const fmt = (y: number, m: number, d: number) => `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
  for (let s = 0; s < 20; s++) {
    for (let k = 0; k < 24; k++) {
      const mi = k; const y = 2024 + Math.floor(mi / 12); const m = (mi % 12) + 1;
      lines.push(`${fmt(y, m, 1 + (s % 28))},"ZQ${String.fromCharCode(65 + s)} STREAMING WEB",-${(5 + s).toFixed(2)},1000.00`);
    }
  }
  const shops = Array.from({ length: 300 }, (_, i) => `SHOP NUMBER ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i / 26) | 0))} #${100 + i} AUSTIN TX`);
  while (lines.length < total + 1) {
    const day = Math.floor(rnd() * 730);
    const dt = new Date(Date.UTC(2024, 0, 1 + day));
    const desc = rnd() < 0.1 ? `AMZN Mktp US*${Math.floor(rnd() * 1e9).toString(36).toUpperCase()}` : shops[Math.floor(rnd() * shops.length)]!;
    lines.push(`${fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())},"${desc}",-${(1 + rnd() * 200).toFixed(2)},1000.00`);
  }
  return lines.join('\r\n') + '\r\n';
}

describe('performance', () => {
  it('50,000 rows parse + detect in < 2 s', () => {
    const text = bigFile(50_000);
    const t0 = performance.now();
    const s = sniffFormat(text);
    const parsed = parseRows(text, s);
    const rows = mergeRows([parsed]);
    const r = detectRecurring(rows, { aliasIndex: INDEX, accountKinds: [s.accountKind] });
    const ms = performance.now() - t0;
    expect(parsed.rows.length).toBe(50_000);
    expect(r.findings.filter((f) => f.merchantKey.startsWith('raw:zq')).length).toBe(20);
    expect(ms).toBeLessThan(2000);
  });
});
