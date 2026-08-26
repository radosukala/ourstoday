
import { createHash } from "node:crypto";
import { getSql, type OurSql } from "@/db/sqltype";

/**
 * Steward review actions. Every action appends receipted canonical events in
 * the SAME transaction as its data change. Ordinals are never reassigned;
 * withdrawals become permanent public tombstones; corrections append a
 * corrected event carrying old and new names.
 */

export class StewardActionError extends Error {}

async function appendEvent(
  tx: OurSql,
  args: {
    type: string;
    actorType: "STEWARD" | "FOUNDER_STEWARD";
    actorRef: string;
    subjectType: string;
    subjectRef: string;
    authorityRef?: string;
    privacyClass: "PUBLIC" | "INTERNAL" | "PRIVATE";
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('ledger.event.chain'))");
  const last = await tx.unsafe<{ digest: string | null }[]>(
    "SELECT digest FROM ledger.event ORDER BY seq DESC LIMIT 1",
  );
  const prevDigest = last[0]?.digest ?? null;
  const occurredAt = new Date();
  const material = JSON.stringify({
    type: args.type,
    payload: args.payload,
    occurredAt: occurredAt.toISOString(),
    prevDigest,
  });
  const digest = createHash("sha256").update(material).digest("hex");
  await tx.unsafe(
    "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, payload, prev_digest, digest) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
    [
      crypto.randomUUID(),
      args.type,
      "ours.founding-relay/0.1",
      occurredAt,
      args.actorType,
      args.actorRef,
      args.subjectType,
      args.subjectRef,
      args.authorityRef ?? "STEWARD-RECEIPT",
      args.privacyClass,
      // Object param: postgres.js serializes jsonb itself.
      args.payload,
      prevDigest,
      digest,
    ],
  );
}

export interface ResolutionResult {
  requestState: string;
  ordinal?: number;
}

/** Resolve a correction request: apply the proposed public name, append event. */
export async function resolveCorrectionRequest(args: {
  requestId: string;
  actorLabel: string;
  approve: boolean;
}): Promise<ResolutionResult> {
  if (!args.actorLabel.trim()) throw new StewardActionError("Actor label is required.");
  return getSql().begin(async (tx: OurSql) => {
    const rows = await tx.unsafe<{
      id: string;
      person_id: string;
      subject_ordinal: number | null;
      proposed_display_name: string;
      state: string;
    }[]>(
      "SELECT id, person_id, subject_ordinal, proposed_display_name, state FROM private.correction_request WHERE id = $1 FOR UPDATE",
      [args.requestId],
    );
    const req = rows[0];
    if (!req) throw new StewardActionError("Request not found.");
    if (req.state !== "REQUESTED") throw new StewardActionError("Request already resolved.");

    const newState = args.approve ? "APPROVED" : "REJECTED";
    await tx.unsafe(
      "UPDATE private.correction_request SET state = $2, resolved_at = now(), resolved_by_actor = $3 WHERE id = $1",
      [req.id, newState, args.actorLabel],
    );

    let ordinal: number | undefined = req.subject_ordinal ?? undefined;
    if (args.approve && req.subject_ordinal !== null) {
      const prior = await tx.unsafe<{ display_name: string }[]>(
        "SELECT display_name FROM ledger.entry WHERE ordinal = $1",
        [req.subject_ordinal],
      );
      const previousName = prior[0]?.display_name ?? "";
      await tx.unsafe(
        "UPDATE ledger.entry SET display_name = $2, updated_at = now() WHERE ordinal = $1 AND lifecycle <> 'VOIDED'",
        [req.subject_ordinal, req.proposed_display_name],
      );
      await appendEvent(tx, {
        type: "ledger.entry.corrected",
        actorType: "STEWARD",
        actorRef: args.actorLabel,
        subjectType: "ledger.entry",
        subjectRef: String(req.subject_ordinal),
        privacyClass: "PUBLIC",
        payload: {
          ordinal: req.subject_ordinal,
          fieldChanged: "display_name",
          previousName,
          newName: req.proposed_display_name,
        },
      });
      ordinal = req.subject_ordinal;
    }
    return { requestState: newState, ...(ordinal !== undefined ? { ordinal } : {}) };
  });
}

/**
 * Resolve a withdrawal request: the public identity becomes a PERMANENT
 * tombstone. The ordinal stays consumed forever and is never reassigned.
 */
export async function resolveWithdrawalRequest(args: {
  requestId: string;
  actorLabel: string;
  approve: boolean;
}): Promise<ResolutionResult> {
  if (!args.actorLabel.trim()) throw new StewardActionError("Actor label is required.");
  return getSql().begin(async (tx: OurSql) => {
    const rows = await tx.unsafe<{
      id: string;
      person_id: string;
      subject_ordinal: number | null;
      state: string;
    }[]>(
      "SELECT id, person_id, subject_ordinal, state FROM private.withdrawal_request WHERE id = $1 FOR UPDATE",
      [args.requestId],
    );
    const req = rows[0];
    if (!req) throw new StewardActionError("Request not found.");
    if (req.state !== "REQUESTED") throw new StewardActionError("Request already resolved.");

    const newState = args.approve ? "APPROVED" : "REJECTED";
    await tx.unsafe(
      "UPDATE private.withdrawal_request SET state = $2, resolved_at = now(), resolved_by_actor = $3 WHERE id = $1",
      [req.id, newState, args.actorLabel],
    );

    let ordinal: number | undefined = req.subject_ordinal ?? undefined;
    if (args.approve && req.subject_ordinal !== null) {
      await tx.unsafe(
        "UPDATE ledger.entry SET lifecycle = 'WITHDRAWN', display_state = 'TOMBSTONED', updated_at = now() WHERE ordinal = $1",
        [req.subject_ordinal],
      );
      // Relays from a withdrawn place can no longer be used for attribution.
      await tx.unsafe(
        "UPDATE private.relay_token_record r SET state = 'REVOKED', revoked_at = now(), revoke_reason = 'predecessor-withdrawn' WHERE r.predecessor_entry_id = (SELECT id FROM ledger.entry WHERE ordinal = $1) AND r.state = 'ACTIVE'",
        [req.subject_ordinal],
      );
      await appendEvent(tx, {
        type: "ledger.entry.withdrawn",
        actorType: "STEWARD",
        actorRef: args.actorLabel,
        subjectType: "ledger.entry",
        subjectRef: String(req.subject_ordinal),
        privacyClass: "PUBLIC",
        payload: {
          ordinal: req.subject_ordinal,
          outcome: "PUBLIC_TOMBSTONE",
          note: "Ordinal permanently retired; never reassigned.",
        },
      });
      ordinal = req.subject_ordinal;
    }
    return { requestState: newState, ...(ordinal !== undefined ? { ordinal } : {}) };
  });
}

/** Void an entry after an integrity review (e.g. duplicate self-referral). */
export async function voidEntryAfterReview(args: {
  ordinal: number;
  caseId: string | null;
  actorLabel: string;
  reason: string;
}): Promise<void> {
  if (!args.reason.trim()) throw new StewardActionError("A reason is required for voiding.");
  return getSql().begin(async (tx: OurSql) => {
    const rows = await tx.unsafe<{ id: string; lifecycle: string }[]>(
      "SELECT id, lifecycle FROM ledger.entry WHERE ordinal = $1 FOR UPDATE",
      [args.ordinal],
    );
    const entry = rows[0];
    if (!entry) throw new StewardActionError("Entry not found.");
    if (entry.lifecycle === "VOIDED") throw new StewardActionError("Entry already voided.");

    await tx.unsafe(
      "UPDATE ledger.entry SET lifecycle = 'VOIDED', display_state = 'TOMBSTONED', updated_at = now() WHERE id = $1",
      [entry.id],
    );
    // Remove continuation edges that depended on this entry's validity.
    await tx.unsafe("DELETE FROM ledger.first_continuation WHERE successor_entry_id = $1", [entry.id]);
    await tx.unsafe(
      "UPDATE private.relay_token_record SET state = 'REVOKED', revoked_at = now(), revoke_reason = 'entry-voided' WHERE predecessor_entry_id = $1 AND state = 'ACTIVE'",
      [entry.id],
    );
    if (args.caseId) {
      await tx.unsafe(
        "UPDATE private.review_case SET state = 'RESOLVED_VOIDED', resolved_at = now(), resolved_by_actor = $2, resolution_notes = $3 WHERE id = $1",
        [args.caseId, args.actorLabel, args.reason],
      );
    }
    await appendEvent(tx, {
      type: "ledger.entry.voided",
      actorType: "STEWARD",
      actorRef: args.actorLabel,
      subjectType: "ledger.entry",
      subjectRef: String(args.ordinal),
      privacyClass: "PUBLIC",
      payload: {
        ordinal: args.ordinal,
        reason: args.reason,
        caseId: args.caseId,
        note: "Reviewed invalid entry. Ordinal retired as tombstone; never reassigned.",
      },
    });
  });
}

/** Open a named integrity review case (private). */
export async function openReviewCase(inputArgs: {
  kind: string;
  subjectOrdinal?: number;
  openedByActor: string;
  openedReason: string;
}): Promise<string> {
  const sql = getSql();
  const rows = await sql.unsafe<{ id: string }[]>(
    "INSERT INTO private.review_case (kind, subject_ordinal, opened_by_actor, opened_reason) VALUES ($1, $2, $3, $4) RETURNING id",
    [inputArgs.kind, inputArgs.subjectOrdinal ?? null, inputArgs.openedByActor, inputArgs.openedReason],
  );
  const id = rows[0]?.id;
  if (!id) throw new StewardActionError("Could not open review case.");
  return id;
}

