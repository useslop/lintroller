// Exports: findings CSV (RFC 4180, CRLF, formula-injection escape) and ICS reminders (RFC 5545).
import { PERIODS_PER_YEAR, yearlyCost } from './money';
import type { Cadence, Finding, FixedCadence, IcsOptions, StatusMap } from './types';
import { dayNum, formatUsd, fromDayNum, gridDay, monthIndexOf } from './values';

const MONTHS_PER_STEP: Partial<Record<FixedCadence, number>> = {
  semimonthly: 1, monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, yearly: 12,
};

/**
 * The first expected date on or after `from`, stepping from `next` by the cadence (Q1 F1b #9: a next date
 * computed from the file's last row can already be past). Month cadences keep the day of month, clamped to
 * the month's end; twice-a-month series step a month, landing on the same one of their two days.
 */
export function rollForward(next: string, cadence: Cadence, from: string): string {
  const target = dayNum(from);
  let d = dayNum(next);
  if (d >= target || cadence === 'irregular') return next;
  const months = MONTHS_PER_STEP[cadence];
  if (months) {
    const anchor = Number(next.slice(8, 10));
    let mi = monthIndexOf(next);
    while (d < target) { mi += months; d = gridDay(mi, anchor); }
    return fromDayNum(d);
  }
  const step = cadence === 'weekly' ? 7 : 14;
  return fromDayNum(d + Math.ceil((target - d) / step) * step);
}

export const CADENCE_WORDS: Record<Cadence, string> = {
  weekly: 'once a week', biweekly: 'once per 2 weeks', semimonthly: 'twice a month', monthly: 'once a month',
  bimonthly: 'once per 2 months', quarterly: 'once a quarter', semiannual: 'twice a year', yearly: 'once a year',
  irregular: 'now and then',
};

/** A cell starting with = + - @ tab or CR gets a leading ' so spreadsheets don't run it as a formula. */
export function csvCell(v: string): string {
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const cents2 = (c: number) => (c / 100).toFixed(2);

export function findingsToCsv(findings: Finding[], statuses: StatusMap): string {
  const header = [
    'Name', 'Status', 'Kind', 'How often', 'Last amount', 'Yearly cost', 'How we got the yearly cost', 'Next expected',
    'Still charging', 'Confidence', 'Charges in file', 'First charge', 'Last charge', 'Category', 'Billed through',
    'Descriptor in your file', 'Id',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const f of findings) {
    const y = yearlyCost(f);
    const st = statuses[f.id] ?? 'not reviewed';
    const row = [
      f.display, st, f.kind, CADENCE_WORDS[f.cadence], cents2(f.amount.lastCents), cents2(y.cents), y.formula,
      f.nextExpected ?? '', f.activity === 'active' ? 'yes' : f.activity === 'maybe-ended' ? 'maybe not' : 'no',
      f.confidenceLabel, String(f.occurrences.length), f.firstDate, f.lastDate, f.category ?? '', f.billedThrough ?? '',
      f.occurrences[f.occurrences.length - 1]?.description ?? '', f.id,
    ];
    lines.push(row.map(csvCell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

// ---------- ICS ----------
function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

const utf8Len = (cp: number) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);

/** RFC 5545 §3.1: lines longer than 75 octets are folded (CRLF + space), never inside a UTF-8 sequence. */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = utf8Len(ch.codePointAt(0)!);
    if (bytes + b > limit) {
      parts.push(cur);
      cur = '';
      bytes = 0;
      limit = 74; // continuation lines start with a space
    }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const RRULE: Partial<Record<Cadence, string>> = {
  weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', bimonthly: 'FREQ=MONTHLY;INTERVAL=2',
  quarterly: 'FREQ=MONTHLY;INTERVAL=3', semiannual: 'FREQ=MONTHLY;INTERVAL=6', yearly: 'FREQ=YEARLY',
};

function stamp(isoDateTime: string): string {
  const t = Date.parse(isoDateTime);
  if (Number.isNaN(t)) return '19700101T000000Z';
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const ymd = (iso: string) => iso.replace(/-/g, '');

function humanDate(iso: string): string {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${M[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
}

/** One VEVENT per active finding with a next date, `daysBefore` days ahead of it. */
export function buildIcs(findings: Finding[], opts: IcsOptions): string {
  const daysBefore = Math.min(30, Math.max(1, Math.round(opts.daysBefore || 3)));
  let host = 'lintroller';
  try { host = new URL(opts.productUrl).host || host; } catch { /* keep default */ }
  const out: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lintroller//Subscription Sweep//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  ];
  const dtstamp = stamp(opts.now);
  for (const f of findings) {
    if (f.activity !== 'active' || !f.nextExpected || (f.status as string) === 'dismissed') continue;
    // a reminder never starts before the real date: roll the next date forward by the cadence
    const next = opts.today ? rollForward(f.nextExpected, f.cadence, fromDayNum(dayNum(opts.today) + daysBefore)) : f.nextExpected;
    const day = dayNum(next) - daysBefore;
    const start = fromDayNum(day);
    const amount = formatUsd(f.amount.lastCents);
    const summary = opts.includeAmounts ? `${f.display}: ${amount} expected ${humanDate(next)}` : f.display;
    const desc = [
      `Looks like a repeating charge (${CADENCE_WORDS[f.cadence]}), based on the rows in your file.`,
      opts.includeAmounts
        ? `Last charge ${amount} on ${humanDate(f.lastDate)}. About ${formatUsd(f.amount.lastCents * (f.cadence === 'irregular' ? 0 : PERIODS_PER_YEAR[f.cadence]))} a year if it keeps going.`
        : `Last charge on ${humanDate(f.lastDate)}.`,
      `Next one expected around ${humanDate(next)}.`,
      `Made with ${opts.productUrl}`,
    ].join('\n');
    const lines = [
      'BEGIN:VEVENT',
      `UID:${f.id}@${host}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`,
      `DTEND;VALUE=DATE:${ymd(fromDayNum(day + 1))}`,
      `SUMMARY:${icsText(summary)}`,
      `DESCRIPTION:${icsText(desc)}`,
      'TRANSP:TRANSPARENT',
    ];
    const rr = RRULE[f.cadence];
    if (rr) lines.push(`RRULE:${rr}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(f.display)}`, 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
    out.push(...lines);
  }
  out.push('END:VCALENDAR');
  return out.map(foldLine).join('\r\n') + '\r\n';
}
