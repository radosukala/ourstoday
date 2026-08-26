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

export async function createScratchDatabase(prefix: string): Promise<string> {
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
  const sql = adminSql("postgres");
  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
