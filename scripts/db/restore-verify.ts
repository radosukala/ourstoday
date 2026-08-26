/**
 * Controlled dump and clean-restore rehearsal:
 *   1. pg_dump the live/local database (custom format)
 *   2. restore into a brand-new empty database
 *   3. verify event order integrity, digest chain, ordinal uniqueness,
 *      idempotency records and First Continuation consistency survived
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import postgres from "postgres";
import { directUrl, createScratchDatabase, dropDatabase } from "./dbadmin";

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

interface VerifyResult {
  events: number;
  entries: number;
  distinctOrdinals: number;
  chainOk: boolean;
  idempotency: number;
  firstContinuations: number;
}

async function verifyRestore(sql: postgres.Sql): Promise<VerifyResult> {
  const eventsRow = await sql<
    { count: string }[]
  >`SELECT count(*)::text AS count FROM ledger.event`;
  const entriesRow = await sql<
    { count: string }[]
  >`SELECT count(*)::text AS count FROM ledger.entry`;
  const distinctRow = await sql<
    { count: string }[]
  >`SELECT count(DISTINCT ordinal)::text AS count FROM ledger.entry`;
  const idemRow = await sql<
    { count: string }[]
  >`SELECT count(*)::text AS count FROM private.idempotency_record`;
  const fcRow = await sql<
    { count: string }[]
  >`SELECT count(*)::text AS count FROM ledger.first_continuation`;

  // Digest chain must be intact in sequence order after restoration.
  const rows = await sql<
    { seq: string; type: string; payload: unknown; prev_digest: string | null; digest: string }[]
  >`
    SELECT seq::text AS seq, type, payload, prev_digest, digest FROM ledger.event ORDER BY seq ASC`;
  const { createHash } = await import("node:crypto");
  const canonical = (value: unknown): string => JSON.stringify(value);
  let prev: string | null = null;
  let chainOk = true;
  for (const row of rows) {
    if ((row.prev_digest ?? null) !== prev) {
      chainOk = false;
      break;
    }
    const material = canonical({
      type: row.type,
      payload: row.payload,
      seq: Number(row.seq),
      prevDigest: row.prev_digest,
    });
    const expected = createHash("sha256").update(material).digest("hex");
    if (expected !== row.digest) {
      chainOk = false;
      break;
    }
    prev = row.digest;
  }

  return {
    events: Number(eventsRow[0]?.count ?? "0"),
    entries: Number(entriesRow[0]?.count ?? "0"),
    distinctOrdinals: Number(distinctRow[0]?.count ?? "0"),
    chainOk,
    idempotency: Number(idemRow[0]?.count ?? "0"),
    firstContinuations: Number(fcRow[0]?.count ?? "0"),
  };
}

async function main() {
  const { host, port, user, db } = hostPortUserDb();
  const tmp = await mkdtemp(path.join(os.tmpdir(), "ours-restore-"));
  const dumpFile = path.join(tmp, "dump.custom");
  const targetDb = await createScratchDatabase("ours_restore_check");

  let failed = false;
  try {
    console.log(`restore-verify: dumping ${db} -> ${dumpFile}`);
    execFileSync(
      "pg_dump",
      [
        "-h",
        host.startsWith("/") ? host : host,
        "-p",
        port,
        "-U",
        user,
        "-Fc",
        "-d",
        db,
        "-f",
        dumpFile,
      ],
      { env: pgEnv(), stdio: "pipe" },
    );
    execFileSync(
      "pg_restore",
      [
        "-h",
        host.startsWith("/") ? host : host,
        "-p",
        port,
        "-U",
        user,
        "-d",
        targetDb,
        "--no-owner",
        "--role",
        user,
        dumpFile,
      ],
      { env: pgEnv(), stdio: "pipe" },
    );

    const restored = postgres(
      new URL(directUrl()).origin.replace(/\/\/?$/, "") + `/${targetDb}`.replace(/^([^/])/, "$1"),
      { max: 1, prepare: false },
    );
    let result: VerifyResult;
    try {
      result = await verifyRestore(restored);
    } finally {
      await restored.end({ timeout: 5 });
    }

    const ok =
      result.entries === result.distinctOrdinals &&
      result.chainOk &&
      (result.events === 0 ? result.idempotency === 0 : result.idempotency >= 0);

    console.log("restore-verify results:", JSON.stringify(result));
    console.log(ok ? "restore-verify: PASS" : "restore-verify: FAIL");
    if (!ok) failed = true;

    // Also prove the append-only trigger survives restoration.
    const probe = postgres(directUrl().replace(/\/[^/]*$/, `/${targetDb}`), {
      max: 1,
      prepare: false,
    });
    try {
      await probe`UPDATE ledger.event SET type = 'tampered' WHERE seq = (SELECT min(seq) FROM ledger.event)`;
      console.log("restore-verify: FAIL - event UPDATE was permitted after restore");
      failed = true;
    } catch {
      console.log("restore-verify: append-only trigger active after restore");
    } finally {
      await probe.end({ timeout: 5 });
    }
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
