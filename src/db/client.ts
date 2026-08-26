import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@/config";
import { normalizeConnectionUrl } from "@/db/connection-url";
import * as authSchema from "@/db/schema/auth";
import * as ledgerSchema from "@/db/schema/ledger";
import * as privateSchema from "@/db/schema/private";

/**
 * Provider-neutral PostgreSQL access.
 * - pooled runtime connection (DATABASE_URL)
 * - direct owner connection for migrations/dumps (DIRECT_DATABASE_URL)
 *
 * Prepared statements do not survive a transaction-mode pooler. The endpoint
 * is detected from the hostname (Neon `-pooler`, Supabase Supavisor,
 * pgbouncer), so the common case needs no configuration;
 * DB_DISABLE_PREPARED_STATEMENTS=true forces it off for anything unrecognized.
 */
function makeSql(url: string) {
  const cfg = config();
  const conn = normalizeConnectionUrl(url);

  // A canonical ledger must not be willing to talk to a remote database in
  // plaintext. Refuse at construction rather than discovering it in a capture.
  if (
    cfg.appEnv === "production" &&
    !conn.isLocal &&
    (conn.ssl === false || conn.ssl === "prefer")
  ) {
    throw new Error(
      "Refusing to connect to a remote database without TLS in production. " +
        "Set sslmode=require (or verify-full) on the connection URL.",
    );
  }

  return postgres(conn.connectionString, {
    prepare: !cfg.disablePreparedStatements && !conn.isTransactionPooler,
    // Each serverless instance opens its own pool, so a high per-instance max
    // multiplies connections across instances without serving more traffic.
    max: Number(process.env.DB_POOL_MAX ?? "3"),
    // Closing idle connections quickly is what lets a scale-to-zero compute
    // actually suspend, which is where the cost saving comes from.
    idle_timeout: Number(process.env.DB_IDLE_TIMEOUT_SECONDS ?? "10"),
    connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT_SECONDS ?? "15"),
    ssl: conn.ssl,
  });
}

let pooled: ReturnType<typeof makeSql> | undefined;
let direct: ReturnType<typeof makeSql> | undefined;

export function getSql() {
  if (!pooled) pooled = makeSql(config().databaseUrl);
  return pooled;
}

export function getDirectSql() {
  if (!direct) direct = makeSql(config().directDatabaseUrl);
  return direct;
}

export function getDb() {
  return drizzle(getSql(), {
    schema: { ...authSchema, ...privateSchema, ...ledgerSchema },
  });
}

export function getDirectDb() {
  return drizzle(getDirectSql(), {
    schema: { ...authSchema, ...privateSchema, ...ledgerSchema },
  });
}

export type Db = ReturnType<typeof getDb>;
