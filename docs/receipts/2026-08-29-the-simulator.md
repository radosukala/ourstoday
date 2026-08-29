# OURS TODAY · Build Receipt — The simulator

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260829-001
title: Ship /worth - what the products you use every day take from you in a
  year, at their own published rates, with the source for every figure
date: 2026-08-29
authority: founder-steward instruction, 29 August 2026
agent: Claude (Opus 5), Claude Code
truthful_status: LOCAL
deployed: false
canonical_writes_open: unchanged
```

## Why

> *"Without simulation we are just homepage with bold statement. Simulations
> could be that sharable artifact that could bring members. I'm worried that
> just on strong claim we won't take off to achieve 1M members! That claim
> alone is not reason that I have to join now and share with others. People
> need arguments and visualizations."*

Correct, and it is the gap the front page could not close on its own. A claim
asks to be believed. A simulation hands over the arithmetic and lets a person
check it.

The founder-steward also named the thing that makes this different from every
"delete Facebook" calculator: the bill has two halves.

> *"To see the facts how valuable are products we use daily, even if they are
> free for us to use, what we are keeping on the table, how we traded free app
> for rights to see how it works, operated, what rules use, how it behave to
> our data, our content."*

Money is the visible half. The rights are the half with no invoice.

## What shipped

**`/worth` — "What are you worth to them?"** A person picks the products they
actually use, puts in their own numbers, and sees what a year costs them: fees
they hand over, revenue their attention generates, and how many working days a
year that adds up to. Then the rights ledger: five things they cannot do on any
of these platforms, and what OURS proposes instead.

### Every figure is theirs, not ours

This is the whole credibility of the page, so it is enforced rather than
intended. `src/simulation/data.ts` carries a publisher, a URL and a date for
every rate, and a unit test fails the build if any figure lacks one.

| Figure | Rate | Source |
|---|---|---|
| Meta, revenue per person | $57.03/yr (FY2025); $233 in US & Canada | Meta full-year 2025 results |
| App Store commission | 30%, 15% under Small Business Program, 26% in the EU | Apple Developer |
| Uber Mobility take rate | 29.9% (Q4 2025) | Uber Q4/FY2025 results |
| Airbnb host service fee | 15.5% host-only | Airbnb Help Center |
| Fiverr / Upwork | 20% flat / 0-15%, ~10% typical | Published fee schedules |
| Etsy | ~9.5% mandatory, 21.4% reported take rate | Etsy fee schedule |
| DoorDash / Deliveroo | 15/25/30% tiers; 25-35% | DoorDash merchant pricing |
| Spotify | ~30% retained; $11B paid out in 2025 | Spotify Newsroom |

Amounts are US dollars because every source reports in US dollars. Converting
would have introduced an exchange rate — the only unsourced number on the page.

### The rights ledger is deliberately conservative

The easiest way to lose this argument is to overclaim. One link to the Digital
Services Act and the rhetoric takes the numbers down with it. So:

- *see the rules that rank you* — **BARELY**, not NO. The DSA requires the main
  parameters of recommender systems to be described. A description is not the
  system.
- *appeal to someone who is not them* — **BARELY**. The DSA created out-of-court
  dispute settlement for content decisions. It does not cover being deranked or
  demonetised, which are the decisions that change what you earn.
- *take your audience with you* — **NO**. GDPR portability gives you your data,
  not the people.
- *vote on a fee or a rule change* — **NO**. On no platform, in no country,
  ever. This one is absolute, and it is the entire difference OURS proposes.
- *share in the value you create* — **NO**, and OURS answers "undecided, the
  first 100,000 members decide it, and may decide there is no share at all."

A unit test pins the two PARTIAL statuses, because a later edit that flattened
them to NO would be the cheapest possible way to become disprovable.

### The share loop

The result lives in `?you=`, so a link reproduces the sender's numbers rather
than the defaults. Unknown slugs, negative amounts and absurd values are
dropped at the parse boundary — this string arrives from whatever someone
pasted, and nobody's nonsense gets rendered as a headline.

## The bug that would have shipped silently

The page was first written `export const dynamic = "force-static"`, on the
reasonable grounds that it touches no database and should cost nothing to
serve.

**A statically generated page does not vary by query string.** In development
it worked perfectly. In a production build every shared link would have served
the defaults, and the one feature the page exists for would have been dead on
arrival — with no error, no failing test, and nothing to see locally.

Caught by building for production and serving it. Now `force-dynamic`, with the
reasoning written above the line so it is not "optimised" back. The e2e suite
asserts a shared link renders `$84K` rather than the default `$8.1K`, so this
cannot regress quietly.

Cost is unaffected: the page reads no database and never wakes the compute.

## The second thing that would have shipped

The total panel originally showed **"days a year you work for them"**, dividing
fees by an assumed $45,000 salary. For anyone whose fees exceeded that salary
it rendered **485 working days in a year.**

There are 260. A visibly impossible number sitting beside carefully sourced
ones does not merely fail on its own — it discredits every sourced figure
next to it, which is the entire asset of the page. The metric was also
conceptually wrong: these fees are charged *on* the income, not paid out of a
separate wage, so the comparison never made sense at any size.

Replaced with a blended take rate: **what they kept of every $100 that passed
through them.** It needs no assumed wage, cannot exceed 100 by construction,
and is unit-tested for both properties. On the example above: $29.99 of every
$100.

## Changes

- `src/simulation/data.ts` (new) — sourced figures and the rights ledger.
- `src/simulation/model.ts` (new) — pure arithmetic, URL state, formatting.
- `tests/unit/simulation.test.ts` (new) — 18 tests.
- `app/worth/page.tsx`, `app/worth/WorthSimulator.tsx` (new).
- `app/globals.css` — the `.worth-*` block.
- `app/page.tsx` — the named target now links to the evidence.
- `src/components/FoundingChrome.tsx` — THE SIMULATOR in the topline, WHAT THEY
  TAKE in the footer.
- `tests/e2e/home.spec.ts` — share-link, source-URL and axe coverage.

## Tests

| Gate | Result | Evidence |
|---|---|---|
| format:check | PASS | run 2026-08-29 |
| lint | PASS | run 2026-08-29 |
| typecheck | PASS | run 2026-08-29 |
| test:unit | PASS | 74/74 (56 + 18 new) |
| test:integration | PASS | 36/36 |
| test:e2e | PASS | 24/24, including axe on /worth |
| build | PASS | compiled clean |
| conformance | PASS | 10/10 |
| production-build share link | PASS | `?you=` honoured; $84K vs default $8.1K |
| hostile input | PASS | absurd amounts and markup fall back to defaults |

## Truth

- deployed: NO at time of writing.
- real_users_observed: NO.
- concept_data_present: NO. Every rate is published by the company charging it
  and linked. Nothing is modelled, estimated or extrapolated.
- legal_membership_changed: NO. The page states that what a member-owned
  version would charge is undecided, that the first 100,000 members decide it,
  and that nothing on it promises anyone a payment.
- personal_data_collected: NONE. Everything a person types stays in their
  browser and is never transmitted.

## What this is not yet

- **The share card does not carry the result.** A shared link reproduces the
  numbers on open, but the social preview is the same for everyone. A per-result
  card needs a dynamic route segment; it is the highest-value next increment.
- **Eight products, not twelve.** Four targets in the registry had no figure
  sourced well enough to publish. Better six real numbers than twelve
  half-invented ones.
- **Figures go stale.** Every rate carries an `asOf`. When a source moves, the
  figure is replaced or the product is removed. A number nobody can check is
  worth less than no number at all.
- **This is not the economic simulation P-0002 requires.** That one models what
  a member-owned alternative would distribute, and it is one of the three things
  OURS must publish before the 100,000 ratification vote can open. This page
  models what the incumbents take today. Different question, different gate.

## Reversal

Additive. Removing the route directory, the `src/simulation` module, the
`.worth-*` CSS block and the three link edits restores the previous state.
