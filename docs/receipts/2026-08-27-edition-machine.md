# OURS TODAY · Build Receipt — The Edition machine

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260827-001
title: The Edition - daily record page, generated card, archive, pnpm edition
date: 2026-08-27
authority: founder-steward instruction, 27 August 2026 ("finish our marketing
  thesis and the machine"; then "report what happened yesterday, archive all
  days, unify the card with the site's type"), following the adopted
  Distribution direction (OURS.md §7-8 - outsource reach, never memory or
  authority)
agent: Claude (Fable 5), Claude Code
truthful_status: LOCAL
deployed: false
canonical_writes_open: unchanged - this task touches no canonical write path
```

## Objective

Make the daily edition generate itself from the canonical ledger so external
posting can never drift from the record: a public `/today` page reporting the
completed day, a recomputable archive, one recognizable card format in the
site's own typographic voice, and a `pnpm edition` command that hands the
founder-steward ready-to-edit share language composed from deployed truth.

## The reporting model

An edition reports **the most recent completed UTC day** — a morning paper
covers yesterday. Posting at 08:26 about a two-hour-old day would say "no new
entries" while people are entering; reporting the completed day shows what
actually happened. FORMED and BUILT are recomputed from the ledger for that
day; NOT YET and OPEN are live lines by nature (what is not yet true is
always evaluated now, never replayed).

The archive is not stored: `/today/[day]` recomputes any completed day from
`public.founding_ledger` and the PUBLIC event log on request. The log is the
archive; a stored copy would eventually disagree with it.

## What actually works for a person

1. `/today` renders the latest completed day — day number, the four tapes,
   editable share language for X and LinkedIn, card alt text — and
   `/today/1`, `/today/2`, … render every past day the same way, with
   prev/next navigation.
2. `/api/v1/edition` (and `?day=N`) returns the edition as JSON, public and
   unauthenticated, like `/api/v1/participation` and for the same reason.
3. `/api/v1/edition/card` (and `?day=N`) renders the 1080×1350 feed card;
   `/today/opengraph-image` the 1200×630 share preview. One fixed format in
   the site's palette and type.
4. `pnpm edition` fetches from the deployed site (never composes locally from
   memory), prints both post texts with character counts and the card's alt
   text, and saves the card PNG. `--day N`, `--local`, `--base <url>`,
   `--no-card`.
5. The masthead computes DAY N from the calendar instead of remembering
   "DAY 1", and gains a TODAY link.
6. Root layout, /status and /anchors declare `twitter:card:
   summary_large_image`; the first live share on X (26 AUG) rendered the
   small imageless card because only Open Graph tags were present.

## Visual unification

The card uses metric twins of the site's own font stacks, so card and page
are one voice: **Arimo Bold** for `--sans` (Arimo is Arial-metric-compatible;
the site's wordmark and locks are heavy Arial/Helvetica) and **DejaVu Sans
Mono** for `--mono` (Menlo descends from the Vera/DejaVu design). Both freely
redistributable (OFL / Bitstream Vera license), committed under
`src/edition/fonts/` so generation performs no third-party fetch — the CSP
philosophy applied to rendering. An earlier draft used Archivo Black; it read
heavier than the site and was replaced on founder-steward review.

## Changes

- `src/edition/compose.ts` — pure composition + day↔date chronology
  (`editionDayNumber`, `dayToDateUtc`, `latestReportableDay`); every line
  degrades to an explicit "Unavailable in this environment." rather than an
  invention, and an unknown day is never reported as "no new entries".
- `src/edition/data.ts` — per-day inputs from `public.founding_ledger` and
  the PUBLIC event tape; independent of the participation views, so the
  edition works in any environment with the base schema.
- `src/ledger/queries.ts` — `newestPublicEntry`, `entryStatsForWindow`,
  `newestPublicEntryInWindow`, `totalEntriesBefore` over the public view.
- `src/edition/card.tsx` + `src/edition/fonts/` — card renderer (next/og).
- `app/today/page.tsx`, `app/today/[day]/page.tsx`,
  `app/today/EditionView.tsx`, `app/today/opengraph-image.tsx`,
  `app/api/v1/edition/route.ts`, `app/api/v1/edition/card/route.ts`.
- `scripts/edition.ts`, `package.json` (`edition` script), `.gitignore`
  (saved cards), `next.config.ts` (font tracing for the two image routes).
- `src/components/Masthead.tsx`, `app/layout.tsx`, `app/status/page.tsx`,
  `app/anchors/page.tsx` (share-card metadata).
- `tests/unit/edition-compose.test.ts` (13 tests).

## Tests

| Gate | Result | Evidence |
|---|---|---|
| format:check | PASS | run 2026-08-27, local |
| lint | PASS | run 2026-08-27, local |
| typecheck | PASS | run 2026-08-27, local |
| test:unit | PASS | 48/48 across 8 files |
| build | PASS | routes registered: /today ○, /today/[day] ƒ, /today/opengraph-image ○, /api/v1/edition ƒ, /api/v1/edition/card ƒ |
| test:integration | NOT RUN | no schema or canonical-path change; suite untouched |
| test:e2e | NOT RUN | no e2e coverage added for /today yet — see decisions_needed |
| visual | PASS | Day 1 card, OG image, /today and CLI (`--day 1`) rendered against the local database and inspected |

## Truth

- deployed: NO. Local working tree only; nothing committed by the agent.
- real_users_observed: NO for these surfaces.
- concept_data_present: NO. Screenshots used the local database's real
  origin row; no fictional counts anywhere.
- legal_membership_changed: NO. All new surfaces carry the status line.

## Decisions made inside the mandate

- Editions report completed UTC days; the UTC boundary is stated on the page
  ("THE RECORD OF … (UTC DAY)").
- The archive is recomputed, never stored.
- `pnpm edition` reads the deployed site, not the local database, so posted
  text always matches public truth.
- The open case (P-0001) is a maintained constant in `compose.ts` until
  canonical proposals exist (Phase B).
- Cache windows follow the /status Neon-suspend reasoning: latest page 300 s,
  archive pages 3600 s, card CDN 900 s, OG 900 s.

## Decisions needed (human)

1. Deploy (the edition no longer depends on the participation views, so no
   migration is required for it — though production still lacks migration
   0007 for /status participation and /api/v1/participation).
2. Whether /today gets an e2e smoke test in the release gates.
3. The daily posting ritual itself (who posts, when) — the machine only
   prepares language; a person publishes it.

## Reversal

Delete `src/edition/`, `app/today/`, `app/api/v1/edition/`,
`scripts/edition.ts`, the `edition` script entry, and the metadata/masthead
edits; each is additive and none is depended on by canonical paths.
