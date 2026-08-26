import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "@/config";
import * as authSchema from "@/db/schema/auth";
import * as ledgerSchema from "@/db/schema/ledger";
import * as privateSchema from "@/db/schema/private";

/**
 * Provider-neutral PostgreSQL access.
 * - pooled runtime connection (DATABASE_URL)
 * - direct owner connection for migrations/dumps (DIRECT_DATABASE_URL)
 *
 * DB_DISABLE_PREPARED_STATEMENTS=true must be set when the runtime URL points
 * at a transaction-pooled endpoint (for example Supabase Supavisor), because
 * prepared statements are incompatible with transaction-mode pooling.
 */
function makeSql(url: string) {
  const cfg = config();
  return postgres(url, {
    prepare: !cfg.disablePreparedStatements,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Local development talks to Postgres over unix sockets / http; never
    // fail on missing TLS locally, providers supply sslmode in the URL.
    ssl: url.includes("sslmode=disable") ? false : "prefer",
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
