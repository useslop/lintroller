import { useEffect, useRef, useState } from 'react';
import { cancelDirectory } from '../data';
import { yearlyCost, findingsToCsv, buildIcs, lookupCancel, totals, type Finding, type CancelLink } from '../engine';
import { LAW_LINES, LAW_NOTE, PLATFORM_NAME, formatDate, formatMoney } from '../copy';
import { PRODUCT_URL } from '../product';
import { downloadText } from '../files';
import { Link, navigate } from '../router';
import { useSession } from '../session';
import { groupOf } from './Review';

function maxLastDate(findings: Finding[]): string {
  return findings.reduce((latest, f) => (f.lastDate > latest ? f.lastDate : latest), '1970-01-01');
}

export function Summary() {
  const session = useSession();
  const { findings, statuses, report, setNote, setRemember, remember, deleteEverything } = session;
  const [days, setDays] = useState<1 | 3 | 7>(3);
  const [amounts, setAmounts] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const missing = findings === null;

  useEffect(() => {
    if (missing) {
      setNote('Import a file first to see your summary.');
      navigate('/sweep', { replace: true });
    } else {
      headingRef.current?.focus();
    }
  }, [missing, setNote]);

  if (!findings) return null;

  const today = report?.detect.coverage.to ?? maxLastDate(findings);
  const t = totals(findings, statuses, today);
  const counted = (f: Finding) => groupOf(f) !== 'people' && groupOf(f) !== 'stopped' && groupOf(f) !== 'bills';
  const confirmedFirst = (a: Finding, b: Finding) => {
    const rank = (f: Finding) => (statuses[f.id] === 'confirmed' ? 0 : 1);
    return rank(a) - rank(b) || yearlyCost(b).cents - yearlyCost(a).cents;
  };
  const listed = findings.filter((f) => statuses[f.id] !== 'dismissed' && counted(f)).sort(confirmedFirst);
  const bills = findings.filter((f) => statuses[f.id] !== 'dismissed' && groupOf(f) === 'bills');
  const maxCategory = Math.max(1, ...t.byCategory.map((c) => c.yearlyCents));
  const reminders = findings.filter((f) => statuses[f.id] !== 'dismissed' && f.kind !== 'person' && f.nextExpected !== null);

  return (
    <section className="page">
      <h1 tabIndex={-1} ref={headingRef}>Your yearly summary</h1>
      <p><Link to="/sweep/review">Back to review</Link></p>
      <p className="headline">
        Confirmed: {formatMoney(t.confirmedYearlyCents)} a year. Not yet reviewed: {formatMoney(t.unreviewedYearlyCents)} a year.
      </p>
      <p className="muted">
        Yearly cost is arithmetic on the rows in your file, not a promise. Bills and bank fees are shown apart and are not in that total.
      </p>

      <section className="panel" aria-labelledby="by-category">
        <h2 id="by-category">By category</h2>
        <ul className="bars">
          {t.byCategory.filter((c) => c.count > 0).map((c) => (
            <li key={c.category}>
              <span className="bar-label">{c.category === 'uncategorised' ? 'Uncategorised' : c.category}</span>
              <span className="bar"><span style={{ width: `${Math.round((c.yearlyCents / maxCategory) * 100)}%` }} /></span>
              <span className="bar-value">{formatMoney(c.yearlyCents)} a year, {c.count} {c.count === 1 ? 'charge' : 'charges'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="by-charge">
        <h2 id="by-charge">Charges: confirmed first, then not yet reviewed</h2>
        {listed.length === 0 && <p>Nothing to total yet. Confirm a charge on the review page.</p>}
        <ul className="cards">
          {listed.map((f) => (
            <li key={f.id}>
              <ChargeCard finding={f} confirmed={statuses[f.id] === 'confirmed'} today={today} />
            </li>
          ))}
        </ul>
      </section>

      {bills.length > 0 && (
        <section aria-labelledby="bills-title" className="panel">
          <h2 id="bills-title">Bills and fees (not in the total above)</h2>
          <ul>
            {bills.map((f) => (
              <li key={f.id}>{f.display}: {formatMoney(yearlyCost(f).cents)} a year, from the rows in your file</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="after-cancel" className="panel">
        <h2 id="after-cancel">If a charge continues after you cancel</h2>
        {LAW_LINES.map((line) => (
          <p key={line.href}>
            {line.text}{' '}
            <a href={line.href} target="_blank" rel="noopener noreferrer">{line.source}</a>
          </p>
        ))}
        <p className="muted">{LAW_NOTE}</p>
      </section>

      <section aria-labelledby="exports" className="panel">
        <h2 id="exports">Export</h2>
        <p>
          <button
            type="button"
            className="button"
            onClick={() => downloadText('subsweep-findings.csv', findingsToCsv(findings, statuses), 'text/csv;charset=utf-8')}
          >
            Download CSV
          </button>
        </p>
        <fieldset className="choice">
          <legend>Calendar reminders: days before the next charge</legend>
          {([1, 3, 7] as const).map((d) => (
            <label key={d}><input type="radio" name="days" checked={days === d} onChange={() => setDays(d)} /> {d} {d === 1 ? 'day' : 'days'}</label>
          ))}
        </fieldset>
        <label><input type="checkbox" checked={amounts} onChange={(e) => setAmounts(e.target.checked)} /> Include amounts in the reminder titles</label>
        <p className="warn">Calendar apps sync to the cloud. Turn amounts off if you don't want them there.</p>
        <p>
          <button
            type="button"
            className="button"
            onClick={() => downloadText(
              'subsweep-reminders.ics',
              buildIcs(reminders, { daysBefore: days, includeAmounts: amounts, productUrl: PRODUCT_URL, now: new Date().toISOString() }),
              'text/calendar;charset=utf-8',
            )}
          >
            Calendar reminders (.ics)
          </button>
        </p>
      </section>

      <section aria-labelledby="device" className="panel">
        <h2 id="device">On this device</h2>
        <label>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember on this device
        </label>
        <p className="muted">
          Off by default. When on, we keep your choices and the findings list (never your file) in this browser only.
        </p>
        <p>
          <button type="button" className="button danger" onClick={() => { deleteEverything(); navigate('/'); }}>
            Delete everything
          </button>
        </p>
      </section>
    </section>
  );
}

function ChargeCard({ finding: f, confirmed, today }: { finding: Finding; confirmed: boolean; today: string }) {
  const y = yearlyCost(f);
  const links = lookupCancel(f, cancelDirectory, today);
  return (
    <article className="card">
      <h3>{f.display}</h3>
      <p className="meta">{confirmed ? 'Confirmed' : 'Not yet reviewed'}</p>
      <p className="yearly">
        {y.periodsPerYear === null ? `${formatMoney(y.cents)}, total of the last 12 months in your file` : `${formatMoney(y.cents)} a year`}
      </p>
      <p className="muted">{y.formula}</p>
      <p>{f.nextExpected ? `Next expected ${formatDate(f.nextExpected)}` : 'Next date unknown: the dates vary.'}</p>
      {links.length === 0 ? (
        <p className="muted">No checked link yet. Look for 'Membership' or 'Subscription' in your account settings on the company's own site.</p>
      ) : (
        links.map((link) => <CancelLinkLine key={`${link.route}-${link.url}`} link={link} />)
      )}
    </article>
  );
}

function CancelLinkLine({ link }: { link: CancelLink }) {
  const platform = link.route === 'merchant' ? null : PLATFORM_NAME[link.route];
  const badge = link.badge === 'verified'
    ? `official page, checked ${formatDate(link.checkedOn)}`
    : `official page, last checked ${formatDate(link.checkedOn)}. Check it again before you rely on it.`;
  const text = link.kind === 'help' ? `${link.name}: how to cancel` : `${link.name}: account page`;
  return (
    <p className="cancel">
      {platform && <span>Billed by {platform}: open your {platform} subscriptions. </span>}
      <a href={link.url} target="_blank" rel="noopener noreferrer">{text}</a>{' '}
      <span className="badge">{badge}</span>
    </p>
  );
}
