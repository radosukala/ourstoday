/**
 * Canonical Founding Ledger records.
 *
 * - ledger.system_state: singleton write gate (CLOSED | OPEN | PAUSED)
 * - ledger.ordinal_counter: row-locked allocator, incremented inside the seal
 *   transaction only; rollback rolls back allocation
 * - ledger.entry: one active entry per person (partial unique index)
 * - ledger.event: append-only canonical events (UPDATE/DELETE rejected by trigger)
 * - relay edges: arrivals always recorded; First Continuation raced atomically
 */
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ledgerNs = pgSchema("ledger");

export const systemState = ledgerNs.table("system_state", {
  id: integer("id").primaryKey(),
  mode: text("mode").notNull().default("CLOSED"),
  declarationVersion: text("declaration_version").notNull(),
  protocolVersion: text("protocol_version").notNull(),
  legalStatusVersion: text("legal_status_version").notNull(),
  privacyVersion: text("privacy_version").notNull(),
  changedByActor: text("changed_by_actor"),
  changedReason: text("changed_reason"),
  changedAt: timestamp("changed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const ordinalCounter = ledgerNs.table("ordinal_counter", {
  id: integer("id").primaryKey(),
  nextOrdinal: integer("next_ordinal").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const entry = ledgerNs.table(
  "entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ordinal: integer("ordinal").notNull(),
    /** Null only for the declared origin row (genesis treatment is a recorded future decision). */
    personId: uuid("person_id"),
    displayName: text("display_name").notNull(),
    sealTs: timestamp("seal_ts", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    lifecycle: text("lifecycle").notNull().default("SEALED"),
    displayState: text("display_state").notNull().default("PUBLIC"),
    declarationVersion: text("declaration_version").notNull(),
    protocolVersion: text("protocol_version").notNull(),
    legalStatusVersion: text("legal_status_version").notNull(),
    originKind: text("origin_kind").notNull().default("DEFAULT_ENTRY"),
    predecessorEntryId: uuid("predecessor_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ledger_entry_ordinal_uq").on(t.ordinal),
    // At most ONE non-voided entry per authenticated person, enforced by the
    // database even under concurrency (voided entries free the person through review).
    uniqueIndex("ledger_entry_one_active_per_person_uq")
      .on(t.personId)
      .where(sql`person_id is not null and lifecycle <> 'VOIDED'`),
    index("ledger_entry_predecessor_idx").on(t.predecessorEntryId),
  ],
);

/** Append-only canonical events. No UPDATE, no DELETE - corrections append. */
export const event = ledgerNs.table(
  "event",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    id: uuid("id").notNull(),
    type: text("type").notNull(),
    schemaVersion: text("schema_version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    actorType: text("actor_type").notNull(),
    actorRef: text("actor_ref"),
    subjectType: text("subject_type").notNull(),
    subjectRef: text("subject_ref").notNull(),
    authorityRef: text("authority_ref"),
    priorEventId: uuid("prior_event_id"),
    privacyClass: text("privacy_class").notNull().default("PUBLIC"),
    idempotencyKey: text("idempotency_key"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    prevDigest: text("prev_digest"),
    digest: text("digest").notNull(),
  },
  (t) => [
    uniqueIndex("ledger_event_id_uq").on(t.id),
    index("ledger_event_subject_idx").on(t.subjectType, t.subjectRef),
    index("ledger_event_type_idx").on(t.type),
  ],
);

export const relayArrival = ledgerNs.table(
  "relay_arrival",
  {
    successorEntryId: uuid("successor_entry_id")
      .primaryKey()
      .references(() => entry.id),
    predecessorEntryId: uuid("predecessor_entry_id").notNull(),
    relayTokenRecordId: uuid("relay_token_record_id"),
    arrivedAt: timestamp("arrived_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("ledger_arrival_predecessor_idx").on(t.predecessorEntryId)],
);

/**
 * First Continuation race: INSERT ... ON CONFLICT DO NOTHING RETURNING decides
 * exactly one winner among concurrent successors.
 */
export const firstContinuation = ledgerNs.table("first_continuation", {
  predecessorEntryId: uuid("predecessor_entry_id")
    .primaryKey()
    .references(() => entry.id),
  successorEntryId: uuid("successor_entry_id")
    .notNull()
    .unique()
    .references(() => entry.id),
  recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
