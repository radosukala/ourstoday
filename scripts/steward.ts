/**
 * Steward CLI - the smallest internal surface the handoff (section 11)
 * requires: see pending reviews, resolve one with a named actor and reason,
 * pause or open canonical writes, and inspect a redacted entry receipt.
 *
 * Every mutating command names a human actor, requires a reason, appends a
 * canonical event in the same transaction as its data change, and writes a
 * receipt file under docs/receipts/. There is no "edit canonical event"
 * command and there never will be: corrections append.
 *
 *   pnpm steward status
 *   pnpm steward queue
 *   pnpm steward receipt <ordinal>
 *   pnpm steward correction <requestId> approve|reject --actor "..." --reason "..."
 *   pnpm steward withdrawal <requestId> approve|reject --actor "..." --reason "..."
 *   pnpm steward void <ordinal>            --actor "..." --reason "..."
 *   pnpm steward mode OPEN|CLOSED|PAUSED   --actor "..." --reason "..."
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

interface Flags {
  actor?: string;
  reason?: string;
  yes: boolean;
}

function parseFlags(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = { yes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--actor") {
      const value = argv[++i];
      if (value !== undefined) flags.actor = value;
    } else if (arg === "--reason") {
      const value = argv[++i];
      if (value !== undefined) flags.reason = value;
    } else if (arg === "--yes") {
      flags.yes = true;
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function requireAuthority(flags: Flags): { actor: string; reason: string } {
  if (!flags.actor?.trim() || !flags.reason?.trim()) {
    throw new Error(
      "Every steward action requires --actor and --reason. Authority is never implied.",
    );
  }
  return { actor: flags.actor.trim(), reason: flags.reason.trim() };
}

/** Steward actions are receipted on disk as well as in the event log. */
async function writeReceipt(kind: string, body: Record<string, unknown>): Promise<string> {
  const dir = path.join(process.cwd(), "docs", "receipts");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${stamp}-${kind}.json`);
  await writeFile(
    file,
    JSON.stringify(
      { receipt: "ours.steward-receipt/v1", kind, at: new Date().toISOString(), ...body },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  return path.relative(process.cwd(), file);
}

async function cmdStatus(): Promise<void> {
  const { readSystemState } = await import("../src/ledger/state");
  const state = await readSystemState();
  console.info(JSON.stringify(state, null, 2));
  if (state.mode === "OPEN" && !state.writesAllowedByEnvironment) {
    console.info("\nNote: the database gate is OPEN but ALLOW_CANONICAL_WRITES is not true,");
    console.info("so this environment still refuses canonical writes. Both gates must agree.");
  }
}

async function cmdQueue(): Promise<void> {
  const { rawQuery } = await import("../src/db/sqltype");
  const corrections = await rawQuery<{ id: string; subject_ordinal: number | null; state: string }>(
    "SELECT id, subject_ordinal, state FROM private.correction_request WHERE state = 'REQUESTED' ORDER BY requested_at ASC",
  );
  const withdrawals = await rawQuery<{ id: string; subject_ordinal: number | null; state: string }>(
    "SELECT id, subject_ordinal, state FROM private.withdrawal_request WHERE state = 'REQUESTED' ORDER BY requested_at ASC",
  );
  const reviews = await rawQuery<{
    id: string;
    kind: string;
    subject_ordinal: number | null;
    state: string;
  }>(
    "SELECT id, kind, subject_ordinal, state FROM private.review_case WHERE state = 'OPEN' ORDER BY opened_at ASC",
  );
  // Reason detail and proposed names stay out of this listing: the queue is a
  // work list, not a place to browse private drafts.
  console.info(JSON.stringify({ corrections, withdrawals, reviews }, null, 2));
}

async function cmdReceipt(ordinalArg: string | undefined): Promise<void> {
  const ordinal = Number(ordinalArg);
  if (!Number.isInteger(ordinal) || ordinal < 1)
    throw new Error("Usage: steward receipt <ordinal>");
  const { rawQuery } = await import("../src/db/sqltype");
  const entry = await rawQuery<Record<string, unknown>>(
    "SELECT ordinal, display_name, seal_ts, lifecycle, display_state, declaration_version, protocol_version, origin_kind FROM ledger.entry WHERE ordinal = $1",
    [ordinal],
  );
  if (!entry[0]) throw new Error("No entry with ordinal " + String(ordinal));
  const events = await rawQuery<Record<string, unknown>>(
    `SELECT seq, type, occurred_at, actor_type, privacy_class, digest
       FROM ledger.event
      WHERE subject_ref = $1 OR payload->>'ordinal' = $1
      ORDER BY seq ASC`,
    [String(ordinal)],
  );
  // Redacted by construction: no person id, email digest, token or payload.
  console.info(JSON.stringify({ entry: entry[0], events }, null, 2));
}

async function cmdResolve(
  kind: "correction" | "withdrawal",
  requestId: string | undefined,
  decision: string | undefined,
  flags: Flags,
): Promise<void> {
  if (!requestId)
    throw new Error(
      `Usage: steward ${kind} <requestId> approve|reject --actor "..." --reason "..."`,
    );
  if (decision !== "approve" && decision !== "reject")
    throw new Error("Decision must be approve or reject.");
  const { actor, reason } = requireAuthority(flags);
  const steward = await import("../src/ledger/steward");
  const approve = decision === "approve";
  const result =
    kind === "correction"
      ? await steward.resolveCorrectionRequest({ requestId, actorLabel: actor, approve })
      : await steward.resolveWithdrawalRequest({ requestId, actorLabel: actor, approve });
  const file = await writeReceipt(kind + "-" + decision, { requestId, actor, reason, result });
  console.info(JSON.stringify(result, null, 2));
  console.info("receipt: " + file);
}

async function cmdVoid(ordinalArg: string | undefined, flags: Flags): Promise<void> {
  const ordinal = Number(ordinalArg);
  if (!Number.isInteger(ordinal) || ordinal < 1)
    throw new Error("Usage: steward void <ordinal> --actor ... --reason ...");
  const { actor, reason } = requireAuthority(flags);
  const { voidEntryAfterReview } = await import("../src/ledger/steward");
  await voidEntryAfterReview({ ordinal, caseId: null, actorLabel: actor, reason });
  const file = await writeReceipt("entry-voided", { ordinal, actor, reason });
  console.info(
    "Entry #" +
      String(ordinal).padStart(6, "0") +
      " voided. The ordinal stays retired and is never reassigned.",
  );
  console.info("receipt: " + file);
}

async function cmdMode(targetArg: string | undefined, flags: Flags): Promise<void> {
  const target = (targetArg ?? "").toUpperCase();
  if (target !== "OPEN" && target !== "CLOSED" && target !== "PAUSED") {
    throw new Error("Usage: steward mode OPEN|CLOSED|PAUSED --actor ... --reason ...");
  }
  const { actor, reason } = requireAuthority(flags);
  if (target === "OPEN" && !flags.yes) {
    throw new Error(
      "Opening canonical writes is a founder-steward decision, not a deployment step.\n" +
        "Re-run with --yes once the readiness receipt in docs/receipts/ has been published.",
    );
  }
  const { transitionLedgerMode } = await import("../src/ledger/state");
  const result = await transitionLedgerMode({ target, actorLabel: actor, reason });
  const file = await writeReceipt("ledger-mode-" + target.toLowerCase(), {
    target,
    actor,
    reason,
    result,
  });
  console.info("Ledger mode is now " + result.mode + ".");
  console.info("receipt: " + file);
}

async function main(): Promise<void> {
  const { positional, flags } = parseFlags(process.argv.slice(2));
  const [command, ...rest] = positional;
  switch (command) {
    case "status":
      return cmdStatus();
    case "queue":
      return cmdQueue();
    case "receipt":
      return cmdReceipt(rest[0]);
    case "correction":
      return cmdResolve("correction", rest[0], rest[1], flags);
    case "withdrawal":
      return cmdResolve("withdrawal", rest[0], rest[1], flags);
    case "void":
      return cmdVoid(rest[0], flags);
    case "mode":
      return cmdMode(rest[0], flags);
    default:
      console.info(
        [
          "OURS steward CLI",
          "",
          "  pnpm steward status",
          "  pnpm steward queue",
          "  pnpm steward receipt <ordinal>",
          '  pnpm steward correction <requestId> approve|reject --actor "..." --reason "..."',
          '  pnpm steward withdrawal <requestId> approve|reject --actor "..." --reason "..."',
          '  pnpm steward void <ordinal> --actor "..." --reason "..."',
          '  pnpm steward mode OPEN|CLOSED|PAUSED --actor "..." --reason "..." [--yes]',
          "",
          "There is no command that edits a canonical event. Corrections append.",
        ].join("\n"),
      );
      process.exitCode = command === undefined ? 0 : 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
