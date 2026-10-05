import { formatsHelp, dataMeta } from '../data';
import { CSP } from '../security';
import { PRODUCT_NAME, REPO_URL, RECEIPT_URL } from '../product';
import { formatDate } from '../copy';
import { etDate } from '../engine';
import { Link } from '../router';
import privacyResults from '../privacy-results.json';

export function HowToExport() {
  return (
    <section className="page">
      <h1>How to download a CSV</h1>
      <p className="lede">Our short steps. Menus change, so the company's own help page is the final word.</p>
      {formatsHelp.map((h) => (
        <section key={h.format} className="panel" aria-labelledby={`fmt-${h.format}`}>
          <h2 id={`fmt-${h.format}`}>{h.institution}: {h.product}</h2>
          <ol>
            {h.steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
          {h.helpUrl && h.verified && (
            <p>
              <a href={h.helpUrl} target="_blank" rel="noopener noreferrer">Official help page</a>, checked {formatDate(h.verified)}
            </p>
          )}
        </section>
      ))}
      <p className="muted">
        Some banks only offer PDF or QFX/OFX statements. Use the CSV option; {PRODUCT_NAME} does not read those.
      </p>
    </section>
  );
}

type PrivacyResults = { status: string; ranAt?: string; checks?: { name: string; result: string }[] };

export function Privacy() {
  const results = privacyResults as PrivacyResults;
  return (
    <section className="page">
      <h1>Privacy: what runs where</h1>
      <p className="lede">Your file is read by this page, in your browser. It is not uploaded anywhere.</p>
      <table className="table">
        <thead><tr><th scope="col">Thing</th><th scope="col">Where it goes</th></tr></thead>
        <tbody>
          <tr><td>Your CSV</td><td>Read in this tab by a background worker on your device. Never sent anywhere.</td></tr>
          <tr><td>Findings and evidence</td><td>Shown in this tab. Gone when you close it, unless you turn on Remember on this device.</td></tr>
          <tr><td>Cancel links</td><td>Open the company's own page in a new tab, only when you click one.</td></tr>
          <tr><td>Downloads (CSV, .ics)</td><td>Saved by your browser to your device.</td></tr>
          <tr><td>Analytics, error reports, cookies, accounts</td><td>None.</td></tr>
        </tbody>
      </table>

      <section className="panel" aria-labelledby="stored">
        <h2 id="stored">What is stored, and where</h2>
        <ul>
          <li>By default: nothing. Refreshing the page clears your review.</li>
          <li>With Remember on this device: one entry in this browser's local storage, named subsweep:v1, holding your choices and the findings list. Delete everything removes it.</li>
          <li>No cookies, no IndexedDB, no session storage, no service worker.</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="rule">
        <h2 id="rule">The rule the browser enforces</h2>
        <p>This is the Content Security Policy sent with each page. <code>connect-src 'none'</code> means the page cannot open any network connection after it loads.</p>
        <pre className="code"><code>{CSP}</code></pre>
      </section>

      <section className="panel" aria-labelledby="check">
        <h2 id="check">Check it yourself</h2>
        <ol>
          <li>Open your browser's developer tools and go to the Network tab.</li>
          <li>Drop in a file, or use the sample file.</li>
          <li>Nothing new appears in the Network list, and there is no request with your rows in it.</li>
          <li>Storage shows nothing for this site unless you turned on Remember on this device.</li>
        </ol>
      </section>

      <section className="panel" aria-labelledby="proof">
        <h2 id="proof">Published proof</h2>
        {results.status === 'not-run-yet' ? (
          <p>No published run yet. The proof is run against the live site before each release.</p>
        ) : (
          <>
            <p>Status: {results.status}{results.ranAt ? `, run ${formatDate(results.ranAt.slice(0, 10))}` : ''}.</p>
            <ul>{(results.checks ?? []).map((c) => <li key={c.name}>{c.name}: {c.result}</li>)}</ul>
          </>
        )}
        <p className="muted">Cancel links were last checked {dataMeta.linkCheckRanAt ? formatDate(etDate(dataMeta.linkCheckRanAt)) : 'when the directory was built'}.</p>
      </section>
    </section>
  );
}

export function About() {
  return (
    <section className="page">
      <h1>About {PRODUCT_NAME}</h1>
      <p>Built with Opus 5.5 and Sonnet 5. Free, MIT licensed.</p>
      <p><strong>We don't make money from this. No ads, no affiliate links, no data.</strong></p>
      <ul>
        {REPO_URL && <li><a href={REPO_URL} target="_blank" rel="noopener noreferrer">Source code</a></li>}
        {RECEIPT_URL && <li><a href={RECEIPT_URL} target="_blank" rel="noopener noreferrer">Build Receipt</a></li>}
      </ul>
      <p><Link to="/sweep">Start with your file</Link></p>
    </section>
  );
}

export function NotFound() {
  return (
    <section className="page">
      <h1>This page doesn't exist.</h1>
      <p><Link to="/">Back to the start</Link></p>
    </section>
  );
}
