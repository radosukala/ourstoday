/**
 * Destroy and rebuild a database.
 *
 *   pnpm db:reset --confirm <hostname>
 *   pnpm db:reset --production --confirm <hostname>
 *
 * This exists for exactly one situation: a ledger that has not been published
 * to anyone yet and needs to start from zero. Once a single stranger holds an
 * ordinal, this command is the wrong tool and no flag makes it right - the
 * chronological record is the product, and corrections append.
 *
 * Guards, in order:
 *   1. the ledger must NOT be OPEN - closing it is a separate, deliberate act
 *   2. the target host must be typed out in --confirm, not just agreed to
 *   3. what is about to be destroyed is printed before anything is dropped
 *   4. a receipt is written to disk FIRST, because the database that would
 *      otherwise record this is the thing being destroyed
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { announceTarget, loadEnv, takeProfile } from "../env";
import { connect, directUrl } from "./dbadmin";
import { normalizeConnectionUrl } from "../../src/db/connection-url";
import { migrate } from "./migrate";

const SCHEMAS = ["ledger", "private", "auth", "_meta"];

/** Public views live in `public`, which must survive; drop the views only. */
const PUBLIC_VIEWS = [
  "founding_ledger",
  "system_status",
  "witness_shape",
  "launch_gates",
  "anchors",
  "conformance",
];

async function main(): Promise<void> {
  const { argv, profile } = takeProfile(process.argv.slice(2));
  loadEnv(profile);

  const confirmIndex = argv.indexOf("--confirm");
  const confirmed = confirmIndex !== -1 ? argv[confirmIndex + 1] : undefined;

  const url = directUrl();
  const { hostname, isLocal } = normalizeConnectionUrl(url);
  announceTarget("db:reset");

  // DROP ... CASCADE lists every dependent object as a NOTICE. Dozens of
  // lines would bury the summary that actually matters.
  const sql = connect(url, { max: 1, onnotice: () => {} });
  try {
    // ---- What is actually there -------------------------------------------
    const counts = await sql
      .unsafe<{ entries: string; events: string; mode: string }[]>(
        `SELECT
           (SELECT count(*)::text FROM ledger.entry) AS entries,
           (SELECT count(*)::text FROM ledger.event) AS events,
           (SELECT mode FROM ledger.system_state WHERE id = 1) AS mode`,
      )
      .catch(() => null);

    if (counts === null) {
      console.info("No ledger schema found. Nothing to destroy; applying migrations.");
    } else {
      const row = counts[0];
      console.info("");
      console.info("  database   " + hostname + (isLocal ? "  [LOCAL]" : "  [REMOTE]"));
      console.info("  entries    " + row?.entries + "   <- every ordinal ever issued");
      console.info("  events     " + row?.events + "   <- the entire canonical log");
      console.info("  auth       every account, session and magic link is destroyed too");
      console.info("  ledger     " + row?.mode);
      console.info("");

      // Guard 1. Opening and closing the ledger are steward acts with
      // receipts. Destroying a ledger that is currently accepting entries
      // would race anyone mid-seal.
      if (row?.mode === "OPEN") {
        console.error(
          "Refusing: the ledger is OPEN. Close it first, deliberately:\n" +
            "  pnpm steward mode CLOSED" +
            (profile ? " --production" : "") +
            ' --actor "..." --reason "..."',
        );
        process.exit(1);
      }

      // Guard 2. Typing the host is the difference between agreeing and
      // choosing. A --yes flag can be pasted from a previous command.
      if (confirmed !== hostname) {
        console.error(
          "Refusing: pass --confirm with the exact host to destroy.\n\n" +
            "  pnpm db:reset" +
            (profile ? " --production" : "") +
            " --confirm " +
            hostname +
            "\n",
        );
        process.exit(1);
      }
    }

    // ---- Guard 3: the receipt is written BEFORE the destruction ------------
    // The canonical log cannot record its own deletion.
    const stamp = new Date().toISOString();
    const dir = path.join(process.cwd(), "docs", "receipts");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, stamp.replace(/[:.]/g, "-") + "-database-reset.json");
    await writeFile(
      file,
      JSON.stringify(
        {
          receipt: "ours.database-reset/v1",
          at: stamp,
          host: hostname,
          destroyed: counts?.[0] ?? null,
          reason:
            "Pre-publication reset. Only valid while no ordinal has been issued to anyone " +
            "but the operator; once a stranger holds a place, corrections append instead.",
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    console.info(
      "receipt written before destroying anything: " + path.relative(process.cwd(), file),
    );

    // ---- Destroy -----------------------------------------------------------
    for (const view of PUBLIC_VIEWS) {
      await sql.unsafe(`DROP VIEW IF EXISTS public.${view} CASCADE`);
    }
    for (const schema of SCHEMAS) {
      await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
    console.info("dropped: " + SCHEMAS.join(", ") + " and the public projections");

    await migrate(sql);
    const after = await sql.unsafe<{ next_ordinal: string; mode: string }[]>(
      "SELECT c.next_ordinal::text AS next_ordinal, s.mode FROM ledger.ordinal_counter c, ledger.system_state s WHERE c.id = 1 AND s.id = 1",
    );
    console.info("");
    console.info(
      "rebuilt. next ordinal: " + after[0]?.next_ordinal + ", ledger: " + after[0]?.mode,
    );
    console.info("The write gate is closed again. Opening it is a separate act.");
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
