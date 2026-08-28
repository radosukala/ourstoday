# OURS TODAY · Build Receipt — The era is answered, the target is named

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260828-005
title: Retire the answered P-0001, define what follows the million, name the
  first target on the front page, and make the entry flow one surface
date: 2026-08-28
authority: founder-steward instruction, 28 August 2026
agent: Claude (Opus 5), Claude Code
truthful_status: LOCAL
deployed: false
canonical_writes_open: unchanged
```

## Why

A review of the Founding Million build found four things that a first-time
visitor would meet, in this order.

**The site contradicted itself.** P-0001 — *When does the Founding Era end?* —
was live on `/today` with the proposed answer *"not when an arbitrary number of
people enter"* and the case-for line *"a viral burst does not arbitrarily
exclude people because a counter filled."* Amendment 0.1 had meanwhile answered
that question at 1,000,000 and enforced it in a database `CHECK` constraint. A
project whose only asset is being believed about process was publicly asking a
question its own schema had settled.

**The verb had no object.** Nothing on the homepage said what anyone would
leave. Grepping the rendered page for LinkedIn, Instagram, Uber, Spotify,
Amazon, Airbnb, TikTok and the app stores returned zero. Twelve targets existed
in the database and rendered only *after* a person sealed — the most motivating
content in the product sat behind the conversion it was supposed to cause.

**The success case terminated.** At #1,000,001 the allocator throws
`FoundingEraFullError`, and no document defined what happens next.

**The funnel changed identity at step two.** The homepage was an ink terminal;
pressing its button landed on the Day 1 paper masthead, a different navigation,
a different accent colour and a browser tab that read "OURS TODAY · Day 1" —
at the exact moment a person was deciding whether to trust it.

## Founder-steward ruling

> Nobody visited, nobody joined. We can fully rewrite. We don't need to
> demonstrate that we shifted since yesterday.

Recorded as given. There is no public that read the earlier question, so
preserving the archaeology of the pivot was judged to cost clarity and buy
nothing. The rewrite is therefore direct rather than diffed.

## What changed

### The open case

`OPEN_CASE` in `src/edition/compose.ts` and §7 of `docs/DAY-1.md` now carry
**P-0001 — What does OURS build first?** The number is reused deliberately and
the substitution is stated in both the doc and the code comment, so the record
says what happened rather than hiding it.

The new question is genuinely undecided, and it is decided by the mechanism the
product already implements: notice against a threshold. Its case-against is
written honestly, including the one that matters — notice counts are demand
signals, not votes, and that distinction has to survive contact with people who
will read them as votes.

### What follows the million

New §6 of [Founding Right 0.1](../FOUNDING-RIGHT-0.1.md). Reaching the millionth
place closes the founding *cohort*, not OURS. The cohort is finite because its
job — ratifying Constitution 1.0 and authorising the first mission — does not
get easier by adding people to it. That is the reason for the number, and it is
not scarcity.

It creates an obligation with a trigger rather than an intention:

> At 900,000 sealed places, OURS must publish the proposed successor instrument
> and put it to the founding cohort. The remaining 100,000 places are the margin
> for getting it right.

And it forecloses the obvious abuse: a successor instrument may not create a
second class who carry the obligations of membership without its rights. After
Constitution 1.0, one member is one vote.

### The first target

The homepage now reads the mission board and names the leading row — ordered by
notice count, then by registry position, so before anyone has given notice it is
the target the registry opens with. Two places, one word each:

- under the message, `LEAVING FIRST / THE PROFESSIONAL NETWORK / LinkedIn`;
- in the boot scan, `AIMED AT ......... LinkedIn`, so the "AGGREGATED DEMAND"
  line stops being an abstraction.

A board that cannot be read costs the page those lines and never costs it the
entry form. `/api/v1/missions` now also projects `incumbents`, so the
machine-readable board says the same thing the page does.

### One surface

`FoundingTopline` / `FoundingFooter` (`src/components/FoundingChrome.tsx`)
replace the Day 1 `Masthead` across `/enter`, `/enter/check-email`,
`/enter/confirm` and `/enter/continue`, which now share the homepage's ground,
palette, grid and step counter. The root layout's title and share card were
still the Day 1 ones, so every page except the homepage announced the old
project when shared; both now carry the Founding Million.

The email field on `/enter` had **no styling of its own** and was rendering as
the browser default box — the one control on the page a person has to trust.
It now uses the terminal's field treatment.

The share card asked for weight 900 of Arial and got satori's default face,
which has no such weight, so it rendered light and wide beside a homepage set
in a heavy grotesque. It now calls `loadEditionFonts()` — the same committed
Arimo Bold and DejaVu Sans Mono the daily Edition card has used since 27
August, read from disk because the CSP forbids fetching a font at render time.
Verified by fetching `/opengraph-image` directly: HTTP 200, 58KB PNG.

### Fixed in passing

- The homepage footer, carrying the legal boundary line, was clipped below a
  900px viewport with `overflow:hidden` and no way to scroll to it. The cause
  was `min-height:100svh` letting the `1fr` row grow past the viewport; it is
  now `height`, with each column absorbing the pressure itself.
- The legal line was 8px desktop / 6.8px mobile. Now 10px / 9px.
- Below 620px the boot scan was hidden, leaving phone visitors — most of the
  traffic from a shared link — with a counter and no argument. It now stays.
- **Six dead links.** The Day 1 masthead navigated to `/#ledger`, `/#tapes`,
  `/#constitution` and `/#decision` — sections of the homepage the Founding
  Million replaced. Four of its five links led nowhere, on every record page
  (`/today`, `/status`, `/anchors`, `/me`, `/e/[ordinal]`). The Edition carried
  two more of the same. All now name pages that exist, and the Edition's CASE
  link points at `#first`, which is where P-0001 is actually decided.

### Archived

`app/Terminal.tsx`, `src/edition/value.ts` and `tests/unit/value.test.ts` moved
to `archive/demand-slider-v0.1/` with a README explaining what would have to be
true to bring them back. Nothing imported `Terminal.tsx` after the Founding
Million rebuild, so five green unit tests were covering a module the product did
not use.

**This is not a decision that the money argument is wrong.** It is a decision
that it cannot sit on the same page as a right that disclaims economic
participation. That call remains open for the founder-steward.

## The README was not telling the truth

Checked while confirming what still referenced the old frame. Every clause of
the section titled **Truthful status** was false:

| README claimed | Verified 28 Aug 2026 |
|---|---|
| Nothing is deployed | Vercel serves `ourstoday.com`, commit `8315f0e` |
| No Git remote | Public: `github.com/radosukala/ourstoday` |
| No database outside a developer's machine | Production DB holds **5 entries** |
| No domain | `ourstoday.com` resolves and serves |
| No email sending domain | Resend, `updates.ourstoday.com`, verified |
| External cost 0.00 EUR | Not zero |

It also understated the state of the ledger. `/api/health?deep=1` reports
`ledger: OPEN` and `canAcceptEntries: true` — **production accepts real
entries right now**, under Founding Declaration 0.1, with no cap, no Founding
Right and no target registry, because migrations 0007 through 0010 have never
been applied there.

For a project whose entire asset is being believed about its own state, a
section headed "Truthful status" that is wrong on six counts is worse than any
design defect on the page. Corrected against the live endpoints, with the
production-versus-repository gap stated plainly.

**Nothing was changed in production.** The checks were read-only calls to
public endpoints the project publishes for this purpose.

## Tests

| Gate | Result | Evidence |
|---|---|---|
| format:check | PASS | run 2026-08-28 |
| lint | PASS | run 2026-08-28 |
| typecheck | PASS | run 2026-08-28 |
| test:unit | PASS | 56/56 |
| test:integration | PASS | 36/36 |
| test:e2e | PASS | 22/22 |
| build | PASS | compiled clean |
| conformance | PASS | 10/10 |
| db:migrate:check | PASS | applied through 0010 |
| visual | PASS | 1440×900 and 390×844; footer reachable, no overflow |

Unit count falls from 62 to 56 because the six archived slider tests left with
the module they covered.

## Truth

- deployed: NO. None of this reached production. Production continues to serve
  commit `8315f0e`, which predates the Founding Million entirely.
- real_users_observed: NO.
- concept_data_present: NO. The named target and its ordering come from
  `public.mission_board`; the notice count behind it is a real zero and is not
  displayed on the homepage.
- legal_membership_changed: NO. No economic entitlement was created, published
  or implied. P-0002 remains unadopted, unreviewed and off every public surface.
- schema_changed: NO. The 1,000,000 cap and its constraints are untouched.

## Decisions still needed (human)

1. **P-0002** — adopt as direction for legal review, amend, or reject.
2. Whether the demand-value slider returns, and in what frame.
3. Whether people may nominate targets outside the registry (now written into
   P-0001 as evidence needed).
4. Whether the 900,000 successor-instrument trigger is the right threshold.
5. **Production is already open and already behind.** It is accepting real
   entries under Declaration 0.1 while the Founding Million sits only in this
   repository. Deciding the order — migrate then deploy, or pause the ledger
   first — is a founder-steward call, and the five existing entries have to
   survive it intact. Migration 0010 backfills `founding_right_version` on
   every existing row and asserts no ordinal falls outside 1..1,000,000, so the
   five are covered; that must still be rehearsed against a restored copy of
   the production database rather than assumed.

## Reversal

Every change is additive or a moved file. `archive/day1-homepage/page.tsx`
still restores the original homepage; `archive/demand-slider-v0.1/` restores the
slider. Reverting the chrome means swapping `FoundingTopline` back to
`Masthead` in the four entry files — the Day 1 `Masthead` component is
unchanged and still used by `/today`, `/status`, `/anchors`, `/me` and
`/e/[ordinal]`.
