
/**
 * Applies committed SQL migrations in filename order. Never runs from a
 * production request or app startup - only a human/script invokes this.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "db", "migrations");

export async function migrate(sql: postgres.Sql): Promise<string[]> {
  await sql`CREATE SCHEMA IF NOT EXISTS _meta`;
  await sql`CREATE TABLE IF NOT EXISTS _meta.schema_migrations (
    filename text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`;
  const appliedRows = await sql.unsafe<{ filename: string }[]>("SELECT filename FROM _meta.schema_migrations");
  const applied = new Set(appliedRows.map((r) => r.filename));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const body = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    // crypto checksum for drift detection
    const { createHash } = await import("node:crypto");
    const checksum = createHash("sha256").update(body).digest("hex");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO _meta.schema_migrations (filename, checksum) VALUES (${file}, ${checksum})`;
    });
    ran.push(file);
  }
  return ran;
}

async function main() {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required");
  const sql = postgres(url, { max: 1 });
  try {
    const ran = await migrate(sql);
    console.log(`migrate: applied ${ran.length} migration(s)`);
    for (const f of ran) console.log(`  - ${f}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// CLI entry
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  void main();
}

