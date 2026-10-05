import { useEffect, useId, useRef } from 'react';
import type { DetectResult, Finding, RowClass } from '../engine';
import { yearlyCost } from '../engine';
import { CADENCE_WORDS, CONFIDENCE_TEXT, formatDate, formatMoney, reasonText } from '../copy';
import { Link, navigate } from '../router';
import { useSession } from '../session';

type Group = 'subs' | 'other' | 'bills' | 'people' | 'stopped';

const GROUPS: { key: Group; title: string; collapsed: boolean }[] = [
  { key: 'subs', title: 'Subscriptions and memberships', collapsed: false },
  { key: 'other', title: 'Other repeating charges', collapsed: false },
  { key: 'bills', title: 'Bills and fees', collapsed: false },
  { key: 'people', title: 'Payments to people', collapsed: true },
  { key: 'stopped', title: 'Possibly stopped', collapsed: false },
];

/** Which group a finding is shown in (decisions 1e: people collapsed, ended series under "Possibly stopped"). */
export function groupOf(f: Finding): Group {
  if (f.kind === 'person') return 'people';
  if (f.activity !== 'active') return 'stopped';
  if (f.kind === 'bill' || f.kind === 'fee') return 'bills';
  return f.aliasId ? 'subs' : 'other';
}

const IGNORED_LABEL: Record<RowClass, string> = {
  transfer: 'transfers', 'card-payment': 'card payments', income: 'paychecks and deposits', atm: 'ATM withdrawals',
  interest: 'interest', purchase: 'purchases', fee: 'fees', refund: 'refunds',
};

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function Review() {
  const session = useSession();
  const { findings, statuses, report, setStatus, setNote } = session;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const missing = findings === null;

  useEffect(() => {
    if (missing) {
      setNote('Import a file first to see its review.');
      navigate('/sweep', { replace: true });
    }
  }, [missing, setNote]);

  useEffect(() => {
    if (!missing) headingRef.current?.focus();
  }, [missing]);

  if (!findings) return null;

  return (
    <section className="page">
      <h1 tabIndex={-1} ref={headingRef}>Review what repeats</h1>
      <p className="lede">
        These are charges that look like they repeat, based on the rows in your file. You decide which ones count.
      </p>
      {GROUPS.map((group) => {
        const items = findings.filter((f) => groupOf(f) === group.key);
        if (items.length === 0) return null;
        const body = (
          <ul className="cards">
            {items.map((f) => (
              <li key={f.id}>
                <FindingCard finding={f} status={statuses[f.id] ?? null} onStatus={setStatus} />
              </li>
            ))}
          </ul>
        );
        return group.collapsed ? (
          <details key={group.key} className="group">
            <summary><h2>{group.title} ({items.length})</h2></summary>
            {body}
          </details>
        ) : (
          <section key={group.key} className="group">
            <h2>{group.title} ({items.length})</h2>
            {body}
          </section>
        );
      })}
      {findings.length === 0 && <p>No charges look like they repeat in this file.</p>}
      {report && <LeftOut detect={report.detect} />}
      <p className="actions">
        <Link to="/sweep/summary" className="button primary">See your yearly summary</Link>
      </p>
    </section>
  );
}

function FindingCard({ finding: f, status, onStatus }: {
  finding: Finding;
  status: 'confirmed' | 'dismissed' | null;
  onStatus: (id: string, status: 'confirmed' | 'dismissed' | null) => void;
}) {
  const titleId = useId();
  const yearly = yearlyCost(f);
  const cadence = CADENCE_WORDS[f.cadence];
  return (
    <article className="card" aria-labelledby={titleId}>
      <h3 id={titleId}>{f.display}</h3>
      <p className="meta">
        {cadence.charAt(0).toUpperCase() + cadence.slice(1)}, last charge {formatMoney(f.amount.lastCents)}
      </p>
      <p className="yearly">
        {yearly.periodsPerYear === null
          ? `${formatMoney(yearly.cents)}, total of the last 12 months in your file`
          : `about ${formatMoney(yearly.cents)} a year`}
      </p>
      <p><span className={`chip chip-${f.confidenceLabel}`}>{CONFIDENCE_TEXT[f.confidenceLabel]} confidence</span></p>
      <p className="looks">Looks like a repeating charge</p>
      <ul className="reasons">
        {f.reasons.map((code) => <li key={code}>{reasonText(code, f)}</li>)}
      </ul>
      <details className="evidence">
        <summary>Evidence: {f.occurrences.length} charges</summary>
        <ul>
          {f.occurrences.map((e) => (
            <li key={e.txnId}>
              <span>{formatDate(e.date)}</span> <span>{formatMoney(e.cents)}</span>{' '}
              <code>{e.description}</code> <span className="muted">file {e.source + 1}, line {e.line}</span>
            </li>
          ))}
        </ul>
        {f.priceChanges.map((p) => (
          <p key={`${p.date}-${p.toCents}`}>
            Price went from {formatMoney(p.fromCents)} to {formatMoney(p.toCents)} on {formatDate(p.date)}.
          </p>
        ))}
        {f.trial && (
          <p>Trial: {formatMoney(f.trial.cents)} on {formatDate(f.trial.date)}, then {formatMoney(f.amount.lastCents)}.</p>
        )}
        {f.refunds.map((r) => (
          <p key={r.txnId}>Money back: {formatMoney(r.cents)} on {formatDate(r.date)} <code>{r.description}</code></p>
        ))}
      </details>
      <div className="actions">
        <button
          type="button"
          className="button"
          aria-pressed={status === 'confirmed'}
          onClick={() => onStatus(f.id, status === 'confirmed' ? null : 'confirmed')}
        >
          Yes, it repeats
        </button>
        <button
          type="button"
          className="button"
          aria-pressed={status === 'dismissed'}
          onClick={() => onStatus(f.id, status === 'dismissed' ? null : 'dismissed')}
        >
          Not a repeating charge
        </button>
      </div>
      {status && (
        <p className="undo">
          {status === 'confirmed' ? 'Marked: it repeats.' : 'Marked: not a repeating charge.'}{' '}
          <button type="button" className="link" onClick={() => onStatus(f.id, null)}>Undo</button>
        </p>
      )}
    </article>
  );
}

function LeftOut({ detect }: { detect: DetectResult }) {
  const parts = detect.ignored.filter((i) => i.count > 0).map((i) => `${i.count} ${IGNORED_LABEL[i.rowClass]}`);
  const shops = detect.suppressed.filter((s) => s.reason === 'variable-merchant');
  const n = shops.length;
  return (
    <section className="panel" aria-label="What we left out">
      {parts.length > 0 && <p>We ignored {joinList(parts)}.</p>}
      {n > 0 && (
        <details>
          <summary>
            {n} {n === 1 ? 'shop you buy from often (gas, groceries) isn’t' : 'shops you buy from often (gas, groceries) aren’t'} counted as repeating charges
          </summary>
          <ul>
            {shops.map((s) => <li key={s.merchantKey}>{s.display}: {s.count} charges</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
