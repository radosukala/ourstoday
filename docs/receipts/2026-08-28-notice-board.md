# OURS TODAY · Build Receipt — The board of notices

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260828-001
title: Lead with demand - missions, notices and the homepage as a signed document
date: 2026-08-28
authority: founder-steward instruction, 28 August 2026, after two days of
  zero conversion on the formation-first homepage ("select what pisses you off
  the most that you want better, OURS-owned version ... build this
  minimalistic, iconic page")
agent: Claude (Fable 5), Claude Code
truthful_status: LOCAL
deployed: false
canonical_writes_open: unchanged
```

## Why this exists

The homepage led with the institution — declaration, ledger, constitution,
gates, anchors. Two published posts produced 250 views and no entries; the
five places in the record are the founder's family. A stranger's honest
reaction to an institution nobody has joined is "congratulations, and what is
this for."

The diagnosis adopted: the government was built before the country. What the
network can offer on day three is not governance but **coordination** — an
assurance contract for leaving. Nobody can leave a platform alone, because
leaving alone costs everything and changes nothing. Everybody would leave
together. Nothing has ever provided the together.

So the front page now leads with the demand side: what could be member-owned,
and how many people have committed to move.

## The mechanic

A **mission** is a thing that could be member-owned, named as a category and a
practice, never a company — the objection is to a business model, not a firm.
A **notice** is one person's conditional commitment to move when enough others
will. Nothing is triggered below the threshold, so nobody is ever asked to go
first. At 1,000 notices a mission must be acted on in public: a plan, a cost
and a named steward, or a published reason why not.

This is the "I will switch if…" response that the Proposal and Deliberation
Protocol already specified and nothing had implemented.

## What actually works for a person

1. The homepage asks **What should be ours?**, states the argument in four
   paragraphs, and shows a live board of eight seeded missions with real
   counts against real thresholds.
2. The board **is** the form: clicking rows selects them, one email field
   below sends the magic link. There is no separate signup.
3. The selection survives the round trip through email and is recorded in the
   same transaction as the entry, as a PUBLIC `notice.given` event.
4. The record is the founding ledger annotated with what each place is waiting
   for, newest first, ending on the next unissued ordinal with a blinking
   caret — the reader looking at their own place before they take it.
5. `/api/v1/missions` serves the board as data, public and unauthenticated,
   recomputable from any export.

## Changes

- `src/db/migrations/0008_missions.sql` — `ledger.mission`, `ledger.notice`,
  and the `mission_board` / `notice_record` / `notice_totals` public views.
  Eight seeded missions.
- `src/ledger/missions.ts` — board, record and totals from the public views;
  `resolveMissionIds` for the seal transaction.
- `src/ledger/seal.ts` — optional `noticeSlugs`, recorded inside the entry's
  own transaction with one `notice.given` event. Unknown slugs are dropped,
  never rejected: a stale form must not cost someone their entry.
- `src/ledger/events.ts` — `notice.given`, `notice.withdrawn` added to the
  implemented event union.
- `src/lib/notice-intent.ts` — the unsigned intent cookie, with the slug
  allowlist at the parse boundary.
- `app/page.tsx` (previous homepage preserved at
  `archive/day1-homepage/page.tsx`), `app/NoticeBoard.tsx`,
  `app/api/v1/missions/route.ts`, `app/api/v1/entries/seal/route.ts`,
  `src/validation/schemas.ts`, `app/globals.css`.
- `tests/unit/notice-intent.test.ts`, `tests/integration/notices.test.ts`.

## Tests

| Gate | Result | Evidence |
|---|---|---|
| format:check | PASS | run 2026-08-28, local |
| lint | PASS | run 2026-08-28, local |
| typecheck | PASS | run 2026-08-28, local |
| test:unit | PASS | 53/53 across 9 files |
| test:integration | PASS | 30/30 before the change; 4 new notice tests pass |
| build | PASS | 13 routes; `/api/v1/missions` registered |
| conformance check | PASS | 10/10 invariants, events through seq 6 |
| visual | PASS | full page rendered against the local database and inspected; row selection, caret and board bars verified |
| test:e2e | NOT RUN | the homepage e2e spec asserts the previous page — see decisions_needed |

## Truth

- deployed: NO. Local working tree; nothing committed by the agent.
- real_users_observed: NO. Every board count is 0 because nobody has given
  notice; no seeded or illustrative number appears anywhere.
- concept_data_present: NO. The eight missions are seeded rows, but they are
  the menu, not evidence — no notice, person or count is fabricated.
- legal_membership_changed: NO. Status line on the page and in the footer.

## Decisions made inside the mandate

- Missions name categories and practices, never companies: a board of
  grievances against named firms would be a smaller and more litigable thing,
  and the objection is to the model.
- Notices are canonical and atomic with the entry — a sealed place with a lost
  commitment would be a record of half an act.
- The intent cookie is unsigned deliberately; forging it buys nothing, because
  a notice exists only once bound to a verified person's sealed entry.
- Threshold 1,000 for every seeded mission, with a deliverable meaning.

## Decisions needed (human)

1. **The constitution now contradicts the front page in spirit.** Article 9
   and the README still frame the ledger as the product. Either amend them to
   put demand first with a published diff, or accept that the site leads
   somewhere the documents do not. This is a founder-steward ruling and an
   agent must not make it.
2. Whether the eight seeded missions are the right eight, and whether people
   may nominate their own (the schema supports it; no UI does).
3. The economics paragraph is stated on the page in general terms. Making it
   binding — surplus rules, the member share, what "owned by them" means when
   a mission is acted on — needs the legal work behind gate 1.
4. The homepage e2e spec asserts the previous page and must be rewritten
   before `test:e2e` is meaningful again.

## Reversal

`cp archive/day1-homepage/page.tsx app/page.tsx` restores the previous
homepage. The migration is additive; missions and notices can be left in place
unused, or the views and tables dropped. No existing column, view or canonical
path was altered.
