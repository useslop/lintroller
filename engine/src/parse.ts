// Rows → Txn (SPEC §6): ISO dates, integer cents, sign normalised to money-out-negative,
// pending / non-USD / zero / summary rows skipped with a reason (line numbers only, never text).
import { readCsv } from './csv';
import { normalizeMerchant, isCardPaymentText } from './normalize';
import type { AliasIndex, ParseResult, ParseSpec, SkipReason, Txn } from './types';
import { parseAmountCents, parseDateIso } from './values';

const SUMMARY_RE = /^(beginning|ending|opening|closing|starting|current|available|ledger)\s+balance|^total\b|^totals?\s|^summary\b|^statement period|^in case of errors|^balance\b|^description$|^disclaimer/i;
const PENDING_RE = /pending|processing|authori[sz]ation|^held$|denied|declined|failed|cancel+ed|^canceled$/i;

function cell(cells: string[], i: number | undefined): string | undefined {
  return i === undefined ? undefined : cells[i];
}

export function parseRows(text: string, spec: ParseSpec, source = 0): ParseResult {
  const records = readCsv(text, spec.delimiter);
  while (records.length > 0 && records[records.length - 1]!.cells.every((c) => c.trim() === '')) records.pop();
  const rows: Txn[] = [];
  const skipped: { line: number; reason: SkipReason }[] = [];
  const m = spec.mapping;
  const decimalComma = spec.delimiter === ';';
  let outflows = 0;
  let inflows = 0;
  let minD = '';
  let maxD = '';

  for (let r = 0; r < records.length; r++) {
    const rec = records[r]!;
    if (r < spec.headerLine) { skipped.push({ line: rec.line, reason: 'preamble' }); continue; }
    if (r === spec.headerLine) continue;
    const cells = rec.cells;
    if (cells.every((c) => c.trim() === '')) { skipped.push({ line: rec.line, reason: 'blank' }); continue; }
    if (!m) { skipped.push({ line: rec.line, reason: 'unparseable-date' }); continue; }

    const desc = (cell(cells, m.description) ?? '').trim();
    const merchantField = (cell(cells, m.merchant) ?? '').trim();
    const firstText = cells.find((c) => c.trim() !== '')?.trim() ?? '';
    if (SUMMARY_RE.test(desc) || SUMMARY_RE.test(firstText)) { skipped.push({ line: rec.line, reason: 'summary-row' }); continue; }

    let date = parseDateIso(cell(cells, m.date), spec.dateOrder);
    const posted = parseDateIso(cell(cells, m.postedDate), spec.dateOrder);
    if (!date) date = posted;
    if (!date) { skipped.push({ line: rec.line, reason: 'unparseable-date' }); continue; }

    const status = cell(cells, m.status)?.trim();
    if (status && PENDING_RE.test(status) && !/complete|cleared|posted/i.test(status)) {
      skipped.push({ line: rec.line, reason: 'pending' }); continue;
    }
    const currency = (cell(cells, m.currency) ?? '').trim().toUpperCase();
    if (currency !== '' && currency !== 'USD' && currency !== '$') { skipped.push({ line: rec.line, reason: 'non-usd' }); continue; }

    let cents: number | null;
    const type = cell(cells, m.type)?.trim();
    switch (spec.signConvention) {
      case 'split-columns': {
        const d = parseAmountCents(cell(cells, m.debit), decimalComma);
        const c = parseAmountCents(cell(cells, m.credit), decimalComma);
        cents = d === null && c === null ? null : Math.abs(c ?? 0) - Math.abs(d ?? 0);
        if (cents === null && m.amount !== undefined) cents = parseAmountCents(cell(cells, m.amount), decimalComma);
        break;
      }
      case 'charge-positive': {
        const a = parseAmountCents(cell(cells, m.amount), decimalComma);
        cents = a === null ? null : -a;
        break;
      }
      case 'type-column': {
        const a = parseAmountCents(cell(cells, m.amount), decimalComma);
        if (a === null) { cents = null; break; }
        const t = (type ?? '').toLowerCase();
        if (/credit|deposit|refund|income|inflow|return/.test(t)) cents = Math.abs(a);
        else if (/debit|purchase|payment|withdrawal|outflow|sale|charge/.test(t)) cents = -Math.abs(a);
        else cents = a;
        break;
      }
      default:
        cents = parseAmountCents(cell(cells, m.amount), decimalComma);
    }
    if (cents === null) { skipped.push({ line: rec.line, reason: 'unparseable-amount' }); continue; }
    if (cents === 0) { skipped.push({ line: rec.line, reason: 'zero-amount' }); continue; }

    const t: Txn = {
      id: `${source}:${rec.line}`, source, line: rec.line, date,
      description: desc || merchantField, amountCents: cents, currency: 'USD',
    };
    if (posted && posted !== date) t.postedDate = posted;
    if (merchantField) t.merchantField = merchantField;
    if (type) t.type = type;
    if (status) t.status = status;
    const cat = cell(cells, m.bankCategory)?.trim();
    if (cat) t.bankCategory = cat;
    rows.push(t);
    if (cents < 0) outflows++; else inflows++;
    if (minD === '' || date < minD) minD = date;
    if (maxD === '' || date > maxD) maxD = date;
  }
  return {
    rows, skipped,
    dateRange: rows.length ? { from: minD, to: maxD } : null,
    stats: { lines: records.length, parsed: rows.length, skipped: skipped.length, outflows, inflows },
  };
}

/** Sorts by date; drops identical (date, cents, description) rows only when they come from different files. */
export function mergeRows(results: ParseResult[]): Txn[] {
  const all = results.flatMap((r) => r.rows);
  const groups = new Map<string, Map<number, Txn[]>>();
  for (const t of all) {
    const k = `${t.date}|${t.amountCents}|${t.description}`;
    let g = groups.get(k);
    if (!g) { g = new Map(); groups.set(k, g); }
    let list = g.get(t.source);
    if (!list) { list = []; g.set(t.source, list); }
    list.push(t);
  }
  const drop = new Set<string>();
  for (const g of groups.values()) {
    if (g.size < 2) continue;
    let kept = 0;
    for (const src of [...g.keys()].sort((a, b) => a - b)) {
      const list = g.get(src)!;
      // a later file keeps only the rows beyond what earlier files already supplied
      const extra = list.length - kept;
      list.forEach((t, i) => { if (i < list.length - Math.max(0, extra)) drop.add(t.id); });
      kept = Math.max(kept, list.length);
    }
  }
  return all
    .filter((t) => !drop.has(t.id))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.source - b.source || a.line - b.line));
}

/**
 * SPEC §6 sign self-check, per file, after parseRows. Card issuers often export purchases as
 * positive. If most rows matching a known subscription/membership alias are money-in, and
 * card-payment rows are not mostly money-in, the convention is inverted: the app flips the file
 * (flipSigns) and says so, with a "Flip back" control.
 */
export function checkSign(rows: Txn[], index: AliasIndex): {
  flip: boolean; votes: { aliasIn: number; aliasOut: number; paymentsIn: number; paymentsOut: number };
} {
  const votes = { aliasIn: 0, aliasOut: 0, paymentsIn: 0, paymentsOut: 0 };
  const cache = new Map<string, boolean>();
  for (const t of rows) {
    if (isCardPaymentText(t.description)) {
      if (t.amountCents > 0) votes.paymentsIn++; else votes.paymentsOut++;
      continue;
    }
    const key = `${t.description}\u0000${t.merchantField ?? ''}`;
    let known = cache.get(key);
    if (known === undefined) {
      const mm = normalizeMerchant(t.description, index, t.merchantField);
      known = mm.kind === 'subscription' || mm.kind === 'membership';
      cache.set(key, known);
    }
    if (known) { if (t.amountCents > 0) votes.aliasIn++; else votes.aliasOut++; }
  }
  const aliasTotal = votes.aliasIn + votes.aliasOut;
  let flip = false;
  if (aliasTotal >= 2) {
    flip = votes.aliasIn > votes.aliasOut && votes.paymentsIn <= votes.paymentsOut;
  } else if (votes.paymentsOut > 0 && votes.paymentsIn === 0) {
    // no known merchants: a card file whose payments are money-out and whose rows are mostly positive
    const pos = rows.filter((t) => t.amountCents > 0).length;
    flip = rows.length >= 5 && pos / rows.length >= 0.7;
  }
  return { flip, votes };
}

/** Copies with amountCents negated (the app applies it when checkSign says so, and for "Flip back"). */
export function flipSigns(rows: Txn[]): Txn[] {
  return rows.map((t) => ({ ...t, amountCents: -t.amountCents }));
}
