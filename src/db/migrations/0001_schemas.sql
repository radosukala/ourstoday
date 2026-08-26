
-- Isolated PostgreSQL namespaces. The runtime application role receives only
-- the grants documented in docs/operations/MIGRATIONS.md; browser code never
-- receives a database credential.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE SCHEMA IF NOT EXISTS _meta;

