# Lintroller

**Find the charges that keep coming back.** Drop in a CSV from your bank or card. Lintroller lists the charges that look like they repeat, what each costs per year, and where to cancel the big ones. The file never leaves your device.

Lintroller is the working name of **Subscription Sweep**, a request on [useslop.com/tools](https://useslop.com/tools). It is free, has no accounts and no server, and is built in public with a Build Receipt (draft: [docs/RECEIPT-DRAFT.md](docs/RECEIPT-DRAFT.md)).

Status: unannounced preview, in QA. Not launched.

## What it does

1. You pick or drop one or more CSV files (or paste rows). The page reads them in your browser.
2. It recognises the bank or card layout, checks the sign of the amounts (and offers "Flip back" when it flips them), and lets you choose the columns yourself when the file is unfamiliar.
3. It groups charges by merchant and shows the ones that look like a repeating charge, with the evidence: the dates, the amounts, the raw descriptor and the file line each row came from.
4. You decide: "Yes, it repeats" or "Not a repeating charge". Nothing counts until you look at it.
5. The summary shows a yearly figure for each charge with its arithmetic (for example 12 × $15.49), bills and bank fees apart from the total, and a link to the company's own cancel or account page when one has been checked.
6. You can download your list as CSV, or calendar reminders (.ics) a few days before each expected charge.

## What it never does

- It never uploads your file or any part of it. There is no server, no API route and no database.
- No analytics, no error reporting, no session replay, no cookies, no third-party scripts, fonts or images.
- Nothing is stored unless you turn on "Remember on this device"; then exactly one key (`subsweep:v1`, your choices and the findings list, never the file) is kept in this browser's local storage. "Delete everything" removes it.
- No bank connections and no logins. It never cancels anything for you; it links to the company's own page.
- It doesn't promise a complete list. Detection is a heuristic; the wording is "looks like a repeating charge" on purpose.

## Supported files

Each layout below is recognised from its header row. "Official" means checked against the bank's own published sample, "open source" against a maintained open-source parser, and "unverified" means a best-known layout: the app shows a preview of the first rows and the column choices so you can confirm it read the file right.

| Layout | Checked against |
|---|---|
| PayPal activity | official |
| Capital One credit card | open source |
| Venmo statement | open source |
| Mint export | open source |
| Bank of America checking or savings | unverified |
| Bank of America credit card | unverified |
| Chase checking or savings | unverified |
| Chase credit card | unverified |
| Wells Fargo (no header row) | unverified |
| Citi credit card | unverified |
| American Express | unverified |
| Discover card | unverified |
| U.S. Bank | unverified |
| Apple Card | unverified |
| Cash App (guessed columns) | unverified |
| YNAB export | unverified |
| Monarch Money export | unverified |
| Any other CSV | you choose the date, description and amount columns |

How to download a CSV from each of these is on the app's `/how-to-export` page.

## How detection works, and where it falls short

- **Cleaning.** Descriptors are normalised: case, payment-processor prefixes (`SQ *`, `PAYPAL *`, `APPLE.COM/BILL`), store and phone numbers, reference codes and trailing states are removed, then matched against a table of 127 known merchant patterns (`data/aliases.json`).
- **Grouping and timing.** Charges from the same merchant are tested against regular intervals, from once a week to once a year, with a few days of tolerance for weekends and short months. A monthly series needs at least 3 charges (4 for weekly, 2 for twice a year and yearly) and a long enough span. A merchant known to sell subscriptions can show with 2 monthly charges, capped at medium confidence. A yearly charge needs about 13 months of history to be seen at all.
- **Amounts.** Stable amounts raise confidence; a real price change starts a new price segment instead of breaking the series. Bills (utilities, phone, insurance) use a wider amount tolerance and get their own group and total.
- **What it leaves out.** Card payments, transfers between your accounts, payroll and other income are counted and shown in "We ignored…", never as repeating charges. Payments to people are collapsed (in a Venmo or Cash App file) or counted as transfers (Zelle and app payments in a bank or card file), and never in totals. A series that seems to have stopped is listed under "Possibly stopped" and is not in the total.
- **Limits.** It only sees the rows in your file: a short file hides yearly renewals, a merchant that changes its descriptor can split into two series, a shop you buy from often can look regular, and a charge billed through Apple, Google or Amazon shows the platform rather than the app. Confidence is shown as text, and you confirm or dismiss each finding.

Engine: `engine/` (pure TypeScript, no I/O). Default parameters are in `engine/src/params.ts`.

## The privacy proof, and how to check it yourself

The page sends a Content Security Policy with `connect-src 'none'`: the browser itself refuses any `fetch`, XHR, beacon, WebSocket or EventSource from the page after it loads, including from a bug or a compromised dependency. The engine runs in a Web Worker that loads with the page, so reading a file makes no request.

`app/e2e/privacy.mjs` proves it in a headless browser, against a local build or the live site, and the latest result is published on `/privacy`. It imports a synthetic canary file (merchants `QUOKKA STREAMING` and `ZEBRAFISH GYM 7781`, $77.77, 12 months, from a seeded generator), walks import, review, summary, both downloads, "Remember on this device" and "Delete everything", and checks that:

- no request of any kind is made after the initial page load, other than the test's own cancel-link clicks, which are aborted and must point at that company's own domain;
- no canary text appears in any request URL, header or body, and the request list is the same for a second, different file;
- storage is empty before the opt-in, holds exactly `subsweep:v1` after it, and is empty after "Delete everything"; no cookies, no service worker;
- the CSP is enforced: an injected `fetch('/x')` is blocked and reported as a violation;
- the whole flow still works offline after the first load;
- each route and static file answers with the exact security headers in `vercel.json`.

To check it yourself: open the browser's developer tools on the Network tab, load the page, then drop in a file or use the sample. Nothing new appears in the list. The Application (or Storage) tab shows nothing for the site unless you turned on "Remember on this device".

## Cancel links and the data refresh

`data/cancel.json` holds 103 companies. A link is shown only when the official page was fetched and answered, with the date it was checked ("official page, checked Oct 4, 2026") and a reminder to check again after 90 days; 60 entries are verified today, the rest are kept but never linked. "How to cancel" wording appears only where the company's own page states the steps.

Refresh the checks (one request per second, about 6 minutes):

```sh
node data/scripts/check-links.mjs            # updates the checked dates and verification in data/, writes data/link-report.md
node data/scripts/check-links.mjs --dry-run  # check only, write nothing
npm test -w data                             # schemas and data rules, including the verified-entry floor
```

## Develop

```sh
npm ci
npm test                          # engine, app, data (and corpus) test suites
npm run build                     # typecheck, vite build, prerender, then the build gates in app/scripts/gates.mjs
node app/e2e/privacy.mjs          # privacy proof against the local build (writes app/src/privacy-results.json)
node app/e2e/privacy.mjs --url https://lintroller.vercel.app --no-write
node app/e2e/a11y.mjs --url https://lintroller.vercel.app --shots /tmp/shots   # axe on the main screens
```

The build fails on any gate: copy rules, outbound links outside the official-source list, network APIs in the bundle, data schemas, headers that differ from the spec, banned code (`dangerouslySetInnerHTML`, `eval`, `console.log`), the evaluator scores, or more than 180 KB of gzipped JS.

## Test data only

The files in this repo are synthetic: hand-made fixtures and a seeded generator with labelled repeating charges. No real bank export was used to build or test it.

## Laws

The summary shows three consumer-action sentences, each linked to its official source (CFPB, eCFR), and the line "General information, not legal advice."

## Licence

MIT. See [LICENSE](LICENSE).
