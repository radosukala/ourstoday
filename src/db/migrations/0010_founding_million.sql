-- The Founding Million is finite in the allocator, not merely in copy.
--
-- Every ordinal from 1 through 1,000,000 carries Founding Right 0.1. The
-- counter may reach 1,000,001 only as the terminal CLOSED value after the last
-- place commits. It can never advance beyond it, and an ordinal can never sit
-- outside the founding range.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ledger.entry WHERE ordinal < 1 OR ordinal > 1000000) THEN
    RAISE EXCEPTION 'Cannot establish the Founding Million: an existing ordinal is outside 1..1000000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM ledger.ordinal_counter
    WHERE id = 1 AND (next_ordinal < 1 OR next_ordinal > 1000001)
  ) THEN
    RAISE EXCEPTION 'Cannot establish the Founding Million: allocator is outside 1..1000001';
  END IF;
END $$;

ALTER TABLE ledger.entry
  ADD COLUMN founding_right_version text NOT NULL DEFAULT 'ours-founding-right/0.1';

ALTER TABLE ledger.entry
  ADD CONSTRAINT ledger_entry_founding_ordinal_ck
  CHECK (ordinal BETWEEN 1 AND 1000000);

ALTER TABLE ledger.ordinal_counter
  ADD CONSTRAINT ledger_ordinal_counter_founding_limit_ck
  CHECK (next_ordinal BETWEEN 1 AND 1000001);

-- Declaration 0.2 incorporates the operative Founding Right 0.1 instrument.
-- Existing entries keep the exact declaration they accepted; all subsequent
-- seals must accept the new version through the ordinary stale-consent gate.
UPDATE ledger.system_state
   SET declaration_version = 'ours-founding-declaration/0.2',
       changed_at = now()
 WHERE id = 1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ours_app_runtime') THEN
    GRANT SELECT (founding_right_version) ON ledger.entry TO ours_app_runtime;
  END IF;
END $$;
