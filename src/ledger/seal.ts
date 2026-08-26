import { config } from "@/config";
import { getSql, jsonParam, toDate, tsParam, type DbTimestamp, type OurSql } from "@/db/sqltype";
import type { DocumentVersions } from "@/legal/documents";
import { signRelayToken } from "@/security/relay";
import { sha256Hex } from "@/security/digest";
import {
  AlreadySealedError,
  IdempotencyConflictError,
  InvalidRelayError,
  LedgerClosedError,
  SelfReferralBlockedError,
  StaleConsentError,
} from "./errors";
import { digestEvent, newEventId } from "./events";

/**
 * The canonical entry seal. ONE PostgreSQL transaction performs every effect:
 * idempotency claim, ordinal allocation under a row lock, the entry row, the
 * sealed event, arrival recording, the atomic First Continuation race and the
 * initial relay issuance. Nothing observable escapes before commit; a failed
 * transaction consumes no ordinal.
 */

export interface SealInput {
  authUserId: string;
  displayName: string;
  acceptedVersions: DocumentVersions;
  idempotencyKey: string;
  predecessor?: { entryId: string; relayRecordId: string };
}

export interface SealResult {
  state: "SEALED";
  ordinal: number;
  entryId: string;
  sealTs: Date;
  displayName: string;
  /** Raw relay token for THIS entrant. Returned exactly once, never stored raw. */
  relayToken: string;
  /** The predecessor's ordinal when this entry arrived through a relay. */
  predecessorOrdinal?: number;
  /**
   * True when this entry won the race to be that predecessor's First
   * Continuation. Separate from predecessorOrdinal: arriving through a relay
   * is lineage, winning the race is an additional, exclusive fact.
   */
  isFirstContinuation: boolean;
  receipt: SealReceipt;
}

export interface SealReceipt {
  headline: string;
  lines: [string, string][];
  legalStatus: string;
  shareCopySuggestion: string;
}

/** Normalize once here so validation, digest and storage agree byte-for-byte. */
export function normalizeDisplayName(raw: string): string {
  // Strip control/format characters, collapse whitespace. No other rewriting.
  return raw
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface EntryRow {
  id: string;
  ordinal: number;
  display_name: string;
  seal_ts: DbTimestamp;
  predecessor_entry_id: string | null;
}

function buildReceipt(ordinal: number, isFirstContinuation: boolean): SealReceipt {
  const padded = String(ordinal).padStart(6, "0");
  return {
    headline: isFirstContinuation
      ? "The line continued through you."
      : "You are in the Founding Ledger.",
    lines: [
      ["PUBLIC NUMBER", "#".concat(padded, " - assigned when your verified entry was sealed.")],
      ["WHAT THIS IS", "A chronological Founding Ledger place. Not a share, security or token."],
      ["WHAT THIS IS NOT", "Not legal membership. Not an extra vote. Not transferable."],
      ["YOUR RELAY", "Issued after commit. Carry it if and where you choose."],
    ],
    legalStatus: "OWNERSHIP: COMMITTED \u00b7 LEGAL MEMBERSHIP: NOT YET ISSUED",
    shareCopySuggestion: "I entered the Founding Ledger of OURS as #".concat(
      padded,
      ".\n\nThe network is ours. Everything else can be built.",
    ),
  };
}

export async function sealEntry(input: SealInput): Promise<SealResult> {
  const cfg = config();
  const displayName = normalizeDisplayName(input.displayName);

  if (displayName.length < 2 || displayName.length > 40) {
    throw new Error("DISPLAY_NAME_LENGTH");
  }

  return getSql().begin(async (tx: OurSql): Promise<SealResult> => {
    // ---- Gate 1: environment + database mode --------------------------------
    const state = await tx.unsafe<{ mode: string }[]>(
      "SELECT mode FROM ledger.system_state WHERE id = 1 FOR SHARE",
    );
    const mode = state[0]?.mode ?? "CLOSED";
    if (!cfg.allowCanonicalWrites || mode !== "OPEN") throw new LedgerClosedError(mode);

    // ---- Gate 2: person ------------------------------------------------------
    const person = await tx.unsafe<{ id: string; email_verified_at: DbTimestamp | null }[]>(
      "SELECT id, email_verified_at FROM private.person WHERE auth_user_id = $1",
      [input.authUserId],
    );
    if (!person[0]) throw new Error("PERSON_NOT_FOUND");
    if (!person[0].email_verified_at && !process.env.OURS_ALLOW_UNVERIFIED_SEAL) {
      throw new StaleConsentError();
    }

    // ---- Gate 3: consent versions must match live system state ---------------
    const versionsRow = await tx.unsafe<
      {
        declaration_version: string;
        protocol_version: string;
        legal_status_version: string;
        privacy_version: string;
      }[]
    >(
      "SELECT declaration_version, protocol_version, legal_status_version, privacy_version FROM ledger.system_state WHERE id = 1",
    );
    const v = versionsRow[0];
    if (
      !v ||
      input.acceptedVersions.declaration !== v.declaration_version ||
      input.acceptedVersions.protocol !== v.protocol_version ||
      input.acceptedVersions.legalStatus !== v.legal_status_version ||
      input.acceptedVersions.privacyNotice !== v.privacy_version
    ) {
      throw new StaleConsentError();
    }

    // ---- Idempotency claim ----------------------------------------------------
    const requestDigest = sha256Hex(
      JSON.stringify({
        op: "entry.seal",
        displayName,
        acceptedVersions: input.acceptedVersions,
        predecessorEntryId: input.predecessor?.entryId ?? null,
      }),
    );
    const claimed = await tx.unsafe<{ id: string }[]>(
      "INSERT INTO private.idempotency_record (person_id, operation, key, request_digest) VALUES ($1, 'entry.seal', $2, $3) ON CONFLICT (person_id, operation, key) DO NOTHING RETURNING id",
      [person[0].id, input.idempotencyKey, requestDigest],
    );

    if (!claimed[0]) {
      const existing = await tx.unsafe<
        {
          request_digest: string;
          status: string;
          result_snapshot: Record<string, unknown> | null;
        }[]
      >(
        "SELECT request_digest, status, result_snapshot FROM private.idempotency_record WHERE person_id = $1 AND operation = 'entry.seal' AND key = $2",
        [person[0].id, input.idempotencyKey],
      );
      if (existing[0]?.request_digest !== requestDigest) throw new IdempotencyConflictError();
      if (existing[0]?.status === "COMMITTED" && existing[0].result_snapshot) {
        const snap = existing[0].result_snapshot as unknown as {
          ordinal: number;
          entryId: string;
          sealTs: string;
          displayName: string;
          predecessorOrdinal?: number;
          isFirstContinuation?: boolean;
        };
        // Same key + same input returns the SAME result. The original relay
        // token is never replayed; a fresh one can be minted separately.
        return {
          state: "SEALED",
          ordinal: snap.ordinal,
          entryId: snap.entryId,
          sealTs: new Date(snap.sealTs),
          displayName: snap.displayName,
          ...(snap.predecessorOrdinal !== undefined
            ? { predecessorOrdinal: snap.predecessorOrdinal }
            : {}),
          isFirstContinuation: snap.isFirstContinuation === true,
          relayToken: "",
          receipt: buildReceipt(snap.ordinal, snap.isFirstContinuation === true),
        };
      }
      throw new Error("IDEMPOTENCY_PENDING");
    }

    // ---- Gate 4: one active entry per person ---------------------------------
    const prior = await tx.unsafe<EntryRow[]>(
      "SELECT id, ordinal, display_name, seal_ts, predecessor_entry_id FROM ledger.entry WHERE person_id = $1 AND lifecycle <> 'VOIDED' LIMIT 1",
      [person[0].id],
    );
    if (prior[0]) throw new AlreadySealedError(prior[0].ordinal);

    // ---- Predecessor revalidation inside the transaction ---------------------
    let predecessorOrdinal: number | undefined;
    if (input.predecessor) {
      const pred = await tx.unsafe<{ id: string; person_id: string | null; lifecycle: string }[]>(
        "SELECT id, person_id, lifecycle FROM ledger.entry WHERE id = $1",
        [input.predecessor.entryId],
      );
      if (!pred[0]) throw new InvalidRelayError("predecessor-missing");
      if (pred[0].lifecycle !== "SEALED") throw new InvalidRelayError("predecessor-not-sealed");
      if (pred[0].person_id === person[0].id) throw new SelfReferralBlockedError();
      const record = await tx.unsafe<{ state: string; predecessor_entry_id: string }[]>(
        "SELECT state, predecessor_entry_id FROM private.relay_token_record WHERE id = $1",
        [input.predecessor.relayRecordId],
      );
      if (
        !record[0] ||
        record[0].state !== "ACTIVE" ||
        record[0].predecessor_entry_id !== input.predecessor.entryId
      ) {
        throw new InvalidRelayError("relay-record-invalid");
      }
      const ord = await tx.unsafe<{ ordinal: number }[]>(
        "SELECT ordinal FROM ledger.entry WHERE id = $1",
        [input.predecessor.entryId],
      );
      predecessorOrdinal = ord[0]?.ordinal;
    }

    // ---- Row-locked ordinal allocation ----------------------------------------
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('ledger.ordinal_counter'))");
    const counter = await tx.unsafe<{ next_ordinal: number }[]>(
      "SELECT next_ordinal FROM ledger.ordinal_counter WHERE id = 1 FOR UPDATE",
    );
    if (!counter[0]) throw new Error("ORDINAL_COUNTER_MISSING");
    const ordinal = counter[0].next_ordinal;
    await tx.unsafe(
      "UPDATE ledger.ordinal_counter SET next_ordinal = $1, updated_at = now() WHERE id = 1",
      [ordinal + 1],
    );

    // ---- Insert the canonical entry --------------------------------------------
    const inserted = await tx.unsafe<EntryRow[]>(
      "INSERT INTO ledger.entry (ordinal, person_id, display_name, declaration_version, protocol_version, legal_status_version, origin_kind, predecessor_entry_id) VALUES ($1, $2, $3, $4, $5, $6, 'DEFAULT_ENTRY', $7) RETURNING id, ordinal, display_name, seal_ts, predecessor_entry_id",
      [
        ordinal,
        person[0].id,
        displayName,
        v.declaration_version,
        v.protocol_version,
        v.legal_status_version,
        input.predecessor?.entryId ?? null,
      ],
    );
    const entry = inserted[0];
    if (!entry) throw new Error("ENTRY_INSERT_FAILED");

    // ---- Append-only events (chain serialized by advisory lock) ----------------
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('ledger.event.chain'))");

    let lastDigestRow = await tx.unsafe<{ digest: string | null }[]>(
      "SELECT digest FROM ledger.event ORDER BY seq DESC LIMIT 1",
    );

    async function appendEvent(args: {
      id: string;
      type: string;
      actorType: "PERSON" | "STEWARD" | "SERVICE" | "SYSTEM" | "FOUNDER_STEWARD";
      actorRef?: string;
      subjectType: string;
      subjectRef: string;
      authorityRef?: string;
      privacyClass: "PUBLIC" | "INTERNAL" | "PRIVATE";
      idempotencyKey?: string;
      payload: Record<string, unknown>;
    }): Promise<void> {
      const prevDigest = lastDigestRow[0]?.digest ?? null;
      const occurredAt = new Date();
      // canonicalJson, not JSON.stringify: PostgreSQL jsonb does not preserve
      // key insertion order, so an order-dependent digest cannot be recomputed
      // from the stored row and the integrity chain becomes unverifiable.
      const digest = digestEvent({
        type: args.type,
        payload: args.payload,
        occurredAt,
        prevDigest,
      });
      await tx.unsafe(
        "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, idempotency_key, payload, prev_digest, digest) VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, $10, $11, $12::text::jsonb, $13, $14)",
        [
          args.id,
          args.type,
          "ours.founding-relay/0.1",
          tsParam(occurredAt),
          args.actorType,
          args.actorRef ?? null,
          args.subjectType,
          args.subjectRef,
          args.authorityRef ?? null,
          args.privacyClass,
          args.idempotencyKey ?? null,
          jsonParam(args.payload),
          prevDigest,
          digest,
        ],
      );
      lastDigestRow = [{ digest }] as unknown as typeof lastDigestRow;
    }

    const sealedEventId = newEventId();
    await appendEvent({
      id: sealedEventId,
      type: "ledger.entry.sealed",
      actorType: "PERSON",
      actorRef: String(person[0].id),
      subjectType: "ledger.entry",
      subjectRef: entry.id,
      authorityRef: "ours.founding-relay/0.1",
      privacyClass: "PUBLIC",
      idempotencyKey: input.idempotencyKey,
      payload: {
        ordinal: entry.ordinal,
        entryId: entry.id,
        declarationVersion: v.declaration_version,
        protocolVersion: v.protocol_version,
        legalStatusVersion: v.legal_status_version,
        ...(predecessorOrdinal !== undefined ? { predecessorOrdinal } : {}),
      },
    });

    // ---- Arrival + atomic First Continuation race -------------------------------
    let isFirstContinuation = false;
    if (input.predecessor && predecessorOrdinal !== undefined) {
      await tx.unsafe(
        "INSERT INTO ledger.relay_arrival (successor_entry_id, predecessor_entry_id, relay_token_record_id) VALUES ($1, $2, $3)",
        [entry.id, input.predecessor.entryId, input.predecessor.relayRecordId],
      );
      const wonFc = await tx.unsafe<{ predecessor_entry_id: string }[]>(
        "INSERT INTO ledger.first_continuation (predecessor_entry_id, successor_entry_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING predecessor_entry_id",
        [input.predecessor.entryId, entry.id],
      );
      const won = Boolean(wonFc[0]);
      isFirstContinuation = won;
      await appendEvent({
        id: newEventId(),
        type: won ? "relay.first_continuation.recorded" : "relay.arrival.recorded",
        actorType: "SERVICE",
        subjectType: "ledger.entry",
        subjectRef: entry.id,
        authorityRef: "ours.founding-relay/0.1",
        privacyClass: "PUBLIC",
        payload: {
          ordinal: entry.ordinal,
          predecessorOrdinal,
          outcome: won ? "FIRST_CONTINUATION" : "ATTRIBUTED_ARRIVAL",
        },
      });
    }

    // ---- Issue this entrant's initial relay ---------------------------------------
    const signed = signRelayToken(cfg.relaySecrets);
    const jtiDigest = sha256Hex(signed.payload.jti);
    const relayRec = await tx.unsafe<{ id: string }[]>(
      "INSERT INTO private.relay_token_record (jti_digest, predecessor_entry_id, channel_hint, signing_key_version) VALUES ($1, $2, 'direct', $3) RETURNING id",
      [jtiDigest, entry.id, signed.payload.kv],
    );
    if (!relayRec[0]) throw new Error("RELAY_RECORD_INSERT_FAILED");

    await appendEvent({
      id: newEventId(),
      type: "relay.issued",
      actorType: "SERVICE",
      subjectType: "private.relay_token_record",
      subjectRef: relayRec[0].id,
      authorityRef: "ours.founding-relay/0.1",
      privacyClass: "INTERNAL",
      payload: { ordinal: entry.ordinal, channelHint: "direct", keyVersion: signed.payload.kv },
    });

    // ---- Persist the idempotent snapshot (public-safe fields only) ---------------
    const snapshot = {
      ordinal: entry.ordinal,
      entryId: entry.id,
      sealTs: toDate(entry.seal_ts).toISOString(),
      displayName: entry.display_name,
      ...(predecessorOrdinal !== undefined ? { predecessorOrdinal } : {}),
      isFirstContinuation,
    };
    await tx.unsafe(
      "UPDATE private.idempotency_record SET status = 'COMMITTED', result_snapshot = $1::text::jsonb WHERE operation = 'entry.seal' AND person_id = $2 AND key = $3",
      [jsonParam(snapshot), person[0].id, input.idempotencyKey],
    );

    return {
      state: "SEALED",
      ordinal: entry.ordinal,
      entryId: entry.id,
      sealTs: toDate(entry.seal_ts),
      displayName: entry.display_name,
      ...(predecessorOrdinal !== undefined ? { predecessorOrdinal } : {}),
      isFirstContinuation,
      relayToken: signed.token,
      receipt: buildReceipt(entry.ordinal, isFirstContinuation),
    };
  });
}
