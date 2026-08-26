import postgres from "postgres";

/** Administrative helpers against the direct (owner) connection. */

export function directUrl(): string {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required");
  return url;
}

/** Connect to an arbitrary database on the same server as the direct URL. */
export function adminSql(database?: string): postgres.Sql {
  const url = new URL(directUrl());
  if (database) url.pathname = `/${database}`;
  return postgres(url.toString(), { max: 2, prepare: false });
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
