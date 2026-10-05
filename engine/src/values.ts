// Value parsers shared by sniff/parse/detect: money to integer cents (no floats), dates to ISO,
// and calendar day numbers in UTC (so DST never moves a day).
import type { DateOrder } from './types';

/**
 * Thousands marks out, decimal mark as '.'. With both marks present the later one is the decimal
 * mark ('1.234,56' and '1,234.56' both mean 1234.56), so a euro-style value is never cut to 1.23.
 * A lone comma before one or two final digits ('15,49') is a decimal comma; before three ('1,234') it groups thousands.
 */
function decimalPoint(s: string, decimalComma: boolean): string {
  const dot = s.lastIndexOf('.');
  const comma = s.lastIndexOf(',');
  if (dot !== -1 && comma !== -1) {
    return comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  }
  if (decimalComma || (comma !== -1 && comma === s.indexOf(',') && /,\d{1,2}$/.test(s))) {
    return s.replace(/\./g, '').replace(',', '.');
  }
  return s.replace(/,/g, '');
}

/**
 * '$1,234.56' '(12.34)' '- $12.34' '-$12.34' '+ $50.00' '12.34-' '1.234,56' → signed integer cents.
 * decimalComma: '1.234,56' style (semicolon files). Returns null when it isn't money.
 */
export function parseAmountCents(raw: string | undefined, decimalComma = false): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (s === '') return null;
  let neg = false;
  if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/\s+/g, '').replace(/^USD/i, '').replace(/USD$/i, '');
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  s = s.replace(/^\$/, '');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  else if (s.startsWith('+')) s = s.slice(1);
  if (s.endsWith('-')) { neg = !neg; s = s.slice(0, -1); }
  if (/^\(.*\)$/.test(s)) { neg = !neg; s = s.slice(1, -1); }
  s = decimalPoint(s, decimalComma);
  const m =/^(\d{0,12})(?:\.(\d*))?$/.exec(s);
  if (!m || (m[1] === '' && (m[2] === undefined || m[2] === ''))) return null;
  const whole = m[1] === '' ? 0 : Number(m[1]);
  const frac = m[2] ?? '';
  let cents = whole * 100 + Number((frac + '00').slice(0, 2));
  if (frac.length > 2 && Number(frac[2]) >= 5) cents += 1;
  if (cents === 0) return 0;
  return neg ? -cents : cents;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function iso(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function year4(y: string): number {
  const n = Number(y);
  return y.length <= 2 ? 2000 + n : n;
}

/** Date text → 'yyyy-mm-dd' or null. ISO forms win regardless of `order`; two-digit years → 20xx. */
export function parseDateIso(raw: string | undefined, order: DateOrder = 'MDY'): string | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (s === '') return null;
  s = s.replace(/[T ]\d{1,2}:\d{2}.*$/, '').trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = year4(m[3]!);
    return order === 'DMY' ? iso(y, b, a) : iso(y, a, b);
  }
  m = /^(\d{1,2})[ -]([A-Za-z]{3,9})\.?[ -,]+(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const mo = MONTHS[m[2]!.toLowerCase().slice(0, m[2]!.toLowerCase().startsWith('sept') ? 4 : 3)];
    return mo ? iso(year4(m[3]!), mo, Number(m[1])) : null;
  }
  m = /^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{2}|\d{4})$/.exec(s);
  if (m) {
    const mo = MONTHS[m[1]!.toLowerCase().slice(0, 3)];
    return mo ? iso(year4(m[3]!), mo, Number(m[2])) : null;
  }
  return null;
}

/** 'yyyy-mm-dd' → integer day number (days since 1970-01-01, UTC). */
const ET_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Calendar date (YYYY-MM-DD) of a timestamp in US Eastern time, where the links were checked; a plain date passes through. */
export function etDate(timestamp: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return timestamp;
  const t = new Date(timestamp);
  return Number.isNaN(t.getTime()) ? timestamp.slice(0, 10) : ET_DATE.format(t);
}

export function dayNum(isoDate: string): number {
  const y = Number(isoDate.slice(0, 4));
  const m = Number(isoDate.slice(5, 7));
  const d = Number(isoDate.slice(8, 10));
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function fromDayNum(n: number): string {
  const dt = new Date(n * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Month-grid date: anchor day clamped to the month's end (Jan 31 → Feb 28/29 → Mar 31). */
export function gridDay(monthIndex: number, anchorDay: number): number {
  const y = Math.floor(monthIndex / 12);
  const m = (monthIndex % 12) + 1;
  const d = Math.min(anchorDay, daysInMonth(y, m));
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function monthIndexOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4)) * 12 + Number(isoDate.slice(5, 7)) - 1;
}

/** '$1,234.56' from integer cents, exact (no float rounding). */
export function formatUsd(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const c = String(abs % 100).padStart(2, '0');
  return `${neg ? '-' : ''}$${dollars}.${c}`;
}
