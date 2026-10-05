// Runs the engine the way the app's worker does (SPEC §5.1): sniff, column mapping for generic files,
// parse, sign self-check, merge, detect. Pure: the engine does no I/O, so the caller passes text.
import {
  buildAliasIndex, checkSign, detectRecurring, flipSigns, mergeRows, parseRows, readCsv, sniffFormat, suggestMapping,
  type AliasIndex, type ColumnMapping, type DetectResult, type ParseSpec, type SniffResult,
} from '@subsweep/engine';
import { aliases } from '@subsweep/data';

export const aliasIndex: AliasIndex = buildAliasIndex(aliases);

export interface RunOutcome {
  sniff: SniffResult;
  mapping: ColumnMapping | null;
  flipped: boolean;
  result: DetectResult;
  rowCount: number;
  parseMs: number;
  detectMs: number;
}

/** The app decodes UTF-8 (BOM stripped) and falls back to windows-1252 when over 1% of characters are U+FFFD. */
export function decodeCsv(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  let bad = 0;
  for (let i = 0; i < utf8.length; i++) if (utf8.charCodeAt(i) === 0xfffd) bad++;
  return bad / Math.max(1, utf8.length) > 0.01 ? new TextDecoder('windows-1252').decode(bytes) : utf8;
}

export function runEngine(text: string): RunOutcome {
  const sniff = sniffFormat(text);
  let mapping = sniff.mapping;
  let signConvention = sniff.signConvention;
  if (!mapping) {
    // Generic file: the app shows the suggested mapping and the user confirms it. Here the suggestion stands in.
    const sample = readCsv(text, sniff.delimiter, 60).slice(Math.max(0, sniff.headerLine) + 1).map((r) => r.cells);
    mapping = suggestMapping(sniff.columns, sample);
    if (mapping) signConvention = mapping.debit !== undefined && mapping.credit !== undefined ? 'split-columns' : 'debit-negative';
  }
  const t0 = performance.now();
  const spec: ParseSpec = {
    format: sniff.format,
    delimiter: sniff.delimiter,
    headerLine: sniff.headerLine,
    mapping,
    signConvention,
    dateOrder: sniff.dateOrder,
    accountKind: sniff.accountKind,
  };
  const parsed = mapping ? parseRows(text, spec, 0) : { rows: [], skipped: [], dateRange: null, stats: { lines: 0, parsed: 0, skipped: 0, outflows: 0, inflows: 0 } };
  const check = checkSign(parsed.rows, aliasIndex);
  const rows = mergeRows([{ ...parsed, rows: check.flip ? flipSigns(parsed.rows) : parsed.rows }]);
  const t1 = performance.now();
  const result = detectRecurring(rows, { aliasIndex, accountKinds: [sniff.accountKind] });
  const t2 = performance.now();
  return { sniff, mapping, flipped: check.flip, result, rowCount: rows.length, parseMs: t1 - t0, detectMs: t2 - t1 };
}
