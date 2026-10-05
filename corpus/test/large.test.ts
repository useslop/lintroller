import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/generate';
import { runEngine } from '../src/run';

describe('performance cases (generated in memory, never committed)', () => {
  it('a 50,000-row file parses and detects in under 2 s', () => {
    const { csv, labels } = generateCase({ seed: 9100, format: 'boa-checking', months: 18, series: 14, targetRows: 50_000 });
    expect(csv.split('\n').length).toBeGreaterThanOrEqual(50_000);
    expect(labels.recurring.length).toBeGreaterThanOrEqual(3);
    const out = runEngine(csv);
    expect(out.rowCount).toBeGreaterThanOrEqual(50_000);
    expect(out.parseMs + out.detectMs).toBeLessThan(2000);
  }, 120_000);
});
