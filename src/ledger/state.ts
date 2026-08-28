import { config } from "@/config";
import { getSql, jsonParam, toDate, tsParam, type DbTimestamp, type OurSql } from "@/db/sqltype";
import { currentDocumentVersions } from "@/legal/documents";
import {
  capacityFromNextOrdinal,
  FOUNDING_RIGHT_VERSION,
  type FoundingCapacity,
} from "@/founding/right";
import { digestEvent } from "./events";

export type LedgerMode = "CLOSED" | "OPEN" | "PAUSED";

export interface SystemStateView {
  mode: LedgerMode;
  writesAllowedByEnvironment: boolean;
  declarationVersion: string;
  protocolVersion: string;
  legalStatusVersion: string;
  privacyVersion: string;
  nextOrdinal: number | null;
  changedAt: Date;
}

export async function readSystemState(): Promise<SystemStateView> {
  const rows = await getSql().unsafe<
    {
      mode: LedgerMode;
      declaration_version: string;
      protocol_version: string;
      legal_status_version: string;
      privacy_version: string;
      next_ordinal: number | null;
      changed_at: DbTimestamp;
    }[]
  >(
    "SELECT s.mode, s.declaration_version, s.protocol_version, s.legal_status_version, s.privacy_version, c.next_ordinal, s.changed_at FROM ledger.system_state s LEFT JOIN ledger.ordinal_counter c ON c.id = s.id WHERE s.id = 1",
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
    nextOrdinal: row?.next_ordinal ?? null,
    changedAt: row?.changed_at ? toDate(row.changed_at) : new Date(0),
  };
}

/** Public founding-state payload for /api/v1/founding-state and /status. */
export async function foundingState(): Promise<{
  ledgerState: "CLOSED" | "OPEN" | "PAUSED";
  canAcceptEntries: boolean;
  capacity: FoundingCapacity;
  capacityAvailable: boolean;
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
      capacity: capacityFromNextOrdinal(null),
      capacityAvailable: false,
      statusLine: "OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED",
      versions: { ...currentDocumentVersions(), foundingRight: FOUNDING_RIGHT_VERSION },
    };
  }
  return {
    ledgerState: state.mode,
    canAcceptEntries:
      state.mode === "OPEN" &&
      state.writesAllowedByEnvironment &&
      !capacityFromNextOrdinal(state.nextOrdinal).full,
    capacity: capacityFromNextOrdinal(state.nextOrdinal),
    capacityAvailable: state.nextOrdinal !== null,
    statusLine: "OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED",
    versions: {
      declaration: state.declarationVersion,
      protocol: state.protocolVersion,
      legalStatus: state.legalStatusVersion,
      privacyNotice: state.privacyVersion,
      foundingRight: FOUNDING_RIGHT_VERSION,
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
    const cur = await tx.unsafe<{ mode: LedgerMode }[]>(
      "SELECT mode FROM ledger.system_state WHERE id = 1 FOR UPDATE",
    );
    const previous = cur[0]?.mode ?? "CLOSED";
    if (previous === args.target)
      throw new StewardTransitionError("Already in ".concat(args.target));
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
    const digest = digestEvent({
      type: "ledger.system_state.changed",
      payload,
      occurredAt,
      prevDigest: last[0]?.digest ?? null,
    });
    await tx.unsafe(
      "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, payload, prev_digest, digest) VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, $10, $11::text::jsonb, $12, $13)",
      [
        crypto.randomUUID(),
        "ledger.system_state.changed",
        "ours.founding-relay/0.1",
        tsParam(occurredAt),
        args.actorLabel.toUpperCase().includes("FOUNDER") ? "FOUNDER_STEWARD" : "STEWARD",
        args.actorLabel,
        "ledger.system_state",
        "1",
        "STEWARD-RECEIPT",
        "PUBLIC",
        jsonParam(payload),
        last[0]?.digest ?? null,
        digest,
      ],
    );
    return { mode: args.target };
  });
}
