import postgres from "postgres";
import { readFileSync } from "node:fs";

export default async function globalTeardown(): Promise<void> {
  try {
    const dbName = readFileSync("/tmp/ours_e2e_db_name", "utf8").trim();
    if (!dbName.startsWith("ours_e2e_")) return;
    const sql = postgres("postgresql://127.0.0.1:5432/postgres", { max: 1 });
    try {
      await sql.unsafe('DROP DATABASE IF EXISTS "' + dbName + '" WITH (FORCE)');
      console.info("e2e teardown: dropped", dbName);
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch {
    // No e2e database marker; nothing to clean.
  }
}
