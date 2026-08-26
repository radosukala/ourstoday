
import postgres from "postgres";
import { createScratchDatabase, dropDatabase } from "@/../scripts/db/dbadmin";

export { createScratchDatabase, dropDatabase };

// Scratch databases are always created on the local development server.
// Tests must run without depending on .env.local being sourced.
process.env.DIRECT_DATABASE_URL ??= "postgresql://127.0.0.1:5432/postgres";
process.env.DATABASE_URL ??= process.env.DIRECT_DATABASE_URL;

/**
 * Creates a disposable PostgreSQL database, applies the committed migrations
 * and points the application environment at it BEFORE any src module is
 * imported. Returns handles for fixture setup and teardown.
 */
let counter = 0;

export async function setupTestDatabase(): Promise<{
  dbName: string;
  adminSql: () => postgres.Sql;
  teardown: () => Promise<void>;
}> {
  counter += 1;
  const dbName = await createScratchDatabase("ours_itest");
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL =
    "postgresql://127.0.0.1:5432/" + dbName;
  process.env.ALLOW_CANONICAL_WRITES = "false";
  process.env.APP_ENV = process.env.APP_ENV ?? "local";
  process.env.EMAIL_DELIVERY_MODE = process.env.EMAIL_DELIVERY_MODE ?? "capture";
  if (!process.env.RELAY_SIGNING_SECRET) {
    process.env.RELAY_SIGNING_SECRET = "1:integration-secret-0123456789abcdef0123456789abcdef";
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    process.env.BETTER_AUTH_SECRET = "integration-better-auth-secret-0123456789abcdef";
  }

  // Fresh module graph per test file so singletons bind to THIS database.
  const { migrate } = await import("@/../scripts/db/migrate");
  const admin = postgres(process.env.DIRECT_DATABASE_URL, { max: 2 });
  try {
    await migrate(admin);
  } finally {
    await admin.end({ timeout: 5 });
  }

  return {
    dbName,
    adminSql: () => postgres(process.env.DIRECT_DATABASE_URL as string, { max: 2 }),
    teardown: async () => {
      await dropDatabase(dbName);
    },
  };
}

/** Fixture person with verified email, mirroring confirm-time provisioning. */
export async function fixtureVerifiedPerson(
  n: number,
): Promise<{ authUserId: string }> {
  const { rawQuery } = await import("@/db/sqltype");
  const { sha256Email } = await import("@/security/digest");
  const authUserId = "itest-user-" + String(n).padStart(4, "0") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  const email = authUserId + "@itest.example";
  await rawQuery(
    'INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at) VALUES ($1, $2, $3, true, now(), now())',
    [authUserId, "ITest " + n, email],
  );
  await rawQuery(
    "INSERT INTO private.person (auth_user_id, email_digest, email_verified_at) VALUES ($1, $2, now())",
    [authUserId, sha256Email(email)],
  );
  return { authUserId };
}

/** Open BOTH write gates for the current scratch database. */
export async function openGates(): Promise<void> {
  const { rawQuery } = await import("@/db/sqltype");
  process.env.ALLOW_CANONICAL_WRITES = "true";
  await rawQuery("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");
}

