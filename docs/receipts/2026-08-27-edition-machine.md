# OURS TODAY · Build Receipt — The Edition machine

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260827-001
title: The Edition - daily page, generated card, and pnpm edition
date: 2026-08-27
authority: founder-steward instruction, 27 August 2026 ("finish our marketing
  thesis and the machine"), following the adopted Distribution direction
  (OURS.md §7-8 - outsource reach, never memory or authority)
agent: Claude (Fable 5), Claude Code
truthful_status: LOCAL
deployed: false
canonical_writes_open: unchanged - this task touches no canonical write path
```

## Objective

Make the daily edition generate itself from the canonical ledger so external
posting can never drift from the record: a public `/today` page, a fixed
recognizable card image, and a `pnpm edition` command that hands the
founder-steward ready-to-edit share language composed from deployed truth.

## What actually works for a person

1. `/today` renders the day number and the four tapes — FORMED, BUILT,
   NOT YET, OPEN — composed from the public projections at load time, plus
   starting share language for X and LinkedIn, marked editable.
2. `/api/v1/edition` returns the same edition as JSON, public and
   unauthenticated, like `/api/v1/participation` and for the same reason.
3. `/api/v1/edition/card` renders a 1080×1350 feed card and
   `/today/opengraph-image` a 1200×630 share preview — one fixed visual
   format in the site's own palette, generated from the ledger.
4. `pnpm edition` fetches the edition from the deployed site (never composes
   locally from memory), prints both post texts with character counts and the
   card's alt text, and saves the card PNG. `--local` and `--base <url>`
   select environments out loud, in the style of the other scripts.
5. The masthead now computes DAY N from the calendar instead of remembering
   "DAY 1", and gains a TODAY link.
6. Root layout, /status and /anchors now declare `twitter:card:
   summary_large_image`; the first live share on X (26 AUG) rendered the
   small imageless card because only Open Graph tags were present.

## Changes

- `src/edition/compose.ts` — pure composition; every line degrades to an
  explicit "Unavailable in this environment." rather than an invention.
- `src/edition/data.ts` — inputs from existing public projections, each
  failing independently; falls back to `system_status.entry_count` when the
  participation views (migration 0007) are absent in an environment.
- `src/edition/card.tsx` + `src/edition/fonts/` — card renderer (next/og)
  with committed OFL fonts (Archivo Black, IBM Plex Mono); no third-party
  fetch at render time, matching the CSP philosophy.
- `app/today/page.tsx`, `app/today/opengraph-image.tsx`,
  `app/api/v1/edition/route.ts`, `app/api/v1/edition/card/route.ts`.
- `scripts/edition.ts`, `package.json` (`edition` script), `.gitignore`
  (saved cards), `next.config.ts` (font tracing for the two image routes).
- `src/components/Masthead.tsx`, `app/layout.tsx`, `app/status/page.tsx`,
  `app/anchors/page.tsx` (share-card metadata).
- `src/ledger/queries.ts` — `newestPublicEntry()` over the existing public
  view.
- `tests/unit/edition-compose.test.ts`.

## Tests

| Gate | Result | Evidence |
|---|---|---|
| format:check | PASS | run 2026-08-27, local |
| lint | PASS | run 2026-08-27, local |
| typecheck | PASS | run 2026-08-27, local |
| test:unit | PASS | 46/46 across 8 files, including 11 new edition tests |
| build | PASS | routes registered: /today ○, /today/opengraph-image ○, /api/v1/edition ○, /api/v1/edition/card ƒ |
| test:integration | NOT RUN | no schema or canonical-path change; suite untouched |
| test:e2e | NOT RUN | no e2e coverage added for /today yet — see decisions_needed |
| visual | PASS | card, OG image and /today rendered against the local database and inspected |

## Truth

- deployed: NO. Local working tree only; nothing committed by the agent.
- real_users_observed: NO for these surfaces.
- concept_data_present: NO. Screenshots used the local database's real
  origin row; no fictional counts anywhere.
- legal_membership_changed: NO. All new surfaces carry the status line.

## Decisions made inside the mandate

- Card fonts committed to the repository rather than fetched (Archivo Black
  and IBM Plex Mono, both OFL; license note in `src/edition/fonts/README.md`).
- `pnpm edition` reads the deployed site, not the local database, so posted
  text always matches public truth.
- The open case (P-0001) is a maintained constant in `compose.ts` until
  canonical proposals exist (Phase B).
- Cache windows follow the /status Neon-suspend reasoning: page 300 s,
  card CDN 900 s, OG 900 s.

## Decisions needed (human)

1. Deploy, and run the production migration so the participation views exist
   there (`/api/v1/participation` currently answers UNAVAILABLE in
   production; the edition falls back to the entry count until then).
2. Whether /today gets an e2e smoke test in the release gates.
3. The daily posting ritual itself (who posts, when) — the machine only
   prepares language; a person publishes it.

## Reversal

Delete `src/edition/`, `app/today/`, `app/api/v1/edition/`,
`scripts/edition.ts`, the `edition` script entry, and the metadata/masthead
edits; each is additive and none is depended on by canonical paths.
