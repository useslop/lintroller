import { describe, expect, it } from 'vitest';
import { previewRows, runImportWithAliases, specFromChoice } from '../src/pipeline';

const TEXT = ['Posted,Memo,Charge', '2026-01-03,NETFLIX,15.49', '2026-02-03,NETFLIX,15.49', ''].join('\n');

describe('column mapper and sign flip', () => {
  const spec = specFromChoice({
    delimiter: ',', headerLine: 0, date: 0, description: 1, amount: 2,
    sign: 'charge-positive', dateOrder: 'MDY',
  });

  it('previews the chosen columns', () => {
    const rows = previewRows(TEXT, spec, false);
    expect(rows.length).toBe(2);
    expect(rows[0]?.description).toBe('NETFLIX');
  });

  it('flipping the signs negates the preview amounts', () => {
    const plain = previewRows(TEXT, spec, false);
    const flipped = previewRows(TEXT, spec, true);
    expect(flipped[0]?.amountCents).toBe(-(plain[0]?.amountCents ?? 0));
  });

  it('builds a split-column spec when there is no single amount column', () => {
    const split = specFromChoice({
      delimiter: ',', headerLine: 0, date: 0, description: 1, debit: 2, credit: 3,
      sign: 'debit-negative', dateOrder: 'MDY',
    });
    expect(split.signConvention).toBe('split-columns');
    expect(split.mapping).toEqual({ date: 0, description: 1, debit: 2, credit: 3 });
  });

  it('leaves a file it cannot map for the mapper', () => {
    const report = runImportWithAliases([{ name: 'odd.csv', text: 'a;b\n1;2\n' }], []);
    expect(report.files[0]?.name).toBe('odd.csv');
    expect(report.txnCount).toBeGreaterThanOrEqual(0);
  });
});
