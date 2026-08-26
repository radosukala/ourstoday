-- Participation, as a projection of the canonical log.
--
-- This is NOT analytics. Nothing here observes a visitor: there is no script,
-- no cookie, no session, no referrer and no device. Every number is derived
-- from entries that people deliberately sealed, and every one of them is
-- already public on the ledger.
--
-- Publishing it follows the same rule as conformance and the launch gates: if
-- OURS is going to make claims about how the network is forming, the numbers
-- behind them should be checkable by the person reading the claim, and
-- reproducible by anyone who exported the log with `ours-fork`.

-- Daily formation. A withdrawn place keeps its ordinal and still counts as an
-- entry that happened; a VOIDED one never legitimately existed.
CREATE OR REPLACE VIEW public.participation_daily AS
SELECT
  (e.seal_ts AT TIME ZONE 'UTC')::date AS day,
  count(*)::integer AS entries,
  count(*) FILTER (WHERE e.predecessor_entry_id IS NOT NULL)::integer AS arrived_through_relay,
  count(*) FILTER (WHERE e.witness_entry_id IS NOT NULL)::integer AS witnessed
FROM ledger.entry e
WHERE e.lifecycle <> 'VOIDED'
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW public.participation_totals AS
SELECT
  (SELECT count(*) FROM ledger.entry WHERE lifecycle <> 'VOIDED')::integer AS entries,
  (SELECT count(*) FROM ledger.relay_arrival)::integer AS relay_arrivals,
  (SELECT count(*) FROM ledger.first_continuation)::integer AS first_continuations,
  (SELECT count(*) FROM ledger.entry
     WHERE witness_entry_id IS NOT NULL AND lifecycle <> 'VOIDED')::integer AS witnessed_entries,
  -- How many places have had someone continue their line. This is the only
  -- honest "reach" number here, and it is a property of the graph rather than
  -- of anyone's popularity.
  (SELECT count(DISTINCT predecessor_entry_id) FROM ledger.relay_arrival)::integer
    AS places_continued,
  (SELECT count(*) FROM ledger.entry
     WHERE lifecycle IN ('WITHDRAWN', 'VOIDED') OR display_state = 'TOMBSTONED')::integer
    AS withdrawn_or_voided,
  (SELECT min(seal_ts) FROM ledger.entry) AS first_entry_at,
  (SELECT max(seal_ts) FROM ledger.entry) AS latest_entry_at;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ours_app_runtime') THEN
    GRANT SELECT ON public.participation_daily, public.participation_totals TO ours_app_runtime;
  END IF;
END $$;
