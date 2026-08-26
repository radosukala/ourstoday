
-- Private application records. NOTHING in this schema may appear in a public projection.
CREATE TABLE IF NOT EXISTS private.person (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id text NOT NULL,
  email_digest text NOT NULL,
  lifecycle text NOT NULL DEFAULT 'ACTIVE',
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS private_person_auth_user_uq ON private.person (auth_user_id);

CREATE TABLE IF NOT EXISTS private.entry_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES private.person (id) ON DELETE CASCADE,
  display_name_draft text NOT NULL,
  declaration_version text NOT NULL,
  constitution_version text NOT NULL,
  protocol_version text NOT NULL,
  privacy_version text NOT NULL,
  legal_status_version text NOT NULL,
  predecessor_relay_record_id uuid,
  state text NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS private_entry_draft_person_idx ON private.entry_draft (person_id);

-- Short-lived, email-bound relay attribution context. Created ONLY when a
-- human requests a magic link; NEVER by a relay GET.
CREATE TABLE IF NOT EXISTS private.entry_context (
  id text PRIMARY KEY,
  email_digest text NOT NULL,
  relay_token_record_id uuid,
  state text NOT NULL DEFAULT 'ACTIVE',
  consumed_by_person_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS private_entry_context_state_idx ON private.entry_context (state);

CREATE TABLE IF NOT EXISTS private.consent_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES private.person (id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id uuid,
  document_versions jsonb NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  superseded_by_id uuid
);
CREATE INDEX IF NOT EXISTS private_consent_person_idx ON private.consent_record (person_id);

CREATE TABLE IF NOT EXISTS private.idempotency_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES private.person (id) ON DELETE CASCADE,
  operation text NOT NULL,
  key text NOT NULL,
  request_digest text NOT NULL,
  status text NOT NULL DEFAULT 'COMMITTED',
  result_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Same (person, operation, key) is ONE canonical result; different input conflicts.
CREATE UNIQUE INDEX IF NOT EXISTS private_idempotency_uq
  ON private.idempotency_record (person_id, operation, key);

-- Relay token records store the JTI digest only - never the reusable raw token.
CREATE TABLE IF NOT EXISTS private.relay_token_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jti_digest text NOT NULL,
  predecessor_entry_id uuid NOT NULL,
  channel_hint text NOT NULL DEFAULT 'direct',
  signing_key_version integer NOT NULL,
  state text NOT NULL DEFAULT 'ACTIVE',
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoke_reason text
);
CREATE UNIQUE INDEX IF NOT EXISTS private_relay_jti_digest_uq ON private.relay_token_record (jti_digest);
CREATE INDEX IF NOT EXISTS private_relay_predecessor_idx ON private.relay_token_record (predecessor_entry_id);

CREATE TABLE IF NOT EXISTS private.withdrawal_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES private.person (id) ON DELETE CASCADE,
  subject_ordinal integer,
  reason_code text NOT NULL,
  reason_detail text,
  state text NOT NULL DEFAULT 'REQUESTED',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_actor text,
  receipt_event_id uuid
);
CREATE INDEX IF NOT EXISTS private_withdrawal_person_idx ON private.withdrawal_request (person_id, state);

CREATE TABLE IF NOT EXISTS private.correction_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES private.person (id) ON DELETE CASCADE,
  subject_ordinal integer,
  proposed_display_name text NOT NULL,
  reason_detail text,
  state text NOT NULL DEFAULT 'REQUESTED',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_actor text,
  receipt_event_id uuid
);
CREATE INDEX IF NOT EXISTS private_correction_person_idx ON private.correction_request (person_id, state);

CREATE TABLE IF NOT EXISTS private.review_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  subject_ordinal integer,
  subject_person_id uuid,
  opened_reason text NOT NULL,
  opened_by_actor text NOT NULL,
  state text NOT NULL DEFAULT 'OPEN',
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_actor text,
  resolution_notes text
);
CREATE INDEX IF NOT EXISTS private_review_state_idx ON private.review_case (state);

-- Named human steward assignments; never client-provided lists.
CREATE TABLE IF NOT EXISTS private.steward_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_label text NOT NULL,
  purpose text NOT NULL,
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS private_steward_actor_idx ON private.steward_assignment (actor_label);

-- Application-level database-backed rate limits.
CREATE TABLE IF NOT EXISTS private.app_rate_limit (
  bucket_key text PRIMARY KEY,
  window_start_ms bigint NOT NULL,
  count bigint NOT NULL
);

