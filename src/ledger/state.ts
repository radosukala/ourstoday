
import { createHash } from "node:crypto";
import { config } from "@/config";
import { getSql, type OurSql } from "@/db/sqltype";
import { currentDocumentVersions } from "@/legal/documents";

export type LedgerMode = "CLOSED" | "OPEN" | "PAUSED";

export interface SystemStateView {
  mode: LedgerMode;
  writesAllowedByEnvironment: boolean;
  declarationVersion: string;
  protocolVersion: string;
  legalStatusVersion: string;
  privacyVersion: string;
  changedAt: Date;
}

export async function readSystemState(): Promise<SystemStateView> {
  const rows = await getSql().unsafe<{
    mode: LedgerMode;
    declaration_version: string;
    protocol_version: string;
    legal_status_version: string;
    privacy_version: string;
    changed_at: Date;
  }[]>(
    "SELECT mode, declaration_version, protocol_version, legal_status_version, privacy_version, changed_at FROM ledger.system_state WHERE id = 1",
  );
  const row = rows[0];
  let cfgWrites = false;
  try {
    cfgWrites = config().allowCanonicalWrites;
  } catch {
    cfgWrites = false;
  }
  return {
    mode: row?.mode ?? "CLOSED",
    writesAllowedByEnvironment: cfgWrites,
    declarationVersion: row?.declaration_version ?? "",
    protocolVersion: row?.protocol_version ?? "",
    legalStatusVersion: row?.legal_status_version ?? "",
    privacyVersion: row?.privacy_version ?? "",
    changedAt: row?.changed_at ?? new Date(0),
  };
}

/** Public founding-state payload for /api/v1/founding-state and /status. */
export async function foundingState(): Promise<{
  ledgerState: "CLOSED" | "OPEN" | "PAUSED";
  canAcceptEntries: boolean;
  statusLine: string;
  versions: Record<string, string>;
}> {
  let state: SystemStateView;
  try {
    state = await readSystemState();
  } catch {
    // Database unreachable: fail closed and say so truthfully.
    return {
      ledgerState: "CLOSED",
      canAcceptEntries: false,
      statusLine: "OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED",
      versions: currentDocumentVersions() as unknown as Record<string, string>,
    };
  }
  return {
    ledgerState: state.mode,
    canAcceptEntries: state.mode === "OPEN" && state.writesAllowedByEnvironment,
    statusLine: "OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED",
    versions: {
      declaration: state.declarationVersion,
      protocol: state.protocolVersion,
      legalStatus: state.legalStatusVersion,
      privacyNotice: state.privacyVersion,
    },
  };
}

export class StewardTransitionError extends Error {}

/**
 * Steward-controlled write-gate transition. Appends a receipt event in the
 * same transaction as the state change. No UI or deploy script may call this
 * silently; invocations must name an actor and reason.
 */
export async function transitionLedgerMode(args: {
  target: LedgerMode;
  actorLabel: string;
  reason: string;
}): Promise<{ mode: LedgerMode }> {
  if (!args.actorLabel.trim() || !args.reason.trim()) {
    throw new StewardTransitionError("Actor label and reason are required.");
  }
  return getSql().begin(async (tx: OurSql) => {
    const cur = await tx.unsafe<{ mode: LedgerMode }[]>("SELECT mode FROM ledger.system_state WHERE id = 1 FOR UPDATE");
    const previous = cur[0]?.mode ?? "CLOSED";
    if (previous === args.target) throw new StewardTransitionError("Already in ".concat(args.target));
    await tx.unsafe(
      "UPDATE ledger.system_state SET mode = $1, changed_by_actor = $2, changed_reason = $3, changed_at = now() WHERE id = 1",
      [args.target, args.actorLabel, args.reason],
    );
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('ledger.event.chain'))");
    const last = await tx.unsafe<{ digest: string | null }[]>(
      "SELECT digest FROM ledger.event ORDER BY seq DESC LIMIT 1",
    );
    const occurredAt = new Date();
    const payload = { from: previous, to: args.target, reason: args.reason };
    const material = JSON.stringify({
      type: "ledger.system_state.changed",
      payload,
      occurredAt: occurredAt.toISOString(),
      prevDigest: last[0]?.digest ?? null,
    });
    const digest = createHash("sha256").update(material).digest("hex");
    await tx.unsafe(
      "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, payload, prev_digest, digest) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        crypto.randomUUID(),
        "ledger.system_state.changed",
        "ours.founding-relay/0.1",
        occurredAt,
        args.actorLabel.toUpperCase().includes("FOUNDER") ? "FOUNDER_STEWARD" : "STEWARD",
        args.actorLabel,
        "ledger.system_state",
        "1",
        "STEWARD-RECEIPT",
        "PUBLIC",
        JSON.stringify(payload),
        last[0]?.digest ?? null,
        digest,
      ],
    );
    return { mode: args.target };
  });
}

