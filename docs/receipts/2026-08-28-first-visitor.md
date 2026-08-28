# OURS TODAY · Build Receipt — Reading the page as a stranger

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260828-003
title: Fix what a first-time visitor actually sees - status framing, the
  believability of the claim, earliness, and the value of aggregated demand
date: 2026-08-28
authority: founder-steward review of the live page, 28 August 2026, five
  numbered objections
agent: Claude (Fable 5), Claude Code
truthful_status: LOCAL
deployed: false
canonical_writes_open: unchanged
```

## The five objections, and what was done

### 1. "NOT YET ISSUED / REGISTRY CLOSED shouts work-in-progress, not opportunity"

Correct, and it was a framing error rather than a legal one. The same fact
stated as a disclaimer reads as broken; stated as a fact about timing it reads
as the reason to be here. The left panel now closes with:

> **Nothing has been issued yet.** No membership, no shares, no tokens, nothing
> to buy — and that is exactly why the numbers are still this low. Entry is
> free and always will be.

The formal `STATUS_LINE` is unchanged and still carried verbatim in the footer,
so the legal truth is intact and the tests that pin it still pass. The terminal
bar now reads `DAY N · NOTHING ISSUED YET`, computed from the calendar.

`REGISTRY CLOSED` was a **local-environment artifact**: `ALLOW_CANONICAL_WRITES`
is unset locally, so `canAcceptEntries` is false. Production answers
`canAcceptEntries: true` and shows `GIVE NOTICE — FREE`. The disabled label is
now `REGISTRY PAUSED`, which is what a temporary state should sound like.

### 2. "Rebuilt this year is not believable"

Correct, and it was the most damaging sentence on the page — an unbelievable
claim on a site whose only asset is being believed. Removed everywhere.

The claim is now the narrower true one: *any one of them* is a tractable
build — "not a weekend, but a project a serious team can finish. That was not
true five years ago, and it is the whole opportunity." The boot line changed
from `TRIVIAL NOW` to `TRACTABLE`, for the same reason.

### 3. "0 / 1000 doesn't make me want to connect. Am I really first?"

Two changes. A target nobody has claimed no longer shows `0/1,000` — it shows
**NOBODY YET** in signal, which is a distinction rather than an absence. And
the prompt now states the thing the visitor is actually asking:

> `> your place would be #000006 — 5 people are in the record.`

Computed from the live allocator, so it is exactly the number they would
receive.

### 4. "Missing: what aggregated demand is worth"

Added `src/edition/value.ts` and a terminal readout: a slider over clean
cohort sizes, showing what that cohort costs to acquire on the open market at
ordinary rates (€50–€200 per customer), plus what each scale unlocks.

**Amended the same day, on founder-steward review:** the slider originally
stopped at 250,000, which quietly conceded that this is a niche project when
the registry names companies operating at hundreds of millions of users. It now
runs to **100 million** (€5B–€20B), with unlock bands through contestable
category (1M), inverted growth model (10M) and — at the top — "the scale the
incumbents themselves operate at. The figure above is not a fantasy; it is
roughly the arithmetic their valuations are built on." Default opens at
100,000.

The honesty constraints are load-bearing: it is a **band**, not a figure, and
the note states plainly that it is the price the cohort is worth to the
companies that currently pay for it — an illustration of leverage, not a
valuation of OURS and **not a payment to anyone**. Nothing here promises a
member a cent.

### 5. "Early joiners should have a financial reason. Revenue share is legal."

Agreed in substance, and drafted — **not shipped**. See
[P-0002](../P-0002-FOUNDING-COHORT-ECONOMICS.md).

The proposal keeps entry free forever, pays for participation rather than for
holding, and forbids resale. That combination is what separates YouTube
revenue share and cooperative patronage dividends from an offering: the
classic test starts with an *investment of money*, and there isn't one.

**Version 0.1 of that document was wrong and was rejected by the
founder-steward the same day.** It proposed a fixed 10,000-place cohort taking
35% of surplus forever. Modelled at the scale actually being aimed for — 100M
members, €8B surplus — that pays each of the first 10,000 **€280,000 per
year, 3,500× an ordinary member**. That is a landlord class of 10,000
collecting rent from 100 million, which is the thing OURS exists to replace.

Version 0.2 replaces it with **declining multiplier bands** (8× for the first
100,000 places, 4× to 1M, 2× to 10M, 1× after) against a fixed 40% pool. The
early premium then caps at 8× and the first 100,000 hold **0.7%** of the pool
at 100M members, instead of 35%. Modelled numbers are tabulated in the
document.

It also states the thing that has no clever solution: **a cooperative dividend
will never be a golden ticket** — €228/yr at full scale — and that the large
number for members is what *stops being taken* (€12k–€51k/yr in avoided
platform fees on ordinary activity), which is available to every member and is
a discount rather than a return, so it is not a security anywhere.

An agent may draft economics and may not issue them. The document is not
linked from any public surface and must not be until launch gate 1 (licensed
legal review) is met.

## Changes

- `src/edition/value.ts` (new) + `tests/unit/value.test.ts` (5 tests).
- `app/Terminal.tsx` — verdict copy, `NOBODY YET`, the value readout, the
  `your place would be` line, `day` prop replacing a hardcoded "DAY 3".
- `app/page.tsx` — argument copy, reframed status block, new props.
- `app/globals.css` — `.term-value`, `.value-*`, `.term-place`, `.t-first`,
  restyled `.split-status`.
- `docs/P-0002-FOUNDING-COHORT-ECONOMICS.md` (new, unpublished).

## Tests

| Gate | Result | Evidence |
|---|---|---|
| format:check | PASS | run 2026-08-28 |
| lint | PASS | run 2026-08-28 |
| typecheck | PASS | run 2026-08-28 |
| test:unit | PASS | 58/58 |
| test:integration | PASS | 34/34 |
| build | PASS | compiled clean |
| conformance check | PASS | 10/10 |
| visual | PASS | full page at 1400x2500; slider driven to 100,000 → €5M–€20M and the correct unlock line |
| test:e2e | NOT RUN | home spec still asserts the Day 1 page |

## Truth

- deployed: NO.
- real_users_observed: NO.
- concept_data_present: NO. Every notice count is 0 and is shown as
  `NOBODY YET`; the slider is an explicit illustration and is labelled as one.
- legal_membership_changed: NO. No economic entitlement was created,
  published or implied on any public surface.

## Decisions needed (human)

1. **P-0002**: adopt as direction for legal review, amend, or reject. Adopting
   the direction is not authorization to publish the numbers.
2. The acquisition-cost band (€50–€200) is a judgement call and should be
   sourced or replaced before it is quoted publicly at scale.
3. The governing documents still present the ledger as the product.
4. `tests/e2e/home.spec.ts` must be rewritten.

## Reversal

Each change is additive and isolated to the two page files, the CSS block and
the new value module. `archive/day1-homepage/page.tsx` still restores the
original homepage.
