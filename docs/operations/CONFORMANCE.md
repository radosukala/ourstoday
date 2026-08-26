# Runbook · Conformance

> **Pass or fail, published either way, automatically, before anyone asks.**

An institution that publishes its own failures on a schedule is making a claim
no marketing department would approve, and it is the cheapest permanent
credibility available. This runbook is how that happens.

## The decision that must not be quietly reversed

The [Vision Escalation adoption receipt](../receipts/2026-08-26-vision-escalation-adoption.md)
records it: **a failing conformance receipt publishes anyway.**

There is deliberately no flag, environment variable or argument that suppresses
a failing run. `runAndRecordConformance` appends `conformance.failed` in the
same call that discovers the failure, and an integration test asserts that a
broken invariant is *recorded* rather than swallowed.

Adding a suppression later would be a visible, reviewable act against a
published receipt. That is the entire mechanism, and it only stayed cheap
because it was decided before the first red day.

## What it checks

| Check | Claim |
|---|---|
| `ordinal-uniqueness` | No two entries share an ordinal. |
| `ordinal-never-reused` | The allocator cannot hand out a number that already exists. |
| `first-continuation-exclusive` | One place vests at most one First Continuation, forever. |
| `continuation-has-arrival` | No continuation exists without the arrival that produced it. |
| `witness-not-self` | No entry attests its own personhood. |
| `no-private-columns-public` | No public projection exposes an email, account id, token, session, address or risk field. |
| `append-only-enforced` | The database itself refuses to update or delete a canonical event. |
| `digest-chain-intact` | Every event recomputes to its stored digest, in order. |
| `anchors-still-valid` | Every published Merkle root still recomputes from the events it covered. |
| `reserved-types-unused` | No reserved event type has been written to the canonical log. |

Each check states its claim in one sentence a non-engineer can check, and a
failure names what broke rather than reporting "the chain is broken".

## Commands

```bash
pnpm conformance check     # run and print; appends nothing
pnpm conformance run       # run, APPEND the result, exit non-zero on failure
pnpm conformance history   # recent runs
```

`check` is for a human looking into something. `run` is what a schedule calls.

It reports `NOT RUN` with a reason when PostgreSQL is unreachable, because a
missing database is missing infrastructure, not a failing invariant.

## The nightly schedule

**Status: NOT SCHEDULED.** There is no repository, no CI and no deployment, so
nothing runs on a timer yet. When the repository is published (Milestone G),
add a scheduled workflow that:

1. checks out the commit currently deployed;
2. connects to the **production** database with a read-mostly role that may
   also insert into `ledger.conformance_run` and `ledger.event`;
3. runs `pnpm conformance run`;
4. lets a non-zero exit fail the job loudly — while the record is already
   written either way.

The run must happen against production. A conformance receipt from a staging
database attests to nothing anybody cares about.

## When a run fails

1. **Do not delete the run.** It is already in an append-only table and in the
   canonical log, and removing it is not possible without a schema change that
   would itself be visible.
2. Decide whether the failure is an integrity problem or a checker problem.
   `digest-chain-intact`, `ordinal-uniqueness` and `anchors-still-valid` mean
   the record is wrong: pause the ledger before investigating
   ([PAUSE-LEDGER.md](./PAUSE-LEDGER.md)).
3. Fix forward. A correction appends.
4. Say what happened on `/status` and in a receipt. The page already shows the
   failing run; the explanation is what the failing run cannot supply.

## Anchors

`pnpm anchor publish DAILY|MONTHLY|ANNUAL --actor "..."` computes a Merkle root
over the canonical log and appends `anchor.published`. It refuses to publish
over a chain that does not verify.

Cadence, per the escalation: a daily digest, a monthly root, an annual root.
The **annual** root is the one that leaves the building — a printed notice,
legal deposit with national libraries in several jurisdictions, a physical
volume. Record each deposit with `--location`; the command warns when an annual
root is published without one, because a root that exists only in this database
anchors nothing.

## Deployment as a constitutional act

```bash
pnpm steward deployed <commitRef> --actor "..." --reason "..."
```

Appends `build.deployed` with the commit and the applied migration set. The gap
between "our repository is public" and "the artifact serving you is provably
that code" is the whole trust gap of the modern internet; this closes the first
half of it. The second half — a reproducible build whose hash anyone can
confirm — is not built and is not claimed.
