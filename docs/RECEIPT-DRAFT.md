# Build Receipt (draft): Lintroller, the Subscription Sweep request

Draft for the useslop.com/tools Build Receipt. Not published. Times are US Eastern, night of Sunday 2026-10-04. Numbers are from the integration lane's runs; QA (Q1) has not run yet.

## What was asked

"Drop in a CSV from your bank or card. It lists each repeating charge, what each costs per year, and where to cancel the big ones. The file never leaves your device." (request `subscription-sweep` on useslop.com/tools)

## Lanes

| Lane | What | Model | Time | Result |
|---|---|---|---|---|
| R1 research | CSV layouts, recurrence heuristics, merchant cleaning, cancel-page sources, consumer-law sources, competitors, name; SPEC and CONTRACT | Opus 5.5 | 20:55–21:16 | done; name Lintroller |
| Scaffold | npm workspaces, MIT licence, docs | Tanya (Opus 5.5) | 21:17 | done |
| B1 engine | CSV reader, layout sniffing, sign check, cleaning, detection with evidence and confidence, yearly cost, cancel lookup, CSV and ICS export, copy lint | Opus 5.5 | 21:17–21:42 | done; 152 tests |
| B2 app | Vite + React screens, column mapper, review, summary, exports, privacy and about pages, CSP, prerender | Sonnet 5 | 21:17–21:34 | partial; data switch-over by Tanya at 22:05; 26 tests |
| B3 data | 103-company cancel directory checked by fetch, 127 merchant patterns, 17 export guides, link checker | Sonnet 5 | 21:17–21:45 | done; 60 links verified; 21 tests |
| B4 corpus | seeded synthetic statements per layout (40 cases), 23 hand fixtures, evaluator | Sonnet 5 | 22:02–about 22:30 | done; 42 tests; precision gate G3 fails on the engine |
| I1 integration | build gates, privacy proof, headers, accessibility, preview deploy, README, this draft | Opus 5.5 (one Sonnet 5 helper for the axe script and the share image) | 22:02– | live preview, unannounced |

## Tests and gates (I1, 22:22)

- Tests: engine 152, app 26, data 21, corpus 42: **241 passing**.
- Build gates, each one fails the build: (a) copy rules over the UI strings, prerendered pages, README and data notes; (b) outbound links: 230 URLs checked, each one a checked company page on its own domain, a cited CFPB/eCFR page or our own; (c) no `fetch`, XHR, beacon, WebSocket or EventSource in the shipped JS; (d) data schemas and rules; (e) security headers identical to the spec; (f) no `dangerouslySetInnerHTML`, `eval`, `new Function` or `console.log` in our code; (g) evaluator scores; (h) JS 122.0 KB gzip of a 180 KB budget. Result: 7 pass, 1 fail. The evaluator on 40 synthetic cases: precision 91.7%, recall 97.0%, cadence 100%, 23 of 23 fixtures exact, 50,000 rows in 0.8 s; **precision at medium confidence and above is 93.1% against a 95% gate**, so the current code can't be deployed until that is fixed. The live preview was built just before the evaluator landed.
- Privacy proof (`app/e2e/privacy.mjs`, headless Chromium): **33/33 on the local build, 32/32 on the live preview** (the dist grep only runs locally). Zero requests after the page loads, other than the test's own cancel-link clicks (aborted, each on that company's domain); no canary text in any request; the same request list for a second file; storage only after the opt-in and empty after "Delete everything"; CSP enforced (an injected `fetch` is blocked); the full flow works offline.
- Accessibility: axe-core on 9 screens at 390×844 (landing, import empty and with the sample, review before and after marking, summary, export guide, privacy, about): 0 serious or critical issues, locally and live.

## What is not verified yet

- Detection precision at medium confidence and above misses its gate (93.1% vs 95%): restaurant charges, card payments wrapped in bank text, and Amazon retail rows still come out as repeating charges on synthetic files. No real bank export was used, by rule; real-world accuracy is unknown.
- 14 of the 18 file layouts are best-known layouts, not checked against an official sample; the app shows a preview and the column choices for that reason.
- 43 of 103 cancel entries have no verified link and show none. Two verified Amazon links end on an Amazon sign-in step, and PayPal's on its sign-in page; Q1 should look at them in a browser.
- The app has not had adversarial QA (Q1): odd and huge files, Unicode, injection in merchant names, copy and honesty review.
- The name Lintroller has not had a trademark search.

## How to check the privacy claim yourself

Open your browser's developer tools on the Network tab, load the page, and drop in a file or use the sample. Nothing new appears in the list.
