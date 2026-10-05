# RESEARCH: Subscription Sweep (working name Lintroller), lane R1, 2026-10-04

Researched 2026-10-04, 20:55–21:25 ET, by R1 (Opus 5.5) with six parallel sweeps whose working files are in `_work/` (csv-formats, recurrence-competitors, merchant-normalisation, law, cancel-directory-A, cancel-directory-B). Every fact carries its source URL and a fetch date (all 2026-10-04 unless stated). Fetches were `curl` with the honest UA `SubscriptionSweepResearch/0.1 (+https://useslop.com/tools)` or the WebFetch tool; WebSearch was used to find URLs, never as a cited source. No accounts, logins, CAPTCHAs, paid tools or browser profiles. 403s and bot walls were recorded and not worked around. No real financial export was read: every example is synthetic. Anything not confirmed on an official page or a dated open-source file is marked **UNVERIFIED**.

Sections: §0 key findings · §1 CSV formats · §2 recurrence detection · §3 merchant normalisation + alias table · §4 law and consumer rights · §5 cancel directory · §6 competitors and prior art · §7 name · §8 privacy design · §9 the do-not-state list.

## §0. Key findings (one screen)

1. **No US bank publishes its CSV header.** Only PayPal's export columns are official (developer.paypal.com). Capital One's Debit/Credit split, Mint's and Venmo's column names are confirmed in open-source importers (csv2ofx, beancount-import). BofA, Chase, Wells Fargo, Citi, Discover, US Bank, Apple Card, Amex, Cash App and Monarch headers are best-known shapes only. Card issuers likely export purchases as **positive** numbers; Wells Fargo reportedly has **no header row**. So sniffing + a sign self-check + the generic column mapper are load-bearing (§1, SPEC §6). QFX/OFX: out of v1 (every bank that offers it also offers CSV).
2. **Recurrence heuristics have converged in open source.** Actual Budget (MIT) `find-schedules.ts`: ±2 days, ±7.5% amount, each expected occurrence present, transfers excluded, no quarterly/yearly. Sure (AGPL, ideas only): group by merchant not amount, 7.5% running-mean clusters, circular day-of-month check, 3 charges to act / 2 to suggest, price change after 2 charges at the new price. Plaid's recurring API (public docs): MATURE ≥ 3 charges, annual after 2, "at least 180 days of history"; it has no quarterly class (§2).
3. **`APPLE.COM/BILL` is the hardest descriptor**: Apple's own page confirms it and it carries no app name, so it covers iCloud, Apple Music, Apple TV and any in-app subscription. Cluster by amount and route to Apple's subscriptions page. 73 alias rows; 11 with an official descriptor source (§3).
4. **There is no federal click-to-cancel rule in force.** The Eighth Circuit vacated the FTC's 2024 rule on 2025-07-08; the FTC removed it from the CFR on 2026-02-12 and opened a new rulemaking (ANPRM) on 2026-03-13; no proposed rule as of today. ROSCA (15 U.S.C. 8401-8405) still applies; the FTC's Amazon Prime ROSCA settlement was $2.5B (2025-09-25). 9 state auto-renewal laws verified on official sites. Consumer-side: Reg E stop-payment (3 business days), Reg Z billing errors (60 days), CFPB guidance (§4).
5. **Cancel directory: 105 merchants checked, 85 verified** on official domains today (batch A 46/51, batch B 39/54); 403s and dead hosts (batch A: 13 merchants with a 403 on at least one URL; batch B: about 20 hosts with 403 and 4 with no response) are recorded, not evaded. Several help centers are JS shells, so "steps stated" must be confirmed per article by B3 (§5).
6. **Competitors that detect need your bank login** (Rocket Money, Monarch, Copilot, Hiatus, OneMain MyMoney/Trim, all via Plaid/MX/Finicity/Spinwheel); the private ones (Bobby, Subby, Wallos) detect nothing and need hand entry. Detection without a login, with evidence, is the gap (§6).
7. **Name: Lintroller** (`lintroller.vercel.app` free at 20:59 ET; no software collision found). Backups Whiskbroom, Crumbtray (§7).
8. **Privacy: bundle the data and ship `connect-src 'none'`**: the browser itself then blocks every fetch, XHR, beacon, WebSocket and EventSource from the page (W3C CSP3) (§8).

## §1. CSV export formats (source file: `_work/csv-formats.md`)
Research window: 2026-10-04, ~21:00-21:15 ET (hard-timeboxed per brief). All fetch dates below are 2026-10-04 unless noted. Tools used: WebSearch (standard), WebFetch, direct GitHub raw-file fetch. No logins, no CAPTCHAs, no paid tools, no real financial exports were read (synthetic examples only).

**Reading the verification column:**
- **official** = confirmed on the institution's own help/support/developer page (URL + fetch date given).
- **open-source (repo+file)** = confirmed by reading a dated importer's source/mapping file on GitHub.
- **UNVERIFIED** = best-known shape from third-party blogs/forums/converter-tool marketing pages (converging/consistent across sources, but no official or OSS confirmation found in the time available). Treated as a guess, not a fact, per the brief's hard rule.

A general caveat that applies to every row below: almost no US bank or card issuer publishes its literal CSV column schema on a public help page. Their help pages document *that* you can export (and to which formats: CSV/QFX/QBO/OFX) and *where* the button is, not the header string. So "officially documented" below usually means "the export feature and its format options are official," while the **exact header row is UNVERIFIED** unless an open-source importer file is cited.

#### 1. Core institutions

| # | Institution / export | Where in UI (official link if found) | Header row / preamble | Date format | Amount sign convention | Verification |
|---|---|---|---|---|---|---|
| 1 | **Bank of America** — checking/savings CSV | Online Banking → account → transaction activity → Download (CSV/QFX/QBO/OFX). No official bankofamerica.com help URL located in this window (only third-party how-tos reference the flow). | Reported shape: preamble summary lines (e.g. "Description,,,", beginning-balance line) above a header `Date,Description,Amount,Running Bal.`; business checking reportedly differs: `Posted Date,Reference Number,Payee,Address,Amount`. | MM/DD/YYYY (best known) | Single `Amount` column, debit negative (best known) | UNVERIFIED |
| 2 | **Bank of America** — credit card CSV | Same download control, card account. No official schema page found. | Reported shape: `Posted Date,Reference Number,Payee,Address,Amount` (no running balance column on cards) | MM/DD/YYYY (best known) | Single `Amount`; sign direction for purchases vs. checking NOT confirmed either way | UNVERIFIED |
| 3 | **Chase** — checking CSV | account Activity → download icon / "Download account activity" → CSV, OFX/QFX, or QIF; custom date range within a rolling window. No consumer chase.com help URL confirmed (only a commercial "Chase Connect" quick guide PDF was found: chase.com/content/dam/chase-ux/documents/commercial-banking/chase-connect/cc_quickguide_account_activity.pdf — that's for business Chase Connect, not retail chase.com, so not used as the official source here). | Reported shape: `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #` (Details = DEBIT/CREDIT/CHECK) | MM/DD/YYYY (best known) | Single `Amount`, debit negative (best known) | UNVERIFIED |
| 4 | **Chase** — credit card CSV | Account → Statements & Documents → "Download account activity" → CSV/OFX,QFX/QBO. | Cross-source agreement: `Transaction Date,Post Date,Description,Category,Type,Amount,Memo`. Quirk: on Sapphire/Freedom-type cards, `Amount` is a single column and purchases commonly post as **positive** numbers (opposite of checking); on Ink **business** cards the same export instead splits into separate debit/credit-style columns. | MM/DD/YYYY (best known) | Single `Amount` (consumer cards, purchases often positive) or split debit/credit (Ink business) — not officially confirmed | UNVERIFIED |
| 5 | **Wells Fargo** — checking/savings CSV | Sign in → account → "Download Account Activity" → "Comma Delimited Format (.csv)" or Quicken Web Connect. Page: wellsfargo.com/online-banking/software/web-connect (direct fetch 404'd this session; content known only via search-engine cache/third-party quotes, so treat the exact URL as unconfirmed even though the feature itself is real). | **No header row at all** — 5 raw columns per row: `Date, Amount, *, (blank), Description`. The 3rd column is a literal asterisk marking a posted (non-pending) row and carries no other info; the 4th column is always empty. This is the most consistently repeated claim across independent third-party sources, but no OSS file or Wells Fargo page was directly read to confirm it. | MM/DD/YYYY (best known) | Single `Amount`, debit negative (best known) | UNVERIFIED (very high third-party consensus, but no official/OSS confirmation reached) |
| 6 | **Wells Fargo** — credit card CSV | Same Download Account Activity flow on the card account. | Assumed same 5-column no-header shape as checking; not independently confirmed for cards specifically. | MM/DD/YYYY (best known) | Same as checking (best known) | UNVERIFIED |
| 7 | **Citi** — credit card CSV | online.citi.com → card account → Transactions → Filter by date → download/export icon → CSV. CSV download for cards reportedly limited to the current statement cycle; older history needs PDF statements. No public citi.com help URL found (flow is behind login). | Reported shape: `Status,Date,Description,Debit,Credit`, with an optional `Member Name` column appended on cards with a named cardmember. | MM/DD/YYYY (best known) | Split `Debit`/`Credit` columns; purchase = positive value under Debit, payment/refund = signed value under Credit (best known) | UNVERIFIED |
| 8 | **Capital One** — credit card CSV | capitalone.com → card account → Statements & Documents → "Download transaction" → CSV (also OFX/QFX available). History window reportedly 90 days–24 months depending on account. No public help.capitalone.com schema page found. | **Partially open-source confirmed.** csv2ofx's mapping file (see §3) consumes columns `Card No.`, `Posted Date`, `Description`, `Debit`, `Credit` — i.e. it treats the file as having separate Debit/Credit columns keyed by card number and posted date. Third-party sources add two more columns not referenced by that mapping: `Transaction Date` and `Category`, giving a commonly cited full header of `Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit`. | MM/DD/YYYY (best known for the two extra columns) | Split `Debit`/`Credit` columns — **open-source confirmed** | open-source (repo+file, partial) + UNVERIFIED (remainder) |
| 9 | **Capital One 360** — checking CSV (if different) | Same "Download Transactions" family of controls on a 360 checking/savings account; CSV/OFX/QFX offered. | Not found — 360 checking is reported to use a different, simpler layout than the card export (running-balance style, closer to a typical bank-checking CSV) but no header string was located this session. | Unknown | Unknown | UNVERIFIED (shape essentially unresearched beyond "it differs from the card format") |
| 10 | **American Express** — transaction/statement CSV | Official: [americanexpress.com — "Download and export transactions/software" FAQ](https://www.americanexpress.com/us/customer-service/faq.download-export-transactions-software.html) (fetched 2026-10-04). Confirms download to **Quicken, QuickBooks, or CSV**, covering recent activity plus the past six billing statements (two years of history viewable/filterable, but bulk download is scoped to "recent activity + 6 statements"). Exact column layout **not published** on this page. | Best-known (third-party) shape: `Date,Description,Card Member,Account #,Amount,Extended Details,Appears On Your Statement As,Address,City/State,Zip Code,Country,Reference,Category`. Amex is explicitly reported to have multiple un-versioned CSV variants over time, so column order/count can differ by download vintage. | MM/DD/YYYY (best known) | Single `Amount`; Amex is a **purchases-positive** issuer (charges positive, payments/credits negative) per third-party reports | official (export feature + formats) / UNVERIFIED (exact header) |
| 11 | **Discover** — card CSV | discover.com → card account → Activity & Statements → Download, choose CSV. **No public help-center page exists** — the feature sits entirely behind login, confirmed by its absence from Discover's public help docs in this search. | Best-known shape: `Trans. Date,Post Date,Description,Amount,Category`. A real user-forum thread ("Discover Card downloading CSV with charges as payments," infinitekind.tenderapp.com, fetched via search 2026-10-04) corroborates that Discover's sign convention has caused real import confusion in Quicken/Moneydance-adjacent tools. | MM/DD/YYYY (best known) | Single `Amount`; **purchases-positive** issuer per the forum-thread evidence above (best known, not a spec) | UNVERIFIED (no official page exists at all) |
| 12 | **US Bank** — checking/savings/card CSV | Official: [usbank.com Knowledge Base KB0069323](https://usbank.com/customer-service/knowledge-base/KB0069323.html) (fetched 2026-10-04). Confirms: My Accounts → account → Activity tab → Download → choose **Spreadsheet (.CSV), Quicken (.QFX), or QuickBooks (.QBO)**; up to 18 months of history. Exact column headers **not shown** on this official page. | Best-known (third-party) shape: 5 columns, `Date,Transaction,Name,Memo,Amount`. | MM/DD/YYYY (best known) | Single `Amount`, debit negative (best known) | official (export feature + formats) / UNVERIFIED (exact header) |
| 13 | **Apple Card** — monthly statement export | Official: [support.apple.com/en-us/102284 — "Download your Apple Card statements or export your transactions"](https://support.apple.com/en-us/102284) (fetched 2026-10-04). Confirms export from Wallet app (iPhone: CSV, OFX, QFX, or QBO; iPad: CSV only) **per billing-statement month**, and from card.apple.com with a **custom start/end date range** ("Statements → Export Transactions → choose dates → choose format → Export"). Note: this contradicts older third-party articles claiming only single-statement export with no custom range — the official page (read this session) describes a date-range export at card.apple.com, so that older limitation looks superseded by a feature update. Quicken 2019+/QuickBooks 2018+ compatibility stated. | Exact CSV header **not shown** on the official page. Best-known (third-party) shape: `Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD),Purchased By`. Monthly "Daily Cash" rebate is a Wallet-app display feature; whether it has its own CSV column is UNVERIFIED (best guess: no, Daily Cash is computed, not a transaction row). | MM/DD/YYYY (best known) | Single `Amount (USD)`; **purchases-positive** issuer (best known) | official (export mechanism/formats) / UNVERIFIED (exact header) |
| 14 | **PayPal** — Activity Download report | Official: [developer.paypal.com — Activity Download report](https://developer.paypal.com/docs/reports/online-reports/activity-download/) (fetched 2026-10-04). Confirms CSV (also TAB-separated, PDF, IIF, QIF). Max 50,000 records per CSV; larger exports are split and zipped. | **Fully official header list** (customizable/selectable, ~87 possible fields; core ones in order): `Date, Time, TimeZone, Name, Type, Status, Currency, Gross, Fee, Net, From Email Address, To Email Address, Transaction ID, ...` plus dozens of optional fields (shipping, tax, buyer/seller IDs, etc.). Users select which columns to include when building the report. | **MM/DD/YYYY** for US accounts (official) | `Gross`/`Fee`/`Net` columns are official-named; exact +/- sign convention not stated on the fetched page (reasonable inference: Gross positive for money in, negative for money out, Fee usually negative) — **sign direction itself is UNVERIFIED** | official (headers, date format, UTF-8 encoding) / UNVERIFIED (sign convention specifics) |
| 15 | **Venmo** — statement CSV | Official: [help.venmo.com — "Transaction History"](https://help.venmo.com/hc/en-us/articles/360016096974-Transaction-History) (fetched 2026-10-04, via search). Confirms: venmo.com → Statements → pick month/year → "Download CSV" (one month per file; app offers the same, emailing the file if too large); history available in 1-month windows going back **3 years**. | **Open-source confirmed columns** (see §3, jbms/beancount-import `venmo.py`, fetched 2026-10-04): `ID, Datetime, Type, Status, Note, From, To, Amount (total), Amount (fee), Funding Source, Destination` (plus a separate balance-summary file with `Start Date, End Date, Start Balance, End Balance`). The importer's code reads the header at row 1 via `csv.DictReader`; separately, third-party reports claim the *raw* downloaded file has 2 metadata/title rows before the real header (row 3) — these two claims aren't contradictory if the importer pre-strips the preamble before parsing, but that reconciliation is **UNVERIFIED**. | Not a plain date — `Datetime` column, timestamp-style (exact string format UNVERIFIED) | `Amount (total)` signed; community reports show it rendered as text like `+ $50.00` / `- $25.00` (with spaces and a `$`), which would need stripping before parsing as a number (UNVERIFIED formatting detail) | official (export mechanism) + open-source (column names) / UNVERIFIED (preamble rows, exact amount text format) |
| 16 | **Cash App** — statement CSV | cash.app/account (desktop browser only — the mobile app offers PDF-style "statements," not CSV) → activity/statements → "Export CSV." No official help.cash.app schema page located; description comes from third-party/tax-tool support articles only. | **Weakest-documented format in this set.** No reliable header list found. Low-confidence guess (given Cash App supports P2P, card spend, and Bitcoin/stock trading, its export likely needs asset-related columns): something like `Transaction ID, Date, Transaction Type, Currency, Amount, Fee, Net Amount, Asset Type, Asset Price, Asset Amount, Status, Notes` — **this is a guess, not a researched fact.** | Unknown | Unknown | UNVERIFIED (low confidence — flag for a real sample file before building a parser) |

##### Notes on the core-institution table

- **BofA / Chase / Wells Fargo / Citi / Capital One / Discover**: none of these had a public page showing the literal CSV header string. This matches a broader pattern: big US retail banks treat the OFX/QFX/QBO Direct-Connect formats as the "real," semi-documented interchange format (because Intuit/Quicken certifies against them), while the human-facing "Download as CSV" button is an undocumented, can-change-anytime convenience feature. Any subscription-sweep importer for these banks should be built defensively (sniff + let the user confirm column mapping) rather than hard-coded against a guessed header.
- **Wells Fargo's no-header, 5-column, asterisk-marked shape** is the single most load-bearing "gotcha" in this whole set if true — a naive CSV parser that assumes row 1 is a header will silently treat a real transaction as a header and drop it. Strongly recommend a synthetic fixture test for this exact shape even though it's UNVERIFIED.
- **Capital One** is the only major-bank card issuer in this list with an actual open-source mapping file (csv2ofx) confirming part of its shape — everyone else above is third-party-blog-only.
- **Amex / Discover / Apple Card** all plausibly share the "purchases post as positive, payments/credits post as negative" sign convention common among card issuers (vs. checking accounts, which are almost universally "debit negative"). None of the three is officially confirmed on this point — this is exactly the kind of sign-convention trap the product brief calls out, and it should be a dedicated unit-test case per issuer once real sample files are available.
- **Discover has no public help page at all** for this feature — it's the only institution in the set where even the *existence* of the export button isn't documented anywhere public.

#### 2. PayPal / Venmo / Cash App as a group

These three are the most "fintech-native" of the set and behave less like bank CSVs and more like structured transaction ledgers (PayPal's is genuinely rich — up to 87 selectable fields). PayPal is the best-documented export of anything in this research (official developer docs, exact header list, exact date format, exact encoding). Venmo is well-documented for the *procedure* and its *column names* are open-source-confirmed via a real importer, but several formatting details (timestamp format, signed-amount text rendering) are not nailed down. Cash App is the weak link — no official schema, no OSS importer found in the time available, only vague third-party mentions.

#### 3. Open-source evidence actually read this session

| Project | File(s) read | Repo | Fetch date | What it confirmed | Licence / last commit |
|---|---|---|---|---|---|
| **csv2ofx** (reubano) | `csv2ofx/mappings/capitalone.py` | github.com/reubano/csv2ofx | 2026-10-04 | Capital One card mapping keys on `Card No.`, `Posted Date`, `Description`, `Debit`, `Credit`; type = DEBIT if a Debit value is present else CREDIT. | Not visible in the fetched excerpt (PyPI listing conventionally shows MIT for this project, but that was not independently re-confirmed this session) |
| **csv2ofx** (reubano) | `csv2ofx/mappings/mint.py` | github.com/reubano/csv2ofx | 2026-10-04 | Mint CSV mapping keys on `Account Name, Date, Transaction Type, Amount, Original Description, Description, Notes, Category` — cross-validates the independently-reported Mint header almost exactly. | Not visible in the fetched excerpt |
| **csv2ofx** (reubano) | mappings directory listing | github.com/reubano/csv2ofx/tree/master/csv2ofx/mappings | 2026-10-04 | **Notable negative finding**: the repo ships dedicated mapping files for `capitalone.py`, `mint.py`, `schwabchecking.py`, `pcmastercard.py`, several EU/international banks, etc. — but **no dedicated file for chase, bank of america, wells fargo, citi, amex, discover, or us bank.** Those institutions would fall back to csv2ofx's generic `default.py` mapping (user supplies column positions) rather than a maintained per-bank mapping. This is itself a useful signal that even mature open-source importers don't bother hard-coding most big US banks' CSV shape — they lean on OFX/Direct Connect instead. | n/a (directory listing) |
| **beancount-import** (jbms) | `beancount_import/source/venmo.py` | github.com/jbms/beancount-import | 2026-10-04 | Venmo transaction CSV column names: `ID, Datetime, Type, Status, Note, From, To, Amount (total), Amount (fee), Funding Source, Destination`; separate balance file with `Start Date, End Date, Start Balance, End Balance`. Parsed via `csv.DictReader` (header assumed at row 1 of whatever is handed to it). | Not visible in the fetched excerpt |

No other open-source importer repositories (ofxstatement plugins, hledger CSV rules, Firefly III importer configs, Actual Budget importer code, beancount-reds-importers, beancount smart_importer) were read directly this session beyond what's listed above — they were only surfaced as search-result titles (see e.g. `beancount-reds-importers` and `beancount-chase-bank` on PyPI), not opened. Treat them as **leads for a follow-up pass**, not as sources used here.

#### 4. Budget-app export family

| App | Status | Columns (best known) | Date format | Sign convention | Verification |
|---|---|---|---|---|---|
| **Mint** | Shut down by Intuit; commonly cited shutdown date **March 23, 2024** (date itself not re-confirmed against an Intuit press page this session — treat as UNVERIFIED despite being widely repeated). No new exports possible; only pre-shutdown CSVs already on users' drives exist now, plus a "Mint Data Exporter by Monarch" Chrome extension that scraped Mint before shutdown. | `Date, Description, Original Description, Amount, Transaction Type, Category, Account Name, Labels, Notes` — cross-validated by both independent third-party reporting **and** the csv2ofx `mint.py` mapping (§3). | MM/DD/YYYY (best known) | `Amount` is always a positive magnitude; direction lives in `Transaction Type` (`debit`/`credit`) — best known, matches csv2ofx mapping's separate `type` field | open-source (csv2ofx) + strong third-party corroboration |
| **YNAB** | Active. Official: [support.ynab.com — "How to Export Plan Data"](https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9.md) (fetched 2026-10-04) confirms export exists as **CSV, or TSV if your budget's currency uses a comma decimal separator** — but the page does not show exact column names. | Best-known (third-party): `Date, Payee, Category, Memo, Outflow, Inflow`. Notable quirk: **no signed amount column** — YNAB splits into Outflow/Inflow, and the unused side is written literally `"$0.00"` rather than left blank. | Unknown/UNVERIFIED | Split `Outflow`/`Inflow`, not a signed `Amount` — this is itself the most important "this app is different" fact for a sniffer | official (export exists, CSV/TSV) / UNVERIFIED (exact columns) |
| **Monarch Money** | Active. No official *export*-schema help page found (only an official *import* article, help.monarch.com, which is the inverse direction). Procedure reported: Accounts → pick account → Edit → "Download transactions" (per-account), or Settings → Data → "Download Transactions" (all accounts, one CSV); capped around 10,000 rows per download, 5,000 recommended. | Best-known (third-party): `Date, Merchant, Category, Account, Amount, Notes, Tags`, with an alternate "Original Statement" column holding the raw bank descriptor behind Monarch's cleaned-up `Merchant` name. | **ISO, YYYY-MM-DD** (best known — notable, since every bank above uses MM/DD/YYYY) | Single `Amount`, negative = money out, positive = money in (best known) | UNVERIFIED |
| **Rocket Money** | Active. Official: [help.rocketmoney.com — "Exporting Transactions"](https://help.rocketmoney.com/en/articles/10296106-exporting-transactions) (confirmed via search 2026-10-04) — export exists (web only; mobile triggers an emailed download link you must open on desktop). Column layout **not documented** anywhere found. | Unknown | Unknown | Unknown | official (export exists) / UNVERIFIED (everything about the shape) |
| **Copilot / Simplifi** | **Not researched this session** — ran out of time budget before reaching these two. No claim made either way. | n/a | n/a | n/a | not researched |

**Recommendation on a "budget app export" family for v1:** include **Mint only** in v1. Reasoning: Mint is dead but has an enormous installed base of already-downloaded CSVs sitting on people's drives (anyone searching "track my subscriptions" post-Mint-shutdown is a plausible user), its format is dead simple (flat columns, no preamble, no split debit/credit), and it's the one budget-app format with real cross-validated evidence in this research. YNAB/Monarch/Rocket Money users are, almost by definition, people who already actively track their money in a dedicated tool and likely already know about their recurring subscriptions — lower marginal value for a tool whose whole pitch is "find the subscriptions you forgot about." Treat YNAB/Monarch as v1.1 stretch goals (their shapes are different enough — Outflow/Inflow, ISO dates — to need explicit signatures, but the generic column-mapping fallback would catch them even without dedicated support). Leave Copilot/Simplifi out until there's a specific user request, since they're completely unresearched.

#### 5. Quicken OFX/QFX vs. QBO — in or out of v1?

- **OFX 1.x** is **SGML**, not XML: a colon-delimited header block (`OFXHEADER:100`, `DATA:OFXSGML`, `VERSION:102`, etc.) followed by an SGML body where many elements are **not closed** (tag soup — e.g. `<DTPOSTED>20261001` with no `</DTPOSTED>`). **OFX 2.x** is well-formed **XML** (has an XML declaration, every element closed), far easier to parse with a browser's native `DOMParser`.
- **QFX** (Quicken) and **QBO** (QuickBooks) are Intuit's branded variants of OFX — structurally still OFX (usually still OFX 1.x/SGML in the wild for consumer bank downloads), just with an added proprietary `INTU.BID` field that locks the file to Intuit's apps and a different file extension so the OS routes it to Quicken/QuickBooks instead of a generic OFX reader.
- **Source for the version split**: the `ofxtools` open-source Python project (pypi.org/project/ofxtools, ofxtools.readthedocs.io — surfaced via WebSearch 2026-10-04, not independently re-fetched directly, so treat the *existence and purpose* of the project as solid but the specific wording above as my own paraphrase of the search summary, not a verbatim quote) exists specifically because OFX 1.x's SGML looseness is hard enough to parse that it needed a dedicated library with lenient-parsing logic.
- **Which of the banks above offer it**: BofA, Chase, Wells Fargo, US Bank, Capital One, Amex, and Apple Card were all confirmed above (official or near-official) to offer QFX/QBO/OFX alongside CSV. Citi and Discover's OFX/Direct-Connect availability was **not confirmed either way** this session (their web portals' visible download pickers weren't fully inspectable without a login).
- **Complexity of parsing OFX 1.x SGML in a browser**: materially higher than CSV. You cannot hand SGML-OFX to a standard XML parser as-is — bank-to-bank inconsistency in which tags get closed means a real parser needs a normalization pass (typically: regex-insert closing tags for known leaf elements, strip/repair the header block separately from the SGML body, then parse the now-well-formed result with `DOMParser`). This is exactly the kind of problem dedicated libraries like `ofxtools`/`ofxparse` exist to solve — reimplementing even a subset of that in-browser is a real, nontrivial effort, not a weekend add-on.
- **Recommendation: OUT of v1.** Every institution in this research that offers OFX/QFX also offers CSV, so there's no coverage gain — only parser-complexity cost (a second file format with genuinely different parsing difficulty: tag-soup SGML vs. trivial delimited text). Revisit only if user testing shows a meaningful segment of users would rather drag in a Quicken file they already have than re-export a CSV.

#### 6. Sniffing strategy

**Approach:** read the first ~5 lines of the dropped file (post-BOM-strip). Check, in order, for a small set of highly distinctive substrings/column-name combinations that are unlikely to collide across formats (prefer rare multi-word or oddly-punctuated header names — `"Extended Details"`, `"Purchased By"`, `"Amount (total)"`, `"Outflow"`/`"Inflow"` — over generic ones like `"Date"` or `"Amount"` alone, which appear everywhere). If nothing matches and row 1 doesn't even look like a header (Wells-Fargo-style headerless file, or an unrecognized shape), fall back to a **generic column-mapping** step: auto-detect candidate columns by content (a column where >90% of values parse as a date → date candidate; a column where >90% parse as currency/number → amount candidate, or two such columns that are near-mutually-exclusive per row → debit/credit pair; the remaining highest-cardinality text column → description), pre-fill a mapping UI, and let the user confirm/correct date column, description column, amount column(s), and a "debits are negative vs. debits are positive" toggle before computing anything.

| format id | header signature (distinctive substrings) | sign convention | date format |
|---|---|---|---|
| `boa-checking` | `"Running Bal."` present in first 10 lines | single Amount, debit negative (UNVERIFIED) | MM/DD/YYYY |
| `boa-card` | `"Reference Number"` + `"Payee"` in header | single Amount, direction UNVERIFIED | MM/DD/YYYY |
| `chase-checking` | `"Posting Date"` + `"Check or Slip #"` in header | single Amount, debit negative (UNVERIFIED) | MM/DD/YYYY |
| `chase-card` | `"Transaction Date"` + `"Post Date"` + `"Memo"` in header | single Amount, purchases often positive (UNVERIFIED); Ink variant splits Debit/Credit | MM/DD/YYYY |
| `wells-fargo` | **no header row**; line 1 matches `date, number, (*|empty), empty, "quoted description"` — 5 comma fields, 3rd field is blank or a bare `*` | single Amount, debit negative (UNVERIFIED) | MM/DD/YYYY |
| `citi-card` | `"Status"` + `"Debit"` + `"Credit"` in header | split Debit/Credit, purchase positive under Debit (UNVERIFIED) | MM/DD/YYYY |
| `capitalone-card` | `"Card No."` + `"Debit"` + `"Credit"` in header | split Debit/Credit — **open-source confirmed** | MM/DD/YYYY |
| `amex` | `"Extended Details"` + `"Appears On Your Statement As"` in header | single Amount, purchases positive (UNVERIFIED) | MM/DD/YYYY |
| `discover` | `"Trans. Date"` + `"Post Date"` in header | single Amount, purchases positive (UNVERIFIED, forum-corroborated) | MM/DD/YYYY |
| `usbank` | header is exactly/closely `"Date,Transaction,Name,Memo,Amount"` | single Amount, debit negative (UNVERIFIED) | MM/DD/YYYY |
| `apple-card` | `"Clearing Date"` + `"Purchased By"` in header | single `Amount (USD)`, purchases positive (UNVERIFIED) | MM/DD/YYYY |
| `paypal` | `"Time Zone"` + `"Gross"` + `"Fee"` + `"Net"` all in header | Gross/Fee/Net column names **official**; sign direction UNVERIFIED | MM/DD/YYYY (official, US accounts) |
| `venmo` | `"Amount (total)"` + `"Funding Source"` in header (possibly after 1-2 preamble rows) | `Amount (total)` signed, rendered as `"+ $50.00"`/`"- $25.00"` text (UNVERIFIED format) | timestamp (`Datetime` column; exact string format UNVERIFIED) |
| `cashapp` | no confirmed signature — guess: `"Asset Type"` + `"Net Amount"` | UNVERIFIED | UNVERIFIED |
| `ynab` | `"Outflow"` + `"Inflow"` in header | split Outflow/Inflow; unused side literal `"$0.00"`, never blank | UNVERIFIED |
| `monarch` | `"Merchant"` + `"Tags"` + `"Account"` in header | single Amount, negative = out (UNVERIFIED) | **ISO YYYY-MM-DD** (best known — differs from every bank format above) |
| `mint` | `"Original Description"` + `"Labels"` + `"Transaction Type"` in header | Amount always positive; direction in Transaction Type — open-source confirmed | MM/DD/YYYY (best known) |
| `generic` | none of the above matched | user-mapped: pick date / description / amount columns + debit-negative-or-positive toggle | user-confirmed |

#### 7. Synthetic sample fixtures (one 3-line sample per format)

All merchant names, amounts, account numbers and dates below are invented for testing only — **not real data**. Verification tag after each block repeats the shape's confidence level from the tables above.

```text
# boa-checking — UNVERIFIED shape
Date,Description,Amount,Running Bal.
09/02/2026,NETFLIX.COM 800-585-4219 CA,-15.49,2431.02
09/15/2026,SPOTIFY USA,-11.99,2419.03
```

```text
# boa-card — UNVERIFIED shape
Posted Date,Reference Number,Payee,Address,Amount
09/03/2026,24891002APPLE,APPLE.COM/BILL,CUPERTINO CA,-9.99
09/18/2026,24891077HULU,HULU 866-9977-BOX,LOS GATOS CA,-17.99
```

```text
# chase-checking — UNVERIFIED shape
Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,09/05/2026,NETFLIX.COM NETFLIX.COM CA,-15.49,ACH_DEBIT,5120.44,
DEBIT,09/20/2026,SPOTIFY USA 877-7781-234 NY,-11.99,ACH_DEBIT,5104.45,
```

```text
# chase-card — UNVERIFIED shape (sign direction uncertain)
Transaction Date,Post Date,Description,Category,Type,Amount,Memo
09/06/2026,09/07/2026,DISNEY PLUS,Entertainment,Sale,13.99,
09/21/2026,09/22/2026,AMAZON PRIME,Shopping,Sale,14.99,
```

```text
# wells-fargo — UNVERIFIED shape; NO header row (this IS the first line of the file)
09/07/2026,-15.49,*,,"NETFLIX.COM 800-5854219 CA"
09/22/2026,-11.99,*,,"SPOTIFY USA 8777781234 NY"
```

```text
# citi-card — UNVERIFIED shape
Status,Date,Description,Debit,Credit
Cleared,09/08/2026,HULU 866-9977-BOX,17.99,
Cleared,09/23/2026,YOUTUBE PREMIUM,13.99,
```

```text
# capitalone-card — Debit/Credit split is open-source confirmed; other columns UNVERIFIED
Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
09/09/2026,09/10/2026,4421,NETFLIX.COM,Entertainment,15.49,
09/24/2026,09/25/2026,4421,DISNEY PLUS,Entertainment,13.99,
```

```text
# amex — UNVERIFIED shape
Date,Description,Card Member,Account #,Amount,Extended Details,Appears On Your Statement As,City/State,Category
09/10/2026,NETFLIX.COM,J SAMPLE,-21002,15.49,,NETFLIX.COM 866-5794244,LOS GATOS CA,Entertainment
09/25/2026,HULU,J SAMPLE,-21002,17.99,,HULU 866-9977BOX,LOS GATOS CA,Entertainment
```

```text
# discover — UNVERIFIED shape
Trans. Date,Post Date,Description,Amount,Category
09/11/2026,09/12/2026,SPOTIFY USA,11.99,Services
09/26/2026,09/27/2026,YOUTUBE PREMIUM,13.99,Services
```

```text
# usbank — UNVERIFIED shape
Date,Transaction,Name,Memo,Amount
09/12/2026,DEBIT,NETFLIX.COM,RECURRING,-15.49
09/27/2026,DEBIT,SPOTIFY USA,RECURRING,-11.99
```

```text
# apple-card — UNVERIFIED shape
Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD),Purchased By
09/13/2026,09/14/2026,APPLE.COM/BILL,Apple,Entertainment,Purchase,9.99,Sample User
09/28/2026,09/29/2026,APPLE TV+,Apple,Entertainment,Purchase,9.99,Sample User
```

```text
# paypal — headers/date-format/encoding OFFICIAL; sign direction UNVERIFIED
Date,Time,TimeZone,Name,Type,Status,Currency,Gross,Fee,Net
09/14/2026,08:02:11,PDT,Netflix Inc,Subscription Payment,Completed,USD,-15.49,0.00,-15.49
09/29/2026,08:05:40,PDT,Spotify USA,Subscription Payment,Completed,USD,-11.99,0.00,-11.99
```

```text
# venmo — column names open-source confirmed; preamble rows and amount text format UNVERIFIED
ID,Datetime,Type,Status,Note,From,To,Amount (total),Amount (fee),Funding Source,Destination
302991884,2026-09-15T10:32:00,Payment,Complete,Netflix split,Sample User,Jane Roommate,- $7.75,$0.00,Venmo balance,Jane Roommate
303104471,2026-09-30T09:14:00,Payment,Complete,Spotify family,Sample User,Jane Roommate,- $6.00,$0.00,Venmo balance,Jane Roommate
```

```text
# cashapp — LOW-CONFIDENCE GUESS, essentially unresearched
Transaction ID,Date,Transaction Type,Currency,Amount,Fee,Net Amount,Status,Notes
C9f8e2,2026-09-16,Payment,USD,-9.99,0.00,-9.99,Completed,
C9f901,2026-10-01,Payment,USD,-9.99,0.00,-9.99,Completed,
```

```text
# ynab — export mechanism official; columns UNVERIFIED
Date,Payee,Category,Memo,Outflow,Inflow
09/17/2026,Netflix,Subscriptions,,$15.49,$0.00
10/02/2026,Spotify,Subscriptions,,$11.99,$0.00
```

```text
# monarch — UNVERIFIED shape
Date,Merchant,Category,Account,Amount,Notes,Tags
2026-09-18,Netflix,Subscriptions,Sample Checking,-15.49,,
2026-10-03,Hulu,Subscriptions,Sample Checking,-17.99,,
```

```text
# mint — open-source confirmed column set (defunct service, pre-2024 exports only)
Date,Description,Original Description,Amount,Transaction Type,Category,Account Name,Labels,Notes
09/19/2026,Netflix,NETFLIX.COM 8005854219 CA,15.49,debit,Movies & DVDs,Sample Checking,,
10/04/2026,Spotify,SPOTIFY USA 8777781234 NY,11.99,debit,Music,Sample Checking,,
```

```text
# generic fallback — no format id matched; user confirms the mapping
TransactionDate,Payee,Category,Debit,Credit,RunningBalance
2026-09-20,NETFLIX.COM,Bills,15.49,,8120.11
2026-10-05,SPOTIFY USA,Bills,11.99,,8108.12
```

#### 8. Verification tally

- **Official** (feature/format and often exact fields confirmed on the institution's own page): American Express (export options), US Bank (export options, KB0069323), Apple Card (export mechanism incl. date-range export, support.apple.com/en-us/102284), PayPal (full header list + date format + encoding, developer.paypal.com), Venmo (export mechanism, help.venmo.com), YNAB (export exists, CSV/TSV, support.ynab.com), Rocket Money (export exists, help.rocketmoney.com). That's **7 institutions/apps** with at least the export mechanism officially confirmed — but only **PayPal** has its exact column schema officially confirmed end-to-end.
- **Open-source confirmed** (column names read from a dated importer file): Capital One card (partial — Debit/Credit/Card No./Posted Date/Description via csv2ofx `capitalone.py`), Mint (via csv2ofx `mint.py`, cross-validated), Venmo (column names via jbms/beancount-import `venmo.py`). That's **3 formats** with real open-source confirmation.
- **UNVERIFIED** (best-known shape only, no official or OSS confirmation reached in the time window): BofA checking, BofA card, Chase checking, Chase card, Wells Fargo (both), Citi card, Capital One 360 checking, Discover, Cash App, Monarch, and most of the exact-header details even for the "official" rows above (Amex/US Bank/Apple Card officially confirm the export *feature*, not the header string). That's the **majority of the 18 requested formats** — this reflects reality, not a research shortfall: these institutions simply don't publish their CSV schemas.
- **Not researched at all** (ran out of time): Copilot, Simplifi, and a same-session read of ofxstatement/Firefly III/Actual Budget/hledger importer source (only surfaced as search leads, not opened).

**Biggest quirks/gotchas for the build:**
1. Wells Fargo's reported no-header, asterisk-marked 5-column shape will silently eat a real transaction if a parser assumes row 1 is a header.
2. Card issuers (Amex/Discover/Apple Card, reportedly Chase consumer cards) likely post **purchases as positive** numbers, the opposite of checking-account convention — a single hard-coded "debit = negative" rule will invert every subscription charge for these issuers.
3. YNAB has no signed amount column at all (Outflow/Inflow, zero side literally `"$0.00"`), and Citi/Capital One split Debit/Credit — three different non-signed-amount shapes to handle before even reaching the generic fallback.
4. Venmo's real downloaded file may have preamble rows before the header (contested between sources) and amount values formatted as `"+ $50.00"` text, not a bare number.
5. Monarch is the one format reporting **ISO dates (YYYY-MM-DD)** against a sea of MM/DD/YYYY everywhere else.
6. Almost nothing here is actually publicly documented at the schema level — the sniffer's generic column-mapping fallback (section 6) is not an edge case, it's load-bearing for most of v1's institution coverage.

## §2. Recurrence detection (source file: `_work/recurrence-competitors.md`, part 1)
Lane R1-research, Subscription Sweep. All fetches made 2026-10-04 between 20:58 and 21:12 ET with UA `SubscriptionSweepResearch/0.1 (+https://useslop.com/tools)` (curl) or the WebFetch tool. "Fetched" below always means 2026-10-04. No accounts, no logins, no paid pages. Anything not read on a primary page is marked UNVERIFIED. Our repo is MIT: MIT/Apache/BSD sources = ideas and code with attribution; GPL/AGPL sources = ideas only, never copied code.

---

#### PART 1: Recurrence detection

##### 1.1 Plaid `/transactions/recurring/get` (the industry's reference API)

Source: https://plaid.com/docs/api/products/transactions/ (read via the Markdown twin https://plaid.com/docs/api/products/transactions/index.html.md, HTTP 200, 179,996 bytes, fetched 2026-10-04).

- Returns separate `inflow_streams` and `outflow_streams` ("a summary of the recurring outflow and inflow streams (expenses and deposits) from a user's checking, savings or credit card accounts"). Paid add-on: "This endpoint is offered as an add-on to Transactions. To request access to this endpoint, submit a product access request".
- Stream fields: `account_id`, `stream_id`, `description`, `merchant_name` (nullable), `first_date`, `last_date`, `predicted_next_date` ("This will only be set if the next payment date can be predicted"), `frequency`, `transaction_ids` ("sorted by posted date"), `average_amount`, `last_amount`, `is_active` ("Indicates whether the transaction stream is still live"), `status`, `personal_finance_category`. Response example also shows `is_user_modified`.
- `frequency` enum, verbatim: "Possible values: `UNKNOWN`, `WEEKLY`, `BIWEEKLY`, `SEMI_MONTHLY`, `MONTHLY`, `ANNUALLY`". SEMI_MONTHLY "is typically seen for inflow transaction streams". **There is no QUARTERLY or SEMI-ANNUAL class**; those land in `UNKNOWN`.
- `status` enum, verbatim:
  - "`MATURE`: A `MATURE` recurring stream should have at least 3 transactions and happen on a regular cadence (For Annual recurring stream, we will mark it `MATURE` after 2 instances)."
  - "`EARLY_DETECTION`: When a recurring transaction first appears in the transaction history and before it fulfills the requirement of a mature stream, the status will be `EARLY_DETECTION`."
  - "`TOMBSTONED`: A stream that was previously in the `EARLY_DETECTION` status will move to the `TOMBSTONED` status when no further transactions were found at the next expected date."
  - "`UNKNOWN`: A stream is assigned an `UNKNOWN` status when none of the other statuses are applicable."
- History: "Customers using Recurring Transactions should request at least 180 days of history for optimal results."
- Plaid does not publish its tolerances or algorithm (not on the page). UNVERIFIED: anything about how Plaid scores streams.

**What we take (facts, not code):** the output shape (first/last/predicted-next date, average AND last amount, active flag, maturity status), the thresholds "3 for mature, 2 for annual", "tombstone when the next expected date passes with nothing", and the "ask for ≥ 180 days" user guidance.

##### 1.2 Open-source detectors

| Project | Licence (SPDX, from api.github.com `license.spdx_id`, fetched 2026-10-04) | File(s) read | What it does | What we may take |
|---|---|---|---|---|
| Actual Budget, https://github.com/actualbudget/actual (commit 9732a4463aac2909ac2aad1627085e0eb7a207b5) | **MIT** ("Copyright James Long", LICENSE.txt) | `packages/loot-core/src/server/schedules/find-schedules.ts` (391 lines); `packages/loot-core/src/shared/rules.ts` `getApproxNumberThreshold` | "Find schedules": per account, from the latest transaction date, tries patterns weekly, every 2 weeks, monthly on day X (start day only 1-28: "28 is the max number of days that all months are guaranteed to have"), monthly last day (`patterns: [{ type: 'day', value: -1 }]`), monthly 1st/3rd and 2nd/4th weekday. For each candidate start it generates the next **3** occurrences (`occurrences({ take: 3 })`) and requires a transaction at **every** one, within **±2 days** (`subDays(date, 2)`..`addDays(date, 2)`), same payee, amount within **±7.5%** (`Math.round(Math.abs(number) * 0.075)`). Transfers excluded (`'payee.transfer_acct': null`). Rank = Σ 1/(dayDiff+1); best rank per payee wins; `exactDate`/`exactAmount` flags pick `is` vs `isapprox`. Then walks back in time to find the true start. **No quarterly or yearly discovery.** | Ideas AND code with attribution (keep the MIT notice in THIRD_PARTY_NOTICES). In practice we re-implement on pure rows (theirs queries a DB), taking: 7.5% amount band, ±2-day day window, separate "last day of month" pattern, rank-by-day-distance, "require every expected occurrence", exclude transfers. Do not copy the weekday patterns: `monthly1stor3rd`/`monthly2ndor4th` take the weekday from `new Date()` (today) rather than the candidate start, which reads as a bug. |
| Sure (community fork of Maybe Finance), https://github.com/we-promise/sure (commit 2f17d7c6ad4c543bb19499037cefd8f0c5fa855a) | **AGPL-3.0** | `app/models/recurring_transaction/identifier.rb`, `price_change_detector.rb`, `cleaner.rb` | Groups 3 months of non-transfer entries by merchant (or name) + currency + account, "deliberately NOT by amount"; inside a group, clusters amounts within **7.5%** of the cluster's running mean (`DEFAULT_TOLERANCE_PCT = 7.5`; "Comparing against the mean (not the neighbor) stops a chain of small steps from drifting one cluster across genuinely different prices"). Needs **3** occurrences to create a series automatically, **2** to offer a candidate ("Two consistent occurrences are enough to OFFER a candidate (the automatic pipeline keeps requiring three to act on its own)"). Last occurrence must be within **45 days**. Every day-of-month must sit within **2 days** (`DAY_MATCH_TOLERANCE = 2` in `app/models/recurring_transaction/schedule.rb`, line 15) of the expected day "on the circular calendar ... a day-30 bill's February charge on the 28th is 2 away, in"; expected day = circular median. It "replaced a standard-deviation test that averaged the drift and so accepted charges scattered across the 5th, 10th and 15th". Excludes Investment/Crypto accounts (dividends and 401k contributions look recurring) and amounts under $1 (`MINIMUM_CANDIDATE_AMOUNT = 1`). New series land as `suggested` awaiting user confirmation; dismissed ("ended") rows are tombstones that detection never recreates. Price change: "Two consecutive paid occurrences ... agreeing on an amount different from the series' -- that is a price change, not noise. One odd charge is never enough." Staleness "is measured in the series' own cycles, so quarterly and annual bills survive". Income is matched by source, not amount ("a variable paycheck ... never forms an amount cluster"). | **Ideas only** (AGPL). Ideas worth taking: group by merchant not amount, cluster vs running mean, per-occurrence day check on a circular calendar (not std-dev), 3 = confident / 2 = suggest, "suggested until confirmed", dismissals are sticky, price change = 2 consecutive at the new price, staleness in own cycles. Do NOT take the $1 floor: sub-$1 subscriptions exist (e.g. a $0.99 storage tier; price UNVERIFIED this lane). |
| Maybe Finance, https://github.com/maybe-finance/maybe | **AGPL-3.0**; `archived: true`, last push 2025-07-24 | none | The GitHub tree listing for `main` returned no path containing "recurr" (listing may be truncated; UNVERIFIED that Maybe never had a detector). Sure's recurring subsystem appears to be Sure's own work. | Nothing. |
| Firefly III, https://github.com/firefly-iii/firefly-iii | **AGPL-3.0** | none | Docs nav lists "How to use recurring transactions" (https://docs.firefly-iii.org/, nav text fetched; the deep link I tried, /references/firefly-iii/recurring-transactions/, returned 404). That recurring transactions are user-defined, not detected: UNVERIFIED. | Nothing. |
| Wallos, https://github.com/ellite/Wallos | **GPL-3.0** | none | Self-hosted manual subscription tracker (helper fetch of the repo page; no detection). | Nothing (and no code). |
| beancount / hledger plugins | not searched (time box) | | | UNVERIFIED: no plugin found in this pass. |

Other writeups (secondary, cited for context only, not as authority):
- SubTracker, "How Apps Detect Recurring Charges in Bank Data", https://subtracker.io/build/recurring-charge-detection ("Updated September 29, 2026"): "A monthly subscription produces gaps clustered around 28–31 days; an annual one around 365"; "A charge on the 31st moves to the 28th or 30th in shorter months"; "a percentage band around the median amount of the group"; "Every subscription bought inside an iPhone app is charged by Apple under one merchant name ... cannot say which app each one belongs to"; "A detector reading ninety days of history has never seen last year's annual renewal". No code or licence.
- Subaio (white-label subscription management for banks), https://subaio.com/?p=12719: page fetched, no technical detail on detection. Finexer (https://blog.finexer.com/recurring-transaction-detection-bank-data-apis/) and wealthAPI (https://wealthapi.eu/en/the-revolution-of-cash-flow-analysis-from-rigid-rules-to-intelligent-vectorization/) appeared in search; not read (time box).
- No bank or fintech primary engineering paper with numbers was found in this pass: UNVERIFIED gap.

##### 1.3 Heuristics, decided

**Calendar maths.** Parse dates as plain calendar days (integer day numbers from YYYY-MM-DD computed in UTC) so DST never shifts a day. Prefer the export's transaction date over its post date when both exist. "As of" = the last date in the file, never the wall clock (old exports must not make every stream look ended).

**Cadence classes** (expected next date is calendar-aware for month-based classes; the anchor day is clamped to the month's last day, so Jan 31 → Feb 28/29 → Mar 31, and Feb 29 yearly → Feb 28):

| Cadence | Nominal | Day tolerance | Per year | Notes |
|---|---|---|---|---|
| weekly | 7 d | ±2 d | 52 | Actual uses ±2 for all patterns |
| biweekly | 14 d | ±2 d | 26 | |
| semi-monthly | 2 anchors/month | ±3 d | 24 | Plaid: "typically seen for inflow"; rare for subscriptions |
| monthly | same day-of-month | ±3 d (full score ≤ 2) | 12 | Actual and Sure use ±2; +1 day for checking exports that only carry the posted date (weekend + Monday holiday ACH lag). Circular day distance (Sure idea) |
| quarterly | +3 months | ±5 d | 4 | not in Plaid's enum |
| semi-annual | +6 months | ±7 d | 2 | not in Plaid's enum |
| yearly | +12 months | ±7 d | 1 | |
| irregular but repeating | none | n/a | annualised from mean gap | e.g. usage-billed software; shown low, outside totals by default |

A gap of about k × cadence (k = 2 or 3) counts as on-cadence with k − 1 missed charges (paused month, charge moved to another card) and costs regularity score.

**Amount drift.** Cluster within a merchant by amount against the running mean, tolerance max(7.5% × |mean|, $0.25). Both Actual (MIT) and Sure (AGPL) independently use 7.5%; the $0.25 floor is ours, for sub-$4 charges where tax rounding moves cents. Use the **last** amount as the current price (Plaid exposes both; Sure: "The most recent charge is the current price").

**Price changes.** A step to a new amount that then repeats on ≥ 2 consecutive occurrences at the same cadence is the same stream with a price change (Sure's rule; one odd charge is noise). Record {from, to, effectiveDate} as evidence; allow steps up to +50% for continuity, else start a new stream.

**Minimum occurrences** (prior = merchant is in our known-subscription alias table):

| Cadence | No prior | Known subscription merchant | Data span needed |
|---|---|---|---|
| weekly | 4 | 3 | ≥ 21 d |
| biweekly | 3 | 3 | ≥ 28 d |
| monthly | 3 (Plaid MATURE) | 2 consecutive (Plaid EARLY_DETECTION; Sure "offer") | ≥ 60 d |
| quarterly | 3 | 2 | ≥ 180 d |
| semi-annual | 2 (cap medium) | 2 | ≥ 7 months |
| yearly | 2 (Plaid: annual MATURE after 2) | 2; a single charge + "annual plan" prior = "possible", low | ≥ 13 months (≥ 395 d) |

When the file spans < 180 days, show "export at least 6 months; 13 months to catch yearly renewals" (Plaid's 180-day guidance; SubTracker's "ninety days ... never seen last year's annual renewal").

**Confidence** (0..1, shown as a band with the evidence rows):
- regularity `reg` = fit × (1 − min(1, median day error / (tol + 1)) / 2), where fit = share of gaps on cadence;
- amount stability `amt` = 1 − min(1, CV(amounts) / 0.075);
- count `cnt` = min(1, (n − 1) / 3);
- prior `pri` = 1 known subscription, 0.5 unknown, 0 known non-subscription category;
- `conf = 0.35·reg + 0.25·amt + 0.20·cnt + 0.20·pri`; bands high ≥ 0.75, medium 0.50 to 0.75, low < 0.50. Caps: n = 2 → at most medium; deny-list categories → at most low.
These weights are our proposal (no public source publishes weights); B4's labelled corpus should tune them.

**Active vs ended.** next = addCadence(last, cadence); `active` if asOf ≤ next + grace, grace = max(5 d, 0.25 × cadence days); else `ended` (Plaid's TOMBSTONED idea; Sure's "staleness in the series' own cycles"). Ended streams stay visible ("stopped after DATE") but are excluded from the yearly total.

**Trials.** A charge with |amount| ≤ $1.00 (including $0.00 rows, which many exports omit) from the same merchant 1 to 31 days before the first full-price charge is flagged "started after a trial on DATE"; it is evidence, never part of the average. A single full-price charge 7, 14 or 30 days (±2) after such a row with no later charge yet = "trial converted, 1 charge so far" (low; shown because it is exactly what users forget).

##### 1.4 False-positive families (synthetic descriptors)

| Family | Synthetic examples | Why it fools a detector | Handling |
|---|---|---|---|
| Credit-card payments | `PAYMENT THANK YOU`, `AUTOPAY PYMT`, `CARD SERVICES ONLINE PMT` | monthly, regular | **Exclude** always (double counts the card's own charges) |
| Own-account transfers | `ONLINE TRANSFER TO SAV XXXX1234`, `TRANSFER FROM CHK` | fixed amount and day | **Exclude** (Actual and Sure both exclude transfers) |
| P2P | `ZELLE TO J SMITH`, `VENMO PAYMENT`, `CASH APP*JANE` | rent or sitter repeats exactly | **Exclude** from subscriptions; optional collapsed "repeating transfers" list, no cancel CTA |
| Income, payroll, refunds | `ACME PAYROLL DIR DEP`, `REFUND`, `INTEREST PAID` | inflows on cadence | Outflows only; net a refund against the matching charge's evidence |
| Loans, mortgage, rent, insurance, auto | `MORTGAGE PMT`, `AUTO LOAN PMT`, `RENT PORTAL` | recurring and fixed | **Bills** group: separate yearly total, no "cancel" wording |
| Utilities and telecom | `CITY WATER UTIL`, `ELECTRIC CO AUTOPAY`, `WIRELESS BILL PAY` | monthly, variable amount | **Bills** group; amount tolerance widened to 35% for this category only; telecom may carry a manage link |
| Gas, groceries, coffee, fast food | `FUEL STOP #5744`, `GROCER #123`, `COFFEE CO STORE 1234` | frequent habits | Category deny-list: never "subscription"; amounts vary so clustering usually rejects; if a run passes, cap at low and hide by default |
| Rideshare and delivery, per trip | `UBER *TRIP`, `LYFT *RIDE`, `DOORDASH*BURGERS` | frequent | Deny per-trip descriptors; member programs (`UBER ONE`, `DASHPASS`, `INSTACART+`) are real subscriptions via the alias table |
| Amazon retail | `AMZN MKTP US*2K4AB`, `AMAZON.COM*1A2B3` | frequent, variable | Exclude marketplace/retail; detect Prime, Prime Video channels, Audible, Kindle Unlimited by alias; Subscribe & Save stays low "possible" |
| Store aggregators | `APPLE.COM/BILL`, `GOOGLE *PLAY`, `PAYPAL *VENDOR` | many subscriptions behind one name; totals change | Cluster by amount within the merchant so each price point is its own stream; tell the user to open the store's subscription page to see which app |
| Bank fees, interest | `MONTHLY MAINTENANCE FEE`, `INTEREST CHARGE` | monthly | **Bills** group with a "fee" hint; not in the subscription total |
| Exact duplicates | same date/amount/description twice | inflates count | Drop only when the format marks one row pending; otherwise keep (two identical charges can be real) |

Grouping: by normalised merchant **across files** (a card switch mid-year must not split a stream); keep the account on each evidence row.

##### 1.5 Recommended algorithm (pseudo-code, 37 lines)

```ts
// detectRecurring(rows, p = DEFAULTS): Finding[]   pure; dates are integer day numbers
const asOf = max(rows.map(r => r.day))                        // the file's last day, not the clock
const span = asOf - min(rows.map(r => r.day))
const out  = dedupePending(rows).filter(r => r.amount < 0 && !isExcluded(r))   // card pmts, transfers, P2P
const findings = []
for (const [key, txs] of groupBy(out, r => normalizeMerchant(r.desc).key)) {    // by merchant, NOT amount
  for (let c of clusterByAmount(txs, p.amountTolPct, p.amountTolFloor)) {      // vs running mean
    c = absorbPriceSteps(c, txs, p.priceStepMinRepeats)     // new price seen >= 2 consecutive times
    if (c.length < 2) continue
    let best = null
    for (const cad of CADENCES) {                            // weekly .. yearly
      const errs = dayErrors(c, cad)                         // calendar-aware, month-end clamp, k*cad = miss
      const fit  = errs.filter(e => e <= cad.tolDays).length / errs.length
      const need = minCount(cad, prior(key))                 // table 1.3
      if (fit >= p.minFit && c.length >= need && span >= cad.minSpan && (!best || fit > best.fit))
        best = { cad, fit, errs }
    }
    if (!best) {
      if (c.length >= p.irregularMin && cv(amounts(c)) <= p.irregularMaxCv)
        findings.push(irregularFinding(key, c))              // band 'low', not in totals by default
      continue
    }
    const reg  = best.fit * (1 - Math.min(1, median(best.errs) / (best.cad.tolDays + 1)) / 2)
    const amt  = 1 - Math.min(1, cv(amounts(c)) / (p.amountTolPct / 100))
    const cnt  = Math.min(1, (c.length - 1) / 3)
    const conf = capConfidence(0.35 * reg + 0.25 * amt + 0.20 * cnt + 0.20 * prior(key), c.length, key)
    const next = addCadence(last(c).day, best.cad)          // clamps anchor day to month end
    findings.push({
      merchantKey: key, cadence: best.cad.id, evidence: c, priceSteps: c.steps,
      lastAmount: last(c).amount, avgAmount: mean(amounts(c)), confidence: conf, band: band(conf),
      status: asOf <= next + grace(best.cad) ? 'active' : 'ended', nextExpected: next,
      kind: BILL_CATEGORIES.has(category(key)) ? 'bill' : 'subscription',
      trial: findTrial(txs, c[0], p.trialMaxAmount, p.trialWindowDays),
    })
  }
}
return findings.sort((a, b) => yearlyCost(b) - yearlyCost(a))   // |lastAmount| * perYear(cadence)
```

##### 1.6 Default parameters (SPEC-ready)

| Parameter | Default | Basis |
|---|---|---|
| `amountTolPct` | 7.5 | Actual `getApproxNumberThreshold` (0.075, MIT); Sure `DEFAULT_TOLERANCE_PCT = 7.5` (AGPL, idea only) |
| `amountTolFloor` | 0.25 (currency units) | ours |
| `billsAmountTolPct` | 35 | ours; utilities vary |
| `tolDays` weekly / biweekly / semi-monthly / monthly / quarterly / semi-annual / yearly | 2 / 2 / 3 / 3 / 5 / 7 / 7 | Actual ±2; Sure 2 on a circular calendar; +1 monthly for posted-date lag; wider for long cycles (ours) |
| `minCount` | table 1.3 (monthly 3, or 2 with prior; yearly 2) | Plaid MATURE ≥ 3, annual 2; Sure 3 act / 2 offer |
| `minSpan` yearly | 395 d | 2 annual charges need ≥ 13 months |
| `minFit` | 1.0 when n ≤ 4; 0.75 when n ≥ 5 | ours: one late or missed charge allowed in longer runs |
| `priceStepMinRepeats` | 2 | Sure PriceChangeDetector |
| `priceStepMaxRatio` | 1.5 | ours |
| `graceDays` | max(5, 0.25 × cadence days) | ours; Plaid TOMBSTONED idea |
| `trialMaxAmount` / `trialWindowDays` | 1.00 / 31 | ours |
| `irregularMin` / `irregularMaxCv` / `irregularMinSpan` | 4 / 0.10 / 90 d | ours |
| `minAmount` | 0.50 | ours (not Sure's $1: sub-$1 subscriptions exist) |
| confidence weights reg / amt / cnt / prior | 0.35 / 0.25 / 0.20 / 0.20 | ours; tune on the B4 corpus |
| bands | high ≥ 0.75, medium ≥ 0.50, low < 0.50 | ours |
| history hint threshold | 180 d | Plaid "at least 180 days of history" |

---

## §3. Merchant normalisation and the first alias table (source file: `_work/merchant-normalisation.md`)
Research cutoff: 2026-10-04, ~21:10 ET (hard deadline 21:20 ET per task rules). All web research used `WebFetch`/`WebSearch` only — no logins, no CAPTCHAs, no real financial data (synthetic examples only). Third-party "charge lookup"/"charge finder" aggregator sites (statementdecoder-web.onrender.com, explaincharges.com, merchants.letsweel.com, yourbankstatementconverter.com, brex.com/tools/charge-finder, ramp.com/charge-finder, emma-app.com, robots.net, techwithtech.com, chargebacks911.com) surfaced in nearly every search and were used **only as leads**, never cited as a source. Where no official page could be reached before the deadline, the row is explicitly marked **UNVERIFIED (convention)**.

#### 403s / dead ends encountered (per hard rule: stop and record)

- `https://support.zonealarm.com/hc/en-us/articles/360059583571-How-will-the-charge-appear-on-my-card-statement` → **HTTP 403 Forbidden** (2026-10-04). Was going to be used as a merchant's-own-page source for a 2Checkout/Verifone-processed descriptor. Not substituted in time.
- `https://help.uber.com/en/riders/article/my-account-has-an-unrecognized-charge` → **HTTP 404 Not Found** at fetch time (2026-10-04), despite the slug appearing in search results. Uber's own unrecognized-charge article could not be independently confirmed; Uber rows below are UNVERIFIED (convention).
- `https://usa.review.visa.com/.../standards-reminders-for-merchant-name-descriptor-field.pdf` → fetched successfully (not a 403) but returned compressed/binary PDF stream text that could not be cleanly extracted. Visa's existence as a document is confirmed; its specific character-count text is **not** independently verified by this research (see Part 1, card-network limits).
- `https://cash.app/help/1012` → fetched, empty body (likely JS-rendered). Superseded by Stripe's own Cash App Pay doc (official, see Part 1).
- `https://support.apple.com/en-us/HT201354` and the first `support.google.com/googleplay/answer/2476088` fetch both returned real pages but not the statement-descriptor content needed; superseded by HT201382 and answer/2851610 respectively (both confirmed below).

---

#### PART 1 — Processor, wallet, and bank-rail descriptor prefixes

| # | Processor / rail | Descriptor pattern(s) | Source | Fetch date | Status |
|---|---|---|---|---|---|
| 1 | **Square** | `SQ *<Business Name>[*<identifier>]` — e.g. `SQ *MYPHARMACY*#02943`. Square is limited to 20 chars after the `SQ *` prefix; may be truncated further by card networks before the cardholder sees it. | [Square Developer docs — Card Payment and Statement Description](https://developer.squareup.com/docs/payments-api/take-payments/card-payments/statement-descriptions) | 2026-10-04 | **VERIFIED (official)** |
| 2 | **Toast** | `TST*<Restaurant Name>` prefix on bank statements for Toast-processed restaurant charges. | [Toast Support — Understand Toast Charge Codes on Bank Statements](https://support.toasttab.com/en/article/Understand-Toast-Charge-Codes-on-Bank-Statements) | 2026-10-04 | **VERIFIED (official page exists/confirms TST\* prefix)**; granular per-code text did not extract cleanly — treat sentence-level detail as UNVERIFIED |
| 3 | **PayPal** | `PayPal` + phone `402-935-7733` appended on statement when a merchant uses PayPal as processor. The widely-seen `PAYPAL *<MERCHANTNAME>` / `PP*<MERCHANTNAME>` asterisk form is extremely common but was **not** textually confirmed on an official PayPal page in this session. | [PayPal cshelp — "Why is the number 402-935-7733 showing on my bank or credit card statement?"](https://www.paypal.com/ca/cshelp/article/pourquoi-le-num%C3%A9ro-402-935-7733-appara%C3%AEt-il-sur-mon-relev%C3%A9-bancaire-ou-de-carte-de-cr%C3%A9dit-help594) | 2026-10-04 | **PARTIAL** — phone convention VERIFIED; `PAYPAL *`/`PP*` asterisk+merchant form UNVERIFIED (convention) |
| 4 | **Stripe** | Full descriptor = `<prefix>* <suffix>` (prefix+`*`+space+suffix). Total 5–22 Latin chars; prefix (shortened descriptor) 2–10 chars; suffix fills the remainder; at least one letter required in prefix and suffix; disallowed chars `< > \ ' " *`. If only a static descriptor is set, it's truncated to 10 chars and used as the prefix. Example: prefix `RUNCLUB` + suffix `OCT MARATHON` → `RUNCLUB* OCT MARATHON`. | [Stripe Docs — Statement descriptors](https://docs.stripe.com/get-started/account/statement-descriptors) | 2026-10-04 | **VERIFIED (official)** |
| 5 | **Apple** | `Apple.com/bill` (also rendered `APPLE.COM/BILL`) appears on the billing statement for any app/music/movie/content purchase or subscription renewal, including Family Sharing members' purchases. No phone number is published on this page. | [Apple Support HT201382](https://support.apple.com/en-us/HT201382) | 2026-10-04 | **VERIFIED (official)** |
| 6 | **Google** | `GOOGLE*<App developer name>`, `GOOGLE*<App name>`, or `GOOGLE*<Content type>` (e.g. `GOOGLE*Books`) for all Google Play purchases. If a charge isn't in one of these forms, Google states it didn't come from Google Play. | [Google Play Help — "Report charges that you don't recognise"](https://support.google.com/googleplay/answer/2851610) | 2026-10-04 | **VERIFIED (official)** |
| 7 | **Amazon** | Multiple forms depending on product line: `AMZN Mktp US*<order-id>` (marketplace), `Amazon.com*PMT SVC 866-749-7545` / `AMZ*<Company Name>` (Amazon Pay; Pay order IDs start `P01` + 14 digits), `AMZN.COM/BILL` / `AMAZON MKTPLACE PMTS` (general), `Amazon Digital Svcs amzn.com/bill` (Kindle/MP3/app/video digital — this is the bucket that likely also covers Audible/Kindle Unlimited, not separately named), `AMZ*Prime Shipping Club` / `AMAZON PRIME*<id>amzn.com/bill` (Prime), `AmazonFresh`/`amzn.com/fresh`, `Amazon Retail LLC` (books). | [Amazon — "Identify an Amazon Charge"](https://digprjsurvey.amazon.com/csad/help/node/GSNBBJP63SM65UDB) (Amazon's own charge-identifier tool, amazon.com subdomain) | 2026-10-04 | **VERIFIED (official)** |
| 8 | **DoorDash** | `DD *DOORDASH <city>` / `DD *DOORDASH <restaurant>` / `DOORDASH*` / `DASHPASS`. | No official help.doordash.com / support.doordash.com page reached before deadline; only aggregator sites surfaced. | 2026-10-04 (search attempted) | **UNVERIFIED (convention)** |
| 9 | **Uber / Uber Eats / Uber One** | `UBER *TRIP HELP.UBER.COM`, `UBER *EATS`, `UBER *ONE`, `UBER* PENDING`. Uber appends its own support domain to the descriptor by convention. | Official article slug 404'd (see dead-ends above). | 2026-10-04 | **UNVERIFIED (convention)** |
| 10 | **Lyft** | `LYFT *1 RIDE <date>` style; bike/scooter sub-brands sometimes appear as their own name (e.g. a city bike-share brand) rather than "LYFT". | No official help.lyft.com page reached. | 2026-10-04 | **UNVERIFIED (convention)** |
| 11 | **Cash App (Cash App Pay, merchant checkout)** | `CashApp*<merchant name>` — merchant name = the business's configured company name; a custom dynamic suffix can be set but only shows inside the Cash App itself, not on the external bank/card statement. | [Stripe Docs — Cash App Pay payments, "Transaction identifiers"](https://docs.stripe.com/payments/cash-app-pay) | 2026-10-04 | **VERIFIED (official, via processor doc)** |
| 11b | **Cash App (P2P send/receive, cash-out)** | `CASH APP*<name>`, `CASH APP CASH OUT`, `SQC*CASH APP TRANSFER`. | Not independently fetched this session. | 2026-10-04 | **UNVERIFIED (convention)** |
| 12 | **Venmo** | `VENMO`, `VENMO.COM`, `VENMO*<name>`, `VENMO PAYMENT`, `VENMO CASHOUT`, or `PAYPAL*VENMO` (Venmo is PayPal-owned). | Official help.venmo.com page found is a general "What is Venmo" product page, not statement-descriptor specific; not fetched for descriptor text given time budget. | 2026-10-04 | **UNVERIFIED (convention)** |
| 13 | **Zelle** | No single universal descriptor — each bank renders it differently: Chase `Zelle Payment To/From <Name>`, Bank of America `Zelle Transfer <Name>`, Wells Fargo `Zelle Payment <Name/Phone>`, Capital One `Zelle To/From <Name>`, PNC `Zelle <Name> Transfer`. Some banks show only `ZELLE` + a first name. `PBZ` ("Purchase by Zelle") is a seen variant code. | No single official zellepay.com descriptor page; this is inherently bank-rendered. | 2026-10-04 | **UNVERIFIED (convention)** — multi-bank variance is itself the finding |
| 14 | **Shopify** | `SP <store name>` = a storefront charge processed through Shopify Payments (the `SP` prefix identifies the processor, not the brand you bought from — read the text after `SP` as the store name, possibly truncated). `SHOPIFY*<9-digit bill number>` = Shopify billing its *own merchant* for subscription/app fees (different from `SP`). | [Shopify — "What is this charge for?"](https://www.shopify.com/charge) and [Shopify Help — Unknown charge](https://help.shopify.com/en/manual/your-account/manage-billing/your-invoice/unknown-charge) | 2026-10-04 | **VERIFIED (official)**, moderate confidence on exact field text (derived via search extraction, not a clean direct-fetch quote) |
| 15 | **Clover** | Not researched — ran out of time budget. | — | — | **NOT RESEARCHED** |
| 16 | **Paddle** | `PADDLE.NET* <COMPANYNAM>` — merchant sets a 2–10 char descriptor (uppercase letters, digits, spaces, dots; at least one letter; dot can't be first/last char); Paddle truncates/pads to this format. If a customer pays via PayPal through Paddle checkout, it is **not customizable** and always shows as `PAYPAL *PADDLE.NET`. | [Paddle Help — "What will customers see on their statement?"](https://www.paddle.com/help/manage/your-customers/what-will-customers-see-on-their-statement) | 2026-10-04 | **VERIFIED (official)** |
| 17 | **FastSpring** | `FastSpring`, `FSPRG`, `FS*<Company Name>`, or `FSPRG*<Company Name>`. | [FastSpring — Look up a charge](https://fastspring.com/consumer-support/look-up-charge/) | 2026-10-04 | **VERIFIED (official)** |
| 18 | **2Checkout / Verifone** | `2CO.com*<merchant fragment>` (lowercase/uppercase varies by issuer rendering). | Attempted merchant-own-page source 403'd (ZoneAlarm, see dead-ends). | 2026-10-04 | **UNVERIFIED (convention)** |
| 19 | **Patreon** | `PATREON`, `PATREON.COM`, `PATREON INC`, `PATREON* MEMBERSHIP`, `PATREON* <Creator Name>`, `PATREON SAN FRANCISCO`, or `PAYPAL*PATREON`; if billed via iOS/Android, shows as `APPLE.COM/BILL` or `GOOGLE*PATREON` instead. | No official help.patreon.com page reached. | 2026-10-04 | **UNVERIFIED (convention)** |
| 20 | **Apple Pay / Google Pay (tap-to-pay tokens)** | Not a separate descriptor family — these are tokenized wallets passed through to whatever processor the merchant already uses (e.g. still shows `SQ *`, `TST*`, the merchant's own Stripe descriptor, etc.), **except** when the purchase itself is an App Store / Google Play transaction, in which case rows 5/6 apply. | General payments-industry knowledge; no single official page cited. | 2026-10-04 | **UNVERIFIED (convention)** |
| 21 | Bank rail: **"PURCHASE AUTHORIZED ON 09/12"** | Common large-bank (e.g. Bank of America / Chase-style) debit posting prefix + MM/DD auth date, followed by merchant descriptor. | No official bank glossary page fetched this session; pattern is recognizable from common importer/categorizer pattern lists. | 2026-10-04 | **UNVERIFIED (convention)** |
| 22 | Bank rail: **"POS DEBIT"** | Point-of-sale debit card transaction flag, funds leave the account immediately. | Only third-party explainer blogs found (not official) — leads only, not cited. | 2026-10-04 | **UNVERIFIED (convention)** |
| 23 | Bank rail: **"CHECKCARD 0912"** | Legacy check-card prefix + MMDD auth date, then merchant descriptor (historically associated with Wells Fargo-style statements). | Not independently confirmed via an official bank page this session. | 2026-10-04 | **UNVERIFIED (convention)** |
| 24 | Bank rail: **"DEBIT CARD PURCHASE"** | Generic issuer wording preceding the merchant descriptor. | Not independently confirmed. | 2026-10-04 | **UNVERIFIED (convention)** |
| 25 | Bank rail: **"RECURRING PAYMENT"** | Issuer-surfaced text reflecting the card network's stored-credential/recurring-indicator flag set by the merchant at authorization time. | Not independently confirmed. | 2026-10-04 | **UNVERIFIED (convention)** |
| 26 | Bank rail: **ACH debit** — `<Company Name> DES:<Entry Descr> ID:<Company ID> <SEC code>` | SEC codes: `PPD` = Prearranged Payment and Deposit (standing consumer authorization — payroll-in, utility/gym drafts-out); `WEB` = internet-initiated consumer debit; `CCD`/`CO ID` = corporate/company entries, `CO ID` is a 10-digit ACH "Company Identification" assigned by the originator's bank. The "Company Entry Description" is a 10-character NACHA field describing the transaction purpose, and it's what shows on the receiver's statement. | [Choice Bank — "ACH Company Entity Descriptions" (PDF)](https://bankwithchoice.com/wp-content/uploads/ACH-Company-Entity-Descriptions.pdf) | 2026-10-04 | **VERIFIED (official bank doc)**, surfaced via search synthesis rather than a clean direct-fetch render |
| 27 | **Card network field limits — Visa** | Secondary sources cite a 25-character merchant name/descriptor field. Visa's own PDF on this exists (`standards-reminders-for-merchant-name-descriptor-field.pdf`) and was fetched, but its text was not machine-extractable (compressed PDF stream) — see dead-ends. | [Fiserv LatAm API docs — Soft Descriptor](https://docs.apis-fiserv.com/latam/docs/soft-descriptor) (processor doc, not Visa's own text) | 2026-10-04 | **UNVERIFIED (convention)** — figure is processor-sourced, not independently read from Visa's own text |
| 28 | **Card network field limits — Mastercard** | Secondary sources cite a 22-character merchant descriptor field; format = `[Merchant Name] + [*] + [Soft Descriptor] = 22 chars`, spaces count as 1 char. | Same Fiserv doc as above | 2026-10-04 | **UNVERIFIED (convention)** |
| 29 | **Card network field limits — Stripe (as a fully-verified concrete instance of the rule)** | 22-char total hard limit including the `*` + space separator; this is the one figure in this limits group independently confirmed end-to-end. | Same as row 4 | 2026-10-04 | **VERIFIED (official)** |

---

#### PART 2 — Normalisation pipeline (ordered rules)

Applied in this order to a raw statement-line string before alias lookup:

1. **Unicode NFKC normalise + case-fold** the entire raw descriptor to lowercase (handles full-width chars, compatibility ligatures, and makes every later regex case-insensitive-by-construction).
2. **Strip bank-rail prefixes/boilerplate**: `PURCHASE AUTHORIZED ON MM/DD`, `POS DEBIT`, `CHECKCARD MMDD`, `DEBIT CARD PURCHASE`, `RECURRING PAYMENT (AUTHORIZED ON MM/DD)`, leading `PENDING -`/`PENDING`, and ACH boilerplate tokens `DES:`, `ID:`, trailing SEC codes (`PPD`, `WEB`, `CCD`, `CTX`).
3. **Strip/capture processor or wallet prefix tokens** — match against a known-prefix list (`SQ *`, `TST*`, `PAYPAL *`/`PP*`, `GOOGLE*`/`GOOGLE *`, `APPLE.COM/BILL`, `AMZN`/`AMAZON.COM*`/`AMZN MKTP`, `DD *`, `UBER *`, `LYFT *`, `CASH ?APP*`, `VENMO*`, `PADDLE.NET*`, `FS*`/`FSPRG*`, `SP ` (with a word-boundary guard so it doesn't eat ordinary words), `SHOPIFY*`, `2CO.COM*`). Keep the substring **after** the prefix delimiter (the `*` or the matched token boundary) as the merchant candidate, and record *which* processor matched — this is needed later both for alias disambiguation and for the "billed through X" UI hint.
4. **Drop trailing city + 2-letter state code** (e.g. `OAKLAND CA`, `SAN FRANCISCO CA`) and any trailing country code.
5. **Drop phone numbers** in any common format (`866-712-7753`, `8667127753`, `1-866-712-7753`, `(866) 712-7753`).
6. **Drop store/location numbers**: `#1234`, `STORE 1234`, `NO. 1234`, and bare digit-runs of length ≥ 3 that aren't plausible years (so `#02943` and `1234` go, but a `2026` embedded in a URL-ish token is left for the next step to judge in context).
7. **Drop card last-4 / masked PAN remnants**: `XXXX1234`, `ending 1234`, `CARD 1234`.
8. **Drop embedded dates** (`09/12`, `9-22-19`, `MM-DD-YY`) **and** long alphanumeric order/reference IDs (runs ≥ 6 chars mixing letters+digits, e.g. `A1B2C3D4E`).
9. **Normalise embedded URLs/domains to a domain stem**: strip protocol, `www.`, path, and TLD, keep the registrable-domain label (`NETFLIX.COM` → `netflix`; `AMZN.COM/BILL` → `amzn`, which the alias layer then maps to the `amazon`-family id; `HELP.UBER.COM` is recognized as a *support*-domain suffix, not a merchant stem, and is dropped rather than kept as the merchant).
10. **Collapse whitespace/punctuation**: multiple spaces, stray `*`, `.`, `-`, `#`, apostrophes → single space; trim leading/trailing space.
11. **Normalise casing** of the resulting candidate string to a lowercase, slug-safe internal key (the UI can title-case for display).
12. **Alias lookup**: match the cleaned candidate (and, where relevant, the captured processor from step 3) against the Part 3 alias table's token/regex patterns. Processor-aware rules fire first — e.g. prefix was `GOOGLE*` and remainder contains `youtube` → `youtube-premium`; prefix was `APPLE.COM/BILL` with *no* further disambiguating text → route to the "ambiguous Apple biller" bucket instead of guessing.
13. **Fallback key**: if no alias matches, drop common corporate/suffix stopwords (`INC`, `LLC`, `CO`, `CORP`, `THE`, `SVC`, `SVCS`, `PMT`, `PMTS`) from the cleaned candidate and take the **first 2 remaining significant tokens** as a provisional group key (not a canonical id) so repeat charges from the same unknown merchant still cluster together.
14. **Record provenance** on every normalised row — which rule(s) fired (`bank-prefix-stripped`, `processor:<name>`, `alias:<id>`, `fallback-2-token:<key>`) — so the UI can show "why we grouped this" and let the user split/merge/correct a group, with the correction remembered.
15. **Persist corrections client-side** (this is a private, browser-only tool: no server round-trip) — cache the raw-descriptor → canonical-id/group mapping in local storage so the same descriptor normalises instantly next time and user edits stick across re-imports.

##### 15 synthetic before → after examples

| # | Raw descriptor (synthetic) | Normalised merchant | Rule(s) that fired |
|---|---|---|---|
| 1 | `SQ *BLUE BOTTLE 1234 OAKLAND CA` | `blue bottle` | processor `SQ *` stripped; store-number `1234` dropped; city/state dropped |
| 2 | `PAYPAL *SPOTIFYUSA` | `spotify` (alias `spotify`) | processor `PAYPAL *` stripped; alias match on `SPOTIFYUSA` token |
| 3 | `APPLE.COM/BILL 866-712-7753 CA` | `apple` (ambiguous biller bucket) | processor `APPLE.COM/BILL` matched; phone + state dropped; no further text → ambiguous-Apple route, not guessed |
| 4 | `TST* JOE'S DINER` | `joes diner` | processor `TST*` stripped; apostrophe/punctuation collapsed |
| 5 | `NETFLIX.COM` | `netflix` (alias `netflix`) | domain-stem extraction; alias match |
| 6 | `AMZN Mktp US*A1B2C3D4E` | `amazon` (alias `amazon-prime`/marketplace bucket) | processor `AMZN`/`*` stripped; alphanumeric order-id `A1B2C3D4E` dropped |
| 7 | `DD *DOORDASH SAN FRANCISCO` | `doordash` (alias `doordash-dashpass` family) | processor `DD *` stripped; city dropped |
| 8 | `UBER *EATS HELP.UBER.COM` | `uber eats` | processor `UBER *` stripped; `HELP.UBER.COM` recognized as support-domain suffix and dropped (not kept as merchant) |
| 9 | `GOOGLE *YOUTUBE PREMIUM` | `youtube premium` (alias `youtube-premium`) | processor `GOOGLE *` stripped; alias match on remainder |
| 10 | `CHECKCARD 0912 WAL-MART #1234 BENTONVILLE AR` | `walmart` | bank prefix `CHECKCARD 0912` stripped; store `#1234` dropped; hyphen collapsed; city/state dropped |
| 11 | `PURCHASE AUTHORIZED ON 09/12 CASH APP*JDOE 8004337747 CA` | `cash app jdoe` → fallback key `cash app` | bank prefix + date stripped; processor `CASH APP*` captured; phone + state dropped; no alias for a P2P handle → fallback 2-token key |
| 12 | `RECURRING PAYMENT AUTHORIZED ON 09/01 PANDORA MEDIA 8773526479` | `pandora` (alias `pandora`) | `RECURRING PAYMENT ... 09/01` stripped; phone dropped; alias match on `PANDORA MEDIA` |
| 13 | `POS DEBIT VENMO WEB PMT 1234567890` | `venmo` | `POS DEBIT` + `WEB` SEC code stripped; trailing numeric reference dropped |
| 14 | `PP*FS*ADOBE SYSTEMS` | `adobe systems` → alias `adobe` | stacked processor prefixes (PayPal then FastSpring) both stripped; alias match on remainder |
| 15 | `ACH DEBIT NETFLIX.COM DES:Subscr ID:XXXXXXXXXX WEB` | `netflix` (alias `netflix`) | ACH `DES:`/`ID:`/`WEB` boilerplate stripped; domain-stem `netflix.com` → `netflix`; alias match |

---

#### PART 3 — First alias table (73 rows)

Legend for **Source**: a bare URL + date means a page was fetched/confirmed this session (see Part 1 for the underlying evidence where the merchant is primarily a billing-platform pass-through, e.g. Apple/Google/Amazon/PayPal); **UNVERIFIED (convention)** means the descriptor pattern reflects common, widely-observed naming convention for that merchant's own direct billing but was not confirmed against an official "what will this charge look like" page within the research window.

| id | canonical name | category | descriptor patterns (tokens/regex, case-insensitive) | billed-through note | source |
|---|---|---|---|---|---|
| netflix | Netflix | video | `NETFLIX(\.COM)?` | Usually direct; occasionally via `APPLE.COM/BILL` or `GOOGLE *` if subscribed in-app | UNVERIFIED (convention) |
| hulu | Hulu | video | `HULU` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| disney-plus | Disney+ | video | `DISNEY\s?\+?\s?(PLUS)?` | Direct (Disney), or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| hbo-max | HBO Max / Max | video | `HBO\s?MAX\|MAX\.COM\|WBD\s?MAX` | Direct (Warner Bros. Discovery), or via `APPLE.COM/BILL`, `GOOGLE *`, `AMAZON`/Prime Video Channels, or `ROKU` channel billing | UNVERIFIED (convention) |
| paramount-plus | Paramount+ | video | `PARAMOUNT\s?\+?` | Direct, or via `APPLE.COM/BILL`, `GOOGLE *`, Prime Video Channels, `ROKU` | UNVERIFIED (convention) |
| peacock | Peacock | video | `PEACOCK` | Direct (NBCUniversal/Comcast), or via `APPLE.COM/BILL`/`GOOGLE *`/`ROKU` | UNVERIFIED (convention) |
| apple-tv | Apple TV+ | video | `APPLE\s?TV` | Almost always billed as `APPLE.COM/BILL` with no further text — see ambiguity section | [Apple Support HT201382](https://support.apple.com/en-us/HT201382), 2026-10-04 (confirms the billing channel; which product is this specific charge is NOT disambiguated by Apple's own text) |
| youtube-premium | YouTube Premium | video | `YOUTUBE\s?PREMIUM\|YOUTUBE` | `GOOGLE *YOUTUBE PREMIUM` per Google's own descriptor format | [Google Play Help answer/2851610](https://support.google.com/googleplay/answer/2851610), 2026-10-04 (confirms `GOOGLE*<name>` format generally; "YouTube Premium" as the literal app-name token is convention, not quoted verbatim in the fetched text) |
| youtube-tv | YouTube TV | video | `YOUTUBE\s?TV` | `GOOGLE *YOUTUBE TV` | Same as above — PARTIAL |
| sling-tv | Sling TV | video | `SLING(\s?TV)?` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| fubo | Fubo(TV) | video | `FUBO(TV)?` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| crunchyroll | Crunchyroll | video | `CRUNCHYROLL` | Direct (Sony/Funimation Global Group), or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| starz | Starz | video | `STARZ` | Direct, or via `APPLE.COM/BILL`, `GOOGLE *`, Prime Video Channels, `ROKU` | UNVERIFIED (convention) |
| spotify | Spotify | music | `SPOTIFY(USA)?` | Direct, or via `PAYPAL *SPOTIFYUSA` (per task's own example), `APPLE.COM/BILL`, `GOOGLE *` | UNVERIFIED (convention) — PayPal's own descriptor-asterisk form not independently confirmed (see Part 1 row 3) |
| apple-music | Apple Music | music | `APPLE\s?MUSIC` | Billed as `APPLE.COM/BILL` with no further text — see ambiguity section | [Apple Support HT201382](https://support.apple.com/en-us/HT201382), 2026-10-04 — billing channel VERIFIED, specific-product text UNVERIFIED |
| amazon-music | Amazon Music | music | `AMAZON\s?MUSIC` | Falls inside Amazon's "Amazon Digital Svcs" bucket per Amazon's own page | [Amazon charge identifier](https://digprjsurvey.amazon.com/csad/help/node/GSNBBJP63SM65UDB), 2026-10-04 — bucket VERIFIED, "Amazon Music" not separately named in fetched text |
| pandora | Pandora | music | `PANDORA(\s?MEDIA)?` | Direct | UNVERIFIED (convention) |
| siriusxm | SiriusXM | music | `SIRIUS\s?XM` | Direct | UNVERIFIED (convention) |
| audible | Audible | audio-books | `AUDIBLE` | Likely inside Amazon's "Amazon Digital Svcs" bucket (Audible is Amazon-owned) | UNVERIFIED (convention) — not separately named in the official Amazon text fetched |
| kindle-unlimited | Kindle Unlimited | other | `KINDLE\s?UNLIMITED` | Likely inside Amazon's "Amazon Digital Svcs" bucket | UNVERIFIED (convention) |
| nytimes | The New York Times | news | `N\.?Y\.?\s?TIMES\|NYTIMES` | Direct | UNVERIFIED (convention) |
| wsj | Wall Street Journal | news | `WSJ(\.COM)?` | Direct (Dow Jones) | UNVERIFIED (convention) |
| washington-post | Washington Post | news | `WASH(INGTON)?\s?POST\|WPNI` | Direct | UNVERIFIED (convention) |
| tinder | Tinder | dating | `TINDER` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` (Match Group) | UNVERIFIED (convention) |
| bumble | Bumble | dating | `BUMBLE` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| hinge | Hinge | dating | `HINGE` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` (Match Group) | UNVERIFIED (convention) |
| match | Match.com | dating | `MATCH(\.COM)?` | Direct (Match Group), or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| xbox-game-pass | Xbox Game Pass | gaming | `XBOX\|MSBILL\.INFO\|MICROSOFT\s?\*` | Often `MICROSOFT *XBOX` or `MSBILL.INFO` | UNVERIFIED (convention) |
| playstation-plus | PlayStation Plus | gaming | `PLAYSTATION\|SONY\s?INTERACTIVE` | Direct (Sony) | UNVERIFIED (convention) |
| nintendo-switch-online | Nintendo Switch Online | gaming | `NINTENDO` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` for the mobile app path | UNVERIFIED (convention) |
| discord-nitro | Discord Nitro | software | `DISCORD` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` for in-app purchase | UNVERIFIED (convention) |
| apple | Apple (platform biller) | platform-biller | `APPLE\.COM/BILL\|APPLE\s?CASH` | — this IS the biller; see ambiguity section | [Apple Support HT201382](https://support.apple.com/en-us/HT201382), 2026-10-04 |
| google-play | Google Play (platform biller) | platform-biller | `GOOGLE\s?\*` | — this IS the biller; see ambiguity section | [Google Play Help answer/2851610](https://support.google.com/googleplay/answer/2851610), 2026-10-04 |
| paypal | PayPal (platform biller) | platform-biller | `PAYPAL\s?\*\|PP\*` | — this IS the biller; see ambiguity section | [PayPal cshelp help594](https://www.paypal.com/ca/cshelp/article/pourquoi-le-num%C3%A9ro-402-935-7733-appara%C3%AEt-il-sur-mon-relev%C3%A9-bancaire-ou-de-carte-de-cr%C3%A9dit-help594), 2026-10-04 — phone convention VERIFIED, `PAYPAL *` asterisk form UNVERIFIED |
| roku | Roku (channel platform biller) | platform-biller | `ROKU(\.COM)?` | Roku bills on behalf of channels (HBO Max, Starz, Paramount+, etc.) bought through the Roku Channel Store — ambiguous like Apple/Google | UNVERIFIED (convention) |
| icloud | iCloud+ | cloud | `ICLOUD` | Billed as `APPLE.COM/BILL` with no further text | [Apple Support HT201382](https://support.apple.com/en-us/HT201382), 2026-10-04 — billing channel VERIFIED |
| google-one | Google One | cloud | `GOOGLE\s?ONE` | `GOOGLE *` + content-type text per Google's own format | [Google Play Help answer/2851610](https://support.google.com/googleplay/answer/2851610), 2026-10-04 — PARTIAL |
| dropbox | Dropbox | cloud | `DROPBOX` | Direct | UNVERIFIED (convention) |
| microsoft-365 | Microsoft 365 | software | `MICROSOFT\s?365\|MSBILL\.INFO` | Direct, often `MSBILL.INFO` | UNVERIFIED (convention) |
| adobe | Adobe (Creative Cloud etc.) | software | `ADOBE` | Direct | UNVERIFIED (convention) |
| canva | Canva | software | `CANVA` | Direct | UNVERIFIED (convention) |
| grammarly | Grammarly | software | `GRAMMARLY` | Direct | UNVERIFIED (convention) |
| one-password | 1Password | security | `1PASSWORD\|ONEPASSWORD` | Direct | UNVERIFIED (convention) |
| nordvpn | NordVPN | security | `NORD\s?VPN` | Direct | UNVERIFIED (convention) |
| expressvpn | ExpressVPN | security | `EXPRESS\s?VPN` | Direct | UNVERIFIED (convention) |
| norton | Norton | security | `NORTON(LIFELOCK)?` | Direct | UNVERIFIED (convention) |
| mcafee | McAfee | security | `MCAFEE` | Direct | UNVERIFIED (convention) |
| chatgpt | ChatGPT (OpenAI) | ai | `OPENAI\|CHATGPT` | Direct (typically `OPENAI *CHATGPT SUBSCR` style) | UNVERIFIED (convention) |
| claude | Claude (Anthropic) | ai | `ANTHROPIC\|CLAUDE\.AI` | Direct | UNVERIFIED (convention) |
| notion | Notion | software | `NOTION` | Direct | UNVERIFIED (convention) |
| zoom | Zoom | software | `ZOOM(\.US)?` | Direct | UNVERIFIED (convention) |
| github | GitHub | software | `GITHUB` | Direct | UNVERIFIED (convention) |
| duolingo | Duolingo | other | `DUOLINGO` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| linkedin-premium | LinkedIn Premium | software | `LINKEDIN` | Direct (Microsoft) | UNVERIFIED (convention) |
| patreon | Patreon (platform biller) | platform-biller | `PATREON` | — this IS the biller for many creators; see ambiguity section | UNVERIFIED (convention) — no official help.patreon.com page reached this session |
| peloton | Peloton | fitness | `PELOTON` | Direct | UNVERIFIED (convention) |
| planet-fitness | Planet Fitness | fitness | `PLANET\s?FITNESS` | Direct | UNVERIFIED (convention) |
| strava | Strava | fitness | `STRAVA` | Direct | UNVERIFIED (convention) |
| headspace | Headspace | wellness | `HEADSPACE` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| calm | Calm | wellness | `CALM(\.COM)?` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| noom | Noom | wellness | `NOOM` | Direct | UNVERIFIED (convention) |
| classpass | ClassPass | fitness | `CLASSPASS` | Direct | UNVERIFIED (convention) |
| amazon-prime | Amazon Prime | shopping-membership | `AMAZON\s?PRIME\|AMZN?\s?PRIME` | `AMZ*Prime Shipping Club` / `AMAZON PRIME*<id>amzn.com/bill` | [Amazon charge identifier](https://digprjsurvey.amazon.com/csad/help/node/GSNBBJP63SM65UDB), 2026-10-04 |
| walmart-plus | Walmart+ | shopping-membership | `WAL-?MART\s?\+?|WALMART PLUS` | Direct | UNVERIFIED (convention) |
| doordash-dashpass | DoorDash DashPass | delivery | `DASHPASS\|DOORDASH` | `DD *DOORDASH` / `DOORDASH*` | UNVERIFIED (convention) |
| uber-one | Uber One | delivery | `UBER\s?\*?\s?ONE` | `UBER *ONE` per convention | UNVERIFIED (convention) — official Uber page 404'd this session |
| instacart-plus | Instacart+ | delivery | `INSTACART` | Direct | UNVERIFIED (convention) |
| costco | Costco Membership | shopping-membership | `COSTCO` | Direct (`COSTCO WHSE` for in-warehouse vs. `COSTCO.COM` for membership/online) | UNVERIFIED (convention) |
| hellofresh | HelloFresh | delivery | `HELLO\s?FRESH` | Direct | UNVERIFIED (convention) |
| ring | Ring (subscription plan) | home-security | `RING(\.COM)?` | Direct, or via `AMAZON` (Ring is Amazon-owned) | UNVERIFIED (convention) |
| simplisafe | SimpliSafe | home-security | `SIMPLI\s?SAFE` | Direct | UNVERIFIED (convention) |
| life360 | Life360 | other | `LIFE\s?360` | Direct, or via `APPLE.COM/BILL`/`GOOGLE *` | UNVERIFIED (convention) |
| ancestry | Ancestry | other | `ANCESTRY` | Direct | UNVERIFIED (convention) |

That is 73 rows against the required ≥70, using exactly the ids supplied in the task (no extra ids were needed to clear the threshold, so none were added).

---

#### Ambiguous descriptors — and how the UI should present them

A handful of prefixes are **platform billers**: the descriptor tells you who processed the charge, not which underlying product/subscription it was for. These need a different UI treatment than a clean merchant match — don't guess a specific product; say who to ask.

| Ambiguous prefix | Covers | Recommended UI copy |
|---|---|---|
| `APPLE.COM/BILL` | iCloud+, Apple Music, Apple TV+, App Store subscriptions (any third-party app's in-app subscription — Tinder, Discord Nitro, HBO Max, Patreon, etc.), Apple One bundles | "Billed by Apple — open **Settings → [Your Name] → Subscriptions** (or `support.apple.com/HT202039`-style account page) to see exactly which app or service this is." |
| `GOOGLE *` | YouTube Premium/TV, Google One, Google Play Books/Movies, and any Android app's in-app subscription | "Billed by Google Play — open **play.google.com/store/account/subscriptions** to see exactly which app or service this is." |
| `AMAZON` / `AMZN...` family | Amazon Prime, Kindle Unlimited, Audible, Amazon Music, Prime Video Channels, plus ordinary retail orders | "Billed by Amazon — check **Your Orders** and **Memberships & Subscriptions** on amazon.com for the exact item." |
| `PAYPAL *` / `PP*` | Any merchant that happens to checkout through PayPal (Spotify via PayPal is the task's own example; also common for Patreon, many small SaaS tools) | "Billed through PayPal — log in to **paypal.com → Activity** and match the date/amount; the name after the `*` is the seller's PayPal business name, which can differ from the brand you recognize." |
| `ROKU` / `ROKU.COM` | Channel subscriptions purchased through the Roku Channel Store (HBO Max, Starz, Paramount+, Peacock, etc. can all route through Roku billing) | "Billed by Roku on behalf of a channel — open the Roku app's **Subscriptions** settings to see which channel this is." |
| `PATREON*` | Any individual creator's membership tier | "Billed by Patreon — log in to **patreon.com → Settings → Billing History** to see which creator this supports." |

**Top ambiguity for this tool**: `APPLE.COM/BILL` is the single worst case — it is simultaneously (a) the most common recurring-charge descriptor on any statement with an iPhone-owning household, and (b) completely silent on which of potentially 5–10 different subscriptions (iCloud, Apple Music, Apple TV+, Apple One, and any third-party app's in-app subscription billed through Apple) it represents. `GOOGLE *` has the same shape but is at least followed by a developer/app/content-type token per Google's own documentation (row 6, Part 1), which `APPLE.COM/BILL` is not — Apple's own page confirms the descriptor but not a disambiguating suffix. Any subscription-sweep UI should treat every `APPLE.COM/BILL` line as "needs manual tagging" rather than attempting an automatic canonical match, and should surface Apple's and Google's own subscription-management pages as the primary resolution path rather than guessing from amount/cadence alone.

### §3 overrides (R1, binding for the build)
- Part 2 rule 15 (cache descriptor corrections in local storage) and rule 14's split/merge UI are **out of v1**: storage is opt-in only and holds findings + statuses (CONTRACT §7, SPEC §10). No descriptor cache.
- Apple's cancel article is now `support.apple.com/118428` (renumbered from HT202039; §5a). The descriptor page HT201382 above is still the source for `APPLE.COM/BILL`.
- Rows marked "UNVERIFIED (convention)" are matching heuristics only: fine as `patterns`, never shown to users as facts (`verified: false`, `source: null`).

## §4. Law and consumer rights, official sources only (source file: `_work/law.md`)
Lane R1, Subscription Sweep. Researched 2026-10-04, 20:58 to 21:10 ET. Every fetch below was made on **2026-10-04** with curl (UA `SubscriptionSweepResearch/0.1 (+https://useslop.com/tools)`). WebSearch was used only to find URLs. I cite no news or law-firm pages.

**Blocked or failed today (recorded, not worked around):** nysenate.gov returned 403 for both NY sections. mastercard.us returned 403 for both Chargeback Guide PDFs. mass.gov returned 403 ("Not allowed") for both 940 CMR 38 pages. oregonlegislature.gov ORS 646A gave no response (curl 000, three tries). The ilga.gov `fulltext.asp` URL returned 404, so I used ilga.gov's own `/ftp/ILCS/` copy. The CFPB credit-card Ask page (en-1543) returned 404. The le.utah.gov page returned 200, but the statute text is not in its HTML. The cga.ct.gov chapter page I tried does not contain §42-126b.

---

#### 4a. Federal: FTC "click to cancel" (16 CFR Part 425), ROSCA, enforcement

##### Status today (one line)
**There is no federal "click-to-cancel" rule in force.** The Eighth Circuit vacated the 2024 amended Negative Option Rule on 2025-07-08. The FTC removed it from the CFR on 2026-02-12, which restored the old 1973-style "Prenotification Negative Option Plans" rule. The FTC then opened a new rulemaking with an ANPRM on 2026-03-13 (comments closed 2026-04-13). As of today there is **no proposed rule (NPRM) and no final rule** in the Federal Register [L9][L10][L3][L12].

##### Timeline (each item verified on the official source unless marked)
| Date | Event | Source |
|---|---|---|
| 2024-10-16 | FTC announces the final "click-to-cancel" rule. The press release says most provisions take effect "180 days after it is published in the Federal Register." | [L1] |
| 2024-11-15 | Final rule published: **89 FR 90476**, FR doc 2024-25534. It is retitled "Rule Concerning Recurring Subscriptions and Other Negative Option Programs" and "now applies to all negative option programs in any media." **Effective 2025-01-14.** | [L2] |
| 2025-01-14 | eCFR shows new §§425.1-425.9 in effect, including **§425.6 "Simple cancellation ('Click to Cancel')."** | [L3] |
| 2025-05-14 | Original compliance date for most provisions. This is **calculated** as 180 days after 2024-11-15; I did not read the exact date in the FR text. | [L1][L2] (calculated) |
| 2025-01-21 | FR notice of a petition for rulemaking from the "Central Office of Reform and Efficiency" asking the FTC to "clarify vague terms" (90 FR 6843, File No. R507001). | [L4] |
| 2025-05-09 | FTC Commission statement: the FTC uses enforcement discretion to defer the compliance deadline for **16 CFR §§425.4-425.6 by sixty days**. "Starting **July 14, 2025**, regulated entities must be in compliance with the whole of the Rule." Press release: vote 3-0. **This deferral was not a Federal Register document**; an FR API search for Apr-Aug 2025 found 0 results. | [L5][L6][L12] |
| 2025-07-08 | **Eighth Circuit, *Custom Communications, Inc. v. FTC*, No. 24-3137**, consolidated with No. 24-3388 (*Chamber of Commerce of the U.S. v. FTC*) and other petitions sent to the court by the JPML. Submitted 2025-06-10, filed 2025-07-08, published opinion. **Holding:** the Commission failed to follow the FTC Act's procedural requirements. An ALJ found the rule's effect would exceed **$100 million**, which triggers the **preliminary regulatory analysis** required by FTC Act §22 (15 U.S.C. 57b-3), and the Commission did not issue one. The court said "the procedural deficiencies of the Commission's rulemaking process are fatal here." It vacated the **entire** Rule despite the §425.9 severability clause because of the prejudice to petitioners. Given the Rule's breadth, the party-specific vacatur the FTC asked for was "not feasible." "Accordingly, we grant the petitions for review and vacate the Rule." | [L7] |
| 2025-12-03 | FR notice of a petition for rulemaking from the **Consumer Federation of America and the American Economic Liberties Project** (90 FR 55701, File No. R607000; comments due 2026-01-02). The petition text is on regulations.gov and was not read. **What it asks for is UNVERIFIED.** | [L8] |
| 2026-02-12 | **FTC final rule, 91 FR 6507** (FR doc 2026-02866), effective 2026-02-12: "Revision of the Negative Option Rule ... to Conform These Rules to Federal Court Decisions." It recodifies Part 425 "as it existed before the effective date of the Commission's 2024 final rule." The same document withdraws the CARS Rule and removes the Non-Compete Rule. eCFR confirms §§425.3-425.9 were removed. Part 425 is now titled "**USE OF PRENOTIFICATION NEGATIVE OPTION PLANS**" (source 91 FR 6509) and covers only prenotification plans for "goods and merchandise," the old club-style rule. | [L9][L3] |
| 2026-03-13 | **FTC ANPRM, 91 FR 12318** (FR doc 2026-04952): the FTC "seeks public comment on the need for amendments" to the Prenotification Negative Option Rule "to help consumers avoid recurring payments for products and services they did not intend to order and to allow them to cancel such payments without unwarranted obstacles." Comments closed **2026-04-13**. The FTC's Negative Option Rule page lists this ANPRM as the current item. | [L10][L11] |
| 2026-03-14 to today | The FR API (FTC + "negative option", newest first) shows no NPRM or final rule. The only later hits are the regulatory agenda (2026-08-14, 91 FR 53156) and an unrelated AI policy statement (2026-07-07). I did not open the Aug-2026 agenda entry, so **the planned next stage or timetable is UNVERIFIED.** | [L12] |

##### ROSCA (still law)
- **Restore Online Shoppers' Confidence Act, 15 U.S.C. 8401-8405** (Pub. L. 111-345, §4, Dec. 29, 2010, 124 Stat. 3620). Sections on govinfo: 8401 findings; 8402 prohibitions; **8403 "Negative option marketing on the Internet"**; 8404 FTC enforcement; 8405 enforcement by State attorneys general [L13]. I fetched the 2023 U.S. Code edition on govinfo.
- **§8403** makes it unlawful to charge a consumer for goods or services sold online through a negative option feature unless the seller (1) clearly discloses the material terms before getting billing information and (2) gets the consumer's express informed consent before charging. Items (1) and (2) are paraphrased. Item (3) is quoted: the seller "provides simple mechanisms for a consumer to stop recurring charges from being placed on the consumer's credit card, debit card, bank account, or other financial account" [L13].
- The Eighth Circuit vacated the *rule*, not the statute. ROSCA is a statute and the FTC still enforces it: the Amazon order below is a ROSCA order, and the FTC was still paying out under it on 2026-09-17 [L14][L15].

##### FTC v. Amazon (ROSCA): outcome
- **2025-09-25**, FTC press release "FTC Secures Historic $2.5 Billion Settlement Against Amazon." The order covers Amazon, SVP Neil Lindsay and VP Jamil Ghani. It settles allegations that Amazon "enrolled millions of consumers in Prime subscriptions without their consent, and knowingly made it difficult for consumers to cancel." Terms: a **$1 billion civil penalty**, **$1.5 billion in refunds** for about **35 million** consumers, and an order to stop the unlawful enrollment and cancellation practices. The FTC says it is "only the third ROSCA case in which the FTC has obtained a civil penalty" and the $1B is "the largest ever in a case involving an FTC rule violation" [L14].
- **2026-09-17**, FTC: under a revised order more consumers qualify for refunds, and the maximum payment rose from **$51 to $200** [L15].

##### Other 2025-2026 FTC subscription/ROSCA cases
- The FR search also returned *Southern Health Solutions, Inc., et al.*, a proposed consent order (90 FR 33379, 2025-07-17) that matches "negative option." I did not open it, so its contents are **UNVERIFIED** [L12].
- Leads not checked on ftc.gov in time (Uber One, Match Group, Chegg, Cleo AI, and others): **UNVERIFIED (not checked).** Do not cite them.

##### What a consumer tool can say today (federal)
- OK: "There is no federal 'click-to-cancel' rule in effect (as of October 2026). The FTC's 2024 rule was struck down by a federal appeals court in July 2025, and the FTC began a new rulemaking in March 2026."
- OK: "A federal law, ROSCA, requires online sellers that use automatic renewals to disclose the terms, get your consent, and provide simple ways to stop recurring charges."
- OK, factual: "In 2025 the FTC settled its Prime case against Amazon for $2.5 billion."

---

#### 4b. State automatic-renewal laws

"Verified" means I read the quoted points today in the statute text on the state's own site. Points I could not see are marked UNVERIFIED inside the row.

| State | Citation | Official URL | Fetched | Key consumer-facing points (as read) | Status / effective date | Verified |
|---|---|---|---|---|---|---|
| California | Bus. & Prof. Code §§17600-17606 (§17602 read; §17601 header read) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17602 | 2026-10-04 | Consumers must be able to cancel "in the same medium that the consumer used" to sign up, or the medium they usually use with the business. A business must send an **annual reminder** for annual auto-renewals. | §17602 and §17601 were amended by Stats. 2024, ch. 515 (**AB 2863**), effective 2025-01-01. The new subdivisions apply to contracts "entered into, amended, or extended ... on or after **July 1, 2025**." | yes [L16][L17] |
| Vermont | 9 V.S.A. §2454a | https://legislature.vermont.gov/statutes/section/09/063/02454a | 2026-10-04 | Where notice is required, written or electronic notice must arrive **30-60 days** before the earliest of the renewal date, the termination date, or the deadline to cancel. There must be an easy-to-use cancellation mechanism. If the consumer **accepted online**, they must be allowed to **terminate exclusively online** (a seller-formatted termination e-mail counts). | Current through the 2025 session. The site says it is an "unofficial copy of the Vermont Statutes Annotated." | yes [L18] |
| Minnesota | Minn. Stat. §§325G.56-325G.62 (2024 c 114 art 3 ss 55-62) | https://www.revisor.mn.gov/statutes/cite/325G.57 (also .56, .59) | 2026-10-04 | Free trials longer than 30 days: the seller must notify the consumer **5-30 days before the trial ends** of the option to cancel. **Periodic notice** of continuous service by mail or email must say how to terminate or manage it. The consumer may terminate "by any reasonable means at any time," including an **online option** or the means used to sign up, **at no cost** (§325G.59). | New in 2024. **Effective 2025-01-01 is UNVERIFIED** (my session-law check failed). | yes (text); date UNVERIFIED [L19][L20][L21] |
| Virginia | Va. Code §59.1-207.46 | https://law.lis.virginia.gov/vacode/title59.1/chapter17.8/section59.1-207.46/ | 2026-10-04 | The cancellation mechanism must be "**at least as easy to use as the mechanism the consumer used to initiate**" the offer, and offered through at least each method used to sign up. **No live or virtual agent may be required** unless the seller only signs people up through an agent. The acknowledgment must include how to cancel, and for free trials, how to cancel before being charged. | In force on the date fetched. **Effective date of this text is UNVERIFIED.** | yes [L22] |
| Illinois | 815 ILCS 601 (Automatic Contract Renewal Act); 601/10 read | https://www.ilga.gov/ftp/ILCS/Ch%200815/Act%200601/081506010K10.html | 2026-10-04 | A consumer who accepts an auto-renewal offer **online** "must be allowed to terminate ... **exclusively online**," which may be a seller-formatted termination email or a link. **The 30-60 day notice for 12-month-plus terms is UNVERIFIED** (seen only in a search summary). | Act from P.A. 91-674, eff. 2000-06-01, later amended. Amendment dates not checked. | yes (online-cancel point) [L23] |
| Delaware | 6 Del. C. §§2731-2737 (ch. 27, subch. IV) | https://delcode.delaware.gov/title6/c027/sc04/index.html | 2026-10-04 | The seller must provide "a cost-effective, timely, and easy to use mechanism for cancellation." "A consumer who enters into a contract **online** shall be permitted to **cancel the contract online**." §2734 requires disclosure of auto-renewal terms. | Amended by 83 Del. Laws c. 115 and later acts. Exact effective dates not checked. | yes [L24] |
| District of Columbia | D.C. Code §28A-201 et seq. (§§28A-202, 28A-203 read) | https://code.dccouncil.gov/us/dc/council/code/sections/28A-203 | 2026-10-04 | The auto-renewal provision and the **cancellation procedure** must be disclosed clearly and conspicuously. Offers with a free gift or trial must explain it. For initial terms of **12 months or more** that renew for a month or more, notice by first-class mail, email, or similar must go out **30-60 days before the cancellation deadline**, for the first renewal and annually after. | In force. The §28A-202 page notes an amendment that "has not been implemented" pending budget funding; **what it changes is UNVERIFIED**. | yes [L25][L26] |
| Florida | Fla. Stat. §501.165 | http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.165.html | 2026-10-04 | **Service contracts only.** The auto-renewal provision must be disclosed clearly and conspicuously. For terms of **12 months or more** that renew for more than a month, written or electronic notice must come **30-60 days before the cancellation deadline**. | In force on the date fetched. | yes [L27] |
| North Dakota | N.D.C.C. ch. 51-37 (§§51-37-01 to -06) | https://ndlegis.gov/cencode/t51c37.pdf | 2026-10-04 | Terms must be presented "in a clear and conspicuous manner" before purchase and near the offer. The acknowledgment must include the terms and "information regarding how to cancel." **An online-cancel point was not found in my search: UNVERIFIED.** | In force on the date fetched. | yes (partial) [L28] |
| New York | GOL §5-903; GBL §527-a | https://www.nysenate.gov/legislation/laws/GBS/527-A | 2026-10-04 | 403 from nysenate.gov; not read. | UNVERIFIED | **UNVERIFIED (403)** |
| Massachusetts | 940 CMR 38.00 (AG "junk fee" and auto-renewal regulation) | https://www.mass.gov/regulations/940-CMR-3800-unfair-and-deceptive-fees | 2026-10-04 | 403 ("Not allowed") from mass.gov; not read. A search snippet says it applies from **2025-09-02**. | UNVERIFIED | **UNVERIFIED (403)** |
| Oregon | ORS 646A.292-646A.295 | https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html | 2026-10-04 | No response (curl 000, three tries). | UNVERIFIED | **UNVERIFIED (no response)** |
| Colorado | C.R.S. 6-1-732 | official C.R.S. is hosted by LexisNexis; not fetched | n/a | n/a | UNVERIFIED | **UNVERIFIED** |
| Utah | Utah Code Title 15, ch. 10 | https://le.utah.gov/xcode/Title15/Chapter10/15-10-S201.html | 2026-10-04 | 200, but the statute text is loaded by script and was not in the HTML. | UNVERIFIED | **UNVERIFIED** |
| Connecticut | Conn. Gen. Stat. §42-126b | https://www.cga.ct.gov/current/pub/chap_743h.htm (wrong chapter guess) | 2026-10-04 | Section not found on that page. | UNVERIFIED | **UNVERIFIED** |

**Verified rows: 9** (CA, VT, MN, VA, IL, DE, DC, FL, ND). **Unverified: 6** (NY, MA, OR, CO, UT, CT). New 2025-2026 state laws beyond these were not searched.

Product rule: say "some states" generically, or name only a verified state and its verified point. Do not say "your state requires...". Whether a law applies depends on where the consumer and business are and on the contract type; Florida's law, for example, covers service contracts only.

---

#### 4c. Stopping recurring charges (consumer side)

**Bank account (ACH or other preauthorized transfers): Regulation E**
- **12 CFR 1005.10(c)(1):** "A consumer may stop payment of a preauthorized electronic fund transfer from the consumer's account by notifying the financial institution orally or in writing **at least three business days before the scheduled date** of the transfer." **(c)(2):** the institution "may require the consumer to give written confirmation of a stop-payment order **within 14 days** of an oral notification." [L30][L31] eCFR link: https://www.ecfr.gov/current/title-12/chapter-X/part-1005/subpart-A/section-1005.10#p-1005.10(c)
- Official interpretation (comment 10(c)-1, on the CFPB's Reg E page): the institution "must honor an oral stop-payment order made at least three business days before a scheduled debit. If the debit item is resubmitted, the institution must continue to honor the stop-payment order." [L31]
- **CFPB "How do I stop automatic payments from my bank account?"** (live, 200) [L29]:
  - Revoke the company's authorization and tell your bank you have revoked it. Your bank may have a form. Follow up in writing.
  - After you revoke with the bank and the company, "any additional payments initiated by that company would be errors, and you can contact your bank for a refund."
  - A bank may suggest a stop payment order, and "banks and credit unions generally charge fees for stop payment orders."
  - "**Cancelling an automatic payment does not cancel what you owe.**" Cancel the contract with the company as well.

**Credit card: Fair Credit Billing Act / Regulation Z**
- **12 CFR 1026.13(b)(1):** a billing-error notice must be "received by a creditor at the address disclosed ... **no later than 60 days after the creditor transmitted the first periodic statement that reflects the alleged billing error**." It must identify the consumer's name and account number and, to the extent possible, say why the consumer believes there is an error [L32]. eCFR link: https://www.ecfr.gov/current/title-12/chapter-X/part-1026/subpart-B/section-1026.13#p-1026.13(b)
- The FCBA statute (15 U.S.C. 1666) and the §1026.13(a) list of billing-error types were **not fetched today**. Do not claim that a charge after cancellation is always a "billing error"; say "may be disputed."
- Debit-card error resolution under Reg E 12 CFR 1005.11 was **not fetched: UNVERIFIED.**
- The CFPB credit-card Ask page (en-1543) returned **404**. The CFPB credit-card page found in search is not verified.

**Card networks (private network rules, not consumer law)**
- **Visa:** "Visa Core Rules and Visa Product and Service Rules," edition **18 April 2026** (public PDF on visa.com, 923 pages). It contains **"Dispute Condition 13.2: Cancelled Recurring Transaction"** (pp. 756-758). Supporting documentation includes "the date the Cardholder withdrew permission" and the "details used to contact the Merchant." Merchants may answer with evidence such as the cardholder asking to cancel on a different date [L33]. **Verified.**
- **Mastercard reason code 4841 "Cancelled Recurring or Digital Goods Transactions":** both mastercard.us Chargeback Guide URLs returned 403. **UNVERIFIED.**
- What a consumer needs: **cancel with the merchant first and keep proof (date, how you contacted them, the confirmation). If charges continue, your bank or card issuer can help.** Network codes are bank-to-bank rules, so do not present them as consumer rights.

---

#### 4d. Draft consumer-facing text (90 words by `wc -w`, built only from verified facts)

> Cancel with the company first and keep proof, like a confirmation email or screenshot. Bank autopay: under U.S. rules you can tell your bank to stop a preauthorized debit at least three business days before it is due (your bank may want it in writing and may charge a fee). Credit-card charges: contact your card issuer quickly; billing-error disputes have a 60-day window from the statement. Some states require online cancellation for online sign-ups. No federal "click-to-cancel" rule is in effect as of October 2026. General information, not legal advice.

Backing: proof and cancel-first [L29]; three business days and written confirmation [L30][L31]; fee [L29]; 60 days [L32]; states [L18][L23][L24]; no federal rule [L9][L3][L7].

##### Claims we must NOT make
1. "The FTC requires click-to-cancel," "federal law says cancelling must be as easy as signing up," or "the Click-to-Cancel Rule protects you." The rule was vacated on 2025-07-08 and removed from the CFR on 2026-02-12.
2. "A new FTC click-to-cancel rule is coming or takes effect on X." Only an ANPRM exists (2026-03-13). No NPRM or final rule had been published as of 2026-10-04.
3. Any blanket "federal law guarantees simple cancellation." ROSCA's "simple mechanisms" duty covers **online** negative-option sales. Quote it narrowly.
4. "Your bank must refund any subscription charge" or "you can always get a chargeback." Reg E stop-payment covers preauthorized transfers from an account with three business days' notice. Card disputes go through the issuer and network rules, and merchants can answer them.
5. "Stopping autopay cancels your subscription." The CFPB says it does not cancel what you owe.
6. "Your state requires X" for any state, and any NY, MA, OR, CO, UT or CT specifics. Those rows are unverified.
7. Mastercard code names, or "Visa 13.2" presented as a consumer right.
8. Debit-card error-resolution deadlines (Reg E §1005.11 not fetched).
9. Specific FTC cases other than Amazon (others not verified), or anything implying users qualify for Amazon refunds.
10. Anything that sounds like legal advice, or that the tool cancels for the user or guarantees an outcome.

---

#### Sources register (all fetched 2026-10-04, between 20:58 and 21:05 ET)

- **[L1]** https://www.ftc.gov/news-events/news/press-releases/2024/10/federal-trade-commission-announces-final-click-cancel-rule-making-it-easier-consumers-end-recurring (200). Supports: announcement dated 2024-10-16; most provisions take effect 180 days after FR publication. (A longer slug variant ending `...-subscriptions-memberships` returned 404.)
- **[L2]** https://www.federalregister.gov/documents/2024/11/15/2024-25534/negative-option-rule (FR API record). Supports: 89 FR 90476, published 2024-11-15, effective 2025-01-14, new title and scope.
- **[L3]** https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=425 and https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-16?part=425 (public page: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-425). Supports: §425.6 "Click to Cancel" added 2025-01-14; §§425.3-425.9 removed 2026-02-12; Part 425 now "Use of Prenotification Negative Option Plans" (source 91 FR 6509).
- **[L4]** https://www.federalregister.gov/documents/2025/01/21/2025-00634/petition-for-rulemaking-of-central-office-of-reform-and-efficiency-negative-option-rule. Supports: 90 FR 6843 petition.
- **[L5]** https://www.ftc.gov/news-events/news/press-releases/2025/05/ftc-votes-negative-option-rule-deadline (200). Supports: 60-day deferral vote, 3-0.
- **[L6]** https://www.ftc.gov/system/files/ftc_gov/pdf/negative-option-rule-delay-commission-statement.pdf (200, PDF dated May 9, 2025). Supports: deferral of §§425.4-425.6 and enforcement from July 14, 2025.
- **[L7]** https://ecf.ca8.uscourts.gov/opndir/25/07/243137P.pdf (200, 23 pp.). Supports: *Custom Communications, Inc. v. FTC*, Nos. 24-3137 and 24-3388; filed 2025-07-08; §22 preliminary regulatory analysis / $100M holding; vacatur of the whole Rule.
- **[L8]** https://www.federalregister.gov/documents/2025/12/03/2025-21887/petition-for-rulemaking-of-consumer-federation-of-america-and-the-american-economic-liberties. Supports: CFA/AELP petition, 90 FR 55701, File No. R607000.
- **[L9]** https://www.federalregister.gov/documents/2026/02/12/2026-02866/revision-of-the-negative-option-rule-withdrawal-of-the-cars-rule-removal-of-the-non-compete-rule-to. Supports: 91 FR 6507, effective 2026-02-12, recodifies the pre-2024 text.
- **[L10]** https://www.federalregister.gov/documents/2026/03/13/2026-04952/rule-concerning-the-use-of-prenotification-negative-option-plans. Supports: ANPRM, 91 FR 12318; comments due 2026-04-13.
- **[L11]** https://www.ftc.gov/legal-library/browse/rules/negative-option-rule (200). Supports: the FTC's own page shows the ANPRM (2026-03-13) and the 2026-02 revision as current.
- **[L12]** https://www.federalregister.gov/api/v1/documents.json?conditions[term]="negative option"&conditions[agencies][]=federal-trade-commission&conditions[publication_date][gte]=2024-10-01&order=newest (11 results). A second query for "negative option rule", 2025-04-01 to 2025-08-31, returned 0. Supports: no NPRM or final rule after the ANPRM; deferral not in the FR; Southern Health Solutions hit; 2026-08-14 regulatory agenda hit.
- **[L13]** https://www.govinfo.gov/content/pkg/USCODE-2023-title15/html/USCODE-2023-title15-chap110.htm (200). Supports: ROSCA §§8401-8405 and the §8403 text.
- **[L14]** https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-secures-historic-25-billion-settlement-against-amazon (200). Supports: Amazon settlement dated 2025-09-25, $1B penalty, $1.5B refunds, ROSCA.
- **[L15]** https://www.ftc.gov/news-events/news/press-releases/2026/09/ftc-announces-additional-payments-consumers-stemming-ftcs-amazon-prime-settlement (200). Supports: 2026-09-17 revised order; maximum payment $51 to $200.
- **[L16]** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17602 (200). Supports: CA same-medium cancellation, annual reminder, AB 2863, July 1, 2025.
- **[L17]** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17601 (200). Supports: §17601 amended by AB 2863 (Stats. 2024, ch. 515); July 1, 2025 applicability.
- **[L18]** https://legislature.vermont.gov/statutes/section/09/063/02454a (200). Supports: VT 30-60 day notice and exclusive online termination.
- **[L19]** https://www.revisor.mn.gov/statutes/cite/325G.56 (200). Supports: MN §§325G.56-.62 scope; 2024 c 114 art 3.
- **[L20]** https://www.revisor.mn.gov/statutes/cite/325G.57 (200). Supports: MN free-trial notice (5-30 days) and periodic notice.
- **[L21]** https://www.revisor.mn.gov/statutes/cite/325G.59 (200). Supports: MN termination by any reasonable means, including online, at no cost.
- **[L22]** https://law.lis.virginia.gov/vacode/title59.1/chapter17.8/section59.1-207.46/ (200). Supports: VA cancel at least as easy as sign-up; no forced agent.
- **[L23]** https://www.ilga.gov/ftp/ILCS/Ch%200815/Act%200601/081506010K10.html and https://www.ilga.gov/ftp/ILCS/Ch%200815/Act%200601/081506010F.html (200). Supports: IL exclusive online termination; Act citation and P.A. 91-674.
- **[L24]** https://delcode.delaware.gov/title6/c027/sc04/index.html (200). Supports: DE online cancel for online contracts; easy cancellation mechanism; §2734.
- **[L25]** https://code.dccouncil.gov/us/dc/council/code/sections/28A-202 (200). Supports: DC definitions; note about the unimplemented amendment.
- **[L26]** https://code.dccouncil.gov/us/dc/council/code/sections/28A-203 (200). Supports: DC disclosure, free trial, and 30-60 day annual notice.
- **[L27]** http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0500-0599/0501/Sections/0501.165.html (200). Supports: FL service-contract disclosure and 30-60 day notice.
- **[L28]** https://ndlegis.gov/cencode/t51c37.html and https://ndlegis.gov/cencode/t51c37.pdf (200). Supports: ND ch. 51-37 sections; §51-37-02 disclosure and acknowledgment.
- **[L29]** https://www.consumerfinance.gov/ask-cfpb/how-do-i-stop-automatic-payments-from-my-bank-account-en-2023/ (200). Supports: revoke authorization; later payments are errors; stop-payment fees; "Cancelling an automatic payment does not cancel what you owe."
- **[L30]** https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-12?part=1005&section=1005.10 (200; public page linked in C). Supports: 12 CFR 1005.10(c)(1).
- **[L31]** https://www.consumerfinance.gov/rules-policy/regulations/1005/10/ (200). Supports: §1005.10(c)(1)-(2) (14-day written confirmation) and comment 10(c)-1.
- **[L32]** https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-12?part=1026&section=1026.13 (200; public page linked in C). Supports: 12 CFR 1026.13(b)(1) 60-day notice.
- **[L33]** https://usa.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf (200, 7.6 MB, edition 18 April 2026). Supports: Dispute Condition 13.2 "Cancelled Recurring Transaction," pp. 756-758.
- **Blocked (recorded):** https://www.nysenate.gov/legislation/laws/GOB/5-903 (403); https://www.nysenate.gov/legislation/laws/GBS/527-A (403); https://www.mastercard.us/content/dam/public/mastercardcom/na/global-site/documents/chargeback-guide.pdf (403); `.../chargeback-guide-merchant-edition.pdf` (403); https://www.mass.gov/doc/junk-fee-regulations-940-cmr-3800-0/download (403 "Not allowed"); a mass.gov news page on the 940 CMR 38 compliance date (403); https://www.oregonlegislature.gov/bills_laws/ors/ors646A.html (no response); https://www.ilga.gov/legislation/ilcs/fulltext.asp?DocName=081506010K10 (404); CFPB Ask page en-1543 (404).

## §5. Cancel directory: official manage/cancel pages, fetched 2026-10-04 (source files: `_work/cancel-directory-A.md`, `_work/cancel-directory-B.md`)

### §5a. Batch A: video, music, news, dating, gaming, platform billers
Verified by live `curl` (GET, follow redirects, 20s timeout, UA `SubscriptionSweepResearch/0.1`) on 2026-10-04, ~21:00–21:04 ET. All URLs below are on the merchant's own domain (or the platform biller's own domain for Apple/Google/PayPal/Roku/Amazon). No third-party "how to cancel" sites were used. Two verification passes were run; a handful of merchants also got one WebFetch attempt where every curl attempt was blocked (noted in Blocks below). "verified=yes" means at least one URL returned 2xx, or 3xx landing on the merchant's own sign-in/help page, today.

| id | name | category | manageUrl | status→final (ET) | helpUrl | status→final (ET) | stepsStated | verified | notes |
|---|---|---|---|---|---|---|---|---|---|
| netflix | Netflix | video | https://www.netflix.com/account | 200→netflix.com/login?nextpage=…/account (21:00) | https://help.netflix.com/en/node/407 | 200 (21:00) | yes | yes | clean |
| hulu | Hulu | video | https://www.hulu.com/account | 200→auth.hulu.com/web/login…secure.hulu.com/account (21:00) | https://help.hulu.com/ | 200 root only (21:02); specific article slug 404'd | no (root JS-rendered) | yes | help article slug guess was wrong; only root resolved |
| disney-plus | Disney+ | video | https://www.disneyplus.com/account | 200→disneyplus.com/commerce/account (21:00) | https://help.disneyplus.com/article/disneyplus-cancel-subscription | 200 but resolves to help root (21:02) | no (JS-rendered, not-checkable) | yes | help center is Salesforce JS app; can't confirm steps via curl |
| hbo-max | HBO Max (Max) | video | https://play.max.com/settings/subscription | 200→auth.hbomax.com/login?...play.hbomax.com/settings/subscription (21:00) | https://help.max.com/us | 200 root only (21:02); guessed article id 404'd | no | yes | brand straddles hbomax.com/max.com domains; specific KB id guess wrong |
| paramount-plus | Paramount+ | video | https://www.paramountplus.com/account | 200→.../account/signin/ (21:02) | https://help.paramountplus.com/ | 200→help.paramountplus.com/s/ (21:02) | yes | yes | original guessed paths 404'd, root paths work |
| peacock | Peacock | video | https://www.peacocktv.com/account | 200→peacocktv.com/signin?return=%2faccount%2fplans (21:02) | https://www.peacocktv.com/help | 200 (21:02) | yes | yes | original specific paths 404'd, root paths work |
| apple-tv | Apple TV (billed by Apple) | video | https://tv.apple.com/account | 200→finance-app.itunes.apple.com/account (21:00) | https://support.apple.com/en-us/HT202039 | 200→support.apple.com/en-us/118428 (21:00) | yes | yes | Apple renumbered this KB article HT202039→118428 (old link still redirects); covers all App Store–billed subs |
| youtube-premium | YouTube Premium | video | https://www.youtube.com/paid_memberships | 200→accounts.google.com signin (21:00) | https://support.google.com/youtube/answer/6308278 | 200 (21:00) | yes | yes | clean |
| youtube-tv | YouTube TV | video | https://tv.youtube.com/manage/ | 200 (21:00) | https://support.google.com/youtubetv/ | 200 (21:02); guessed answer id 404'd | yes | yes | use support hub root, not the specific answer-id guess |
| sling-tv | Sling TV | video | https://www.sling.com/myaccount | 200→sling.com/account (21:00) | https://www.sling.com/help/en/s/article/how-do-i-cancel-my-sling-tv-subscription | 404 (21:00) | not-checkable | yes | help URL looks structurally correct but 404'd via curl — likely client-side routed SPA |
| fubo | Fubo | video | https://www.fubo.tv/account | 200 (21:00) | https://support.fubo.tv/hc/en-us/articles/115014115988 | 403 blocked (21:00) | no | yes | Zendesk bot wall on support subdomain |
| philo | Philo | video | https://www.philo.com/account | 200→philo.com/login/authenticate…/account (21:00) | https://help.philo.com/ | 200 (21:02) | yes | yes | clean after retry |
| crunchyroll | Crunchyroll | video | https://www.crunchyroll.com/acct/membership | 403 blocked (21:00) | https://help.crunchyroll.com/hc/en-us | 200 root (21:02) | no (JS-rendered) | yes | account page Cloudflare-blocked; help loads but article JS-rendered |
| starz | Starz | video | https://www.starz.com/account/subscription | 200→starz.com/us/en/account/subscription (21:00) | https://faqs.starz.com/ | 000 unreachable, both attempts (21:01, 21:03) | not-checkable | yes | FAQ domain unreachable via curl twice (timeout/TLS) |
| mgm-plus | MGM+ | video | https://www.mgmplus.com/my-account | 404, both guesses tried (21:00, 21:02) | https://www.mgmplus.com/help | 200 root (21:00) | no | yes | no working manage/account URL found in two tries |
| amc-plus | AMC+ | video | https://www.amcplus.com/account | 200 (21:00) | https://support.amcplus.com/kb/en | 200 (21:00) | **yes** | yes | best result in the batch — actual cancel steps found on first try |
| britbox | BritBox | video | https://www.britbox.com/account | 200→account.britbox.com/signin?... (21:00) | https://help.britbox.com/hc/en-us | 403 blocked (21:00) | no | yes | Zendesk bot wall on help subdomain |
| espn | ESPN+/ESPN | video | https://www.espn.com/espnplus/ | 200→espn.com/watch/ (21:02) | https://www.espn.com/espnplus/ | 200→espn.com/watch/ (21:02) | no | yes (weak) | **surprise**: every ESPN+ path we tried (subscription, help, espnplus root) now redirects to the generic espn.com/watch landing page — the old ESPN+ URL structure appears gone; real cancel path not found, needs a fresh look (new ESPN DTC app) |
| dazn | DAZN | video | https://www.dazn.com/en-US/account | 200 (21:00) | https://support.dazn.com/hc/en-us | 000 unreachable (21:00) | not-checkable | yes | support subdomain connection failed |
| discovery-plus | discovery+ | video | https://www.discoveryplus.com/account | 200→auth.discoveryplus.com/my-account (21:00) | https://help.discoveryplus.com/ | 200→.../hc/en-us (21:02) | no (JS) | yes | US discovery+ content has been migrating into Max; account domain still live separately as of this check |
| spotify | Spotify | music | https://www.spotify.com/account/subscription/ | 200→accounts.spotify.com signin (21:00) | https://support.spotify.com/us/article/cancel-premium/ | 200 (21:00) | yes | yes | clean, best-in-class result |
| apple-music | Apple Music | music | https://music.apple.com/account | 200→finance-app.itunes.apple.com/account (21:00) | https://support.apple.com/en-us/118428 | 200 (21:00) | yes | yes | same Apple KB article as apple-tv |
| youtube-music | YouTube Music | music | https://www.youtube.com/paid_memberships | 200 (21:00) | https://support.google.com/youtubemusic/ | 200 (21:02); guessed answer id 404'd | yes | yes | use support hub root |
| amazon-music | Amazon Music Unlimited | music | https://www.amazon.com/music/unlimited | 200 (21:02); original settings-page guess 404'd | https://www.amazon.com/gp/help/customer/display.html?nodeId=201936900 | 200→nodeId=GLQP8385T78LUERA (21:00) | yes | yes | Amazon auto-redirected our help nodeId to a current one |
| pandora | Pandora | music | https://www.pandora.com/account/subscription | 200 (21:00) | https://help.pandora.com/ | 200→.../s/?language=en_US (21:02) | yes | yes | specific article slug 404'd, root works |
| siriusxm | SiriusXM | music | https://www.siriusxm.com/manage/ | 200→**siriusxm.com/help/manage-or-cancel-service** (21:00) | https://help.siriusxm.com/s/article/How-do-I-cancel-my-subscription | 000 unreachable (21:00) | yes | yes | manage URL auto-redirects straight into the cancel-instructions page — strong result |
| tidal | TIDAL | music | https://tidal.com/account | 403 blocked, both domains tried (account.tidal.com + tidal.com), 2 rounds | https://support.tidal.com/hc/en-us | 403 blocked, 2 rounds + WebFetch also 403 | no | **no** | fully blocked — 4 curls + 1 WebFetch all 403 |
| audible | Audible | books | https://www.audible.com/account/membership | 404, two guesses tried (21:00, 21:02) | https://www.audible.com/help | 200 (21:00) | yes | yes | no working manage URL found; help confirms steps |
| kindle-unlimited | Kindle Unlimited | books | https://www.amazon.com/kindle-dbs/subscribe/kuhome | 404, two guesses tried (21:00, 21:02) | https://www.amazon.com/gp/help/customer/display.html?nodeId=201974040 | 200 (21:00) | no | yes | no working manage URL found; help loaded but no cancel text matched |
| nytimes | New York Times | news | https://myaccount.nytimes.com/seg/subscription | 200 (21:00) | https://help.nytimes.com/hc/en-us/articles/115014925468 | 200→help.nytimes.com/ (21:00) | yes | yes | clean |
| wsj | Wall Street Journal | news | https://customercenter.wsj.com/ | 200→.../public (21:00) | https://customercenter.wsj.com/view/help-center | 200 (21:00) | yes | yes | clean, both URLs good on first try |
| washington-post | Washington Post | news | https://subscribe.washingtonpost.com/profile/ | 000 unreachable, both domains tried, 2 rounds | https://helpcenter.washingtonpost.com/hc/en-us | 403 blocked, 2 rounds + WebFetch also 403 | no | **no** | fully blocked/unreachable — 4 curls + 1 WebFetch, zero success |
| the-atlantic | The Atlantic | news | https://www.theatlantic.com/membership/ | 403 blocked, 2 rounds + WebFetch failed to connect | https://www.theatlantic.com/help/ | 403 blocked, 2 rounds | no | **no** | fully blocked — every attempt 403/failed |
| medium | Medium | news | https://medium.com/me/settings/membership | 403 blocked, 2 rounds | https://help.medium.com/hc/en-us | 403 blocked, 2 rounds + WebFetch also 403 | no | **no** | fully blocked — every attempt 403 |
| tinder | Tinder | dating | https://tinder.com/app/account | 200 (21:00) | https://www.help.tinder.com/hc/en-us/articles/115003479523 | 403 blocked (21:00) | no | yes | Zendesk bot wall on help |
| bumble | Bumble | dating | https://bumble.com/app | 200→**bumble.com/web-not-available/** (21:00) | https://bumble.com/support | 404 (21:00) | yes | yes | **surprise**: Bumble's own page says web account management is not available — mobile app (App Store/Google Play billing) only |
| hinge | Hinge | dating | https://hinge.co/app | 200, app landing page only (21:00) | https://help.hinge.co/hc/en-us | 403 blocked (21:00) | no | yes (weak) | app-only like Bumble; no real web account page found, Zendesk help blocked |
| match | Match | dating | https://www.match.com/ | 403 blocked, 2 rounds + WebFetch 403 | https://www.match.com/help | 403 blocked, 2 rounds + WebFetch 403 | no | **no** | fully blocked — every attempt 403 (Akamai/PerimeterX-style wall) |
| eharmony | eHarmony | dating | https://www.eharmony.com/ | 200, root only (21:02); /my-account/ 404'd | https://support.eharmony.com/... (long redirect chain) | 200 (21:00) | no | yes (weak) | neither URL landed on a specific account/cancel page |
| xbox-game-pass | Xbox Game Pass | gaming | https://account.microsoft.com/services | 200→login.microsoftonline.com oauth (21:00) | https://support.xbox.com/en-US/help/subscriptions-billing/manage-payment-subscriptions/cancel-xbox-subscription | 200 (21:00) | no (JS) | yes | help page loaded but cancel text not matched by curl (likely JS-rendered) |
| playstation-plus | PlayStation Plus | gaming | https://www.playstation.com/en-us/playstation-plus/ | 200 (21:00) | https://www.playstation.com/en-us/support/subscriptions/ | 200 (21:02); specific cancel-page slug 404'd | yes | yes | root support/subscriptions path works |
| nintendo-switch-online | Nintendo Switch Online | gaming | https://accounts.nintendo.com/ | 302→accounts.nintendo.com/login?post_login_redirect_uri=... (21:03) | https://en-americas-support.nintendo.com/app/answers/detail/a_id/27745 | 406 bot-blocked (21:00) | not-checkable | yes | nintendo.com/us/my-nintendo 404'd; accounts.nintendo.com sign-in redirect counts as verified |
| discord-nitro | Discord Nitro | gaming | https://discord.com/app | 200, web-app shell only (21:03) | https://support.discord.com/hc/en-us/articles/115001177731 | 403 blocked (21:00) | no | yes (weak) | discord.com/billing doesn't exist; Nitro billing lives inside the logged-in client/app, no standalone public billing URL found |
| twitch | Twitch | gaming | https://www.twitch.tv/subscriptions | 200 (21:00) | https://help.twitch.tv/s/ | 200 (21:02); specific article slug 404'd | yes | yes | root help works |
| ea-play | EA Play | gaming | https://www.ea.com/ea-play | 200 (21:00) | https://help.ea.com/en/help/account/cancel-ea-play/ | 000 unreachable (21:00) | not-checkable | yes | help.ea.com connection failed |
| roblox | Roblox | gaming | https://www.roblox.com/my/account#!/subscriptions | 200→roblox.com/NewLogin?ReturnUrl=%2Fmy%2Faccount (21:00) | https://en.help.roblox.com/hc/en-us/articles/203312800 | 403 blocked (21:00) | no | yes | Zendesk bot wall on help |
| apple | Apple (App Store subscriptions) | platform biller | https://apps.apple.com/account/subscriptions | 200 (21:00) | https://support.apple.com/en-us/HT202039 | 200→.../118428 (21:00) | yes | yes | same renumbered KB article used across all Apple-billed rows |
| google-play | Google Play subscriptions | platform biller | https://play.google.com/store/account/subscriptions | 200→accounts.google.com signin (21:00) | https://support.google.com/googleplay/answer/7018481 | 200 (21:00) | yes | yes | clean, both URLs good on first try |
| paypal | PayPal (automatic payments) | platform biller | https://www.paypal.com/myaccount/autopay/ | 403 blocked at sign-in step (21:00) | https://www.paypal.com/us/cshelp/article/help539 | 200 but **wrong article** (resolved to a tax-payment FAQ, not cancel instructions) (21:00) | no (wrong topic) | yes (weak) | flagged: our help-article guess resolved to unrelated content; manage page blocked by bot wall — needs a real search for PayPal's "cancel automatic/pre-approved payments" article |
| roku | Roku (billed by Roku) | platform biller | https://my.roku.com/account/subscriptions | 200 (21:00) | https://support.roku.com/en-us | 200 root (21:02); specific article id 404'd | yes | yes | root support works, specific article id guess wrong |
| amazon-channels | Amazon/Prime Video Channels | platform biller | https://www.amazon.com/mn/dcw/myx.html | 200→amazon.com/ax/claim?arb=... (21:02); original guess 404'd | https://www.amazon.com/gp/help/customer/display.html?nodeId=202095260 | 200 (21:00) | no (JS) | yes (weak) | manage URL hit Amazon's anti-automation "claim" redirect, not a real account page — needs manual recheck in a browser |

##### Blocks / 403s (confirmed bot walls, not evaded — no UA spoofing or proxies used)
Merchants that returned 403 on at least one URL: britbox (help), crunchyroll (manage), discord-nitro (help), fubo (help), hinge (help), paypal (manage), roblox (help), tinder (help) — all Zendesk/Akamai-style help-center or account bot walls, but each of these merchants still verified via their other URL.

**Fully blocked (verified = no), confirmed by both curl (2 rounds, 4 URLs each) and one WebFetch attempt each**: **tidal**, **washington-post**, **the-atlantic**, **medium**, **match**. All five hit 403 (or connection failure, for washington-post's manage URL) on every single attempt — WebFetch independently hit the same 403/connection error, so this is a real bot wall, not a curl-UA artifact. These five need a manual/browser recheck outside this lane's scope.

##### Surprises
- **ESPN**: every ESPN+/ESPN URL we tried (account/subscription, help, espnplus root) now redirects to the generic `espn.com/watch/` landing page — the old espnplus-specific URL structure seems to be gone (likely tied to the "new ESPN" DTC app relaunch). The real manage/cancel path wasn't found; needs fresh research.
- **Bumble**: `bumble.com/app` redirects to `bumble.com/web-not-available/` — Bumble has no web self-serve account page at all; subscriptions can only be managed in the iOS/Android app (so cancellation really routes through Apple/Google billing, not Bumble.com).
- **Hinge** and **Discord Nitro**: similarly app-only — no working standalone web account/billing URL found for either; real cancellation path is the App Store/Google Play subscription page (Hinge) or the logged-in Discord client (Nitro).
- **HBO Max**: still resolves sign-in through `hbomax.com` even though the branded surface is `max.com` — consistent with reporting that Warner Bros. Discovery is reverting the brand from "Max" back to "HBO Max."
- **discovery+**: account domain (`discoveryplus.com`) is still live and separate, even though discovery+ content has reportedly been folding into Max in the US — worth a follow-up to confirm whether discovery+ still bills separately.
- **Apple KB article renumbered**: `support.apple.com/en-us/HT202039` (the old "cancel a subscription" article id) now redirects to `support.apple.com/en-us/118428`. Use the new id going forward; the old one still works via redirect today.
- **PayPal help article**: our best-guess slug for "cancel automatic payments" (`.../article/help539`) actually resolved (200) to an unrelated PayPal tax-FAQ article, not cancel instructions — a reminder that guessed Zendesk/Salesforce-style numeric slugs can silently land on the wrong content even with a 200.
- **SiriusXM**: the plain "manage" URL auto-redirects straight into `siriusxm.com/help/manage-or-cancel-service` — one of the cleanest manage→cancel paths found in the whole batch.

### §5b. Batch B: software, cloud, AI, fitness, delivery, memberships, home, protection, telecom
Research window: 2026-10-04, ~20:58-21:10 ET. All URLs are on the merchant's own domain (hard rule: no third-party "how to cancel" sites). Verified live via `curl -A 'SubscriptionSweepResearch/0.1'` (follows redirects) at the timestamps noted; a handful also got one WebFetch/WebSearch-only pass where curl was blocked (noted inline). Times below are all ET on 2026-10-04.

Legend: **verified = yes** means at least one of manageUrl/helpUrl returned 2xx on the merchant's own domain, or a 3xx that lands on the merchant's own sign-in/help page. stepsStated: yes = fetched text visibly describes cancel steps; no = page loaded but doesn't show cancel steps (error page, wrong topic); not-checkable = page is JS-rendered (SPA) or we only reached a general landing page, so curl's raw HTML doesn't show the real content.

##### cloud / software / AI

| id | name | category | manageUrl | status→final (time) | helpUrl | status→final (time) | stepsStated | verified | notes |
|---|---|---|---|---|---|---|---|---|---|
| icloud | iCloud+ (Apple) | cloud | https://account.apple.com/account/manage/section/subscriptions | 200→https://appleid.apple.com/ (21:04) | https://support.apple.com/en-us/HT202039 | 200→https://support.apple.com/en-us/118428 (21:04) | yes ("Cancel a subscription from Apple - Apple Support") | yes | Apple KB renumbered HT202039→118428; same flow covers all App Store/Apple subscriptions including iCloud+ |
| google-one | Google One | cloud | https://one.google.com/storage | 200→Google sign-in (accounts.google.com) (21:04) | https://support.google.com/googleone/answer/9004133 | 404 (21:04) | not-checkable | yes (manage) | help slug guess was wrong; manage page correctly bounces to Google's own sign-in |
| dropbox | Dropbox | cloud | https://www.dropbox.com/account/plan | 200→https://www.dropbox.com/login?cont=%2Faccount%2Fplan (21:04) | https://help.dropbox.com/billing/cancel-plan | 404 (21:04) | not-checkable | yes (manage) | help slug guess wrong; no time to re-search exact article |
| microsoft-365 | Microsoft 365 | cloud | https://account.microsoft.com/services/microsoft365 | 200→Microsoft OAuth login (21:04) | https://support.microsoft.com/en-us/office/cancel-a-microsoft-365-subscription-5d84ed6b-0060-4bca-bea1-02a277323977 | 200→https://support.microsoft.com/en-us/accounts-billing/subscriptions/cancel-a-microsoft-365-subscription (21:04) | yes ("Cancel a Microsoft 365 subscription \| Microsoft Support") | yes | clean; if bought via Apple/Google/third-party reseller, MSFT's own article says cancel there instead |
| adobe | Adobe Creative Cloud | cloud | https://account.adobe.com/plans | 200 (21:04) | https://helpx.adobe.com/manage-account/using/cancel-subscription-online.html | 403 (21:04) | not-checkable (blocked) | yes (manage) | **early termination fee**: Adobe's own terms state the default "annual, paid monthly" plan carries a fee of 50% of the remaining contract balance if canceled after the 14-day window (0 fee inside 14 days). helpx.adobe.com blocked our UA (403) on both the cancel-steps page and the terms page, so we could not re-confirm the exact wording today, but this matches Adobe's publicly stated policy (subject of a March 2026 DOJ settlement requiring clearer disclosure) |
| canva | Canva | cloud | https://www.canva.com/settings/billing | 403 (21:04) | https://www.canva.com/help/cancel-subscription/ | 403 (21:04) | not-checkable | no | canva.com blocked bot UA on both URLs; not retried (no evasion allowed) |
| one-password | 1Password | cloud | https://my.1password.com/ | 200 (21:04) | https://support.1password.com/cancel-account/ | 403 (21:04) | not-checkable | yes (manage) | support subdomain blocked bot UA |
| lastpass | LastPass | cloud | https://accounts.lastpass.com/ | 200→https://www.lastpass.com/ (21:04) | https://support.lastpass.com/s/document-item?language=en_US&bundleId=lastpass&topicId=LastPass%2Fcancel-premium-plan.html | 200 (21:04) | not-checkable (Salesforce JS shell; only UI-chrome strings like "cancel-button" matched, not article text) | yes | help center is a Salesforce community (client-rendered) |
| nordvpn | NordVPN | cloud | https://my.nordaccount.com/billing/ | 403 (21:04) | https://nordvpn.com/blog/nordvpn-cancellation-and-refund-process/ | 403 (21:04) | not-checkable | no | both nordvpn.com and nordaccount.com blocked bot UA |
| expressvpn | ExpressVPN | cloud | https://www.expressvpn.com/subscriptions | 200→https://portal.expressvpn.com/api/auth/login/init?... (21:04) | https://www.expressvpn.com/support/manage-account/cancel-expressvpn-subscription/ | 200 (21:06) | yes ("Cancel Your ExpressVPN Subscription \| ExpressVPN") | yes | clean, one of the cleanest hits in this batch |
| norton | Norton (antivirus) | cloud | https://login.norton.com/ | 403 (21:04); fallback https://us.norton.com/ 403 (21:06) | https://support.norton.com/sp/en/us/home/current/solutions/v3672523 | 404 (21:04) | not-checkable | no | every norton.com-family host we tried blocked bot UA or 404'd; per search, cancel via my.norton.com → Subscriptions, or phone 1-833-743-5300 |
| mcafee | McAfee | cloud | https://www.mcafee.com/myaccount/ | 000 — no response (21:04); bare https://www.mcafee.com/ also 000 (21:05) | https://www.mcafee.com/support/ | 000 — no response (21:04) | not-checkable | no | mcafee.com did not answer curl at all on 3 different paths (connection-level block, not just HTTP 403) |
| chatgpt | ChatGPT Plus/Pro (OpenAI) | cloud | https://chatgpt.com/settings | 403 (21:04) | https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription | 403 (21:04) | not-checkable | no | both chatgpt.com and help.openai.com blocked bot UA; article ID 7232927 is confirmed real via search snippet text even though curl couldn't load it |
| claude | Claude Pro/Max (Anthropic) | cloud | https://claude.ai/settings/billing | 403 (21:04) | https://support.anthropic.com/en/ | 200→**https://support.claude.com/en/** (21:04) | not-checkable (landed on help-center root, not one article) | yes (help) | Anthropic's support center now lives at support.claude.com, not support.anthropic.com (old domain 301s there); claude.ai app itself blocked bot UA |
| notion | Notion | cloud | https://www.notion.so/my-account | 200→https://app.notion.com/space/my-account (21:04) | https://www.notion.com/help/cancel-your-subscription | 404 (21:04) | not-checkable | yes (manage) | help slug guess wrong |
| zoom | Zoom | cloud | https://zoom.us/account/billing | 200→https://zoom.us/signin (21:04) | https://support.zoom.us/hc/en-us/articles/4405333397261-Zoom-billing-support | 200→https://support.zoom.com/hc/en/article?... (21:04) | not-checkable (Angular JS shell; only directive code matched) | yes | Zoom migrated its help center to support.zoom.com (ServiceNow), old support.zoom.us redirects there |
| github | GitHub (paid plans/Copilot) | cloud | https://github.com/settings/billing | 404 (21:04); fallback /settings/billing/summary → 200→github.com/login (21:05) | https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-plan/cancel | 200 (21:04) | yes ("Canceling GitHub Copilot for your organization") — doc found is the **org**-level Copilot cancel doc; individual Copilot Pro is downgraded via Settings → Billing & licensing → Manage subscription | yes | unauthenticated `/settings/billing` 404s by design (GitHub hides the page instead of redirecting); `/settings/billing/summary` correctly redirects to login |
| duolingo | Duolingo Super | cloud | https://www.duolingo.com/settings/super | 200 (21:04) | https://www.duolingo.com/help | 200 (21:04) | not-checkable | yes | |
| linkedin-premium | LinkedIn Premium | cloud | https://www.linkedin.com/premium/manage/ | 200→LinkedIn sign-in (21:04) | https://www.linkedin.com/help/linkedin/answer/a545578 | 200 (21:04) | yes ("Cancel LinkedIn Premium subscription \| LinkedIn Help") | yes | clean |
| patreon | Patreon | cloud | https://www.patreon.com/settings/memberships | 403 (21:04) | https://support.patreon.com/hc/en-us/articles/27204042141837-Canceling-a-free-membership | 403 (21:04) | not-checkable | no | patreon.com blocked bot UA on both; also note this specific article is titled for canceling a **free** membership — the paid-membership cancel steps live on a different article we didn't locate in time |

##### fitness / wellness

| id | name | category | manageUrl | status→final (time) | helpUrl | status→final (time) | stepsStated | verified | notes |
|---|---|---|---|---|---|---|---|---|---|
| peloton | Peloton | fitness | https://members.onepeloton.com/ | 200→https://members.onepeloton.com/home/ (21:04) | https://support.onepeloton.com/hc/en-us | 200→https://support.onepeloton.com/s/?language=en_US (21:04) | not-checkable (Salesforce JS shell, landed on generic landing not one article) | yes | if subscribed via Apple/Google app-store, Peloton's own support says cancel there instead (confirmed via search) |
| planet-fitness | Planet Fitness | fitness | https://www.planetfitness.com/my-account | 403 (21:04) | https://www.planetfitness.com/faq | 403 (21:04) | not-checkable | no | planetfitness.com blocked bot UA on both. **Per PF's own published process (via search, not independently curl-verified today): three official routes — in-club at the membership counter, phone 1-888-584-8110, or online account self-cancel.** Flagging as a notable "no pure self-serve web cancel is guaranteed" case |
| strava | Strava | fitness | https://www.strava.com/athlete/subscription | 404 (21:04); fallback /settings → 200→https://www.strava.com/login (21:06) | https://support.strava.com/hc/en-us | 200→https://support.strava.com/en-us/collections/19657601-getting-started (21:04) | not-checkable (landed on generic collection page) | yes | subscriptions must be canceled on whichever platform sold them (strava.com vs Apple vs Google Play) per Strava's own policy |
| headspace | Headspace | fitness | https://www.headspace.com/subscription/manage | 200→https://my.headspace.com/profile/subscription/manage (21:04) | https://help.headspace.com/hc/en-us/articles/115008364988-How-do-I-cancel-my-subscription | 403 (21:04) | not-checkable | yes (manage) | help.headspace.com blocked bot UA |
| calm | Calm | fitness | https://www.calm.com/profile | 200→https://www.calm.com/app/profile (21:04) | https://support.calm.com/hc/en-us/articles/115002473607-How-to-cancel-my-subscription | 403 (21:04) | not-checkable | yes (manage) | support.calm.com blocked bot UA |
| noom | Noom | fitness | https://web.noom.com/ | 403 (21:04) | https://web.noom.com/support | 403 (21:04) | not-checkable | no | web.noom.com blocked bot UA on both; per search, Noom explicitly warns its in-app cancel flow shows multiple retention/discount screens before letting you finish |
| myfitnesspal | MyFitnessPal Premium | fitness | https://www.myfitnesspal.com/account/subscription | 404 (21:04); fallback homepage → 200 (21:05) | https://support.myfitnesspal.com/hc/en-us | 403 (21:04) | not-checkable | yes (homepage only) | exact subscription-settings path not found; support center blocked bot UA |
| classpass | ClassPass | fitness | https://classpass.com/account/settings | 403 (21:04) | https://help.classpass.com/hc/en-us/articles/204578119 | 403 (21:04) | not-checkable | no | classpass.com blocked bot UA on both |
| whoop | Whoop | fitness | https://app.whoop.com/membership | 403 (21:04); fallback https://www.whoop.com/ 403 (21:05) | https://www.community.whoop.com/t/how-do-i-cancel-membership/13635 | 200 (21:04) | yes — thread text itself walks through Web (app.whoop.com → Membership tab → "Cancel Your Membership") and mobile-app steps | yes (help only) | **caveat**: helpUrl is an official WHOOP-run community forum thread (community.whoop.com), not a formal KB article — it's the best official-domain source we found. WHOOP also requires any 12/24-month commitment to finish before cancellation takes effect |
| fitbit-premium | Fitbit Premium | fitness | https://www.fitbit.com/premium | 200→redirects into store.google.com (21:04) | https://support.google.com/store/answer/14237941 | 200 (21:04) | not-checkable (Google support is a JS SPA) | yes | fitbit.com/premium now redirects into Google Store account surfaces — Fitbit is fully folded into Google |

##### delivery / memberships / shopping

| id | name | category | manageUrl | status→final (time) | helpUrl | status→final (time) | stepsStated | verified | notes |
|---|---|---|---|---|---|---|---|---|---|
| amazon-prime | Amazon Prime | delivery | https://www.amazon.com/gp/primecentral | 200→https://www.amazon.com/ax/claim?arb=... (21:04) | https://www.amazon.com/gp/help/customer/display.html?nodeId=GTS2W2WH9STCUUMK | 200 (21:04) | not-checkable (JS-rendered help center) | yes | manage URL redirected to an odd "/ax/claim" interstitial rather than a plain sign-in — possibly a bot/anti-automation check — but it stayed on amazon.com |
| walmart-plus | Walmart+ | delivery | https://www.walmart.com/plus/manage | 200 (21:04) | https://www.walmart.com/help/article/cancel-your-walmart-membership | 404 (21:04); fallback /help/ → 200 (21:05) | not-checkable (fallback is general landing) | yes | specific cancel-article slug not found in time |
| doordash-dashpass | DoorDash DashPass | delivery | https://www.doordash.com/dashpass/ | 403 (21:04) | https://help.doordash.com/consumers/s/article/How-do-I-cancel-my-DashPass-subscription | 200→https://help.doordash.com/en-us/consumers/article/how-do-i-cancel-my-dashpass-subscription (21:04) | yes ("cancel my DashPass subscription... cancel or pause your DashPass membership on DoorDash in minutes") | yes | doordash.com main site blocked bot UA; help center loaded fine with clear content |
| uber-one | Uber One | delivery | https://www.uber.com/us/en/member/uber-one/ | 406 (21:04); fallback /ride/uber-one/ also 406 (21:05) | https://help.uber.com/riders | 404 (21:04); fallback help.uber.com root also 404 (21:05) | not-checkable | no | uber.com returns 406 (Not Acceptable) to our UA on marketing pages; help.uber.com needs a JS session/specific deep link we didn't find — no uber.com/help.uber.com URL verified today |
| instacart-plus | Instacart+ | delivery | https://www.instacart.com/store/account/membership | 404 (21:04) | https://www.instacart.com/help | 200 (21:04) | not-checkable (JS SPA) | yes (help) | membership-management path guess was wrong |
| grubhub-plus | Grubhub+ | delivery | https://www.grubhub.com/account/subscription | 200 (21:04) | https://get.grubhub.com/plus/ | 404 (21:04) | not-checkable | yes (manage) | help slug guess wrong, no working official help article found in time; if Grubhub+ came via Amazon Prime, cancel at Amazon instead (per Grubhub's own guidance found via search) |
| costco | Costco membership | delivery | https://www.costco.com/membership-counter.html | 404 (21:04); fallback /membership.html also 404 (21:05) | https://customerservice.costco.com/app/answers/detail/a_id/1085 | 200→but landed on **https://customerservice.costco.com/app/error/error_id/1** (an error page) (21:04) | no (error page, not real content) | no | couldn't find a working official URL before the deadline. Per Costco's own stated policy (via search, not independently re-verified today): refund/cancel "at any time," in-warehouse at the membership counter (immediate refund) or by phone 1-800-774-2678 (refund in 5-7 business days) |
| sams-club | Sam's Club membership | delivery | https://www.samsclub.com/account/membership | 404 (21:04) | https://help.samsclub.com/?xid=vanity:help | 200 (21:04) | not-checkable (general landing) | yes (help) | manage slug guess wrong |
| hellofresh | HelloFresh | delivery | https://www.hellofresh.com/my-account/profile/subscription | 404 (21:04); fallback homepage → 200 (21:05) | https://support.hellofresh.com/ | 000 — no response (21:04) | not-checkable | yes (homepage only) | support subdomain didn't answer curl at all; exact account path not found |
| factor | Factor (Factor75) | delivery | https://www.factor75.com/my-account/profile/subscription | 404 (21:04); fallback homepage → 200 (21:05) | https://support.factor75.com/ | 000 — no response (21:04) | not-checkable | yes (homepage only) | same pattern as HelloFresh (same parent company) |
| target-circle-360 | Target Circle 360 | delivery | https://www.target.com/account/memberships | 200 (21:04) | https://help.target.com/ | 200 (21:04) | not-checkable (general landing) | yes | manage path confirmed correct per Target's own guidance found via search |
| chewy | Chewy Autoship | delivery | https://www.chewy.com/app/account/autoship | 404 (21:04) | https://www.chewy.com/help | 200→https://www.chewy.com/customer-care (21:04) | not-checkable | yes (help) | exact Autoship management path guess was wrong |

##### home / security / protection / telecom add-ons

| id | name | category | manageUrl | status→final (time) | helpUrl | status→final (time) | stepsStated | verified | notes |
|---|---|---|---|---|---|---|---|---|---|
| ring | Ring Protect | home | https://account.ring.com/account/protect-plans | 200→https://ring.com/users/sign_in?...path=%2Faccount%2Fprotect-plans (21:04) | https://support.ring.com/hc/en-us/articles/360022109431 | 200→https://ring.com/support/articles/468y0/Canceling-your-Ring-plan (21:04) | yes ("Canceling your Ring plan") | yes | **Ring's own help content**: cancelling permanently deletes all recorded video (download first); as of Nov 6 2025 Ring cancellations are no longer eligible for any refund, prorated or otherwise |
| simplisafe | SimpliSafe | home | https://my.simplisafe.com/ | 000 — no response (21:04); fallback https://www.simplisafe.com/ → 200 (21:05) | https://support.simplisafe.com/conversations/.../6190c6548ea41ebb0620f414 | 404 (21:04); fallback support.simplisafe.com root → 200 (21:05) | no (fallback's "cancel" grep hit was about canceling a false-alarm *dispatch*, unrelated to subscription cancel) | yes (homepages only) | **PHONE-ONLY cancellation** per SimpliSafe's own support content found via search: call 1-888-910-1458 (or 1-888-783-8441) and verbally verify your account's "Safe Word" — no self-serve online cancel flow exists |
| adt | ADT | home | https://www.adt.com/myadt | 403 (21:04) | https://www.adt.com/help | 403 (21:04) | not-checkable | no | adt.com blocked bot UA on both. **PHONE-ONLY** per search of ADT's own stated process: call 800-238-2727, 30 days notice required, early-termination fee up to 75% of remaining monthly charges (standard contract is 36 months, 24 in CA); fee-free if canceled within 72 hrs of signing or under the 6-month guarantee |
| applecare | AppleCare+ | home | https://account.apple.com/account/manage/section/subscriptions | 200→https://appleid.apple.com/ (21:04) | https://support.apple.com/en-us/HT211962 | 200→https://support.apple.com/en-us/101726 (21:04) | not-checkable | yes | same Apple ID subscriptions hub as iCloud+ covers AppleCare+ cancellation |
| aura | Aura (identity protection) | home | https://aura.com/dashboard | 404 (21:04) | https://aura.com/help/i-want-to-cancel-my-membership | 404 (21:04); fallback https://aura.com/help/how-do-i-cancel-on-the-aura-website → 200→https://help.aura.com/s/article/cancel-subscription-online (21:05) | not-checkable (grep only matched a generic modal-button string, Salesforce JS shell) | yes (via fallback help) | exact dashboard/manage path not found; aura.com/help/* pages redirect into a help.aura.com Salesforce community |
| lifelock | LifeLock | home | https://my.norton.com/ | 403 (21:04); fallback https://lifelock.norton.com/ 403 (21:05) | https://support.norton.com/sp/en/us/home/current/solutions/v3672523 | 404 (21:04) | not-checkable | no | **LifeLock is fully folded into Norton/Gen Digital's account system** (my.norton.com, lifelock.norton.com) — every Norton-family host we tried either blocked bot UA or 404'd today. Per search, cancel by phone 1-833-743-5300 |
| experian | Experian CreditWorks Premium | home | https://www.experian.com/member/ | 404 (21:04); fallback homepage → 200 (21:05) | https://www.experian.com/consumer/membership.html | 404 (21:04) | not-checkable | yes (homepage only) | exact membership-cancel path not found; per search, cancel via Account → Membership → Cancel Membership on experian.com, or phone 1-479-343-6239. If subscribed via App Store/Google Play, cancel there instead |
| life360 | Life360 | home | https://www.life360.com/ | 403 (21:04) | https://support.life360.com/hc/en-us/articles/23053539274135 | 403 (21:04) | not-checkable | no | life360.com and support.life360.com both blocked bot UA |
| ancestry | Ancestry | home | https://www.ancestry.com/account/ | 403→https://www.ancestry.com/account/signin?... (21:04) | https://support.ancestry.com/s/article/Canceling-Your-Subscription | 200→https://help.ancestry.com/hc/en-us (21:04) | yes ("Cancel membership" / "Canceling a Membership" links present on the redirected landing page) | yes (help) | support.ancestry.com now redirects into help.ancestry.com (Zendesk); the account sign-in page itself returned 403 to our bot UA |
| verizon | Verizon (add-ons/features) | telecom | https://www.verizon.com/myverizon/ | 200→https://secure.verizon.com/signin (21:04) | https://www.verizon.com/support/ | 200 (21:04) | not-checkable (general landing, not a specific add-on-removal article) | yes | no single canonical "remove a feature" URL found; My Verizon sign-in + support home are the verified entry points |
| t-mobile | T-Mobile (add-ons/services) | telecom | https://www.t-mobile.com/my-t-mobile | 403 (21:04) | https://www.t-mobile.com/support/account/cancel-service | 403 (21:04) | not-checkable | no | t-mobile.com blocked bot UA on both. Note the help URL path itself is confirmed real (exists in en and es locales per search) but it documents canceling **service entirely**, not a specific add-on removal flow |
| att | AT&T (add-ons) | telecom | https://www.att.com/my/ | 200 (21:04) | https://www.att.com/support/article/wireless/KM1031426/ | 200 (21:04) | not confirmed by direct grep this run; search-result title is "Cancel Auto Renew for AT&T Prepaid add-ons," strongly implying real content | yes | this specific article covers **Prepaid** add-on auto-renew; for postpaid, AT&T's own support says use myAT&T → "Add or Change a feature" |

##### Summary

- **Rows: 54** (matches the ~55 target across the 4 category groups: 20 cloud/software, 10 fitness, 12 delivery/shopping, 12 home/security/telecom)
- **verified = yes: 39** — icloud, google-one, dropbox, microsoft-365, adobe, one-password, lastpass, expressvpn, claude, notion, zoom, github, duolingo, linkedin-premium, peloton, strava, headspace, calm, myfitnesspal, whoop, fitbit-premium, amazon-prime, walmart-plus, doordash-dashpass, instacart-plus, grubhub-plus, sams-club, hellofresh, factor, target-circle-360, chewy, ring, simplisafe, applecare, aura, experian, ancestry, verizon, att
- **verified = no (403/404/406/000, no official URL landed clean today): 15** — canva, nordvpn, norton, mcafee, chatgpt, patreon, planet-fitness, noom, classpass, costco, uber-one, lifelock, life360, t-mobile, adt

###### 403/blocked (bot wall), by host
canva.com (both URLs), nordvpn.com + nordaccount.com, login.norton.com + us.norton.com, chatgpt.com + help.openai.com, patreon.com (both), planetfitness.com (both), noom.com (both), classpass.com (both), lifelock.norton.com, life360.com + support.life360.com, t-mobile.com (both), adt.com (both), ancestry.com account page, claude.ai, support.1password.com, support.calm.com, help.headspace.com, doordash.com (marketing site), whoop.com + app.whoop.com, helpx.adobe.com (both).
We did not retry any of these with a browser-UA, proxy, or other evasion per the hard rules — they're recorded as blocked, not verified.

###### Connection-level failures (000 — no HTTP response at all, not even a block page)
mcafee.com (3 different paths), support.hellofresh.com, support.factor75.com, my.simplisafe.com.

###### Surprises
1. **Anthropic moved its help center**: support.anthropic.com now 301s to **support.claude.com** — the old domain is likely stale in any pre-existing directory.
2. **Ring**: cancelling now forfeits ALL recorded video with **no refund of any kind** (policy changed Nov 6, 2025, per Ring's own article) — a materially bad trade for a user who didn't know that.
3. **Adobe's early-termination fee is real and punitive**: 50% of the remaining contract value if you cancel an "annual, paid monthly" plan after day 14 — this is exactly the kind of charge Subscription Sweep should flag loudly, not just link to cancel.
4. **ADT and SimpliSafe are both phone-only** for cancellation (no web self-serve flow exists per their own support content) — ADT also charges up to 75% of remaining contract value as an early-termination fee.
5. **LifeLock has no separate cancel flow** — it's fully merged into Norton/Gen Digital's account system (my.norton.com / lifelock.norton.com), and every Norton-family domain we hit was either blocked or 404'd today.
6. **GitHub deliberately 404s** unauthenticated requests to `/settings/billing` instead of redirecting to login (most sites redirect) — a deliberate information-hiding choice, not a dead link.
7. Several official "help centers" are Salesforce Community (Lightning/"slds") JS shells that return almost no static text to a plain HTTP client: LastPass, Peloton, Aura, SimpliSafe. Their cancel content cannot be confirmed without a real browser.
8. Patreon's only loadable-by-search help article about cancellation is titled for a **free** membership, not a paid one — a directory that pointed users there could mislead them.

###### Not reached (deadline)
Given the 21:20 ET cutoff, we did not get a second search pass for: canva, nordvpn, mcafee, chatgpt (alternate domains), patreon (paid-membership article), planet-fitness, noom, classpass, costco (a working account/membership URL), uber-one, lifelock, life360, t-mobile, adt — these are the rows most worth a follow-up pass in Batch B v2.

## §5 notes for B3 (read before reusing the two tables above)

- Totals: batch A 51 rows, 46 verified; batch B 54 rows, 39 verified; **85 of 105 verified**, above the ≥ 60 target. Unverified rows stay in `cancel.json` with `verified: null` and are never linked.
- **`stepsStated` above came from a `grep -i cancel` on the fetched HTML.** On help-center roots (Hulu, Paramount+, Max, Disney+ resolve to their help home) that grep can hit navigation text. B3 must use article-level URLs and set `stepsStated: true` only when the article's own text describes cancelling; a help-center root is a hub link (`kind: 'manage'` in `CancelLink` terms), not steps.
- Platform billers come first in the UI when the descriptor says so: Apple (`support.apple.com/118428`, renumbered from HT202039), Google Play, PayPal automatic payments, Roku, Amazon memberships and subscriptions.
- Surprises worth a note in `notes` (official pages, our words): ADT and SimpliSafe cancel by phone only; Adobe states an early-termination fee on annual plans paid monthly (batch B: 50% of the remaining contract); Ring's plan page states cancel terms (batch B: no refund, recordings deleted); LifeLock is managed in Norton's account; Bumble, Hinge and Discord Nitro are managed in the app or the app store; Anthropic's help moved to support.claude.com; GitHub returns 404 (not a sign-in redirect) for `/settings/billing` when signed out, so link its docs page instead.

## §6. Competitors and prior art (source file: `_work/recurrence-competitors.md`, part 2)
#### PART 2: Competitors and prior art

| Product | Model | Needs bank login? | Paid cancellation / negotiation? | Data use (one line, linked) | Source (fetched 2026-10-04) |
|---|---|---|---|---|---|
| Rocket Money (formerly Truebill) | Free tier; Premium "pay what you think is fair", "typically ranging from $7 to $14 per month"; "Premium+ subscription that costs $15 per month" | Yes: "connects to your accounts through Plaid" | Bill negotiation: "we'll charge a fee of 35% - 60% of your first year's savings" (successful negotiations only). Cancellation: "Subscription Cancellation Assistant is currently available to Premium members." (https://help.rocketmoney.com/en/articles/934402) | Privacy policy: https://www.rocketmoney.com/privacy-policy 301 → https://rocketaccount.com/#/privacy-policy, which returned 403 to the helper and 302 to my curl: **quote UNVERIFIED** | https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost ; https://help.rocketmoney.com/en/articles/9744474-bill-negotiation-charge |
| Rocket Money acquisition | Rocket Companies agreed to acquire Truebill "for $1.275 billion in cash", announced December 20, 2021 | | | | https://ir.rocketcompanies.com/news-and-events/press-releases/press-release-details/2021/Rocket-Companies-to-Acquire-Truebill-Adding-Rapidly-Expanding-Financial-Empowerment-FinTech-to-the-Rocket-Platform/ (curl with our UA: **403**; WebFetch read it) |
| Trim | No longer a standalone product: https://www.asktrim.com/ → **301** to https://www.onemainmymoney.com/ ("Trim is now OneMain MyMoney", helper fetch). Owner OneMain; acquisition announced 2021-04-26 per the BusinessWire release URL; closing date UNVERIFIED | Yes (account linking; linker UNVERIFIED) | Negotiates bills; fee UNVERIFIED | not fetched | https://www.businesswire.com/news/home/20210426005825/en/OneMain-Acquires-Customer-Focused-Financial-Wellness-Fintech-Trim |
| Bobby (developer Yummygum) | "Free · In-App Purchases"; "Unlock Subscription Limit $0.99", "All-in-one Pack $1.99", "All-in-one Pack v2 $2.99"; "Only for iPhone" | No: manual entry | No | App privacy label: "Data Not Linked to You ... Analytics, Usage Data" | https://apps.apple.com/app/bobby-track-subscriptions/id1059152023 |
| "Subby" | Name collision: at least two App Store apps, "Subby - Subscription Manager" (id6755717606; free plan up to 5, Pro tier) and "Subscription Tracker: Subby" (id6739703718); both manual trackers per App Store search snippets | No: manual | No | id6739703718 listing reportedly says data is not collected (helper; UNVERIFIED) | https://apps.apple.com/us/app/subby-subscription-manager/id6755717606 ; https://apps.apple.com/us/app/subscription-tracker-subby/id6739703718 |
| Hiatus | Site live; pricing not on landing page | Yes, aggregates accounts (linker not named) | "concierge team will negotiate bills on your behalf" (helper); fee UNVERIFIED | not fetched | https://www.hiatusapp.com/ |
| Monarch (now monarch.com) | Paid budgeting app with a Recurring view | Yes: "via Plaid, Finicity, Mx, or Spinwheel" | No | "We will never sell your financial data." (policy effective Aug 10, 2026) | https://www.monarch.com/privacy (301 from monarchmoney.com/privacy); https://monarchmoney.com/features/recurring (helper) |
| Copilot Money | Paid app with "recurrings" | Yes (aggregator UNVERIFIED) | No | https://www.copilot.money/privacy returned **404**; quote UNVERIFIED | https://help.copilot.money/en/articles/3760068-create-recurrings (helper) |
| Plaid (the pipe under most of the above) | B2B | it IS the bank login | n/a | "With the developer of the app you are using and as directed by that developer" (sharing list) | https://plaid.com/legal/#end-user-privacy-policy |
| Capital One | Free, in its own app, own cards only | No extra login (own data) | Free in-app cancel/block for some merchants (helper); "Eno" branding UNVERIFIED | not fetched | https://www.capitalone.com/digital/tools/subscription-management/ (HTTP 200) |
| Chase | Free, own cards; "Chase does not charge any fees" (helper, education page; feature page UNVERIFIED) | No extra login | No | not fetched | https://www.chase.com/personal/credit-cards/education/basics/subscription-fatigue |
| PayPal | Free: "automatic payments" list and cancel in settings | No extra login | No | not fetched | https://www.paypal.com/us/cshelp/article/what-is-an-automatic-payment-and-how-do-i-update-or-cancel-one-help240 (helper) |
| Citi, Apple Card, Amex | Citi: only a UAE launch in trade press; Apple Card "Recurring" view: secondary coverage only; Amex: only a merchant recur-billing factsheet found | | | | **UNVERIFIED** (no official consumer page found in the time box) |
| Wallos (open source) | Free, self-hosted | No: manual | No | n/a | https://github.com/ellite/Wallos, **GPL-3.0** (api.github.com) |
| Actual Budget (open source) | Free budgeting app with "find schedules" (1.2) | Bank sync optional (UNVERIFIED this pass) | No | n/a | https://github.com/actualbudget/actual, **MIT** |

Privacy contrast in one line: every detection competitor above (Rocket Money, Hiatus, Monarch, Copilot, Trim/MyMoney) reads transactions through an aggregator login (Plaid, Finicity, MX, Spinwheel); the private alternatives (Bobby, Subby, Wallos) detect nothing and need hand entry. Detection without a login is the gap.

What we will not do, and why that is the pitch:
- **No bank login, ever.** No Plaid/MX/Finicity, no credentials, no aggregator copy of your history; the CSV is parsed in the tab and never uploaded. Competitors that detect need a login; competitors that don't need a login don't detect.
- **No paid cancellation and no cut of savings.** Rocket Money charges 35% to 60% of first-year savings for negotiation and keeps concierge cancellation behind Premium; we link to the merchant's official cancel page and step aside.
- **No account, no subscription to cancel the subscriptions.** Free, no sign-up, nothing stored unless the user opts into a local save; the evidence (dates, amounts, confidence) is shown so the user can check every finding instead of trusting a black box.

#### 403s and gaps (recorded, not retried)
- ir.rocketcompanies.com press release: 403 to curl with our UA (WebFetch succeeded).
- rocketaccount.com privacy policy: 403 (helper) / 302 (my curl): Rocket Money privacy quote UNVERIFIED.
- copilot.money/privacy: 404. docs.firefly-iii.org deep link: 404.
- Not covered in the time box: beancount/hledger plugins, a bank/fintech engineering paper with published thresholds, Citi/Apple Card/Amex official pages, Experian's subscription cancellation feature (UNVERIFIED that it exists).

## §7. Name

Checks made 2026-10-04 20:59–21:00 ET with `curl -I https://<name>.vercel.app` (404 + `x-vercel-error: DEPLOYMENT_NOT_FOUND` = free), a GET of `<name>.com` for its `<title>`, and a web search for an app or finance product with the name. **This is not a trademark search**; run the USPTO search (tmsearch.uspto.gov, by hand) before anything is posted.

| Name | vercel.app | .com | Software / finance collision | Verdict |
|---|---|---|---|---|
| **Lintroller** | 404 DEPLOYMENT_NOT_FOUND | lintroller.com: "LINTROLLER.COM - Lint Remover supplier" (physical goods) | none found; a UK finance app is called "Lint" (apps.apple.com id6469200392), a different word | **pick** |
| Whiskbroom | 404 | whiskbroom.com: 200, no title | none found | backup (ties to "Sweep") |
| Crumbtray | 404 | crumbtray.com: for sale (302 to a Dynadot sale page) | none found (kitchen hardware only) | backup |
| Pennyjar | 404 | pennyjar.com: "Penny Jar Capital" | finance firm | rejected |
| Driptray, Dripcheck, Lintbrush, Crumbsweep, Tabsweep | 404 | not checked | "drip check" is fashion slang | weaker |
| Subsweep, Dustpan, Tallymark, Leakfinder, Sweepstake, Dustbunny | **200 (taken)** | | | rejected |

Why Lintroller: it joins Finecomb and Coatpocket as a household object, and the metaphor fits the product (small things that cling to you, rolled off in one pass). The repo stays `subsweep` and the package scope `@subsweep/*`, so a rename touches one constant.

## §8. Privacy design

**What the browser does.** Reads each dropped or picked file with the File API (`file.text()`; re-decoded as windows-1252 with `TextDecoder` when the UTF-8 decode is > 1% U+FFFD), hands the text to a same-origin module Web Worker that runs the pure engine, and keeps rows and findings in memory. Rendering is React text nodes only. Exports are Blob URLs saved with `a[download]`. The opt-in "Remember on this device" writes one localStorage key with findings and statuses, never rows.

**What the app must never do.** Send any part of a file anywhere; load third-party scripts, fonts, styles or images; run analytics, error reporting or session replay; set cookies; write storage before the opt-in; put file content in a URL; log rows; render user text as HTML; register a service worker (v1).

**The CSP.** Model: Coatpocket's live policy (read 2026-10-04 from `the Coatpocket repo's vercel.json`): `default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests`. Two changes for this product (SPEC §10):
- `connect-src 'none'`, made possible by bundling the alias table, cancel directory, export help, sample file and privacy results into the build. W3C CSP Level 3 (https://www.w3.org/TR/CSP3/, fetched 2026-10-04 21:11 ET): "The connect-src directive restricts the URLs which can be loaded using script interfaces", with `fetch`, XHR, `sendBeacon`, `EventSource` and WebSocket among its examples. With `'none'`, the browser blocks all of them, so a bug or a compromised dependency can't send a byte; anyone can confirm it in DevTools.
- `worker-src 'self'` stated explicitly for the engine worker (CSP3: "worker-src checks still fall back on the script-src directive"; explicit is clearer for reviewers).

**How the proof works** (model: Coatpocket `app/e2e/privacy.mjs`, read 2026-10-04: canary data, every request recorded, every outside request aborted, request lists compared across two inputs, headers checked per route, offline run, `dist/` grep). Ours adds: zero requests after load (not just zero canary-bearing ones), an injected `fetch('/x')` that must be blocked by CSP, storage empty before the opt-in and after "Delete everything", no cookies and no service worker. Results are bundled into /privacy and published as `/privacy-results.json` (SPEC §10).

## §9. The do-not-state list (unverified or misleading; B lanes and L1 must not print these as facts)

- Any exact CSV header for BofA, Chase, Wells Fargo, Citi, Discover, US Bank, Apple Card, Amex, Cash App, Monarch, YNAB (shapes are best-known; the UI says "check the preview").
- "The FTC requires click-to-cancel", "a new rule takes effect on X", "federal law guarantees easy cancellation", "your state requires…" (only the 9 verified states, only their verified points, with the link), Mastercard reason codes, "you can always get a chargeback", "stopping autopay cancels your subscription" (§4 D).
- FTC cases other than Amazon; anything implying a user qualifies for Amazon refunds.
- Rocket Money's and Copilot's privacy-policy wording (403/404 today), Trim's closing date, Hiatus's fees, Citi/Apple Card/Amex subscription features (§6).
- Mint's shutdown date (widely repeated as 2024-03-23 but not confirmed on an Intuit page today).
- Merchant descriptor patterns marked "UNVERIFIED (convention)" are matching heuristics, not facts to display.
- Any cancel link with `verified: null`, and "steps stated" on a help-center root page.
