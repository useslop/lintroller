import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { navigate } from '../router';
import { useSession } from '../session';
import { SAMPLE_NAME, SAMPLE_TEXT } from '../sample';
import { runImportAsync } from '../run-import';
import { MAX_FILE_BYTES, type FileOverride, type FileProblem, type FileReport, type ImportReport, type InputFile } from '../pipeline';
import { FORMAT_LABEL, SKIP_LABEL, formatDate, plural, signFlipNote } from '../copy';
import { readTextFile } from '../files';
import type { ParseSpec } from '../engine';
import { Mapper } from './Mapper';

export function Import() {
  const session = useSession();
  const [inputs, setInputs] = useState<InputFile[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [mapperOpen, setMapperOpen] = useState<Record<number, boolean>>({});
  const [focusResults, setFocusResults] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusResults && report) {
      resultsRef.current?.focus();
      setFocusResults(false);
    }
  }, [focusResults, report]);

  async function run(next: InputFile[], focus: boolean): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const result = await runImportAsync(next);
      setInputs(next);
      setReport(result);
      session.setNote(null);
      if (focus) setFocusResults(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read these files.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addFiles(list: File[]) {
    const accepted: InputFile[] = [];
    const problems: string[] = [];
    try {
      for (const file of list) {
        if (file.size > MAX_FILE_BYTES) {
          problems.push(`${file.name} is over 25 MB. Split it by date range and try again.`);
          continue;
        }
        accepted.push({ name: file.name, text: await readTextFile(file) });
      }
    } catch {
      problems.push('One of the files could not be read.');
    }
    if (accepted.length > 0) await run([...inputs, ...accepted], true);
    if (problems.length > 0) setError(problems.join(' '));
  }

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (list.length > 0) void addFiles(list);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const list = Array.from(event.dataTransfer.files);
    if (list.length > 0) void addFiles(list);
  };
  const addPasted = () => {
    if (!pasted.trim()) return;
    void run([...inputs, { name: 'pasted rows', text: pasted }], true).then((ok) => {
      if (ok) setPasted('');
    });
  };
  const trySample = () => void run([{ name: SAMPLE_NAME, text: SAMPLE_TEXT }], true);
  const removeFile = (index: number) => {
    const next = inputs.filter((_, i) => i !== index);
    if (next.length === 0) {
      setInputs([]);
      setReport(null);
      return;
    }
    void run(next, false);
  };
  const patchFile = (index: number, change: FileOverride) =>
    void run(inputs.map((f, i) => (i === index ? { ...f, override: { ...f.override, ...change } } : f)), false);

  const usable = report?.files.filter((f) => !f.needsMapping) ?? [];
  const found = report?.detect.findings.length ?? 0;
  const summary = report && usable.length > 0
    ? `Read ${plural(report.txnCount, 'row', 'rows')} from ${plural(usable.length, 'file', 'files')}. ${found === 1 ? '1 charge looks like it repeats.' : `${found} charges look like they repeat.`}`
    : '';

  return (
    <section className="page">
      <h1>Import your file</h1>
      <p className="lede">Drop in a CSV from your bank or card, or paste rows. Everything is read in this tab. Nothing is uploaded.</p>
      {session.note && <p role="status" className="note">{session.note}</p>}

      <div className="drop" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <label className="button primary">
          Choose CSV files
          <input type="file" multiple accept=".csv,text/csv,.txt" className="visually-hidden" onChange={onPick} />
        </label>
        <p className="muted">or drop them here</p>
      </div>

      <label className="field">
        Paste rows
        <textarea
          rows={5}
          spellCheck={false}
          value={pasted}
          placeholder={'Date,Description,Amount'}
          onChange={(e) => setPasted(e.target.value)}
        />
      </label>
      <p>
        <button type="button" className="button" onClick={addPasted} disabled={busy || !pasted.trim()}>Use pasted rows</button>
      </p>
      <p className="row-links">
        <button type="button" className="link" onClick={trySample} disabled={busy}>Try the sample file</button>
        <span aria-hidden="true"> · </span>
        <a href="/sample/sample-statement.csv" download>Download the sample</a>
      </p>

      {busy && <p role="status">Reading your file…</p>}
      {error && <p role="alert" className="problem">{error}</p>}
      {session.savedAvailable && (
        <p className="muted">You have a saved review on this device. <button type="button" className="link" onClick={() => { session.openSaved(); navigate('/sweep/review'); }}>Open your saved review</button></p>
      )}

      {report && (
        <section aria-labelledby="results-title" className="results">
          <h2 id="results-title" tabIndex={-1} ref={resultsRef}>What we read</h2>
          <p aria-live="polite">{summary}</p>
          {report.txnCount > 0 && report.detect.coverage.showHistoryHint && (
            <p>Your file covers {plural(report.detect.coverage.days, 'day', 'days')}. Six months or more gives better results.</p>
          )}
          {report.txnCount > 0 && !report.detect.coverage.canSeeYearly && (
            <p>Yearly renewals need 13 months or more; add a longer export to see them.</p>
          )}
          <ul className="files">
            {report.files.map((file, i) => (
              <li key={`${file.source}-${file.name}`}>
                <FileCard
                  file={file}
                  text={inputs[i]?.text ?? ''}
                  open={mapperOpen[i] === true}
                  onToggle={() => setMapperOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
                  onFlip={() => patchFile(i, { flip: !file.flipApplied })}
                  onApply={(spec: ParseSpec) => patchFile(i, { spec })}
                  onRemove={() => removeFile(i)}
                />
              </li>
            ))}
          </ul>
          {usable.length > 0 && (
            <p>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  session.setReport(report);
                  navigate('/sweep/review');
                }}
              >
                Next: review
              </button>
            </p>
          )}
        </section>
      )}
    </section>
  );
}

function FileCard({ file, text, open, onToggle, onFlip, onApply, onRemove }: {
  file: FileReport; text: string; open: boolean;
  onToggle: () => void; onFlip: () => void; onApply: (spec: ParseSpec) => void; onRemove: () => void;
}) {
  const skipped = Object.entries(file.skipped).filter(([, n]) => (n ?? 0) > 0);
  const range = file.dateRange ? `, ${formatDate(file.dateRange.from)} to ${formatDate(file.dateRange.to)}` : '';
  const unreadable = file.problem?.kind === 'empty' || file.problem?.kind === 'not-text';
  return (
    <article className="file">
      <h3>{file.name}</h3>
      {file.problem && <p className="problem">{problemText(file.problem)}</p>}
      {file.needsMapping ? (
        !unreadable && <p className="problem">We couldn't map the columns of this file. Choose them below.</p>
      ) : (
        <>
          <p>{file.format === 'generic' ? 'A CSV we read with the columns you choose' : `Looks like a ${FORMAT_LABEL[file.format]} CSV`}</p>
          {file.confidence === 'medium' && file.format !== 'generic' && (
            <p className="note">Check the preview: we couldn't confirm this bank's format from an official page.</p>
          )}
          <p>Read {plural(file.rowsRead, 'row', 'rows')}{range}.</p>
          {skipped.length > 0 && (
            <p className="muted">Skipped: {skipped.map(([reason, n]) => `${n} ${SKIP_LABEL[reason]?.[n === 1 ? 0 : 1] ?? reason}`).join(', ')}.</p>
          )}
        </>
      )}
      {file.flipSuggested && file.flipApplied ? (
        <p className="note">
          {signFlipNote(file.spec)} Wrong?{' '}
          <button type="button" className="link" onClick={onFlip}>Flip back</button>
        </p>
      ) : !file.needsMapping && !unreadable && (
        <p>
          <button type="button" className="link" onClick={onFlip}>{file.flipApplied ? 'Flip back' : 'Flip the signs'}</button>
        </p>
      )}
      <p className="row-links">
        {!file.needsMapping && !unreadable && (
          <button type="button" className="link" aria-expanded={open} onClick={onToggle}>Not right? Choose the columns</button>
        )}
        <button type="button" className="link" onClick={onRemove}>Remove</button>
      </p>
      {(open || file.needsMapping) && !unreadable && <Mapper file={file} text={text} onApply={onApply} />}
    </article>
  );
}

function problemText(p: FileProblem): string {
  switch (p.kind) {
    case 'empty': return 'This file is empty.';
    case 'not-text': return "This doesn't look like a CSV file. Download the statement again and choose CSV.";
    case 'open-quote': return `A quote mark on line ${p.line} is never closed, so the rows after it run together. Fix that line in a text editor, or download the file again.`;
  }
}
