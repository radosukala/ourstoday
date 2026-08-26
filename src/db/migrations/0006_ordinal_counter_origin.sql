-- The ordinal allocator started at 2, not 1.
--
-- Migration 0004 seeds `ordinal_counter.next_ordinal = 2` because the local
-- development seed writes the declared origin row as #000001. Production
-- deliberately does NOT run that seed - `seed-local` refuses a remote host,
-- because how #000001 exists in production is a founder-steward decision.
--
-- Those two facts were never connected. A production database therefore
-- starts with #000001 unallocated and issues #000002 to the first person who
-- enters, which is exactly what happened on ourstoday.com.
--
-- Correct the starting point ONLY where nothing has been issued yet. Where
-- entries already exist, the past is the past: an ordinal that has been
-- handed to a person is never reassigned, and a ledger does not renumber
-- itself because the first number is prettier.
UPDATE ledger.ordinal_counter
   SET next_ordinal = 1,
       updated_at = now()
 WHERE id = 1
   AND next_ordinal = 2
   AND NOT EXISTS (SELECT 1 FROM ledger.entry);
