// Calendar arithmetic on ISO yyyy-mm-dd strings. Everything is UTC, so no DST shift can move a day.

const MS_PER_DAY = 86_400_000;

/** Days since 1970-01-01. */
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function isoFromDay(n: number): string {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return isoFromDay(dayNumber(iso) + n);
}

/** Calendar months; the day is the anchor day clamped to the month's last day (Jan 31 -> Feb 28/29). */
export function addMonths(iso: string, months: number, anchorDay = Number(iso.slice(8, 10))): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1;
  const total = y * 12 + m + months;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const d = Math.min(anchorDay, last);
  return `${ny}-${pad2(nm + 1)}-${pad2(d)}`;
}

/** Inclusive day count from a to b. */
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(iso: string): number {
  return new Date(dayNumber(iso) * MS_PER_DAY).getUTCDay();
}

export function isWeekend(iso: string): boolean {
  const w = weekday(iso);
  return w === 0 || w === 6;
}

/** MM/DD/YYYY, the bank export style. */
export function usDate(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
}

/** MM/DD, used inside descriptors such as "PURCHASE AUTHORIZED ON 09/12". */
export function usShort(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
