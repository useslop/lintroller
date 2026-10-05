// Format sniffing (SPEC §6, RESEARCH §1 tables 1, 4 and 6). No US bank publishes its CSV header,
// so every shape below except PayPal (official) and Capital One / Venmo / Mint (open-source
// importers) is a best-known guess: those sniff at 'medium' confidence and the app says
// "check the preview". The column mapper (suggestMapping) is a main path, not an edge case.
import { detectDelimiter, firstLines, readCsv } from './csv';
import type { ColumnMapping, DateOrder, FormatId, SignConvention, SniffResult } from './types';
import { parseAmountCents, parseDateIso } from './values';

type ColumnKey = keyof ColumnMapping;

export interface FormatDef {
  id: FormatId;
  label: string;                                   // "Chase credit card"
  /** Header cells that must all be present (case-insensitive, trimmed). null = no header signature. */
  signature: string[][] | null;                    // any of these sets matches
  columns: Partial<Record<ColumnKey, string[]>>;   // candidate header names per mapping field
  signConvention: SignConvention;
  dateOrder: DateOrder;
  accountKind: SniffResult['accountKind'];
  verified: 'official' | 'open-source' | 'unverified';
}

const DATE = ['transaction date', 'trans. date', 'trans date', 'date'];
const POSTED = ['posted date', 'post date', 'posting date', 'clearing date'];

/** One entry per FormatId. Order = matching priority (most distinctive signatures first). */
export const FORMATS: Record<FormatId, FormatDef> = {
  'boa-checking': {
    id: 'boa-checking', label: 'Bank of America checking or savings',
    signature: [['date', 'description', 'amount', 'running bal.']],
    columns: { date: ['date'], description: ['description'], amount: ['amount'] },
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'bank', verified: 'unverified',
  },
  'boa-card': {
    id: 'boa-card', label: 'Bank of America credit card',
    signature: [['posted date', 'reference number', 'payee', 'amount']],
    columns: { date: ['posted date'], description: ['payee'], amount: ['amount'] },
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'card', verified: 'unverified',
  },
  'chase-checking': {
    id: 'chase-checking', label: 'Chase checking or savings',
    signature: [['posting date', 'description', 'amount', 'check or slip #']],
    columns: { date: ['posting date'], description: ['description'], amount: ['amount'], type: ['type'] },
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'bank', verified: 'unverified',
  },
  'chase-card': {
    id: 'chase-card', label: 'Chase credit card',
    signature: [['transaction date', 'post date', 'description', 'amount', 'memo']],
    columns: { date: ['transaction date'], postedDate: ['post date'], description: ['description'], amount: ['amount'], type: ['type'], bankCategory: ['category'] },
    signConvention: 'charge-positive', dateOrder: 'MDY', accountKind: 'card', verified: 'unverified',
  },
  'wells-fargo': {
    id: 'wells-fargo', label: 'Wells Fargo (no header row)',
    signature: null, // headerless shape rule, see sniffFormat
    columns: {},
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'bank', verified: 'unverified',
  },
  'citi-card': {
    id: 'citi-card', label: 'Citi credit card',
    signature: [['status', 'date', 'description', 'debit', 'credit']],
    columns: { date: ['date'], description: ['description'], debit: ['debit'], credit: ['credit'], status: ['status'] },
    signConvention: 'split-columns', dateOrder: 'MDY', accountKind: 'card', verified: 'unverified',
  },
  'capitalone-card': {
    id: 'capitalone-card', label: 'Capital One credit card',
    signature: [['card no.', 'description', 'debit', 'credit']],
    columns: { date: ['transaction date', 'posted date'], postedDate: ['posted date'], description: ['description'], debit: ['debit'], credit: ['credit'], bankCategory: ['category'] },
    signConvention: 'split-columns', dateOrder: 'MDY', accountKind: 'card', verified: 'open-source',
  },
  amex: {
    id: 'amex', label: 'American Express',
    signature: [['extended details', 'appears on your statement as']],
    columns: { date: ['date'], description: ['description'], amount: ['amount'], bankCategory: ['category'] },
    signConvention: 'charge-positive', dateOrder: 'MDY', accountKind: 'card', verified: 'unverified',
  },
  discover: {
    id: 'discover', label: 'Discover card',
    signature: [['trans. date', 'post date', 'description', 'amount']],
    columns: { date: ['trans. date'], postedDate: ['post date'], description: ['description'], amount: ['amount'], bankCategory: ['category'] },
    signConvention: 'charge-positive', dateOrder: 'MDY', accountKind: 'card', verified: 'unverified',
  },
  usbank: {
    id: 'usbank', label: 'U.S. Bank',
    signature: [['date', 'transaction', 'name', 'memo', 'amount']],
    columns: { date: ['date'], description: ['name'], amount: ['amount'], type: ['transaction'] },
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'bank', verified: 'unverified',
  },
  'apple-card': {
    id: 'apple-card', label: 'Apple Card',
    signature: [['clearing date', 'purchased by']],
    columns: { date: ['transaction date'], postedDate: ['clearing date'], description: ['description'], merchant: ['merchant'], amount: ['amount (usd)', 'amount'], type: ['type'], bankCategory: ['category'] },
    signConvention: 'charge-positive', dateOrder: 'MDY', accountKind: 'card', verified: 'unverified',
  },
  paypal: {
    id: 'paypal', label: 'PayPal activity',
    signature: [['timezone', 'gross', 'fee', 'net'], ['time zone', 'gross', 'fee', 'net']],
    columns: { date: ['date'], description: ['name'], amount: ['gross'], type: ['type'], status: ['status'], currency: ['currency'] },
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'wallet', verified: 'official',
  },
  venmo: {
    id: 'venmo', label: 'Venmo statement',
    signature: [['amount (total)', 'funding source']],
    columns: { date: ['datetime'], description: ['to'], amount: ['amount (total)'], type: ['type'], status: ['status'] },
    signConvention: 'debit-negative', dateOrder: 'YMD', accountKind: 'wallet', verified: 'open-source',
  },
  cashapp: {
    // RESEARCH §1: a low-confidence guess. Sniffs as 'generic' with this preset mapping.
    id: 'cashapp', label: 'Cash App (guessed columns)',
    signature: [['net amount', 'asset type'], ['transaction id', 'transaction type', 'net amount']],
    columns: { date: ['date'], description: ['notes', 'name of sender/receiver', 'description'], amount: ['amount', 'net amount'], type: ['transaction type'], status: ['status'], currency: ['currency'] },
    signConvention: 'debit-negative', dateOrder: 'YMD', accountKind: 'wallet', verified: 'unverified',
  },
  ynab: {
    id: 'ynab', label: 'YNAB export',
    signature: [['outflow', 'inflow']],
    columns: { date: ['date'], description: ['payee'], debit: ['outflow'], credit: ['inflow'], bankCategory: ['category'] },
    signConvention: 'split-columns', dateOrder: 'MDY', accountKind: 'budget-app', verified: 'unverified',
  },
  monarch: {
    id: 'monarch', label: 'Monarch Money export',
    signature: [['merchant', 'tags', 'account']],
    columns: { date: ['date'], description: ['original statement', 'merchant'], merchant: ['merchant'], amount: ['amount'], bankCategory: ['category'] },
    signConvention: 'debit-negative', dateOrder: 'YMD', accountKind: 'budget-app', verified: 'unverified',
  },
  mint: {
    id: 'mint', label: 'Mint export',
    signature: [['original description', 'labels', 'transaction type']],
    columns: { date: ['date'], description: ['original description'], merchant: ['description'], amount: ['amount'], type: ['transaction type'], bankCategory: ['category'] },
    signConvention: 'type-column', dateOrder: 'MDY', accountKind: 'budget-app', verified: 'open-source',
  },
  generic: {
    id: 'generic', label: 'Other CSV (choose the columns)',
    signature: null, columns: {},
    signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'unknown', verified: 'unverified',
  },
};

const SIGNATURE_ORDER: FormatId[] = [
  'paypal', 'venmo', 'amex', 'apple-card', 'mint', 'ynab', 'capitalone-card', 'citi-card',
  'chase-checking', 'chase-card', 'discover', 'boa-checking', 'boa-card', 'usbank', 'monarch', 'cashapp',
];

const norm = (s: string) => s.replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, ' ');

function matchesSignature(cells: string[], def: FormatDef): boolean {
  if (!def.signature) return false;
  const set = new Set(cells.map(norm));
  return def.signature.some((sig) => sig.every((h) => set.has(h)));
}

function mapByNames(columns: string[], def: FormatDef): ColumnMapping | null {
  const cols = columns.map(norm);
  const out: Partial<ColumnMapping> = {};
  for (const [key, names] of Object.entries(def.columns) as [ColumnKey, string[]][]) {
    for (const name of names) {
      const i = cols.indexOf(name);
      if (i >= 0) { out[key] = i; break; }
    }
  }
  if (out.date === undefined || out.description === undefined) return null;
  if (out.amount === undefined && (out.debit === undefined || out.credit === undefined)) return null;
  return out as ColumnMapping;
}

const MONEY_RE = /^[(+\-]?\s*\$?\s*[-+]?\s*(?:[\d,]*\d(?:\.\d{1,2})?|[\d.]*\d(?:,\d{1,2})?)\)?-?$/;
const isMoney = (v: string) => MONEY_RE.test(v.trim()) && parseAmountCents(v) !== null;
const isDate = (v: string) => parseDateIso(v, 'MDY') !== null || parseDateIso(v, 'DMY') !== null;

function isWellsFargoRow(cells: string[]): boolean {
  return cells.length === 5 && isDate(cells[0]!) && isMoney(cells[1]!) &&
    (cells[2]!.trim() === '*' || cells[2]!.trim() === '') && cells[3]!.trim() === '' && cells[4]!.trim() !== '';
}

function looksLikeData(cells: string[]): boolean {
  return cells.some((c) => isDate(c)) && cells.some((c) => isMoney(c) && !isDate(c));
}

function guessDateOrder(values: string[]): DateOrder {
  let dmy = false;
  for (const v of values) {
    const t = v.trim();
    if (/^\d{4}[-/.]/.test(t)) return 'YMD';
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.]/.exec(t);
    if (m && Number(m[1]) > 12) dmy = true;
    if (m && Number(m[2]) > 12) return 'MDY';
  }
  return dmy ? 'DMY' : 'MDY';
}

/** Generic files: header words first, then value shapes (≥ 90% dates / money). */
export function suggestMapping(columns: string[], sample: string[][]): ColumnMapping | null {
  const names = columns.map(norm);
  const width = Math.max(columns.length, ...sample.map((r) => r.length));
  const stats = Array.from({ length: width }, (_, i) => {
    const vals = sample.map((r) => (r[i] ?? '').trim()).filter((v) => v !== '');
    const dates = vals.filter(isDate).length;
    const money = vals.filter((v) => isMoney(v) && !/^\d{4,}$/.test(v)).length;
    return {
      i, name: names[i] ?? '', nonEmpty: vals.length,
      dateShare: vals.length ? dates / vals.length : 0,
      moneyShare: vals.length ? money / vals.length : 0,
      distinct: new Set(vals).size,
      filled: sample.map((r) => { const v = (r[i] ?? '').trim(); return v !== '' && parseAmountCents(v) !== 0; }),
    };
  });
  const isBalance = (n: string) => /balance|\bbal\b|bal\.$/.test(n);
  const byName = (re: RegExp, pred: (s: (typeof stats)[number]) => boolean = () => true) =>
    stats.find((s) => re.test(s.name) && pred(s));
  const out: Partial<ColumnMapping> = {};

  const dateCol = byName(/^(transaction ?date|trans\.? date|date|posted? ?date|posting date|booking date)$/, (s) => s.dateShare >= 0.9 || s.nonEmpty === 0)
    ?? byName(/date/, (s) => s.dateShare >= 0.9)
    ?? stats.find((s) => s.dateShare >= 0.9 && s.nonEmpty > 0);
  if (!dateCol) return null;
  out.date = dateCol.i;
  const posted = stats.find((s) => s.i !== dateCol.i && /post|clear/.test(s.name) && s.dateShare >= 0.9);
  if (posted) out.postedDate = posted.i;

  const moneyCols = stats.filter((s) => s.i !== dateCol.i && s.moneyShare >= 0.9 && s.nonEmpty > 0 && !isBalance(s.name) && s.dateShare < 0.5);
  const amountByName = moneyCols.find((s) => /^(amount|amt|amount \(usd\)|value|transaction amount|net)$/.test(s.name) || /amount/.test(s.name));
  const debitByName = stats.find((s) => /debit|withdrawal|outflow|money out|paid out|spent|charge/.test(s.name) && !isBalance(s.name));
  const creditByName = stats.find((s) => /credit|deposit|inflow|money in|paid in|received/.test(s.name) && !isBalance(s.name));
  if (debitByName && creditByName && debitByName.i !== creditByName.i) {
    out.debit = debitByName.i; out.credit = creditByName.i;
  } else if (amountByName) {
    out.amount = amountByName.i;
  } else if (moneyCols.length === 1) {
    out.amount = moneyCols[0]!.i;
  } else if (moneyCols.length >= 2) {
    // two near-exclusive money columns → debit/credit (the busier one is usually debit)
    let pair: [number, number] | null = null;
    for (let a = 0; a < moneyCols.length && !pair; a++) {
      for (let b = a + 1; b < moneyCols.length && !pair; b++) {
        const A = moneyCols[a]!; const B = moneyCols[b]!;
        let both = 0; let either = 0;
        for (let r = 0; r < sample.length; r++) {
          if (A.filled[r] && B.filled[r]) both++;
          if (A.filled[r] || B.filled[r]) either++;
        }
        if (either > 0 && both / either <= 0.1) {
          const ca = A.filled.filter(Boolean).length; const cb = B.filled.filter(Boolean).length;
          pair = ca >= cb ? [A.i, B.i] : [B.i, A.i];
        }
      }
    }
    if (pair) { out.debit = pair[0]; out.credit = pair[1]; } else out.amount = moneyCols[0]!.i;
  } else {
    return null;
  }

  const used = new Set([out.date, out.postedDate, out.amount, out.debit, out.credit]);
  const descByName = byName(/^(description|desc|payee|merchant|name|narrative|details|transaction description|memo|original description)$/, (s) => !used.has(s.i));
  const textCols = stats.filter((s) => !used.has(s.i) && s.dateShare < 0.5 && s.moneyShare < 0.5 && s.nonEmpty > 0);
  const descCol = descByName ?? textCols.sort((a, b) => b.distinct - a.distinct)[0];
  if (!descCol) return null;
  out.description = descCol.i;
  const typeCol = byName(/^(type|transaction type|details)$/, (s) => s.i !== descCol.i && !used.has(s.i));
  if (typeCol) out.type = typeCol.i;
  const statusCol = byName(/^status$/);
  if (statusCol) out.status = statusCol.i;
  const curCol = byName(/^currency$/);
  if (curCol) out.currency = curCol.i;
  const catCol = byName(/^category$/, (s) => s.i !== descCol.i);
  if (catCol) out.bankCategory = catCol.i;
  return out as ColumnMapping;
}

/** Reads at most the first 30 lines; strips a UTF-8 BOM; never throws. */
export function sniffFormat(text: string): SniffResult {
  try {
    return sniffInner(text);
  } catch {
    return {
      format: 'generic', confidence: 'low', delimiter: ',', headerLine: 0, columns: [], mapping: null,
      signConvention: 'debit-negative', dateOrder: 'MDY', accountKind: 'unknown', notes: ['could not read the file'],
    };
  }
}

function sniffInner(text: string): SniffResult {
  const lines = firstLines(text, 30);
  const delimiter = detectDelimiter(lines);
  const head = readCsv(lines.join('\n'), delimiter, 30);
  const notes: string[] = [];

  // 1. distinctive header signatures, scanning past preambles (BoA summary block, Venmo title rows)
  for (let r = 0; r < head.length; r++) {
    const cells = head[r]!.cells;
    for (const id of SIGNATURE_ORDER) {
      const def = FORMATS[id];
      if (!matchesSignature(cells, def)) continue;
      const mapping = mapByNames(cells, def);
      if (r > 0) notes.push(`skipped ${r} line${r === 1 ? '' : 's'} above the header`);
      if (id === 'cashapp') {
        notes.push('looks like Cash App: these columns are a guess, check the preview');
        return {
          format: 'generic', confidence: 'low', delimiter, headerLine: r, columns: cells, mapping,
          signConvention: def.signConvention, dateOrder: guessDateOrder(head.slice(r + 1).map((h) => h.cells[mapping?.date ?? 0] ?? '')),
          accountKind: 'wallet', notes,
        };
      }
      if (def.verified === 'unverified') notes.push('format not confirmed from an official page: check the preview');
      return {
        format: id, confidence: def.verified === 'unverified' ? 'medium' : 'high', delimiter, headerLine: r,
        columns: cells, mapping, signConvention: def.signConvention, dateOrder: def.dateOrder,
        accountKind: def.accountKind, notes,
      };
    }
  }

  // 2. Wells Fargo: no header; date, amount, '*' or empty, empty, description
  const firstData = head.findIndex((h) => h.cells.some((c) => c.trim() !== ''));
  if (firstData >= 0) {
    const rows = head.slice(firstData).filter((h) => h.cells.some((c) => c.trim() !== '')).slice(0, 5);
    if (rows.length > 0 && rows.every((h) => isWellsFargoRow(h.cells))) {
      const def = FORMATS['wells-fargo'];
      notes.push('no header row (Wells Fargo layout)', 'format not confirmed from an official page: check the preview');
      return {
        format: 'wells-fargo', confidence: 'medium', delimiter, headerLine: -1,
        columns: ['col1', 'col2', 'col3', 'col4', 'col5'], mapping: { date: 0, amount: 1, description: 4 },
        signConvention: def.signConvention, dateOrder: 'MDY', accountKind: 'bank', notes,
      };
    }
  }

  // 3. generic: find the header (or none), then map by names and value shapes
  let headerLine = -1;
  for (let r = 0; r < head.length; r++) {
    const cells = head[r]!.cells;
    if (cells.filter((c) => c.trim() !== '').length < 2) continue;
    if (looksLikeData(cells)) break;
    const next = head.slice(r + 1, r + 4).filter((h) => h.cells.some((c) => c.trim() !== ''));
    if (next.length > 0 && next.every((h) => looksLikeData(h.cells))) { headerLine = r; break; }
  }
  const dataRows = head.slice(headerLine + 1).map((h) => h.cells).filter((c) => c.some((v) => v.trim() !== ''));
  const width = Math.max(0, ...dataRows.map((c) => c.length));
  const columns = headerLine >= 0 ? head[headerLine]!.cells : Array.from({ length: width }, (_, i) => `col${i + 1}`);
  if (headerLine > 0) notes.push(`skipped ${headerLine} line${headerLine === 1 ? '' : 's'} above the header`);
  if (headerLine < 0) notes.push('no header row found');
  const mapping = suggestMapping(columns, dataRows.slice(0, 20));
  notes.push(mapping ? 'columns guessed from the values: check the preview' : 'choose the columns');
  const dateOrder = guessDateOrder(dataRows.map((c) => c[mapping?.date ?? 0] ?? ''));
  return {
    format: 'generic', confidence: 'low', delimiter, headerLine, columns, mapping,
    signConvention: mapping && mapping.debit !== undefined ? 'split-columns' : 'debit-negative',
    dateOrder, accountKind: 'unknown', notes,
  };
}
