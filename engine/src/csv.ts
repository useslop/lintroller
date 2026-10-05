// RFC 4180 reader with physical line numbers (shown to users as evidence: "file 1, line 37").
// Handles quotes, "" escapes, CRLF / LF / CR-only line endings, newlines inside quotes,
// ',' ';' and tab delimiters, and a UTF-8 BOM. No dependency.

export type Delimiter = ',' | ';' | '\t';

export interface CsvRecord {
  line: number;      // 1-based physical line where the record starts
  cells: string[];
}

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Reads records. Blank lines come back as `{ cells: [''] }` so callers can count them. */
export function readCsv(text: string, delimiter: Delimiter = ',', maxRecords = Infinity): CsvRecord[] {
  const s = stripBom(text);
  const out: CsvRecord[] = [];
  const n = s.length;
  const delim = delimiter.charCodeAt(0);
  let i = 0;
  let line = 1;
  while (i < n && out.length < maxRecords) {
    const startLine = line;
    const cells: string[] = [];
    let field = '';
    let ended = false;
    while (!ended) {
      // start of a field: optional spaces, then maybe a quote
      let j = i;
      while (j < n && s.charCodeAt(j) === 32) j++;
      if (j < n && s.charCodeAt(j) === 34) {
        // quoted field
        i = j + 1;
        for (;;) {
          if (i >= n) break;
          const c = s.charCodeAt(i);
          if (c === 34) {
            if (i + 1 < n && s.charCodeAt(i + 1) === 34) { field += '"'; i += 2; continue; }
            i++;
            break;
          }
          if (c === 13) {
            field += '\n'; line++;
            i += i + 1 < n && s.charCodeAt(i + 1) === 10 ? 2 : 1;
            continue;
          }
          if (c === 10) { field += '\n'; line++; i++; continue; }
          field += s[i];
          i++;
        }
        // lenient: text after the closing quote up to the delimiter is kept
        while (i < n) {
          const c = s.charCodeAt(i);
          if (c === delim || c === 13 || c === 10) break;
          field += s[i];
          i++;
        }
      } else {
        const start = i;
        while (i < n) {
          const c = s.charCodeAt(i);
          if (c === delim || c === 13 || c === 10) break;
          i++;
        }
        field = s.slice(start, i);
      }
      cells.push(field);
      field = '';
      if (i >= n) { ended = true; break; }
      const c = s.charCodeAt(i);
      if (c === delim) { i++; if (i >= n) { cells.push(''); ended = true; } continue; }
      // line break ends the record
      if (c === 13) i += i + 1 < n && s.charCodeAt(i + 1) === 10 ? 2 : 1;
      else i++;
      line++;
      ended = true;
    }
    out.push({ line: startLine, cells });
  }
  return out;
}

/** Physical lines (for sniffing), keeping CR-only files intact. */
export function firstLines(text: string, max: number): string[] {
  const s = stripBom(text);
  const lines: string[] = [];
  let start = 0;
  for (let i = 0; i < s.length && lines.length < max; i++) {
    const c = s.charCodeAt(i);
    if (c === 13 || c === 10) {
      lines.push(s.slice(start, i));
      if (c === 13 && s.charCodeAt(i + 1) === 10) i++;
      start = i + 1;
    }
  }
  if (lines.length < max && start < s.length) lines.push(s.slice(start));
  return lines;
}

function countOutsideQuotes(line: string, ch: string): number {
  let inQ = false;
  let k = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (!inQ && c === ch) k++;
  }
  return k;
}

/** Picks the delimiter whose per-line count is most consistent (then largest). Ties go to ','. */
export function detectDelimiter(lines: string[]): Delimiter {
  const cands: Delimiter[] = [',', ';', '\t'];
  let best: Delimiter = ',';
  let bestScore = -1;
  let bestMode = 0;
  const nonBlank = lines.filter((l) => l.trim() !== '');
  for (const d of cands) {
    const freq = new Map<number, number>();
    for (const l of nonBlank) {
      const k = countOutsideQuotes(l, d);
      if (k > 0) freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    let mode = 0;
    let modeN = 0;
    for (const [k, v] of freq) if (v > modeN || (v === modeN && k > mode)) { mode = k; modeN = v; }
    if (modeN > bestScore || (modeN === bestScore && mode > bestMode)) {
      best = d; bestScore = modeN; bestMode = mode;
    }
  }
  return bestScore <= 0 ? ',' : best;
}
