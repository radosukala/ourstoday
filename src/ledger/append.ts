import { jsonParam, tsParam, type OurSql } from "@/db/sqltype";
import {
  assertAppendable,
  digestEvent,
  newEventId,
  EVENT_SCHEMA_VERSION,
  type EventType,
} from "./events";

/**
 * The one place a canonical event is written.
 *
 * The seal service keeps its own inlined append because it holds the chain
 * lock for a whole multi-event transaction and threads the running digest
 * through several appends. Everything else - stewardship, state transitions,
 * anchors, conformance, deploys - comes through here, so a single function
 * owns the chain lock, the reserved-type guard and the digest material.
 *
 * Callers MUST already be inside a transaction. An event appended outside one
 * cannot be rolled back with the change it describes, and a record that
 * disagrees with itself is worse than no record.
 */
export async function appendCanonicalEvent(
  tx: OurSql,
  args: {
    type: EventType;
    actorType: "PERSON" | "STEWARD" | "SERVICE" | "SYSTEM" | "FOUNDER_STEWARD";
    actorRef?: string;
    subjectType: string;
    subjectRef: string;
    authorityRef?: string;
    privacyClass: "PUBLIC" | "INTERNAL" | "PRIVATE";
    idempotencyKey?: string;
    payload: Record<string, unknown>;
  },
): Promise<{ id: string; digest: string }> {
  assertAppendable(args.type);

  // Serialize appends so the chain has one writer at a time.
  await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('ledger.event.chain'))");
  const last = await tx.unsafe<{ digest: string | null }[]>(
    "SELECT digest FROM ledger.event ORDER BY seq DESC LIMIT 1",
  );
  const prevDigest = last[0]?.digest ?? null;
  const occurredAt = new Date();
  const digest = digestEvent({
    type: args.type,
    payload: args.payload,
    occurredAt,
    prevDigest,
  });
  const id = newEventId();

  await tx.unsafe(
    "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, idempotency_key, payload, prev_digest, digest) VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, $10, $11, $12::text::jsonb, $13, $14)",
    [
      id,
      args.type,
      EVENT_SCHEMA_VERSION,
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

  return { id, digest };
}
