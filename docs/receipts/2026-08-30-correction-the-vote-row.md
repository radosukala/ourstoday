# Correction receipt · the vote row was false

**Date:** 30 August 2026
**Authority:** founder-steward
**Class:** CORRECTION — a false claim was published and is now withdrawn
**Surface:** `/worth`, "The part with no invoice", row `vote`

## What was published

From 29 August 2026, the simulator answered the question *"Can you vote on a
fee or a rule change?"* with:

> "Not on any platform in this list, in any country, ever."

## Why it was false

Facebook is on that list. From 2009 Facebook operated a binding Site
Governance vote: if 30% of users took part, the result bound the company.

In the final vote, in December 2012, 588,803 of 668,500 votes — 88% — opposed
the proposed changes. That turnout was roughly 0.07% of users, far below the
30% threshold, so the changes passed. One of them abolished the vote.

Source: [TechCrunch, 10 December 2012](https://techcrunch.com/2012/12/10/facebook-vote-ends/)

The word "ever" made a blanket historical claim that one afternoon of
research disproves. The file's own doc comment warned against exactly this:
*"a false blanket claim would be the easiest thing in the world to disprove
and would take the numbers down with it."* The claim was written anyway.

## What it now says

The row still answers NO, because no platform on the list offers such a vote
today. The detail now tells the Facebook history with its figures and links
the source. The OURS commitment gained the part the history actually teaches:

> One member, one vote, on the fee and on the rule — with a quorum that can
> actually be met, because a threshold nobody can reach is a polite way of
> saying no.

## What changed in the code

- `src/simulation/data.ts` — the `vote` row rewritten; `Right` gained an
  optional `source` so a row making a numeric claim carries a link.
- `app/worth/WorthSimulator.tsx` — renders that source when present.

## What this cost

The correction is an improvement. The true history is more damning than the
false claim, and it names a design obligation OURS now has to meet.

## The standing lesson

Every figure on `/worth` was checked against its source before publication.
The rights rows were not, because they read as description rather than data.
A sentence containing "ever", "never", "any", or a date is a factual claim and
must be sourced like a number. This applies to any successor repository.

**Status:** CORRECTED · DEPLOYED
