-- Vision Escalation 0.1, section 14 "smallest set of changes".
-- Adopted by founder-steward decision; see docs/receipts/.
--
-- Four additions, each of which turns a claim into a mechanism:
--   1. witness   - the ledger becomes a graph of attestation, not a list
--   2. anchor    - the record becomes provable without OURS existing
--   3. gate      - the sixteen launch gates become rows, so /status is live
--   4. conformance - the invariant suite publishes its own result, pass or fail

-- ---------------------------------------------------------------------------
-- 1. Witness
--
-- An entry MAY name an existing entry that attests it is a person. This
-- creates NO reward, count, rank, vote, revenue or visibility bonus for the
-- witness, and an entrant who names no witness enters exactly the same and is
-- in no way lesser. That rule is in the lock and is not relaxed here.
-- ---------------------------------------------------------------------------
ALTER TABLE ledger.entry
  ADD COLUMN IF NOT EXISTS witness_entry_id uuid REFERENCES ledger.entry (id);

CREATE INDEX IF NOT EXISTS ledger_entry_witness_idx ON ledger.entry (witness_entry_id);

-- An entry cannot witness itself.
ALTER TABLE ledger.entry DROP CONSTRAINT IF EXISTS ledger_entry_witness_not_self;
ALTER TABLE ledger.entry
  ADD CONSTRAINT ledger_entry_witness_not_self CHECK (witness_entry_id IS NULL OR witness_entry_id <> id);

-- ---------------------------------------------------------------------------
-- 2. Anchor
--
-- A Merkle root over the canonical event digest chain, published at a fixed
-- cadence and deposited somewhere whose durability does not depend on OURS,
-- any provider, or any network being up. A member's founding position becomes
-- provable to a third party WITHOUT OURS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger.anchor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_kind text NOT NULL CHECK (period_kind IN ('DAILY', 'MONTHLY', 'ANNUAL')),
  -- '2026-08-26', '2026-08', '2026'
  period_label text NOT NULL,
  algorithm text NOT NULL DEFAULT 'sha256-merkle-binary/1',
  merkle_root text NOT NULL,
  -- Inclusive event sequence range this root covers.
  event_seq_from bigint NOT NULL,
  event_seq_to bigint NOT NULL,
  event_count integer NOT NULL,
  -- Where a copy exists outside this database. Free-form on purpose: a
  -- newspaper notice and a national library deposit are not a URL.
  locations jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_uri text,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by_actor text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_anchor_period_uq
  ON ledger.anchor (period_kind, period_label);
CREATE INDEX IF NOT EXISTS ledger_anchor_published_idx ON ledger.anchor (published_at DESC);

-- An anchor is a published fact. Correct one by publishing the next period.
CREATE OR REPLACE FUNCTION ledger.forbid_anchor_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger.anchor is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS anchor_no_update ON ledger.anchor;
CREATE TRIGGER anchor_no_update BEFORE UPDATE ON ledger.anchor
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_anchor_mutation();
DROP TRIGGER IF EXISTS anchor_no_delete ON ledger.anchor;
CREATE TRIGGER anchor_no_delete BEFORE DELETE ON ledger.anchor
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_anchor_mutation();

-- ---------------------------------------------------------------------------
-- 3. Launch gates as rows
--
-- Handoff section 17 lists sixteen gates as Markdown checkboxes. Checkboxes in
-- a document are a claim; rows with evidence, an owner and a changed_at are a
-- mechanism. /status renders these live, including when one slips.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger.gate (
  key text PRIMARY KEY,
  position integer NOT NULL,
  title text NOT NULL,
  state text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'IN_PROGRESS', 'MET', 'SLIPPED')),
  -- What would make this true, in one sentence a non-engineer can check.
  evidence_required text NOT NULL,
  -- What is actually true today. Null while nothing has been shown.
  evidence_uri text,
  -- Named human or decision this waits on. Null when it waits on work.
  blocked_by text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by_actor text
);

INSERT INTO ledger.gate (key, position, title, evidence_required, blocked_by) VALUES
  ('legal-status-reviewed', 1, 'Legal status and privacy notice reviewed',
   'A licensed reviewer has signed off on the entry copy and the privacy notice.',
   'a named legal reviewer (handoff decision 12)'),
  ('data-map-approved', 2, 'Public/private data map approved',
   'DATA-MAP.md is complete and approved by the legal controller.',
   'a named legal controller (handoff decision 2)'),
  ('identity-recovery-tested', 3, 'Identity and recovery path tested',
   'A person can lose access and recover it without a steward reading their mail.', NULL),
  ('atomic-entry-tests', 4, 'Atomic entry and continuation tests pass',
   'Concurrency and First Continuation tests pass against real PostgreSQL.', NULL),
  ('idempotency-abuse', 5, 'Idempotency and abuse controls pass',
   'Idempotent replay and per-actor rate limits verified.', NULL),
  ('rights-operations', 6, 'Correction, withdrawal and export work',
   'A person can export, correct and withdraw without asking anyone.', NULL),
  ('backup-restore', 7, 'Encrypted backup exists and clean restore rehearsal passes',
   'A restore FROM THE REAL BACKUP into a clean environment, with the digest chain recomputed.',
   'an off-site backup target (handoff decision 8)'),
  ('incident-owner', 8, 'Incident owner and support path are named',
   'A named human answers, with a named escalation path.',
   'founder-steward (handoff decision 7)'),
  ('no-membership-claim', 9, 'No interface claims legal membership',
   'Every entry and receipt surface carries the legal-status qualifier.', NULL),
  ('pause-rollback', 10, 'Pause/rollback path is tested',
   'Pausing stops seals while reading and data rights keep working.', NULL),
  ('monitoring', 11, 'Monitoring exposes failures without exposing private data',
   'Failure is visible; no raw email or IP metric is published.', NULL),
  ('email-domain', 12, 'Email domain, bounce and complaint handling work',
   'A verified sending domain with SPF, DKIM and monitored DMARC.',
   'domain registration (handoff decision 10)'),
  ('cost-controls', 13, 'Production plan/cost and spend controls are accepted',
   'A plan chosen, a spend limit set, both recorded.',
   'founder-steward (handoff decision 9)'),
  ('genesis-decision', 14, 'Genesis/origin treatment has a decision receipt',
   'How #000001 exists in production is decided and receipted.',
   'founder-steward (handoff decision 3)'),
  ('readiness-receipt', 15, 'Founder-steward signs and publishes the readiness receipt',
   'A published receipt naming every gate above as met.',
   'every gate above'),
  ('gates-opened', 16, 'Environment and database write gates are deliberately opened',
   'ALLOW_CANONICAL_WRITES=true and system_state.mode=OPEN, each with a receipt.',
   'the readiness receipt')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Conformance runs
--
-- The invariant suite re-run against a real database on a schedule, appending
-- its result. PASS OR FAIL, PUBLISHED EITHER WAY, BEFORE ANYONE ASKS. The
-- decision that a red result publishes anyway is only cheap to make today.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger.conformance_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  passed boolean NOT NULL,
  checks jsonb NOT NULL,
  failed_checks integer NOT NULL DEFAULT 0,
  event_seq_high bigint NOT NULL,
  -- Commit hash of the code that ran, when the runner can determine it.
  commit_ref text,
  environment text NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_conformance_ran_idx ON ledger.conformance_run (ran_at DESC);

CREATE OR REPLACE FUNCTION ledger.forbid_conformance_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger.conformance_run is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conformance_no_update ON ledger.conformance_run;
CREATE TRIGGER conformance_no_update BEFORE UPDATE ON ledger.conformance_run
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_conformance_mutation();
DROP TRIGGER IF EXISTS conformance_no_delete ON ledger.conformance_run;
CREATE TRIGGER conformance_no_delete BEFORE DELETE ON ledger.conformance_run
  FOR EACH ROW EXECUTE FUNCTION ledger.forbid_conformance_mutation();

-- ---------------------------------------------------------------------------
-- 5. Public projections
-- ---------------------------------------------------------------------------

-- Rebuilt to carry the witness ordinal. The witness EDGE is public; the
-- identity graph is not published as a whole, and no degree count is exposed
-- per person - only the aggregate shape below.
DROP VIEW IF EXISTS public.founding_ledger;
CREATE VIEW public.founding_ledger AS
SELECT
  e.ordinal,
  CASE WHEN e.display_state = 'PUBLIC' AND e.lifecycle <> 'VOIDED' THEN e.display_name END AS display_name,
  e.seal_ts AS entered_at,
  p.ordinal AS predecessor_ordinal,
  w.ordinal AS witness_ordinal,
  CASE WHEN fc.successor_entry_id IS NOT NULL THEN 'CONTINUED' ELSE 'OPEN' END AS relay_state,
  fco.ordinal AS first_continuation_ordinal,
  CASE WHEN e.display_state = 'PUBLIC' AND e.lifecycle <> 'VOIDED' THEN e.lifecycle ELSE 'WITHDRAWN' END AS public_status,
  e.declaration_version,
  e.protocol_version,
  'NOT YET ISSUED'::text AS legal_membership_status,
  e.origin_kind
FROM ledger.entry e
LEFT JOIN ledger.entry p ON p.id = e.predecessor_entry_id
LEFT JOIN ledger.entry w ON w.id = e.witness_entry_id
LEFT JOIN ledger.first_continuation fc ON fc.predecessor_entry_id = e.id
LEFT JOIN ledger.entry fco ON fco.id = fc.successor_entry_id;

-- Publish the SHAPE of the attestation graph, never the edges as a dataset.
-- Degree distribution tells a researcher what they need about Sybil
-- resistance; an edge list tells an adversary who knows whom.
CREATE OR REPLACE VIEW public.witness_shape AS
SELECT
  degree,
  count(*)::integer AS entries_with_this_degree
FROM (
  SELECT e.id, count(w.id)::integer AS degree
  FROM ledger.entry e
  LEFT JOIN ledger.entry w ON w.witness_entry_id = e.id
  WHERE e.lifecycle <> 'VOIDED'
  GROUP BY e.id
) d
GROUP BY degree
ORDER BY degree;

CREATE OR REPLACE VIEW public.launch_gates AS
SELECT key, position, title, state, evidence_required, evidence_uri, blocked_by, changed_at
FROM ledger.gate
ORDER BY position;

CREATE OR REPLACE VIEW public.anchors AS
SELECT period_kind, period_label, algorithm, merkle_root, event_seq_from, event_seq_to,
       event_count, locations, evidence_uri, published_at
FROM ledger.anchor
ORDER BY published_at DESC;

CREATE OR REPLACE VIEW public.conformance AS
SELECT ran_at, passed, failed_checks, checks, event_seq_high, commit_ref, environment
FROM ledger.conformance_run
ORDER BY ran_at DESC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ours_app_runtime') THEN
    GRANT SELECT ON public.founding_ledger, public.system_status, public.witness_shape,
      public.launch_gates, public.anchors, public.conformance TO ours_app_runtime;
  END IF;
END $$;
