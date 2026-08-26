/**
 * Creates the disposable e2e database, applies migrations, seeds the declared
 * origin row and opens both write gates for the duration of the run.
 */
import postgres from "postgres";
import { migrate } from "./migrate";
import { seedLocal } from "./seed-local";

async function main() {
  const url = process.env.DATABASE_URL as string;
  const dbName = url.split("/").pop() as string;
  const admin = postgres(process.env.DIRECT_DATABASE_URL as string, { max: 1 });
  try {
    await admin.unsafe('DROP DATABASE IF EXISTS "' + dbName + '" WITH (FORCE)');
    await admin.unsafe('CREATE DATABASE "' + dbName + '"');
  } finally {
    await admin.end({ timeout: 5 });
  }

  const sql = postgres(url, { max: 1 });
  try {
    await migrate(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }

  // Seed the origin row into the fresh database.
  process.env.DIRECT_DATABASE_URL = url;
  await seedLocal();

  const gate = postgres(url, { max: 1 });
  try {
    await gate.unsafe("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");
  } finally {
    await gate.end({ timeout: 5 });
  }
  console.log("e2e database ready:", dbName);
}

void main();
