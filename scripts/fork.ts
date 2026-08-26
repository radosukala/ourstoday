/**
 * ours-fork — Article Zero, as a command.
 *
 *   pnpm fork export [--out <dir>] [--from <base-url>]
 *   pnpm fork verify <dir>
 *
 * Member-owned is otherwise a promise about intent, and promises about intent
 * are what every platform made before it enclosed its users. The right to
 * leave with everything is only real if it is a shipped, tested, rehearsed
 * capability. This is that capability.
 *
 * `export` pulls the complete PUBLIC state - the event log, the ledger, the
 * anchors, the gates, the conformance history, the event schema and the
 * projection SQL - into a directory that stands on its own. `verify`
 * recomputes the digest chain and every anchor root from the exported files
 * alone, with no database and no network, which is what makes the export
 * worth anything to someone who does not trust us.
 *
 * The strategic point is not that anyone forks. It is that they always could,
 * which disciplines every decision made by people who are not yet in the room.
 *
 * PRIVATE DATA IS NEVER EXPORTED. A fork inherits the public record, not other
 * people's email addresses. Anyone can already build their own read model from
 * this; that is the design, not a leak.
 */
import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnv, notRun, requireDatabaseUrl } from "./env";

interface ExportedEvent {
  seq: number;
  id: string;
  type: string;
  schemaVersion: string;
  occurredAt: string;
  actorType: string;
  actorRef: string | null;
  subjectType: string;
  subjectRef: string;
  authorityRef: string | null;
  payload: Record<string, unknown>;
  prevDigest: string | null;
  digest: string;
}

/**
 * One link of the integrity chain.
 *
 * The digest chain and every anchor root span EVERY canonical event, not only
 * the public ones. Exporting public bodies alone would leave gaps wherever an
 * INTERNAL event sits between two public ones, and the chain would not walk.
 *
 * So the export publishes a skeleton: for every event, its position and its
 * two digests. A non-public event is attested by its digest without revealing
 * anything about its content. A verifier can then walk the whole chain, check
 * that each public body reproduces its digest, and reproduce every anchor root
 * - while `relay.issued` stays as private as it was.
 */
interface ChainLink {
  seq: number;
  privacyClass: "PUBLIC" | "INTERNAL" | "PRIVATE";
  /** Present only for PUBLIC events; their body is in events.json. */
  type?: string;
  prevDigest: string | null;
  digest: string;
}

const MANIFEST = "ours.fork/1";

async function cmdExport(outDir: string): Promise<void> {
  requireDatabaseUrl("fork export");
  const { getSql } = await import("../src/db/client");
  const sql = getSql();

  try {
    await sql.unsafe("SELECT 1");
  } catch (error) {
    notRun(
      "fork export",
      "cannot reach PostgreSQL: " + (error instanceof Error ? error.message : String(error)),
    );
  }

  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, "schema"), { recursive: true });
  await mkdir(path.join(outDir, "docs"), { recursive: true });

  // ---- The canonical log, PUBLIC events only ---------------------------------
  const events = await sql.unsafe<Record<string, unknown>[]>(
    "SELECT seq, id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, payload, prev_digest, digest FROM ledger.event WHERE privacy_class = 'PUBLIC' ORDER BY seq ASC",
  );
  const exported: ExportedEvent[] = events.map((row) => ({
    seq: Number(row.seq),
    id: String(row.id),
    type: String(row.type),
    schemaVersion: String(row.schema_version),
    occurredAt: (row.occurred_at instanceof Date
      ? row.occurred_at
      : new Date(String(row.occurred_at))
    ).toISOString(),
    actorType: String(row.actor_type),
    actorRef: row.actor_ref === null ? null : String(row.actor_ref),
    subjectType: String(row.subject_type),
    subjectRef: String(row.subject_ref),
    authorityRef: row.authority_ref === null ? null : String(row.authority_ref),
    payload: row.payload as Record<string, unknown>,
    prevDigest: row.prev_digest === null ? null : String(row.prev_digest),
    digest: String(row.digest),
  }));
  await writeFile(
    path.join(outDir, "events.json"),
    JSON.stringify(exported, null, 2) + "\n",
    "utf8",
  );

  // ---- The chain skeleton, spanning every event -------------------------------
  const chainRows = await sql.unsafe<Record<string, unknown>[]>(
    "SELECT seq, type, privacy_class, prev_digest, digest FROM ledger.event ORDER BY seq ASC",
  );
  const chain: ChainLink[] = chainRows.map((row) => {
    const privacyClass = String(row.privacy_class) as ChainLink["privacyClass"];
    return {
      seq: Number(row.seq),
      privacyClass,
      // The type of a non-public event is withheld too. Nothing here needs it,
      // and a list of event types is a description of private activity.
      ...(privacyClass === "PUBLIC" ? { type: String(row.type) } : {}),
      prevDigest: row.prev_digest === null ? null : String(row.prev_digest),
      digest: String(row.digest),
    };
  });
  await writeFile(path.join(outDir, "chain.json"), JSON.stringify(chain, null, 2) + "\n", "utf8");

  // ---- Public projections ------------------------------------------------------
  const views: [string, string][] = [
    ["ledger.json", "SELECT * FROM public.founding_ledger ORDER BY ordinal ASC"],
    ["anchors.json", "SELECT * FROM public.anchors"],
    ["gates.json", "SELECT * FROM public.launch_gates"],
    ["conformance.json", "SELECT * FROM public.conformance"],
    ["witness-shape.json", "SELECT * FROM public.witness_shape"],
    ["system-status.json", "SELECT * FROM public.system_status"],
  ];
  for (const [file, query] of views) {
    const rows = await sql.unsafe<Record<string, unknown>[]>(query);
    await writeFile(path.join(outDir, file), JSON.stringify(rows, null, 2) + "\n", "utf8");
  }

  // ---- The schema and the governing documents ----------------------------------
  // A read model you cannot rebuild the tables for is a snapshot, not a fork.
  const migrationsDir = path.join(process.cwd(), "src", "db", "migrations");
  const { readdir } = await import("node:fs/promises");
  for (const file of (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql"))) {
    await copyFile(path.join(migrationsDir, file), path.join(outDir, "schema", file));
  }
  for (const doc of [
    "EVENT-SCHEMA-1.0.md",
    "CONSTITUTION-0.1.md",
    "FOUNDING-RELAY-PROTOCOL.md",
    "OURS.md",
  ]) {
    const from = path.join(process.cwd(), "docs", doc);
    if (existsSync(from)) await copyFile(from, path.join(outDir, "docs", doc));
  }

  const head = chain[chain.length - 1];
  const manifest = {
    manifest: MANIFEST,
    exportedAt: new Date().toISOString(),
    publicEventCount: exported.length,
    chainLength: chain.length,
    nonPublicEventCount: chain.length - exported.length,
    eventSeqHigh: head ? head.seq : 0,
    headDigest: head ? head.digest : null,
    contains: [
      "chain.json — every canonical event's position and digests, public or not",
      "events.json — the full body of every PUBLIC event, in sequence order",
      "ledger.json — the founding ledger projection",
      "anchors.json — published Merkle roots",
      "gates.json — the sixteen launch gates and their state",
      "conformance.json — every conformance run, pass and fail",
      "witness-shape.json — the attestation degree distribution (never the edges)",
      "schema/ — the SQL that builds the tables and the public views",
      "docs/ — the event schema standard and the governing documents",
    ],
    excludes:
      "All private data. No email address, no account, no session, no token, no draft, no review case. " +
      "Non-public events appear in chain.json as a position and a digest only, which is what lets the " +
      "chain and the anchors verify without disclosing their content.",
    verify: "pnpm fork verify <dir> — recomputes the digest chain and every anchor root offline",
  };
  await writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  console.info("Forked to " + outDir);
  console.info("  chain:   " + chain.length + " events (" + exported.length + " public)");
  console.info("  head:    " + (manifest.headDigest ?? "(empty log)"));
  console.info("\nVerify it without this database or this network:");
  console.info("  pnpm fork verify " + outDir);
}

async function cmdVerify(dir: string): Promise<void> {
  // Deliberately offline and database-free: the whole value of the export is
  // that someone who does not trust us can check it on their own machine.
  const { digestEvent } = await import("../src/ledger/events");
  const { merkleRoot } = await import("../src/ledger/anchor");

  const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as {
    manifest: string;
    publicEventCount: number;
    chainLength: number;
    headDigest: string | null;
  };
  if (manifest.manifest !== MANIFEST) throw new Error("Not an " + MANIFEST + " export.");

  const events = JSON.parse(
    await readFile(path.join(dir, "events.json"), "utf8"),
  ) as ExportedEvent[];
  const chain = JSON.parse(await readFile(path.join(dir, "chain.json"), "utf8")) as ChainLink[];
  const failures: string[] = [];

  if (events.length !== manifest.publicEventCount) {
    failures.push(
      "manifest says " + manifest.publicEventCount + " public events, file holds " + events.length,
    );
  }
  if (chain.length !== manifest.chainLength) {
    failures.push(
      "manifest says " + manifest.chainLength + " chain links, file holds " + chain.length,
    );
  }

  // 1. The chain walks end to end, across public and non-public events alike.
  let prev: string | null = null;
  let previousSeq = 0;
  for (const link of chain) {
    if (link.seq <= previousSeq) {
      failures.push("seq " + link.seq + ": chain is not in ascending sequence order");
      break;
    }
    if (link.prevDigest !== prev) {
      failures.push("seq " + link.seq + ": prevDigest does not follow the previous event");
      break;
    }
    prev = link.digest;
    previousSeq = link.seq;
  }
  if (manifest.headDigest !== prev) {
    failures.push("head digest does not match the end of the chain");
  }

  // 2. Every public body reproduces the digest the chain claims for it.
  const bySeq = new Map(chain.map((link) => [link.seq, link]));
  for (const event of events) {
    const link = bySeq.get(event.seq);
    if (!link) {
      failures.push("seq " + event.seq + ": public event is missing from the chain");
      continue;
    }
    if (link.privacyClass !== "PUBLIC") {
      failures.push("seq " + event.seq + ": chain marks this event non-public");
    }
    const expected = digestEvent({
      type: event.type,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
      prevDigest: event.prevDigest,
    });
    if (expected !== link.digest || event.digest !== link.digest) {
      failures.push("seq " + event.seq + ": digest does not reproduce from the event body");
    }
  }

  // 3. Every anchor root reproduces over the chain range it covers.
  const anchors = JSON.parse(await readFile(path.join(dir, "anchors.json"), "utf8")) as {
    period_kind: string;
    period_label: string;
    merkle_root: string;
    event_seq_from: string | number;
    event_seq_to: string | number;
  }[];
  for (const anchor of anchors) {
    const from = Number(anchor.event_seq_from);
    const to = Number(anchor.event_seq_to);
    const inRange = chain.filter((l) => l.seq >= from && l.seq <= to).map((l) => l.digest);
    if (merkleRoot(inRange) !== anchor.merkle_root) {
      failures.push(
        "anchor " + anchor.period_kind + ":" + anchor.period_label + " root does not reproduce",
      );
    }
  }

  if (failures.length === 0) {
    console.info("FORK VERIFIED");
    console.info(
      "  chain:   " + chain.length + " events (" + events.length + " public bodies reproduced)",
    );
    console.info("  head:    " + (manifest.headDigest ?? "(empty log)"));
    console.info("  anchors: " + anchors.length + " reproduced");
    console.info("\nThis copy stands on its own. It needed no database and no network.");
    return;
  }
  console.error("FORK VERIFICATION FAILED");
  for (const failure of failures) console.error("  " + failure);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  loadEnv();
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (command === "export") {
    const outIndex = argv.indexOf("--out");
    const out =
      outIndex !== -1 && argv[outIndex + 1] !== undefined
        ? (argv[outIndex + 1] as string)
        : path.join(process.cwd(), "fork-export");
    return cmdExport(out);
  }
  if (command === "verify") {
    const dir = argv[1];
    if (!dir) throw new Error("Usage: pnpm fork verify <dir>");
    return cmdVerify(dir);
  }

  console.info(
    [
      "ours-fork — leave with everything, and be able to prove it is everything.",
      "",
      "  pnpm fork export [--out <dir>]",
      "  pnpm fork verify <dir>",
      "",
      "Exports the complete public state: the event log, the ledger, the anchors,",
      "the gates, the conformance history, the schema and the governing documents.",
      "Verification is offline: no database, no network, no permission.",
    ].join("\n"),
  );
  process.exitCode = command === undefined ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
