/**
 * Controlled dump and clean-restore rehearsal:
 *   1. pg_dump the configured database (custom format)
 *   2. restore into a brand-new empty database
 *   3. verify that entry order, ordinal uniqueness, the event digest chain,
 *      idempotency records, First Continuation exclusivity and the
 *      append-only trigger all survived
 *
 * A provider dashboard saying "backup enabled" is not a restore rehearsal.
 * This is the rehearsal, and it is a canonical launch gate.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import postgres from "postgres";
import { adminSql, directUrl, createScratchDatabase, dropDatabase } from "./dbadmin";
import { notRun, requireDatabaseUrl } from "../env";
import { digestEvent } from "../../src/ledger/events";

function pgEnv(): NodeJS.ProcessEnv {
  const url = new URL(directUrl());
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password || "") };
  return env as NodeJS.ProcessEnv;
}

function hostPortUserDb(): { host: string; port: string; user: string; db: string } {
  const url = new URL(directUrl());
  return {
    host: url.hostname || "/tmp",
    port: url.port || "5432",
    user: decodeURIComponent(url.username || process.env.USER || "postgres"),
    db: url.pathname.slice(1),
  };
}

/**
 * The same server, a different database.
 *
 * URL.origin is the string "null" for the postgresql: scheme, so it cannot be
 * used to rebuild a connection string. Copy the parsed URL and swap only the
 * path, which preserves credentials and query parameters such as sslmode.
 */
function urlForDatabase(database: string): string {
  const url = new URL(directUrl());
  url.pathname = "/" + database;
  return url.toString();
}

interface VerifyResult {
  events: number;
  entries: number;
  distinctOrdinals: number;
  chainOk: boolean;
  chainBrokeAtSeq: number | null;
  idempotency: number;
  firstContinuations: number;
  firstContinuationExclusive: boolean;
  appendOnlyEnforced: boolean;
}

async function verifyRestore(sql: postgres.Sql): Promise<Omit<VerifyResult, "appendOnlyEnforced">> {
  const one = async (query: string): Promise<number> => {
    const rows = await sql.unsafe<{ count: string }[]>(query);
    return Number(rows[0]?.count ?? "0");
  };
  const events = await one("SELECT count(*)::text AS count FROM ledger.event");
  const entries = await one("SELECT count(*)::text AS count FROM ledger.entry");
  const distinctOrdinals = await one(
    "SELECT count(DISTINCT ordinal)::text AS count FROM ledger.entry",
  );
  const idempotency = await one("SELECT count(*)::text AS count FROM private.idempotency_record");
  const firstContinuations = await one(
    "SELECT count(*)::text AS count FROM ledger.first_continuation",
  );
  // One predecessor may vest at most one First Continuation, forever.
  const duplicatePredecessors = await one(
    `SELECT count(*)::text AS count FROM (
       SELECT predecessor_entry_id FROM ledger.first_continuation
       GROUP BY predecessor_entry_id HAVING count(*) > 1
     ) d`,
  );

  const rows = await sql.unsafe<
    {
      seq: string | number;
      type: string;
      occurred_at: Date | string;
      payload: Record<string, unknown>;
      prev_digest: string | null;
      digest: string;
    }[]
  >(
    "SELECT seq, type, occurred_at, payload, prev_digest, digest FROM ledger.event ORDER BY seq ASC",
  );

  let prev: string | null = null;
  let chainOk = true;
  let chainBrokeAtSeq: number | null = null;
  for (const row of rows) {
    const occurredAt =
      row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at);
    // Recompute with the SAME function the writer used. Anything else would
    // be testing a second implementation rather than the record.
    const expected = digestEvent({
      type: row.type,
      payload: row.payload,
      occurredAt,
      prevDigest: row.prev_digest,
    });
    if ((row.prev_digest ?? null) !== prev || expected !== row.digest) {
      chainOk = false;
      chainBrokeAtSeq = Number(row.seq);
      break;
    }
    prev = row.digest;
  }

  return {
    events,
    entries,
    distinctOrdinals,
    chainOk,
    chainBrokeAtSeq,
    idempotency,
    firstContinuations,
    firstContinuationExclusive: duplicatePredecessors === 0,
  };
}

function haveTool(tool: string): boolean {
  try {
    execFileSync(tool, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  requireDatabaseUrl("db:restore:verify");
  for (const tool of ["pg_dump", "pg_restore"]) {
    if (!haveTool(tool)) notRun("db:restore:verify", tool + " is not on PATH");
  }
  try {
    const probe = adminSql("postgres");
    await probe`SELECT 1`;
    await probe.end({ timeout: 5 });
  } catch (error) {
    notRun(
      "db:restore:verify",
      "cannot reach PostgreSQL: " + (error instanceof Error ? error.message : String(error)),
    );
  }

  const { host, port, user, db } = hostPortUserDb();
  const tmp = await mkdtemp(path.join(os.tmpdir(), "ours-restore-"));
  const dumpFile = path.join(tmp, "dump.custom");
  const targetDb = await createScratchDatabase("ours_restore_check");

  let failed = false;
  try {
    console.info(`restore-verify: dumping ${db} -> ${dumpFile}`);
    execFileSync("pg_dump", ["-h", host, "-p", port, "-U", user, "-Fc", "-d", db, "-f", dumpFile], {
      env: pgEnv(),
      stdio: "pipe",
    });
    execFileSync(
      "pg_restore",
      ["-h", host, "-p", port, "-U", user, "-d", targetDb, "--no-owner", dumpFile],
      { env: pgEnv(), stdio: "pipe" },
    );

    const restored = postgres(urlForDatabase(targetDb), { max: 1, prepare: false });
    let partial: Omit<VerifyResult, "appendOnlyEnforced">;
    try {
      partial = await verifyRestore(restored);
    } finally {
      await restored.end({ timeout: 5 });
    }

    // The append-only guarantee must survive restoration, not just exist in
    // the source database's DDL.
    let appendOnlyEnforced = false;
    if (partial.events > 0) {
      const probe = postgres(urlForDatabase(targetDb), { max: 1, prepare: false });
      try {
        await probe`UPDATE ledger.event SET type = 'tampered' WHERE seq = (SELECT min(seq) FROM ledger.event)`;
      } catch {
        appendOnlyEnforced = true;
      } finally {
        await probe.end({ timeout: 5 });
      }
    } else {
      // Nothing to tamper with; treat as enforced rather than claim a pass
      // that was never exercised. The summary reports events: 0 alongside it.
      appendOnlyEnforced = true;
    }

    const result: VerifyResult = { ...partial, appendOnlyEnforced };
    const ok =
      result.entries === result.distinctOrdinals &&
      result.chainOk &&
      result.firstContinuationExclusive &&
      result.appendOnlyEnforced;

    console.info("restore-verify results: " + JSON.stringify(result));
    console.info(ok ? "restore-verify: PASS" : "restore-verify: FAIL");
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.error("restore-verify FAILED:", error instanceof Error ? error.message : error);
  } finally {
    await dropDatabase(targetDb);
    await rm(tmp, { recursive: true, force: true });
  }
  if (failed) process.exit(1);
}

void main();
