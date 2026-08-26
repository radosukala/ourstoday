
-- Canonical Founding Ledger.

CREATE TABLE IF NOT EXISTS ledger.system_state (
  id integer PRIMARY KEY,
  mode text NOT NULL DEFAULT 'CLOSED' CHECK (mode IN ('CLOSED', 'OPEN', 'PAUSED')),
  declaration_version text NOT NULL,
  protocol_version text NOT NULL,
  legal_status_version text NOT NULL,
  privacy_version text NOT NULL,
  changed_by_actor text,
  changed_reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Singleton write gate: default CLOSED. Opening requires BOTH this row being
-- OPEN and ALLOW_CANONICAL_WRITES=true in the server environment.
INSERT INTO ledger.system_state (id, mode, declaration_version, protocol_version, legal_status_version, privacy_version)
VALUES (1, 'CLOSED', 'ours-founding-declaration/0.1', 'ours.founding-relay/0.1', 'ours-legal-status/0.1', 'ours-privacy-notice-draft/0.1')
ON CONFLICT (id) DO NOTHING;

-- Row-locked ordinal allocator. Incremented ONLY inside the seal transaction;
-- rollback rolls back allocation, so failed seals consume no number.
CREATE TABLE IF NOT EXISTS ledger.ordinal_counter (
  id integer PRIMARY KEY,
  next_ordinal integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ledger.ordinal_counter (id, next_ordinal) VALUES (1, 2)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ledger.entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordinal integer NOT NULL,
  -- Null only for the declared origin row; genesis treatment is a recorded future decision.
  person_id uuid,
  display_name text NOT NULL,
  seal_ts timestamptz NOT NULL DEFAULT now(),
  lifecycle text NOT NULL DEFAULT 'SEALED'
    CHECK (lifecycle IN ('SEALED', 'WITHDRAWN', 'UNDER_REVIEW', 'VOIDED', 'CLOSED')),
  display_state text NOT NULL DEFAULT 'PUBLIC' CHECK (display_state IN ('PUBLIC', 'TOMBSTONED')),
  declaration_version text NOT NULL,
  protocol_version text NOT NULL,
  legal_status_version text NOT NULL,
  origin_kind text NOT NULL DEFAULT 'DEFAULT_ENTRY' CHECK (origin_kind IN ('DEFAULT_ENTRY', 'DECLARED_ORIGIN')),
  predecessor_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_entry_ordinal_uq ON ledger.entry (ordinal);
-- At most ONE non-voided entry per authenticated person, even under concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS ledger_entry_one_active_per_person_uq
  ON ledger.entry (person_id) WHERE person_id IS NOT NULL AND lifecycle <> 'VOIDED';
CREATE INDEX IF NOT EXISTS ledger_entry_predecessor_idx ON ledger.entry (predecessor_entry_id);

-- Append-only canonical events.
CREATE TABLE IF NOT EXISTS ledger.event (
  seq bigserial PRIMARY KEY,
  id uuid NOT NULL,
  type text NOT NULL,
  schema_version text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('PERSON', 'STEWARD', 'SERVICE', 'SYSTEM', 'FOUNDER_STEWARD')),
  actor_ref text,
  subject_type text NOT NULL,
  subject_ref text NOT NULL,
  authority_ref text,
  prior_event_id uuid,
  privacy_class text NOT NULL DEFAULT 'PUBLIC' CHECK (privacy_class IN ('PUBLIC', 'INTERNAL', 'PRIVATE')),
  idempotency_key text,
  payload jsonb NOT NULL,
  prev_digest text,
  digest text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_event_id_uq ON ledger.event (id);
CREATE INDEX IF NOT EXISTS ledger_event_subject_idx ON ledger.event (subject_type, subject_ref);
CREATE INDEX IF NOT EXISTS ledger_event_type_idx ON ledger.event (type);

-- There is no direct "edit row" product operation for canonical events.
CREATE OR REPLACE FUNCTION ledger.forbid_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger.event is append-only: % is not permitted (use a corrective event)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_no_update ON ledger.event;
CREATE TRIGGER event_no_update BEFORE UPDATE ON ledger.event
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_event_mutation();
DROP TRIGGER IF EXISTS event_no_delete ON ledger.event;
CREATE TRIGGER event_no_delete BEFORE DELETE ON ledger.event
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_event_mutation();

CREATE TABLE IF NOT EXISTS ledger.relay_arrival (
  successor_entry_id uuid PRIMARY KEY REFERENCES ledger.entry (id),
  predecessor_entry_id uuid NOT NULL,
  relay_token_record_id uuid,
  arrived_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_arrival_predecessor_idx ON ledger.relay_arrival (predecessor_entry_id);

-- First Continuation race resolves via INSERT ... ON CONFLICT DO NOTHING RETURNING.
CREATE TABLE IF NOT EXISTS ledger.first_continuation (
  predecessor_entry_id uuid PRIMARY KEY REFERENCES ledger.entry (id),
  successor_entry_id uuid NOT NULL UNIQUE REFERENCES ledger.entry (id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Safe public projections. Only allowlisted fields are exposed; the automated
-- non-disclosure test enumerates these columns and fails on any private data.
CREATE OR REPLACE VIEW public.founding_ledger AS
SELECT
  e.ordinal,
  CASE WHEN e.display_state = 'PUBLIC' AND e.lifecycle <> 'VOIDED' THEN e.display_name END AS display_name,
  e.seal_ts AS entered_at,
  p.ordinal AS predecessor_ordinal,
  CASE WHEN fc.successor_entry_id IS NOT NULL THEN 'CONTINUED' ELSE 'OPEN' END AS relay_state,
  fco.ordinal AS first_continuation_ordinal,
  CASE WHEN e.display_state = 'PUBLIC' AND e.lifecycle <> 'VOIDED' THEN e.lifecycle ELSE 'WITHDRAWN' END AS public_status,
  e.declaration_version,
  e.protocol_version,
  'NOT YET ISSUED'::text AS legal_membership_status,
  e.origin_kind
FROM ledger.entry e
LEFT JOIN ledger.entry p ON p.id = e.predecessor_entry_id
LEFT JOIN ledger.first_continuation fc ON fc.predecessor_entry_id = e.id
LEFT JOIN ledger.entry fco ON fco.id = fc.successor_entry_id;

CREATE OR REPLACE VIEW public.system_status AS
SELECT
  s.mode,
  s.declaration_version,
  s.protocol_version,
  s.legal_status_version,
  (SELECT count(*) FROM ledger.entry WHERE lifecycle <> 'VOIDED')::integer AS entry_count,
  (SELECT count(*) FROM ledger.entry WHERE display_state = 'TOMBSTONED' OR lifecycle IN ('WITHDRAWN', 'VOIDED'))::integer AS withdrawn_count,
  s.changed_at AS state_changed_at
FROM ledger.system_state s WHERE s.id = 1;

-- Optional least-privilege runtime role. Providers that support roles should
-- create ours_app_runtime and connect as that role (see MIGRATIONS.md).
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ours_app_runtime') THEN
    GRANT USAGE ON SCHEMA auth, private, ledger TO ours_app_runtime;
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA auth TO ours_app_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO ours_app_runtime;
    -- Ledger: insert entries/events, update only lifecycle/display columns of entries.
    GRANT SELECT ON ALL TABLES IN SCHEMA ledger TO ours_app_runtime;
    GRANT INSERT ON ledger.entry, ledger.event, ledger.relay_arrival, ledger.first_continuation TO ours_app_runtime;
    GRANT UPDATE ON ledger.entry TO ours_app_runtime;
    GRANT SELECT ON public.founding_ledger, public.system_status TO ours_app_runtime;
  END IF;
END $$;

