// The import pipeline, pure: sniff → parse → sign check → merge → detect. Runs in the worker in the browser and directly in tests.
import {
  buildAliasIndex, checkSign, detectRecurring, flipSigns, mergeRows, parseRows, sniffFormat,
  type AliasEntry, type AliasIndex, type DateOrder, type DetectResult, type ParseResult, type ParseSpec,
  type SkipReason, type SniffResult, type Txn,
} from './engine';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_ROWS = 300_000;

export interface FileOverride { spec?: ParseSpec; flip?: boolean }
export interface InputFile { name: string; text: string; override?: FileOverride }

export interface FileReport {
  name: string;
  source: number;
  format: SniffResult['format'];
  confidence: SniffResult['confidence'];
  columns: string[];
  sniffSpec: ParseSpec;                  // what sniffFormat saw: prefills the column mapper
  spec: ParseSpec | null;                // what was parsed; null = needs the column mapper
  needsMapping: boolean;
  rowsRead: number;
  dateRange: ParseResult['dateRange'];
  skipped: Partial<Record<SkipReason, number>>;   // counts only, never row text
  flipSuggested: boolean;
  flipApplied: boolean;
}

export interface ImportReport {
  files: FileReport[];
  txnCount: number;
  detect: DetectResult;
}

export type WorkerRequest = { id: number; inputs: InputFile[]; aliases: AliasEntry[]; today?: string };
export type WorkerResponse = { id: number; ok: true; report: ImportReport } | { id: number; ok: false; message: string };

export function specFromSniff(s: SniffResult): ParseSpec {
  return {
    format: s.format, delimiter: s.delimiter, headerLine: s.headerLine, mapping: s.mapping,
    signConvention: s.signConvention, dateOrder: s.dateOrder, accountKind: s.accountKind,
  };
}

/** The device's calendar date (ISO). The engine never reads the clock; the app passes this in. */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * today: the real date. Rows dated after it (plus a short grace) or before 1990 are skipped and counted, and the
 * as-of date for "still active" is the file's last date or today, whichever is earlier (Q1 F1b #2).
 */
export function runImport(inputs: InputFile[], index: AliasIndex, today?: string): ImportReport {
  const results: ParseResult[] = [];
  const files: FileReport[] = [];
  inputs.forEach((input, source) => {
    const sniff = sniffFormat(input.text);
    const sniffSpec = specFromSniff(sniff);
    const spec = input.override?.spec ?? (sniff.mapping ? sniffSpec : null);
    const base = {
      name: input.name, source, format: sniff.format, confidence: sniff.confidence, columns: sniff.columns, sniffSpec,
    };
    if (!spec) {
      files.push({
        ...base, spec: null, needsMapping: true, rowsRead: 0, dateRange: null, skipped: {},
        flipSuggested: false, flipApplied: false,
      });
      return;
    }
    const parsed = parseRows(input.text, spec, source, { today });
    const check = checkSign(parsed.rows, index);
    const flipApplied = input.override?.flip ?? check.flip;
    results.push({ ...parsed, rows: flipApplied ? flipSigns(parsed.rows) : parsed.rows });
    const skipped: Partial<Record<SkipReason, number>> = {};
    for (const s of parsed.skipped) skipped[s.reason] = (skipped[s.reason] ?? 0) + 1;
    files.push({
      ...base, spec, needsMapping: false, rowsRead: parsed.stats.parsed, dateRange: parsed.dateRange, skipped,
      flipSuggested: check.flip, flipApplied,
    });
  });
  const txns: Txn[] = mergeRows(results);
  if (txns.length > MAX_ROWS) {
    throw new Error(`More than ${MAX_ROWS.toLocaleString('en-US')} rows in total. Split the files by date range and try again.`);
  }
  const lastDate = txns.length > 0 ? txns[txns.length - 1]!.date : undefined;
  const asOf = today && lastDate && lastDate > today ? today : undefined;
  const detect = detectRecurring(txns, { aliasIndex: index, includeInflows: false, today: asOf });
  return { files, txnCount: txns.length, detect };
}

export function runImportWithAliases(inputs: InputFile[], aliases: AliasEntry[], today?: string): ImportReport {
  return runImport(inputs, buildAliasIndex(aliases), today);
}

/** The first `lines` lines of the text, so the mapper preview never parses a 25 MB file on the main thread. */
function head(text: string, lines: number): string {
  let at = -1;
  for (let i = 0; i < lines; i++) {
    at = text.indexOf('\n', at + 1);
    if (at === -1) return text;
  }
  return text.slice(0, at);
}

export function previewRows(text: string, spec: ParseSpec, flip: boolean, limit = 5): Txn[] {
  const rows = parseRows(head(text, 200), spec, 0).rows;
  return (flip ? flipSigns(rows) : rows).slice(0, limit);
}

export interface MapChoice {
  delimiter: ParseSpec['delimiter']; headerLine: number;
  date: number; description: number;
  amount?: number; debit?: number; credit?: number;
  sign: 'debit-negative' | 'charge-positive'; dateOrder: DateOrder;
}

/** Column mapper output: a ParseSpec the engine parses like a sniffed one. */
export function specFromChoice(c: MapChoice): ParseSpec {
  const split = c.amount === undefined;
  return {
    format: 'generic', delimiter: c.delimiter, headerLine: c.headerLine,
    mapping: split
      ? { date: c.date, description: c.description, debit: c.debit, credit: c.credit }
      : { date: c.date, description: c.description, amount: c.amount },
    signConvention: split ? 'split-columns' : c.sign, dateOrder: c.dateOrder, accountKind: 'unknown',
  };
}
