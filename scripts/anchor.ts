/**
 * Anchor CLI.
 *
 * Computes and publishes a Merkle root over the canonical event log so a
 * member's founding position becomes provable to a third party without OURS.
 *
 *   pnpm anchor compute DAILY 2026-08-26
 *   pnpm anchor publish DAILY  --actor "..."
 *   pnpm anchor publish MONTHLY 2026-08 --actor "..." --location "..." --evidence "..."
 *   pnpm anchor list
 *
 * Publishing is append-only: the row cannot be updated or deleted, and a
 * second publish of the same period with a DIFFERENT root is refused as an
 * integrity incident rather than quietly overwritten.
 *
 * The annual root is the one that matters. It goes on paper - a notice in a
 * newspaper of record, legal deposit with national libraries in several
 * jurisdictions, a printed annual volume. Record each of those with
 * --location, because an archive nobody can find is not an archive. This
 * command cannot do that part; a human must, and then say where it went.
 */
import { loadEnv, requireDatabaseUrl } from "./env";

type Kind = "DAILY" | "MONTHLY" | "ANNUAL";

interface Flags {
  actor?: string;
  locations: string[];
  evidence?: string;
}

function parse(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = { locations: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--actor") {
      const v = argv[++i];
      if (v !== undefined) flags.actor = v;
    } else if (arg === "--location") {
      const v = argv[++i];
      if (v !== undefined) flags.locations.push(v);
    } else if (arg === "--evidence") {
      const v = argv[++i];
      if (v !== undefined) flags.evidence = v;
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function asKind(value: string | undefined): Kind {
  const kind = (value ?? "").toUpperCase();
  if (kind !== "DAILY" && kind !== "MONTHLY" && kind !== "ANNUAL") {
    throw new Error("Period must be DAILY, MONTHLY or ANNUAL.");
  }
  return kind;
}

async function main(): Promise<void> {
  loadEnv();
  const { positional, flags } = parse(process.argv.slice(2));
  const [command, ...rest] = positional;

  if (command === "list") {
    requireDatabaseUrl("anchor list");
    const { listAnchors } = await import("../src/ledger/anchor");
    const anchors = await listAnchors();
    if (anchors.length === 0) {
      console.info("No anchors published yet. Volume one has to start somewhere.");
      return;
    }
    for (const a of anchors) {
      console.info(
        [
          a.periodKind.padEnd(8),
          a.periodLabel.padEnd(11),
          a.merkleRoot,
          "seq " + a.eventSeqFrom + "-" + a.eventSeqTo,
          a.eventCount + " events",
          a.publishedAt.toISOString(),
        ].join("  "),
      );
      if (Array.isArray(a.locations) && a.locations.length > 0) {
        for (const loc of a.locations) console.info("    deposited: " + String(loc));
      }
    }
    return;
  }

  if (command === "compute" || command === "publish") {
    requireDatabaseUrl("anchor " + command);
    const kind = asKind(rest[0]);
    const { periodLabelFor, computeAnchor, publishAnchor } = await import("../src/ledger/anchor");
    // Default to the period containing "now", which is what a scheduled run wants.
    const label = rest[1] ?? periodLabelFor(kind, new Date());

    if (command === "compute") {
      const computed = await computeAnchor(kind, label);
      console.info(JSON.stringify({ periodKind: kind, periodLabel: label, ...computed }, null, 2));
      if (!computed.chainVerified) {
        console.error("\nThe digest chain does NOT verify over this period. Do not publish.");
        process.exitCode = 1;
      }
      return;
    }

    if (!flags.actor?.trim()) throw new Error("Publishing an anchor requires --actor.");
    const result = await publishAnchor({
      kind,
      label,
      actorLabel: flags.actor,
      locations: flags.locations,
      evidenceUri: flags.evidence ?? null,
    });
    console.info(
      (result.alreadyPublished ? "Already published (identical root): " : "Published: ") +
        kind +
        " " +
        label,
    );
    console.info("  root:   " + result.merkleRoot);
    console.info("  events: " + result.eventCount);
    if (kind === "ANNUAL" && flags.locations.length === 0) {
      console.info(
        "\nNo --location recorded. An annual root that exists only in this database\n" +
          "anchors nothing. Deposit it on paper and record where.",
      );
    }
    return;
  }

  console.info(
    [
      "OURS anchor CLI",
      "",
      "  pnpm anchor compute DAILY|MONTHLY|ANNUAL [label]",
      '  pnpm anchor publish DAILY|MONTHLY|ANNUAL [label] --actor "..." [--location "..."] [--evidence <uri>]',
      "  pnpm anchor list",
      "",
      "Labels default to the current period: 2026-08-26, 2026-08, 2026.",
    ].join("\n"),
  );
  process.exitCode = command === undefined ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
