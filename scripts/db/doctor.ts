/**
 * Connection doctor.
 *
 *   pnpm db:doctor
 *   DIRECT_DATABASE_URL='postgres://...' pnpm db:doctor
 *
 * "It didn't work" is not a diagnosis, and a provider connection string has
 * roughly six independent ways to be wrong. This reports which URL was
 * resolved and from where, what TLS and pooling settings it implies, whether
 * the connection actually opens, and what the database on the other end
 * contains - with credentials masked so the output is safe to paste.
 *
 * It never writes anything.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadEnv, takeProfile } from "../env";
import { normalizeConnectionUrl } from "../../src/db/connection-url";
import { connect } from "./dbadmin";

/** Show shape and host, never credentials. */
function mask(raw: string): string {
  try {
    const url = new URL(raw);
    const user = url.username ? url.username.slice(0, 2) + "***" : "(none)";
    const pass = url.password ? "***" : "(none)";
    const params = [...url.searchParams.keys()];
    return (
      url.protocol +
      "//" +
      user +
      ":" +
      pass +
      "@" +
      url.hostname +
      (url.port ? ":" + url.port : "") +
      url.pathname +
      (params.length ? "?" + params.join("&") : "")
    );
  } catch {
    return "(not a URL: " + raw.slice(0, 12) + "...)";
  }
}

/** Which file, if any, would have supplied this variable. */
function sourceOf(name: string, beforeLoad: Record<string, string | undefined>): string {
  if (beforeLoad[name] !== undefined) return "process environment";
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file);
    if (existsSync(full) && new RegExp("^" + name + "=", "m").test(readFileSync(full, "utf8"))) {
      return file;
    }
  }
  return "unset";
}

function classify(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code ?? "";
  if (/unrecognized configuration parameter/i.test(message)) {
    return "The URL carries a libpq CLIENT-side parameter that was sent to the server.\n     This build strips them; if you see this, the connection bypassed normalizeConnectionUrl.";
  }
  if (code === "ENOTFOUND" || /getaddrinfo/i.test(message)) {
    return "Hostname does not resolve. Check for a truncated paste or a missing region segment.";
  }
  if (code === "ECONNREFUSED") {
    return "Nothing is listening. For a local database, is PostgreSQL running?";
  }
  if (code === "CONNECT_TIMEOUT" || /timeout/i.test(message)) {
    return "Timed out. A scale-to-zero provider may be cold-starting; try again.\n     If it persists, an IP allowlist or firewall is the usual cause.";
  }
  if (/password authentication failed|SASL|SCRAM/i.test(message)) {
    return "Credentials rejected. Re-copy the URL; a password containing @ : / or ?\n     must be percent-encoded in a connection string.";
  }
  if (/no pg_hba|SSL|self signed|certificate/i.test(message)) {
    return "TLS negotiation failed. Try sslmode=require in the URL.";
  }
  if (/does not exist/i.test(message) && /database/i.test(message)) {
    return "The database name in the URL path does not exist on that server.";
  }
  return "Unclassified. The raw message above is the best signal.";
}

async function main(): Promise<void> {
  const before = { ...process.env };
  const { profile } = takeProfile(process.argv.slice(2));
  loadEnv(profile);

  console.info("OURS connection doctor\n");
  console.info("APP_ENV                 " + (process.env.APP_ENV ?? "(unset, treated as local)"));
  console.info(
    "ALLOW_CANONICAL_WRITES  " +
      (process.env.ALLOW_CANONICAL_WRITES ?? "(unset, treated as false)"),
  );
  console.info("");

  const targets: [string, string | undefined][] = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["DIRECT_DATABASE_URL", process.env.DIRECT_DATABASE_URL],
  ];

  const seen: string[] = [];
  let anyFailed = false;

  for (const [name, raw] of targets) {
    console.info("── " + name);
    if (!raw) {
      console.info("   unset\n");
      continue;
    }
    console.info("   from      " + sourceOf(name, before));
    console.info("   url       " + mask(raw));

    const conn = normalizeConnectionUrl(raw);
    console.info(
      "   host      " + (conn.hostname || "(socket)") + (conn.isLocal ? "  [local]" : "  [remote]"),
    );
    console.info("   tls       " + String(conn.ssl));
    console.info(
      "   pooler    " +
        (conn.isTransactionPooler
          ? "transaction pooler detected; prepared statements disabled"
          : "none detected"),
    );
    seen.push(conn.hostname || "(socket)");

    const sql = connect(raw, { max: 1, connect_timeout: 20 });
    try {
      const info = await sql.unsafe<{ version: string; db: string; usr: string }[]>(
        "SELECT version() AS version, current_database() AS db, current_user AS usr",
      );
      console.info("   connect   OK");
      console.info("   server    " + (info[0]?.version ?? "").split(" ").slice(0, 2).join(" "));
      console.info("   database  " + info[0]?.db + "  as " + info[0]?.usr);

      const migrations = await sql
        .unsafe<
          { filename: string }[]
        >("SELECT filename FROM _meta.schema_migrations ORDER BY filename")
        .catch(() => null);
      if (migrations === null) {
        console.info("   schema    NO MIGRATIONS APPLIED (_meta.schema_migrations absent)");
      } else {
        console.info("   schema    " + migrations.length + " migration(s) applied");
        const entries = await sql
          .unsafe<{ count: string }[]>("SELECT count(*)::text AS count FROM ledger.entry")
          .catch(() => null);
        const mode = await sql
          .unsafe<{ mode: string }[]>("SELECT mode FROM ledger.system_state WHERE id = 1")
          .catch(() => null);
        if (entries) console.info("   entries   " + entries[0]?.count);
        if (mode) console.info("   gate      ledger.system_state.mode = " + mode[0]?.mode);
      }
    } catch (error) {
      anyFailed = true;
      console.info("   connect   FAILED");
      console.info("   error     " + (error instanceof Error ? error.message : String(error)));
      console.info("   likely    " + classify(error));
    } finally {
      await sql.end({ timeout: 5 }).catch(() => {});
    }
    console.info("");
  }

  // The mixed configuration is easy to create and hard to notice: the app
  // talks to one database while migrations and dumps target another.
  if (seen.length === 2 && seen[0] !== seen[1]) {
    const bare = (h: string): string => h.replace("-pooler.", ".");
    if (bare(seen[0] as string) !== bare(seen[1] as string)) {
      console.info("WARNING  DATABASE_URL and DIRECT_DATABASE_URL are on DIFFERENT servers:");
      console.info("           " + seen[0] + "  (application)");
      console.info("           " + seen[1] + "  (migrations, dumps, seeding)");
      console.info(
        "         Migrations would land somewhere the application never reads.\n" +
          "         On one provider these differ only by the '-pooler' segment.",
      );
      anyFailed = true;
    }
  }

  if (anyFailed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
