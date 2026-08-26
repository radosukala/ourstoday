# Runbook · Backup and restore

> **The rule.** No canonical launch on a database tier without automated
> encrypted backups outside the live database's failure boundary, a named
> retention period, a named owner, and a **successful restoration into a clean
> environment**. A provider dashboard saying "backup enabled" is not a restore
> rehearsal.

## Status

| Requirement | State |
|---|---|
| Automated encrypted off-site backups | **NOT PROVISIONED** — no external database exists yet |
| Named retention period | **UNDECIDED** (handoff 16.8) |
| Named owner | **UNDECIDED** (handoff 16.7) |
| Clean restore rehearsal | **PASSING** locally — `pnpm db:restore:verify` |
| Post-restore integrity verification | **PASSING** — see below |

## The rehearsal

```bash
pnpm db:restore:verify
```

It:

1. `pg_dump`s the configured database in custom format;
2. `pg_restore`s into a brand-new empty database;
3. verifies, **in the restored copy**:
   - entry count equals distinct ordinal count (no duplicate or lost ordinals),
   - the event digest chain recomputes end to end using the same `digestEvent`
     the writer uses,
   - no predecessor holds more than one First Continuation,
   - `UPDATE` on `ledger.event` is still rejected — the append-only guarantee
     survived restoration rather than merely existing in the source DDL;
4. drops the scratch database and removes the dump.

Reports `NOT RUN` with a reason when `pg_dump`/`pg_restore` are absent or
PostgreSQL is unreachable.

### Reading the result

```json
{"events":1,"entries":1,"distinctOrdinals":1,"chainOk":true,"chainBrokeAtSeq":null,
 "idempotency":0,"firstContinuations":0,"firstContinuationExclusive":true,
 "appendOnlyEnforced":true}
```

`chainOk: false` with a `chainBrokeAtSeq` means the record at that sequence
number cannot be reproduced from what is stored. Treat it as an integrity
incident: pause the ledger before investigating.

## Taking a dump by hand

```bash
pg_dump -Fc -d "$DIRECT_DATABASE_URL" -f ours-$(date +%Y%m%dT%H%M%SZ).custom
```

Dumps contain **every** private field in [DATA-MAP.md](./DATA-MAP.md): email
addresses, session tokens, email digests. Encrypt at rest, restrict who can
read them, and never put one in the repository, an issue, or a chat message.

## Before canonical launch

- [ ] choose a provider tier with automated backups (handoff 16.1);
- [ ] configure an off-site encrypted copy outside that provider's failure
      boundary — Neon's six-hour restore window is not sufficient recovery for a
      canonical ledger, and Supabase Free has no automatic backups at all;
- [ ] name the retention period and the owner;
- [ ] rehearse a restore **from the real backup**, not from a local dump, and
      publish the receipt;
- [ ] repeat the rehearsal on a schedule and publish each result.
