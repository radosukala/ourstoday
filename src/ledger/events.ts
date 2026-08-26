
import { sha256Hex, canonicalJson } from "@/security/digest";

/** Canonical event types (Founding Relay Protocol section 11). */
export const EVENT_SCHEMA_VERSION = "ours.founding-relay/0.1";

export type EventType =
  | "ledger.entry.sealed"
  | "ledger.entry.corrected"
  | "ledger.entry.withdrawn"
  | "ledger.entry.review_opened"
  | "ledger.entry.voided"
  | "relay.issued"
  | "relay.revoked"
  | "relay.arrival.recorded"
  | "relay.first_continuation.recorded"
  | "ledger.system_state.changed";

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
 * Callers must serialize appends (the seal service holds a transaction-
 * scoped advisory lock while appending).
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

