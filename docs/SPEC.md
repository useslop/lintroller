# SPEC: Lintroller (project "Subscription Sweep"), a free, private repeating-charge finder (lane R1, 2026-10-04)

Inputs: RESEARCH.md (this folder; sources and fetch dates), LANE-RULES.md, PLAN.md, and the Coatpocket and Finecomb playbooks. Shapes and signatures live in CONTRACT.md; this file says what to build and why. Same posture as the siblings: private, honest, cited, open source (MIT), built in public with a Build Receipt.

## 0. The one fact that shapes everything

**A bank CSV is the most private file most people own, so the page never opens a network connection after it loads.**
- All data the app needs (merchant aliases, the cancel directory, export help) is bundled into the static JS at build time. There is no data fetch, no API route, no server.
- The CSP says `connect-src 'none'`. The browser itself then refuses any fetch, XHR, beacon, WebSocket or EventSource from our page, including from a bug or a compromised dependency. That's a stronger and simpler promise than Coatpocket's `connect-src 'self'`, and anyone can check it in DevTools.
- The only things that leave the device are the user's own clicks: a cancel link opens the merchant's official page in a new tab (no referrer, no parameters), and downloads (CSV, ICS) are Blob URLs saved locally.

Honest pitch: "Drop in a CSV from your bank or card. See the charges that look like they repeat, what each costs per year, and where to cancel. The file never leaves your device." **We never say we found all of them.** Detection is a heuristic: "looks like a repeating charge", with the dates and amounts as evidence, and the user confirms or dismisses each one.

## 1. Name

| Option | `<name>.vercel.app` HEAD, 2026-10-04 20:59 ET | Collision check (web search + .com fetch, 21:00 ET) | Verdict |
|---|---|---|---|
| **Lintroller** ("roll off the little charges that stick to you") | 404 `DEPLOYMENT_NOT_FOUND` (free) | lintroller.com = a physical lint-roller supplier; no software product found. A UK finance app is called "Lint" (adjacent, not the same word) | **PICK** |
| Whiskbroom ("sweep up the small charges"; echoes "Sweep") | 404 (free) | whiskbroom.com answers 200 with no title (parked?); no app found | backup |
| Crumbtray | 404 (free) | crumbtray.com is for sale; only kitchen hardware | backup |

Rejected: `subsweep`, `dustpan`, `tallymark`, `leakfinder`, `sweepstake`, `dustbunny` (all answer 200 on vercel.app: taken); `pennyjar` (Penny Jar Capital, a finance firm); `dripcheck` (fashion slang); `driptray` (weak). It sits in the family with Finecomb and Coatpocket (household objects). **Not a trademark search**: run the USPTO check before posting. No domain purchase (rule 1): `lintroller.vercel.app`. The repo and package scope stay `subsweep` / `@subsweep/*`; the request title stays "Subscription Sweep".

Tagline: "Roll off the little charges that stick. Find repeating charges in your bank or card CSV, see the yearly cost, and get the official cancel page. Free. Your file never leaves your device."

## 2. v1 scope and non-goals

**In v1:**
- CSV in by drop, file picker (several files at once: checking + cards) or paste. The formats in §6, sniffed automatically, plus a generic column mapper.
- Detection of repeating charges with cadence, evidence, confidence and reasons; confirm/dismiss.
- Yearly cost per finding (arithmetic shown) and totals (confirmed vs not yet reviewed).
- Official cancel links (verified by fetch, date shown) and "billed by Apple / Google Play / Amazon / PayPal / Roku" routing.
- Exports: CSV of findings, ICS reminders before the next expected charge.
- /how-to-export (download steps per bank, official help links), /privacy with the live proof, /about with the Build Receipt link.

**Not in v1:** bank connections (Plaid/MX are paid and against rule 1), accounts, email, a server, analytics on any route, QFX/OFX/PDF import (RESEARCH §1), non-USD currencies (skipped and counted), bill negotiation, "cancel for me", any AI call, bring-your-own-key, browser extensions, a mobile app.

## 3. Screens and flows

```
Landing ─► /sweep (import) ─► /sweep/review ─► /sweep/summary ─► CSV / ICS downloads
   ├► /how-to-export          ├► "Try the sample file" (synthetic)
   ├► /privacy (proof)        └► column mapper (generic files)
   └► /about
```

1. **Landing (/).** Headline: "Find the charges that keep coming back." Sub: "Drop in a CSV from your bank or card. See what repeats, what it costs per year, and where to cancel. Free. Your file never leaves your device." Three bullets: "Made for CSVs from Bank of America, Chase, Wells Fargo, Citi, Capital One, Amex, Discover, US Bank, Apple Card and PayPal. Other CSVs work when you pick the columns." (names only for formats §6 ships a signature for; no logos); "Shows the dates and amounts behind each match, so you decide"; "Links only to the company's own cancel page, checked on <date>". A "prove it" link to /privacy. CTA "Start" → /sweep.
2. **Import (/sweep).**
   - A drop zone (also a real `<input type=file multiple accept=".csv,text/csv">`), a "Paste rows" textarea, and **"Try the sample file"**: B4's synthetic statement, bundled into the JS (`?raw` import, no fetch; §10), plus a plain "Download the sample" link to the same file as a static asset so people can see the format.
   - Per file: detected format ("Looks like a Chase credit card CSV"), rows read, date range, rows skipped by reason (counts only). "Not right? Choose the columns" opens the mapper: date, description, amount (or debit + credit), sign ("purchases are negative / positive"), date order; the preview shows 5 parsed rows.
   - History hints from `coverage`: under 180 days (`showHistoryHint`): "Your file covers 94 days. Six months or more gives better results."; under 395 days (`!canSeeYearly`): "Yearly renewals need 13 months or more; add a longer export to see them."
   - Limits: 25 MB per file, 300,000 rows in total; above that, a plain message, no crash. Parsing runs in a module Web Worker so the page stays responsive.
   - "Next: review" → /sweep/review.
3. **Review (/sweep/review).** Groups, in this order: "Subscriptions and memberships", "Other repeating charges" (no alias), "Bills and fees", "Payments to people", "Possibly stopped". Each card (a table row on wide screens):
   - name, cadence ("monthly"), last amount, "about $185.88 a year", a confidence chip (High / Medium / Low, text, not only colour), the line "Looks like a repeating charge" plus reason sentences mapped from `ReasonCode` (§4).
   - **Evidence** (expandable): each charge with date, amount, the raw descriptor and "file 1, line 37"; price changes ("went from $15.49 to $17.99 on Jun 3"); a trial ("$1.00 on Jan 2, then $9.99"); refunds.
   - Two buttons: **"Yes, it repeats"** (confirm) and **"Not a repeating charge"** (dismiss). Undo on both. Keyboard: Tab order, Enter/Space; `aria-pressed` state.
   - Below the list: "We ignored 41 transfers, 6 card payments and 2 paychecks" and "12 shops you buy from often (gas, groceries) aren't counted as repeating charges" (counts from `ignored` / `suppressed`, expandable).
4. **Summary (/sweep/summary).**
   - "Confirmed: $X a year. Not yet reviewed: $Y a year." Then by category (a simple bar list, text values always visible). Never "you could save".
   - Confirmed (then unreviewed) findings sorted by yearly cost. Each: yearly cost with its formula; next expected date; **cancel**: up to 2 `CancelLink`s from `lookupCancel` ("Billed by Apple: open your Apple subscriptions" first when `billedThrough` is set), each with the badge "official page, checked Oct 4, 2026"; with no verified link: "No checked link yet. Look for 'Membership' or 'Subscription' in your account settings on the company's own site." (no URL).
   - A small "If a charge continues after you cancel" panel: the first three sentences of RESEARCH §4d's verified text (cancel with the company first and keep proof; bank autopay stop-payment at least three business days ahead, may need writing, may cost a fee; card billing-error disputes within 60 days of the statement), each linked to its official source (CFPB [L29], eCFR 12 CFR 1005.10 [L30], eCFR 12 CFR 1026.13 [L32]), then "General information, not legal advice." The state-law and FTC sentences stay out of v1 (open question 4).
   - Exports: **"Download CSV"** (`findingsToCsv`), **"Calendar reminders (.ics)"** (`buildIcs`; options: days before 1/3/7, include amounts on/off; warning: "Calendar apps sync to the cloud. Turn amounts off if you don't want them there.").
   - "Remember on this device" toggle and "Delete everything".
5. **How to export (/how-to-export).** One section per `formatsHelp` entry: our short steps + the official help link (verified date) where one exists.
6. **Privacy (/privacy).** §10: what runs where, the exact CSP text, the published proof (`/privacy-results.json`), and "check it yourself" steps (DevTools → Network, then drop a file: nothing new appears).
7. **About (/about).** How it was built (Opus 5.5 + Sonnet 5, the Build Receipt link once H1 lands), the open-source link once P1 lands, "We don't make money from this. No ads, no affiliate links, no data."

## 4. Copy rules (binding for every lane; `lintCopy` enforces the list)

- **Never say** (product copy, UI strings, README, launch drafts): every, overnight, in minutes, no humans, fully autonomous, guarantee(d), AI-powered, insane, revolutionary, 10x, magic, link in bio, "we found all", "all your subscriptions", "save $", "you'll save", "you could save", "cancel for you", "subscription found". Write around "every": "each", "per month", "monthly".
- **Say:** "looks like a repeating charge", "based on the rows in your file", "about $X a year if it keeps going", "official page, checked <date>", "you decide".
- Yearly cost always shows its arithmetic (`YearlyCost.formula`) or, for irregular series, "total of the last 12 months in your file".
- Cadence words (never "every …"): weekly "once a week", biweekly "once per 2 weeks", semimonthly "twice a month", monthly "once a month", bimonthly "once per 2 months", quarterly "once a quarter", semiannual "twice a year", yearly "once a year", irregular "now and then".
- Reason sentences (exact text, B2 maps `ReasonCode` → copy): regular-interval "Charged about <cadence word>" (e.g. "Charged about once a month"); stable-amount "Same amount each time"; amount-varies "Amount changes"; price-change "Price changed"; known-merchant "We know this company sells subscriptions"; platform-biller "Billed through Apple/Google/…"; few-occurrences "Only 2 charges so far"; missed-one "One expected charge is missing"; trial-then-paid "Small first charge, then full price"; possibly-ended "No charge since <date>"; ended "Seems to have stopped"; variable-merchant "A shop you buy from often"; bill-like "Looks like a bill"; payment-to-person "A payment to a person"; short-history "Your file is short, so this is a guess"; interval-drifts "Dates move around a bit".
- Law: only facts from RESEARCH §4 with the official link, and the line "General information, not legal advice." Never state that the FTC rule requires anything (RESEARCH §4a).
- No merchant logos or brand colours. Names in plain text only. No affiliate links, no UTM tags.

## 5. Engine (lane B1; exports and types in CONTRACT §2–§3)

### 5.1 Pipeline
`sniffFormat` → (mapper if generic) → `parseRows` per file → `mergeRows` → `detectRecurring` (normalize → classify → group → series → score) → `yearlyCost` / `totals` → `lookupCancel`. All pure; the worker in `app/` calls them.

### 5.2 Detection algorithm
1. **Normalise and classify** each row (`normalizeMerchant`, `classifyRow`). Drop `transfer`, `card-payment`, `income`, `atm`, `interest` (counted in `ignored`). On `venmo`/`cashapp`, P2P rows to a person stay as `kind: 'person'` series. `refund` rows attach to the series of the same key.
2. **Group** outflows by `merchantKey` **across files** (a card switch mid-year must not split a stream), never by amount. Inside a group, **cluster amounts against the cluster's running mean**: tolerance `max(amountTolPct % × |mean|, amountTolFloorCents)` (`billsAmountTolPct` for utilities/telecom/insurance). This keeps two Apple plans ($2.99 and $10.99 behind one `APPLE.COM/BILL`) apart. A new amount that repeats on ≥ `priceStepMinRepeats` consecutive charges at the same cadence, within `priceStepMaxRatio`, is a **price change** of the same series; one odd charge is noise.
3. **Cadence** per series: calendar-aware day errors for each candidate cadence (integer day numbers from `YYYY-MM-DD` in UTC, so DST never moves a day). Month-based cadences use the anchor day clamped to the month's end (Jan 31 → Feb 28/29 → Mar 31), with circular day-of-month distance. A gap of k steps (k = 2, 3) counts as k − 1 missed charges (`missed-one` reason, lower regularity). Fit = share of gaps within `dayTolerance`; need `minFitShort` (n ≤ 4) or `minFitLong` (n ≥ 5), plus the minimum count and `minSpanDays` (§5.3). Best fit wins. No fit: `irregular` only with ≥ `irregularMin` charges, amount CV ≤ `irregularMaxCv` and span ≥ `irregularMinSpanDays`; always low, outside totals by default.
4. **Minimum occurrences** per cadence (§5.3); known `subscription`/`membership`/`platform` aliases use the lower column.
5. **Trial**: a charge ≤ `trialMaxCents` from the same merchant 1–`trialWindowDays` days before the first full-price charge → `trial` evidence, never part of the averages.
6. **Activity** (as of `today` = the file's last date unless given): `active` if today ≤ nextExpected + grace, grace = max(`graceMinDays`, `graceFraction` × step); `maybe-ended` if within one more step; else `ended`. Ended and maybe-ended show under "Possibly stopped" and never count in totals.
7. **Score** `conf = 0.35·reg + 0.25·amt + 0.20·cnt + 0.20·prior` (weights in `params.weights`): reg = fit × (1 − min(1, median day error / (tol + 1)) / 2); amt = 1 − min(1, CV(amounts) / 0.075); cnt = min(1, (n − 1) / 3); prior = 1 for subscription/membership/platform aliases, 0.5 for no alias, 0 for bill/variable-merchant aliases. Caps: n = 2 → at most medium (0.74); variable-merchant → at most low (0.49). Below `minConfidence` → `suppressed`.
8. **Variable merchants** (gas, groceries, coffee, restaurants, per-trip rideshare and delivery, Amazon retail) never become subscriptions; member programs under the same brand (`UBER ONE`, `DASHPASS`, `INSTACART+`, Prime) are separate aliases and do.
9. **Exact duplicates** inside one file stay (two identical charges can be real); `mergeRows` drops a duplicate only across files.
10. Sort findings by yearly cost, high to low. `id` per CONTRACT.

### 5.3 Default parameters (`DEFAULT_PARAMS`; B4's evaluator may tune; changes are listed in B1/B4 SUMMARY)

| Cadence | Step | `dayTolerance` (± days) | min occurrences | min, known merchant | `minSpanDays` | periods/yr |
|---|---|---|---|---|---|---|
| weekly | 7 d | 2 | 4 | 3 | 21 | 52 |
| biweekly | 14 d | 2 | 3 | 3 | 28 | 26 |
| semimonthly | 2 anchor days/month | 3 | 4 | 3 | 45 | 24 |
| monthly | same day of month | 3 | 3 | 2 | 60 | 12 |
| bimonthly | +2 months | 4 | 3 | 2 | 120 | 6 |
| quarterly | +3 months | 5 | 3 | 2 | 180 | 4 |
| semiannual | +6 months | 7 | 2 (cap medium) | 2 | 210 | 2 |
| yearly | +12 months | 7 | 2 | 2 | 395 | 1 |

Other defaults: `amountTolPct` 7.5, `amountTolFloorCents` 25, `billsAmountTolPct` 35, `minFitShort` 1.0, `minFitLong` 0.75, `priceStepMinRepeats` 2, `priceStepMaxRatio` 1.5, `graceMinDays` 5, `graceFraction` 0.25, `trialMaxCents` 100, `trialWindowDays` 31, `irregularMin` 4, `irregularMaxCv` 0.10, `irregularMinSpanDays` 90, `minAmountCents` 50, `minConfidence` 0.35, `historyHintDays` 180.

Basis (RESEARCH §2): Actual Budget's `find-schedules.ts` (MIT: ±2 days, ±7.5% amount, every expected occurrence present, transfers excluded); Sure (AGPL, ideas only: group by merchant, running-mean clusters at 7.5%, circular day-of-month check, 3 to act / 2 to suggest, price change after 2 charges at the new price); Plaid's recurring API (MATURE ≥ 3, annual after 2, "at least 180 days of history"). Weights, floors and the long-cycle tolerances are ours; B4's corpus tunes them. Actual's weekday patterns are not copied (they read today's weekday, which looks like a bug).

### 5.4 Yearly cost
`last amount × periods per year`, formula string "$15.49 x 12 = $185.88". Irregular: sum of the series' charges in the last 365 days of the file, "total of the last 12 months in your file". Integer cents throughout; format with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.

## 6. Formats (B1 parses, B4 generates, both from RESEARCH §1)

RESEARCH §1 has the per-institution table: header signature, preamble lines, date format, sign convention, quirks and the verification level of each shape. **The key finding: no US bank publishes its CSV header.** Only PayPal's columns are official; Capital One (Debit/Credit split), Mint and Venmo column names are confirmed in open-source importers; everything else is a best-known shape. So:
- `sniffFormat` matches distinctive header signatures first (RESEARCH §1 table: e.g. `Running Bal.`, `Check or Slip #`, `Extended Details`, `Clearing Date` + `Purchased By`, `Amount (total)`, `Outflow` + `Inflow`), case-insensitive, trimmed, BOM stripped, scanning the first 30 lines for preambles (BoA summary block, Venmo title rows); then shape rules (Wells Fargo: headerless, 5 columns, column 3 `*` or empty, column 4 empty).
- Every shape not marked official or open-source ships with `confidence: 'medium'`; the import screen then says "Check the preview: we couldn't confirm this bank's format from an official page." `cashapp` has no trusted signature (RESEARCH: a guess): it goes through the mapper with a preset.
- **Sign self-check (load-bearing, because card issuers often export purchases as positive):** after parsing, look at rows whose descriptor matches a known `subscription`/`membership` alias and at card-payment rows (`PAYMENT THANK YOU` style). If most alias rows are money-in and payment rows money-out, the convention is inverted: flip it, add a note, and show "Purchases look positive in this file, so we flipped the signs. Wrong? Flip back." The preview always offers the flip.
- The generic mapper is a main path, not an edge case: `suggestMapping` uses value shapes (≥ 90% dates → date; ≥ 90% money → amount; two near-exclusive money columns → debit/credit; the highest-cardinality text column → description).
- Amounts: strip `$`, commas, spaces; `(12.34)` and `- $12.34` and `-$12.34` are negative; parse to integer cents without floating point (split on the decimal point).
- Dates: per format; two-digit years → 20xx; invalid → `unparseable-date`.
- Encoding: UTF-8 (BOM stripped); if the text has U+FFFD in more than 1% of characters, the app re-reads the file as windows-1252 with `TextDecoder`.
- QFX/OFX: out of v1 (RESEARCH §1 recommendation); the import screen says "Download the CSV option instead" with the /how-to-export link.

## 7. Merchant normalisation (`cleanDescriptor`, `normalizeMerchant`)

Ordered rules (RESEARCH §3 has the sources and examples):
1. NFKC, uppercase for matching, collapse whitespace.
2. Strip bank wrappers: `PURCHASE AUTHORIZED ON MM/DD`, `CHECKCARD MMDD`, `POS DEBIT`, `DEBIT CARD PURCHASE`, `RECURRING PAYMENT`, `ACH DEBIT`, trailing `PPD ID: …`/`WEB ID: …`, card tails `CARD 1234`, `XXXX1234`.
3. Processor prefixes → `processor`, keep the merchant part: `SQ *`, `TST*`, `PAYPAL *`, `PP*`, `SP `, `PADDLE.NET*`, `FS *`, `DD *`, `UBER *`, `LYFT *`, `CASH APP*`, `AMZN MKTP`, `APPLE.COM/BILL` (→ `billedThrough: 'apple'`), `GOOGLE *` (→ `google-play` unless the rest matches a Google-owned alias such as YouTube or Google One).
4. Remove phone numbers, URLs → domain stem (`NETFLIX.COM` → `NETFLIX`), store numbers (`#1234`, standalone digit runs ≥ 3), trailing US state codes and city words after the merchant, dates, reference numbers.
5. Lowercase → `cleaned`. Alias lookup: first compiled pattern that matches `cleaned` wins (`aliases.json` order = priority; specific before generic, e.g. `uber one` before `uber`).
6. No alias: `key = 'raw:' + first two significant tokens`, `display` in Title Case.

## 8. Data (lane B3; schemas in CONTRACT §4)

- **`data/aliases.json`**: ≥ 60 entries (RESEARCH §3 table is the seed; target ~100), each with `kind`; variable-merchant entries for the false-positive families (major gas brands, grocers, coffee chains, rideshare, `amazon-retail`).
- **`data/cancel.json`**: ≥ 60 entries with `verified` set (RESEARCH §5 table is the seed; it was fetched 2026-10-04). B3 re-runs the link check before writing. Rules: official domains only; **denylist** for any third-party "how to cancel" or aggregator host (e.g. justcancel, donotpay, rocketmoney, wikihow, reddit); `stepsStated` only when the fetched help page text describes cancelling; a 403 or bot wall is recorded as `ok: false` with a note, never retried with a fake user agent.
- **`data/formats-help.json`**: one entry per supported format (RESEARCH §1), our words, official help URL only.
- **`data/scripts/check-links.mjs`**: GET each URL, follow redirects, UA `Lintroller-linkcheck/1.0 (+https://lintroller.vercel.app/about)`, 1 request/second, writes `check` + `verified` into `cancel.json` and a `data/link-report.md` (status table, REVIEW lines for changes). Manual or weekly from the Mac later; not CI-blocking; never part of the app.
- Platform routing data: entries `apple`, `google-play`, `amazon-channels`, `paypal`, `roku` with their official subscription-management pages.

## 9. Evaluator (lane B4)

- **Synthetic corpus**: `corpus/src/generate.ts`, seeded PRNG (mulberry32), writers for every `FormatId` (exact header, preamble, sign and date conventions from RESEARCH §1). Each case: 6–18 months, 3–14 labelled series (mix of cadences, traps from CONTRACT `Trap`), distractors from each `DistractorFamily`, realistic descriptors from the alias patterns plus processor prefixes and store-number noise. ≥ 40 cases, ≥ 2 per format, plus 3 large cases (50k rows) for performance.
- **Hand fixtures**: `corpus/fixtures/*.csv` + `*.expected.json` (≥ 15): weekend drift, Jan 31 → Feb 28, price rise, trial, an ended subscription, two Apple plans, Amazon retail noise, weekly gas, Zelle rent, card payment, payroll, a yearly renewal across 13 months, exact duplicate rows inside one file (both kept; cross-file duplicates are B1's `mergeRows` unit test, since a case is one file), Unicode merchant, a merchant named `=HYPERLINK("http://x")` (CSV injection) and one with `<img src=x onerror=alert(1)>` (XSS).
- **Metric**: a finding matches a labelled series when their line sets overlap ≥ 50% (Jaccard, same case). Precision = TP / findings; recall = TP / `mustFind` series. Also cadence accuracy and max yearly-cost error.
- **Gates** (I1 runs `npm run eval -w corpus` in the build): corpus precision ≥ 0.90 and recall ≥ 0.90 at default params; at confidence ≥ medium, precision ≥ 0.95; fixtures exact (each `mustFind` present with the right cadence, no finding on a distractor). Performance: a 50k-row case parses and detects in < 2 s on the Mac (vitest timing).

## 10. Privacy model, headers and the proof

- **Architecture**: Vite static build; no API routes, no server code, no service worker, no runtime data fetch. Engine runs in a module Web Worker (same-origin file).
- **What the app must never do**: send transaction data anywhere; load third-party scripts, fonts, styles or images; use analytics, error reporting or session replay; write storage without the opt-in; put file content in a URL; log rows to the console; render user text as HTML (`dangerouslySetInnerHTML` is banned).
- **Headers on every route** (`vercel.json`):
  ```
  Content-Security-Policy: default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=(), clipboard-read=(), payment=(), usb=()
  X-Content-Type-Options: nosniff
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  ```
- **The sample file and /privacy-results.json** are fetched by the browser how? With `connect-src 'none'` the app can't `fetch()` them. So: the sample CSV is bundled as a string (imported `?raw`), and `/privacy` renders results from a JSON imported at build time (`app/src/privacy-results.json`, written by I1's e2e; publishing a new result = commit + rebuild, as with Coatpocket).
- **Outbound links**: `target=_blank rel="noopener noreferrer"`, only to `cancel.json`/`formats-help.json` URLs whose host is on the entry's `domains`, the official law sources the summary panel cites (consumerfinance.gov, ecfr.gov), and our repo/useslop.com. A build gate checks every external `href` in `dist/`.
- **The proof** (`app/e2e/privacy.mjs`, Playwright via a local `playwright-core`, published on /privacy, merge gate):
  1. Load `/`, go to `/sweep`, import a synthetic canary CSV (merchants `QUOKKA STREAMING`, `ZEBRAFISH GYM 7781`, amount `$77.77`), walk review (confirm 2, dismiss 1), summary, download the CSV and the ICS, toggle "Remember on this device", then "Delete everything". Record every request (`page.on('request')`, workers included).
  2. Assert **zero requests of any kind after the initial page load** except the test's explicit cancel-link clicks; those popups are intercepted with `route.abort()` and each host must be on the clicked entry's `domains`.
  3. Assert no canary token in any request URL, header or body (including the initial load).
  4. Assert the request list is identical for a second, different CSV.
  5. Storage: no cookies; localStorage/sessionStorage/IndexedDB empty before the opt-in, exactly `subsweep:v1` after it, empty after "Delete everything".
  6. CSP: count `securitypolicyviolation` events (0 expected), and prove enforcement: an injected `fetch('/x')` from the page context must be blocked.
  7. Offline: `context.setOffline(true)` after the first load; the full flow still works.
  8. `curl -I` every route: the exact headers above. Grep `dist/` for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` (allowlist only documented library false positives, with the reason in the gate file).

## 11. Accessibility and phone-first

- Design at 390×844 first; the review list is cards on phones, a table from 768 px. Tap targets ≥ 44 px. Text ≥ 16 px.
- The drop zone is a labelled button that opens the file picker; drag-and-drop is an extra. Paste works on phones.
- `aria-live="polite"` announces "Read 1,204 rows from 2 files. 14 charges look like they repeat."; focus moves to the results heading.
- Confidence and badges carry text, never colour alone; contrast ≥ 4.5:1; `prefers-reduced-motion` respected; works at 200% zoom.
- axe: 0 serious/critical on every route, with data loaded.

## 12. Build gates (I1 wires them into `npm run build`; each fails the build)

(a) `lintCopy` over UI strings (`app/src/**/*.tsx` string literals and the prerendered HTML) and README; (b) outbound-link allowlist (§10); (c) network-API grep in `dist/` (§10.8); (d) zod schemas + B3's data rules; (e) `vercel.json` headers equal the §10 text exactly; (f) `dangerouslySetInnerHTML`, `eval(`, `new Function(`, `console.log` absent from `app/src` and `engine/src`; (g) evaluator gates (§9); (h) budgets: JS ≤ 180 KB gzip in total including the bundled data; `/` interactive in < 1.5 s on a mid phone profile (Lighthouse, informational).

## 13. Tech stack and deploy

- Vite + React 19 + TypeScript strict, no CSS framework (plain CSS modules or one stylesheet), zod, vitest, Testing Library, Playwright via `playwright-core` + axe-core for e2e.
- CSV parsing: a small hand-written RFC 4180 parser in the engine (quotes, escaped quotes, CRLF/LF, embedded newlines); no runtime dependency needed. If B1 prefers a library, it must be MIT/BSD, zero-dependency and < 10 KB gz (`papaparse` is MIT and acceptable).
- Monorepo per CONTRACT §1. MIT. Node ≥ 22.
- **Deploy** (I1, like Coatpocket's DEPLOY.md): new Vercel Hobby project `lintroller`, not git-connected; `vercel build --prod` from a clean `git worktree` of `main`, then `vercel deploy --prebuilt --prod`; no Web Analytics, no Speed Insights, no env vars. Unannounced until Q1 says GO and Tanya reviews.

## 14. Test plan (summary; each brief has the details)

- **Engine (B1, vitest):** RFC 4180 edge cases; each format's sniff + parse on B4-style samples; sign conventions; dates; cents without float error; `cleanDescriptor` table tests (≥ 30 cases from RESEARCH §3); alias priority; classification families; detection on hand-made series for each cadence and trap; yearly cost; totals; `lookupCancel` platform routing and unverified exclusion; CSV injection escaping; ICS round-trip; copy lint hits/misses.
- **Data (B3):** schemas, uniqueness, domain rule, denylist, ≥ 60 verified cancel entries, alias/cancel category agreement.
- **Corpus (B4):** generator determinism (same seed → same bytes), writer shapes match RESEARCH §1 signatures (sniffed back by the engine), evaluator unit tests (TP/FP/FN on toy cases).
- **App (B2):** import → review → summary on the sample file; confirm/dismiss/undo; mapper; opt-in storage and delete; copy lint over strings.
- **E2E (I1):** §10 proof, axe on all routes at 390×844, header sweep.
- **QA (Q1):** adversarial files (empty, header only, 300k rows, 25 MB+, binary renamed .csv, UTF-16, semicolons, CR-only line endings, formula and HTML injection in descriptors, emoji/RTL merchant names), honesty (reasons match evidence, no never-say, yearly math), link spot-check (15 cancel links by fetch), a11y, phone layout.

## 15. Launch content hooks (drafts only; L1 after Q1 GO)

1. "Your bank statement, checked for repeating charges, without uploading it anywhere": a screen recording with the synthetic sample and the DevTools Network tab staying empty.
2. "`connect-src 'none'`: the browser won't let this page phone home" (developer angle; the Finecomb privacy angle performed best).
3. "The $X/year you forgot about": built only from the sample file, never a real person's numbers, no savings promise.
4. "Where to cancel, on the company's own page, checked today": the directory as a public, dated list (useslop.com tools row).
5. The build story: Opus 5.5 researched and specified, Sonnet 5 built, Build Receipt, MIT repo.

## 16. Open questions (for Tanya; ranked by risk; recommendations in SUMMARY)

1. **Unverified CSV shapes.** No US bank publishes its header; only PayPal is official. Ship best-known signatures at medium confidence + the sign self-check + the mapper as a main path? Optionally ask volunteers (the owner included) for a header line only, never rows; lanes never read anyone's files.
2. **Synthetic-only evaluation is partly circular** (B4's generator and B1's detector share RESEARCH's assumptions). Have Q1 write its own fixtures without reading B4's generator, and keep thresholds conservative (precision over recall)?
3. **Cancel-link freshness.** 85 of 105 verified tonight; links rot. Show the checked date, mark stale at 90 days, and add a weekly `check-links.mjs` run from the Mac after launch (a new automation: Tanya's call)?
4. **Law copy.** v1 ships only the three consumer-action sentences (CFPB, Reg E, Reg Z) with links; the "no federal click-to-cancel rule" and state-law lines stay out because they can change (FTC ANPRM open since 2026-03-13)?
5. **What counts.** Bills and bank fees as their own group with their own total (no cancel wording), and payments to people collapsed and never in totals; or subscriptions and memberships only?

Decided in this spec (not open): the name pick (§1, the owner can rename; USPTO check by hand before posting); `connect-src 'none'` with bundled data (§0, §10), stricter than the brief's "static data loader" allowance; QFX/OFX out of v1; no analytics anywhere.
