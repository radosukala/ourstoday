# Archived — the demand-value slider, 28 August 2026

Three files, removed from the build when the homepage became the Founding
Million. Nothing imported `Terminal.tsx` after that rebuild, and `value.ts`
was imported only by `Terminal.tsx` and its own test — so six green unit
tests were covering a module the product no longer used.

They are kept here rather than deleted because the question they answer is
still open.

## What this was

A slider over cohort sizes (100 → 100,000,000) showing what that many people
cost to acquire on the open market at ordinary rates, plus what each scale
unlocks. It existed to answer a first-visitor objection: *the page never says
what aggregated demand is actually worth.*

## Why it is not in the product

Founding Right 0.1 states plainly that a place carries no claim on revenue,
surplus, treasury or assets. A money readout on the same page as that
sentence invites exactly one reading, and it is the wrong one.

The slider itself never promised a member a cent — it priced the cohort as
the incumbents price it — but that distinction is too fine to survive a
stranger's first ten seconds.

## What would have to be true to bring it back

Either the economics in [P-0002](../../docs/P-0002-FOUNDING-COHORT-ECONOMICS.md)
are adopted and legally reviewed, or the slider returns framed strictly as
leverage against the incumbents rather than value to a member — and even then
it competes for the attention the entry form needs.

Restoring it means moving the three files back and re-adding the test to the
unit suite. Nothing else references them.
