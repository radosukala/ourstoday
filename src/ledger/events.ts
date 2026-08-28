import { sha256Hex, canonicalJson } from "@/security/digest";

/**
 * Canonical event types.
 *
 * This union is the machine-readable half of docs/EVENT-SCHEMA-1.0.md, which
 * is published as a versioned public standard in the same tier as the
 * Constitution. A breaking change to it is a constitutional amendment, not a
 * refactor: anyone may build their own read model over this log, and they are
 * entitled to know when its meaning changes.
 */
export const EVENT_SCHEMA_VERSION = "ours.founding-relay/0.1";

/** Events the application appends today. */
export type ImplementedEventType =
  | "ledger.entry.sealed"
  | "ledger.entry.witnessed"
  | "ledger.entry.corrected"
  | "ledger.entry.withdrawn"
  | "ledger.entry.review_opened"
  | "ledger.entry.voided"
  | "notice.given"
  | "notice.withdrawn"
  | "relay.issued"
  | "relay.revoked"
  | "relay.arrival.recorded"
  | "relay.first_continuation.recorded"
  | "ledger.system_state.changed"
  | "ledger.gate.changed"
  | "anchor.published"
  | "build.deployed"
  | "conformance.verified"
  | "conformance.failed";

/**
 * Reserved and deliberately unimplemented.
 *
 * Reserving the names now fixes the shape before there is money to be
 * embarrassed about or an agent population to argue over. Nothing appends
 * these yet, and the writer refuses them at runtime so a reservation cannot
 * quietly become a feature.
 *
 * treasury.*   - every cent in and out as a projection of this same log, so
 *                "our share never exceeds 5%" becomes checkable rather than
 *                promised.
 * instrument.* - agents admitted as a NAMED NON-PERSON CLASS. An instrument
 *                acts only as the disclosed agent of exactly one human entry,
 *                has no ordinal, no place, no vote, no continuation and no
 *                standing, and every action names its principal's ordinal.
 */
export type ReservedEventType =
  | "treasury.received"
  | "treasury.disbursed"
  | "treasury.reimbursed"
  | "instrument.registered"
  | "instrument.acted"
  | "instrument.revoked";

export type EventType = ImplementedEventType | ReservedEventType;

export const RESERVED_EVENT_TYPES: readonly ReservedEventType[] = [
  "treasury.received",
  "treasury.disbursed",
  "treasury.reimbursed",
  "instrument.registered",
  "instrument.acted",
  "instrument.revoked",
] as const;

export function isReservedEventType(type: string): type is ReservedEventType {
  return (RESERVED_EVENT_TYPES as readonly string[]).includes(type);
}

/**
 * Guard for every append path. A reserved type has a published name and no
 * implementation; appending one would put an event into the canonical log
 * that no documented reader knows how to interpret.
 */
export function assertAppendable(type: string): void {
  if (isReservedEventType(type)) {
    throw new Error(
      "Event type '" +
        type +
        "' is RESERVED and unimplemented. Implement it and document it in " +
        "EVENT-SCHEMA-1.0.md before appending it to the canonical log.",
    );
  }
}

export interface EventInput {
  type: EventType;
  actorType: "PERSON" | "STEWARD" | "SERVICE" | "SYSTEM" | "FOUNDER_STEWARD";
  actorRef?: string;
  subjectType: string;
  subjectRef: string;
  authorityRef?: string;
  priorEventId?: string;
  privacyClass: "PUBLIC" | "INTERNAL" | "PRIVATE";
  idempotencyKey?: string;
  payload: Record<string, unknown>;
}

/**
 * Integrity digest for one event. The chain links every event to its
 * predecessor so omission or rewriting is detectable after restore.
 *
 * The material is CANONICAL JSON with recursively sorted keys, not
 * JSON.stringify. PostgreSQL jsonb does not preserve key insertion order, so
 * an order-dependent digest could not be recomputed from a stored row and the
 * chain would be decorative. Callers must serialize appends (the seal service
 * holds a transaction-scoped advisory lock while appending).
 */
export function computeEventMaterial(event: {
  type: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  prevDigest: string | null;
}): string {
  return canonicalJson({
    type: event.type,
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
    prevDigest: event.prevDigest,
  });
}

export function digestEvent(event: Parameters<typeof computeEventMaterial>[0]): string {
  return sha256Hex(computeEventMaterial(event));
}

export function newEventId(): string {
  return crypto.randomUUID();
}
