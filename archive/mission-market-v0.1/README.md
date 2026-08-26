# OURS TODAY · Mission Market

The Phase 0 minimal public shell of OURS TODAY, built from
[docs/OURS.md](docs/OURS.md) (founding direction v0.1) and the
[docs/mission-market.html](docs/mission-market.html) design proposal.

> Everything can be built. What should become ours?
> Join a mission. Prove the product. Switch together. Own the result.

## Run it

No build step, no dependencies, no backend:

- Double-click "index.html" (works from file://), or
- Serve the folder: python3 -m http.server → http://localhost:8000

The page makes zero network requests (enforced by its Content-Security-Policy).
All counts, momentum values and costs are CONCEPT DATA and visibly marked as such.

## What is implemented — Phase 0 scope per OURS.md §13

| Phase 0 item | Where |
|---|---|
| One public Mission Market page | index.html heatmap: area = ranked verified commitments; color + number + arrow = 7-day momentum |
| One cell page | Click any tile → detail: mission, thesis, participation snapshot, readiness dimensions |
| Together Pledge | COMMIT MY GROUP: bounded group, members, threshold (auto 30%), expiry, at least 2 required conditions, withdrawal |
| Captain invitations | BRING MY PEOPLE: named cohort + code + copy-paste invite text. No contact scraping. |
| Build log | Per-cell entries naming hypothesis, owner, how-to-try, cost truth, failures, next decision |
| Manual contribution receipts | TRY / CONTRIBUTE / STEWARD actions file receipts into local storage |
| Threshold verification | Next-unlock conditions with current/target bars and a named verifier each |
| Switch event page | Cell 004 shows window, support coverage, rollback path, live threshold gates |
| Basic cost reporting | Monthly ledger snapshot per cell: revenue lines, costs, reserve, surplus (often negative — honest) |
| Complete export | MY RECORDS → EXPORT JSON (your data only), plus full local wipe |

## Invariants honored (OURS.md §14)

- A social reaction never satisfies a gate — every action files use, evidence, or accountability.
- Pledges activate only when all declared conditions verify; expiry is enforced, not decorative.
- Withdrawal is always available before activation.
- Adoption credit vests on retained users, not impressions; no multilevel anything.
- Committed to member ownership — legal membership claims wait for the pilot.
- Concept data is labeled wherever it appears.
- Right to leave applies here too: export or delete all local records at any time.

## Files

- index.html — app shell (CSP, theme toggle, views)
- assets/styles.css — civic-instrument design system (hard edges, tabular numerals)
- assets/data.js — CONCEPT seed data: 5 cells, unlocks, build logs, ledgers
- assets/store.js — localStorage records: receipts, pledges, cohorts, export/wipe
- assets/app.js — routing, heatmap, cell detail, pledge and participation actions
- docs/ — founding direction + original design proposal

## Deliberately absent (per OURS.md §13)

Accounts, servers, tokens, trading, infinite feeds, mobile apps, AI code editing,
idea submissions, cooperative auto-incorporation. The first product is a
coordinated migration, not a software platform.

## Accessibility & design guardrails

Keyboard-operable throughout; status is never color-only (arrows, words, labels);
light/dark/auto themes; reduced-motion respected; small-screen layouts;
no rounded-card abundance, no gradients, no ticker that reads like securities.