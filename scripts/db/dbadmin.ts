import postgres from "postgres";
import { loadEnv } from "../env";
import { normalizeConnectionUrl } from "../../src/db/connection-url";

/** Administrative helpers against the direct (owner) connection. */

export function directUrl(): string {
  loadEnv();
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required");
  return url;
}

/**
 * Open a connection, honouring the URL's own sslmode and stripping libpq
 * client-side parameters that postgres.js would otherwise forward to the
 * server as startup parameters. A provider URL pasted verbatim (Neon ships
 * `channel_binding=require`) fails without this.
 */
export function connect(
  rawUrl: string,
  options: Partial<Parameters<typeof postgres>[1]> = {},
): postgres.Sql {
  const conn = normalizeConnectionUrl(rawUrl);
  return postgres(conn.connectionString, {
    max: 2,
    prepare: false,
    connect_timeout: 15,
    ...options,
    ssl: conn.ssl,
  });
}

/** Connect to an arbitrary database on the same server as the direct URL. */
export function adminSql(database?: string): postgres.Sql {
  const url = new URL(directUrl());
  if (database) url.pathname = `/${database}`;
  return connect(url.toString());
}

/**
 * Refuse to create or drop a database on a remote server.
 *
 * Scratch databases are disposable things belonging to a developer machine.
 * The integration suite relies on tests/integration/helpers.ts defaulting the
 * target to localhost BEFORE .env.local is read - a correct but fragile
 * invariant, since it depends on module import order. If it ever breaks
 * silently, the suite would CREATE and DROP ... WITH (FORCE) against whatever
 * .env.local points at, which today is production.
 *
 * A guard that does not depend on import order is worth more than a comment.
 * The restore rehearsal legitimately needs a scratch database beside a remote
 * source, so it opts in explicitly.
 */
function assertScratchTargetAllowed(operation: string): void {
  const { isLocal, hostname } = normalizeConnectionUrl(directUrl());
  if (isLocal) return;
  if ((process.env.OURS_ALLOW_REMOTE_SCRATCH ?? "").toLowerCase() === "true") return;
  throw new Error(
    operation +
      " refuses to run against the remote host '" +
      hostname +
      "'. Scratch databases are local and disposable. If you really mean to do " +
      "this beside a remote database (a restore rehearsal), set " +
      "OURS_ALLOW_REMOTE_SCRATCH=true for that command only.",
  );
}

export async function createScratchDatabase(prefix: string): Promise<string> {
  assertScratchTargetAllowed("createScratchDatabase");
  const name = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const sql = adminSql("postgres");
  try {
    await sql.unsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await sql.end({ timeout: 5 });
  }
  return name;
}

export async function dropDatabase(name: string): Promise<void> {
  assertScratchTargetAllowed("dropDatabase");
  const sql = adminSql("postgres");
  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
