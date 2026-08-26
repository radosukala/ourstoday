# Runbook · The Fork Drill

**Cadence:** quarterly
**Operator:** a named person who is **not** the founder-steward
**Standing:** the same as the restore rehearsal. **If the drill fails, the
ledger does not open.**

> Member-owned is otherwise a promise about intent, and promises about intent
> are what every platform made before it enclosed its users. The right to leave
> with everything is Article Zero: a shipped, tested, rehearsed capability, not
> a clause.

## Status

| Requirement | State |
|---|---|
| `ours-fork` implemented | **YES** — `pnpm fork export` / `pnpm fork verify` |
| Offline verification | **YES** — no database, no network, no permission |
| Tamper detection proven | **YES** — an altered payload and a dropped event both caught |
| Named non-founder operator | **NOT NAMED** — blocks the drill |
| Quarterly drill performed | **NEVER** — no drill has been run by anyone but the build |
| Published drill receipt | **NONE** |

Three of those are blank. They are why this is a runbook and not a claim.

## What the drill proves

Not that the export runs. That the export is **enough**: that a person who
does not trust OURS, on a machine OURS does not control, can take the public
state and check it themselves.

## Procedure

Perform every step on a **clean machine**, from a **fresh checkout**, as a
person who is not the founder-steward. Time each step; the receipt records
durations because "it works" and "it works in twenty minutes" are different
claims.

### 1. Export

```bash
pnpm fork export --out ./drill-$(date +%Y%m%d)
```

Records:

- `chain.json` — every event's position, privacy class and both digests
- `events.json` — the full body of every PUBLIC event
- `ledger.json`, `anchors.json`, `gates.json`, `conformance.json`,
  `witness-shape.json`, `system-status.json`
- `schema/` — the SQL that builds the tables and the public views
- `docs/` — the event schema standard and the governing documents
- `manifest.json` — counts and the head digest

### 2. Verify offline

**Disconnect from the network.** Then:

```bash
pnpm fork verify ./drill-YYYYMMDD
```

It must report `FORK VERIFIED` and reproduce:

- the digest chain, end to end, across public and non-public events alike;
- every public event body against the digest the chain claims for it;
- every published Merkle root over the sequence range it committed to.

If it needs the network or the database to do that, the export has failed its
purpose and the drill fails.

### 3. Prove the verifier is not decorative

A verifier that never fails is not a verifier. Corrupt a copy and confirm each
tamper is caught:

```bash
cp -r ./drill-YYYYMMDD ./drill-tamper
# 1. change a value inside any payload in events.json
# 2. delete any single entry from chain.json
pnpm fork verify ./drill-tamper
```

Expect `FORK VERIFICATION FAILED` naming the sequence number. Both cases are
covered by the test suite; the drill confirms it on the operator's own machine
with the operator's own hands.

### 4. Stand it up

```bash
createdb ours_fork_drill
psql -d ours_fork_drill -f ./drill-YYYYMMDD/schema/0001_schemas.sql
# ...through the highest-numbered migration
```

Load `events.json` and the projections and confirm the ledger reads back:
ordinals in order, the declared origin present, relay and continuation state
intact, the witness edges where they belong.

### 5. Read the rules

Open `docs/EVENT-SCHEMA-1.0.md` from **inside the export**. The operator must
be able to answer, from the export alone and without asking anyone: what is an
event, how is a digest computed, and how do I check a root?

### 6. Publish the receipt

Write to `docs/receipts/YYYY-MM-DD-fork-drill.md`:

- date, operator name, machine and network conditions;
- duration of each step;
- export size, event count, head digest;
- **what broke** — including anything ambiguous, missing from the docs, or
  requiring a question to someone at OURS;
- pass or fail.

Publish it either way. A drill whose failures are not published is theatre.

## Failure means the ledger does not open

If the drill fails, gate 7 (`backup-restore`) and gate 15
(`readiness-receipt`) do not proceed, and any already-open write gate is
paused. That is the whole point of giving this the same standing as the
restore rehearsal.

## What the drill does NOT export

Private data. No email address, no account, no session, no token, no draft, no
review case. A fork inherits the public record — not other people's identities.
Non-public events appear as a position and a digest, which is what lets the
chain verify without disclosing what they contain.

## Why this matters even if nobody forks

The strategic point is not that anyone forks. It is that they **always could**,
which disciplines every future decision by people who are not yet in the room.
Most networks defend against exit. This one maintains the exit as
infrastructure and dares itself to stay worth staying in — which is the only
version of anti-feudalism that is falsifiable.
