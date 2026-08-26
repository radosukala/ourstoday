
/**
 * Private application records. Nothing here may appear in any public
 * projection. See docs/operations/DATA-MAP.md before adding fields.
 */
import {
  bigint,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const privateNs = pgSchema("private");

/** One private record per authenticated person. */
export const person = privateNs.table(
  "person",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: text("auth_user_id").notNull(),
    /** sha256(lowercased email); used to bind entry contexts without storing raw emails twice. */
    emailDigest: text("email_digest").notNull(),
    lifecycle: text("lifecycle").notNull().default("ACTIVE"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("private_person_auth_user_uq").on(t.authUserId)],
);

/** Entry draft: private until sealed. Never holds an ordinal. */
export const entryDraft = privateNs.table(
  "entry_draft",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    displayNameDraft: text("display_name_draft").notNull(),
    declarationVersion: text("declaration_version").notNull(),
    constitutionVersion: text("constitution_version").notNull(),
    protocolVersion: text("protocol_version").notNull(),
    privacyVersion: text("privacy_version").notNull(),
    legalStatusVersion: text("legal_status_version").notNull(),
    predecessorRelayRecordId: uuid("predecessor_relay_record_id"),
    state: text("state").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("private_entry_draft_person_idx").on(t.personId)],
);

/**
 * Short-lived, email-bound relay attribution context. Created ONLY when a
 * human requests a magic link - never by a relay GET. Lets a person open the
 * emailed confirmation on another device without putting the raw relay token
 * in the email.
 */
export const entryContext = privateNs.table(
  "entry_context",
  {
    /** Opaque high-entropy capability ID (32 random bytes, base64url). */
    id: text("id").primaryKey(),
    emailDigest: text("email_digest").notNull(),
    relayTokenRecordId: uuid("relay_token_record_id"),
    state: text("state").notNull().default("ACTIVE"),
    consumedByPersonId: uuid("consumed_by_person_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [index("private_entry_context_state_idx").on(t.state)],
);

/** Exact document versions accepted, purpose and server time. */
export const consentRecord = privateNs.table(
  "consent_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    documentVersions: jsonb("document_versions").$type<Record<string, string>>().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    supersededById: uuid("superseded_by_id"),
  },
  (t) => [index("private_consent_person_idx").on(t.personId)],
);

/**
 * Idempotency records. Unique per (person, operation, key); the stored
 * request digest makes same-key-different-input return a conflict instead of
 * a second entry.
 */
export const idempotencyRecord = privateNs.table(
  "idempotency_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    operation: text("operation").notNull(),
    key: text("key").notNull(),
    requestDigest: text("request_digest").notNull(),
    status: text("status").notNull().default("COMMITTED"),
    resultSnapshot: jsonb("result_snapshot").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("private_idempotency_uq").on(t.personId, t.operation, t.key)],
);

/**
 * Relay token records: digest of the JTI only - never the reusable raw token.
 */
export const relayTokenRecord = privateNs.table(
  "relay_token_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jtiDigest: text("jti_digest").notNull(),
    predecessorEntryId: uuid("predecessor_entry_id").notNull(),
    channelHint: text("channel_hint").notNull().default("direct"),
    signingKeyVersion: integer("signing_key_version").notNull(),
    state: text("state").notNull().default("ACTIVE"),
    issuedAt: timestamp("issued_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    revokeReason: text("revoke_reason"),
  },
  (t) => [
    uniqueIndex("private_relay_jti_digest_uq").on(t.jtiDigest),
    index("private_relay_predecessor_idx").on(t.predecessorEntryId),
  ],
);

export const withdrawalRequest = privateNs.table(
  "withdrawal_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    subjectOrdinal: integer("subject_ordinal"),
    reasonCode: text("reason_code").notNull(),
    reasonDetail: text("reason_detail"),
    state: text("state").notNull().default("REQUESTED"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedByActor: text("resolved_by_actor"),
    receiptEventId: uuid("receipt_event_id"),
  },
  (t) => [index("private_withdrawal_person_idx").on(t.personId, t.state)],
);

export const correctionRequest = privateNs.table(
  "correction_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    subjectOrdinal: integer("subject_ordinal"),
    proposedDisplayName: text("proposed_display_name").notNull(),
    reasonDetail: text("reason_detail"),
    state: text("state").notNull().default("REQUESTED"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedByActor: text("resolved_by_actor"),
    receiptEventId: uuid("receipt_event_id"),
  },
  (t) => [index("private_correction_person_idx").on(t.personId, t.state)],
);

/** Private integrity review cases. Risk data never leaves this table. */
export const reviewCase = privateNs.table(
  "review_case",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    subjectOrdinal: integer("subject_ordinal"),
    subjectPersonId: uuid("subject_person_id"),
    openedReason: text("opened_reason").notNull(),
    openedByActor: text("opened_by_actor").notNull(),
    state: text("state").notNull().default("OPEN"),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedByActor: text("resolved_by_actor"),
    resolutionNotes: text("resolution_notes"),
  },
  (t) => [index("private_review_state_idx").on(t.state)],
);

/**
 * Named human steward assignments. Stewards are never authorized through a
 * client-provided list; bootstrap happens through a controlled script that
 * writes a receipt event.
 */
export const stewardAssignment = privateNs.table(
  "steward_assignment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorLabel: text("actor_label").notNull(),
    purpose: text("purpose").notNull(),
    grantedBy: text("granted_by").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [index("private_steward_actor_idx").on(t.actorLabel)],
);

/** Application-level database rate limits (per bucket, sliding window). */
export const appRateLimit = privateNs.table(
  "app_rate_limit",
  {
    bucketKey: text("bucket_key").primaryKey(),
    windowStartMs: bigint("window_start_ms", { mode: "number" }).notNull(),
    count: bigint("count", { mode: "number" }).notNull(),
  },
);

/** sha256 helper lives in src/security/digest.ts to keep this file pure DDL mapping. */

