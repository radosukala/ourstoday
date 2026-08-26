# Runbook · Incident

**Named incident owner: NOT YET NAMED.** This is handoff decision 16.7 and it
blocks canonical launch. A runbook with no owner is a document, not a response.

## First move

If canonical integrity might be affected, **pause before investigating**:

```bash
pnpm steward mode PAUSED --actor "..." --reason "..."
```

Reading and data-rights requests keep working. See
[PAUSE-LEDGER.md](./PAUSE-LEDGER.md).

## Severity

| Level | Meaning | First action |
|---|---|---|
| S1 | Canonical record wrong: duplicate ordinal, broken digest chain, two First Continuations for one predecessor, an entry that should not exist | Pause. Do not repair by hand. |
| S2 | Private data exposed, or may have been | Pause writes if entry-related. Preserve evidence. Legal notification clock may have started. |
| S3 | Service down or entry broken, record intact | Restore service. No pause needed if writes are already failing closed. |
| S4 | Degraded: email delivery, latency, rate limiting | Fix forward. |

## Triage

```bash
pnpm steward status              # both write gates and current versions
pnpm steward queue               # open corrections, withdrawals, reviews
pnpm steward receipt <ordinal>   # redacted entry + its events
pnpm db:restore:verify           # dump, restore clean, recompute the chain
```

`db:restore:verify` is the fastest honest answer to "is the record intact?"
because it recomputes every digest from stored rows in a fresh database.

Logs will not tell you much on purpose: the redaction rules in
[DATA-MAP.md](./DATA-MAP.md) mean errors carry an event name and no personal
data. Reproduce locally rather than trying to read more out of production.

## Resetting to zero

`pnpm db:reset --confirm <host>` destroys every schema and rebuilds them
empty. It exists for exactly one situation: **a ledger that has not been
published to anyone yet.**

Once a single stranger holds an ordinal, this is the wrong tool and no flag
makes it right. The chronological record is the product; corrections append.
A ledger that can be reset once someone is relying on it was never a ledger.

It refuses while the ledger is OPEN, requires the target host typed out rather
than a `--yes` that can be pasted from a previous command, prints what it is
about to destroy, and writes a receipt to `docs/receipts/` **before** dropping
anything — because the canonical log cannot record its own deletion.

## What you must not do

- **Never edit a canonical event.** There is no command for it and the database
  rejects it. Corrections append.
- **Never reassign an ordinal.** A voided or withdrawn place stays consumed
  forever. Renumbering would make every earlier screenshot a lie.
- **Never publish an accusation.** Suspected abuse opens a private
  `review_case`. A person learns they are under review through the support
  path, not through the public ledger.
- **Never paste a dump, a token or an email address into an issue or a chat.**

## Repairing

The only legitimate repairs are appends:

| Situation | Action |
|---|---|
| Wrong public name | `pnpm steward correction <requestId> approve --actor ... --reason ...` |
| Person wants out | `pnpm steward withdrawal <requestId> approve ...` → permanent public tombstone, ordinal retired |
| Entry should never have existed | `pnpm steward void <ordinal> --actor ... --reason ...` after a review case |

Each appends a receipted event in the same transaction as the change.

## Closing

1. resume writes with a reason (`pnpm steward mode OPEN ... --yes`);
2. write the incident receipt into `docs/receipts/`: what happened, what was
   affected, what was appended, what changed so it does not recur;
3. publish it. An institution that publishes its own failures before anyone
   asks is making a claim no marketing department would approve, and it is the
   cheapest permanent credibility available.
