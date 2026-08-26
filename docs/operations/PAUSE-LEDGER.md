# Runbook · Pause the ledger

**When:** suspected abuse, a data-integrity doubt, a provider incident, or any
moment where continuing to write canonical entries would be worse than stopping.

**Authority:** a steward. Not a deployment. Not an automated rule.

## What pausing does and does not do

`ledger.system_state.mode = 'PAUSED'`:

- **stops** canonical entry seals — an attempt returns `LEDGER_PAUSED` with a
  plain-language explanation and the entrant's draft is preserved;
- **keeps** public reading working — `/`, `/status`, `/e/[ordinal]`, `/r/[token]`;
- **keeps** data-rights requests working — `/me`, export, correction, withdrawal;
- **appends** a `ledger.system_state.changed` event carrying the actor and the
  reason, in the same transaction as the state change.

Pausing never deletes anything and never renumbers anything.

## Do it

```bash
pnpm steward mode PAUSED --actor "your-steward-label" --reason "what happened, in one sentence"
```

The command refuses without both `--actor` and `--reason`. It writes a receipt
to `docs/receipts/` and prints its path. Confirm:

```bash
pnpm steward status
```

## The other gate

There are two independent gates and **both** must allow a write:

1. `ALLOW_CANONICAL_WRITES=true` in the server environment;
2. `ledger.system_state.mode = 'OPEN'`.

Pausing changes gate 2. If you need to stop writes faster than a database
round-trip, set `ALLOW_CANONICAL_WRITES=false` in the platform environment and
redeploy — but still record the pause in the ledger afterwards, or the event log
will not explain a gap that people can see.

## Resuming

```bash
pnpm steward mode OPEN --actor "your-steward-label" --reason "what was resolved" --yes
```

`--yes` is required and deliberate. Reopening canonical writes is a
founder-steward decision with a published receipt, not a step in a deploy
script. Before resuming, satisfy yourself that:

- the cause is understood and recorded, not merely absent;
- `pnpm db:restore:verify` passes;
- any entries affected during the incident have an open `review_case`.

## Afterwards

Write the incident up in `docs/receipts/` and say what happened on `/status`.
The point of a public gate state is that people do not have to ask.
