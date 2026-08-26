/**
 * Proves migrations apply cleanly to a fresh database, then removes it.
 */
import { migrate } from "./migrate";
import { adminSql, createScratchDatabase, dropDatabase } from "./dbadmin";

async function main() {
  const dbName = await createScratchDatabase("ours_migrate_check");
  const sql = adminSql(dbName);
  let failed = false;
  try {
    const ran = await migrate(sql);
    const tables = await sql<{ schemaname: string; tablename: string }[]>`
      SELECT schemaname, tablename FROM pg_tables
      WHERE schemaname IN ('auth', 'private', 'ledger') ORDER BY 1, 2`;
    console.log(`migrate-check: OK on ${dbName}; applied: ${ran.join(", ")}`);
    console.log(`tables created: ${(await tables).length}`);
  } catch (error) {
    failed = true;
    console.error("migrate-check FAILED:", error instanceof Error ? error.message : error);
  } finally {
    await sql.end({ timeout: 5 });
    await dropDatabase(dbName);
  }
  if (failed) process.exit(1);
}

void main();
