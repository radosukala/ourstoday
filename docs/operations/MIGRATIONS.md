# Runbook · Migrations

Migrations are plain, reviewable SQL in `src/db/migrations/`, applied in
filename order and recorded in `_meta.schema_migrations` with a checksum.
Drizzle is used for typed application queries; it does not own the schema.

## Rules

1. **Forward only.** There is no down-migration. To undo, write the next
   migration.
2. **Never edit an applied file.** The checksum is recorded; changing a file
   after it has run makes two databases silently disagree. Add a new file.
3. **Never rewrite canonical history.** `ledger.event` rejects UPDATE and
   DELETE by trigger. A migration that needs to change the meaning of past
   events is a constitutional change, not a refactor.
4. **The runtime role is not the migration role.** Migrations use
   `DIRECT_DATABASE_URL` (owner). The application uses `DATABASE_URL` and, on
   providers that support roles, connects as `ours_app_runtime` with only the
   grants it needs.

## Apply

```bash
pnpm db:migrate
```

Reads `.env.local` automatically. Prints each file applied, after naming the
host it is about to write to.

Against production, the target must be named in the command:

```bash
pnpm db:migrate --production
```

That loads `.env.production.local` and lets it win over anything exported in
the shell. `db:doctor --production` and `db:restore:verify --production` take
the same flag. Never migrate production by exporting a connection string — the
whole point of the flag is that the target is visible in the scrollback next
to the result.

## Rehearse against real data, not an empty database

`db:migrate:check` proves migrations apply to an *empty* database. That does
not prove they apply to a database that already holds entries — the case that
actually matters. Before migrating production:

```bash
pg_dump -Fc -f prod.dump "$PROD_DIRECT_URL"          # a restore point first
psql "$PROD_ADMIN_URL" -c "CREATE DATABASE ours_rehearsal"
pg_restore -d "$SCRATCH_URL" --no-owner --no-acl prod.dump
DIRECT_DATABASE_URL=$SCRATCH_URL DATABASE_URL=$SCRATCH_URL pnpm db:migrate
DIRECT_DATABASE_URL=$SCRATCH_URL DATABASE_URL=$SCRATCH_URL pnpm conformance
psql "$PROD_ADMIN_URL" -c "DROP DATABASE ours_rehearsal WITH (FORCE)"
```

Conformance on the rehearsal copy is the check that counts: it recomputes the
digest chain over the migrated data. Keep the dump until production is verified.
It contains real people's data — never put it in the repository, which is
public.

## Prove they apply to an empty database

```bash
pnpm db:migrate:check
```

Creates a scratch database, applies everything, counts the tables, drops it.
This is what CI runs. If PostgreSQL is unreachable it reports `NOT RUN` with a
reason rather than failing — a missing database is not a broken migration.

## Writing one

- name it `NNNN_subject.sql`, continuing the sequence;
- make it idempotent where cheap (`IF NOT EXISTS`) so a partial failure can be
  retried;
- if it adds a public-facing column, extend `public.founding_ledger` **and** the
  projection test in `tests/integration/immutability-and-projections.test.ts`,
  which fails when a public view exposes a private column;
- if it changes an event's shape, bump the event schema version rather than
  reinterpreting stored payloads.

## After a migration touching `ledger`

```bash
pnpm test:integration
pnpm db:restore:verify
```

The second one matters: it dumps, restores into a clean database and recomputes
the whole event digest chain. A migration that breaks the chain has broken the
record, and you want to find that out here.
