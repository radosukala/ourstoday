-- Missions and notices: the demand side of the ledger.
--
-- A mission is a thing that could be member-owned. A notice is one person's
-- conditional commitment to move to a member-owned version when enough others
-- will. Nothing happens below the threshold, and that is the point: no single
-- person can leave a network alone, so nobody is asked to.
--
-- Missions name a CATEGORY and a PRACTICE, never a company. The objection is
-- to a business model - the user as the product - not to any one firm, and a
-- board of grievances against named companies would be a different, smaller
-- and more litigable thing than this.

CREATE TABLE IF NOT EXISTS ledger.mission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  -- The specific practice being objected to, stated as fact.
  practice text NOT NULL,
  threshold integer NOT NULL CHECK (threshold > 0),
  state text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'REACHED', 'ACTING', 'RETIRED')),
  -- Ordering for equal counts; also the seed order on an empty board.
  position integer NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_mission_slug_uq ON ledger.mission (slug);

-- One person, one notice per mission. The unique index is the whole Sybil
-- story at this layer: a notice is bound to a sealed entry, and there is
-- already at most one active entry per verified person.
CREATE TABLE IF NOT EXISTS ledger.notice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES ledger.entry (id),
  mission_id uuid NOT NULL REFERENCES ledger.mission (id),
  -- Optional, public, and the most valuable field on the row: what this person
  -- would actually need before they moved.
  condition_text text,
  given_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_notice_entry_mission_uq
  ON ledger.notice (entry_id, mission_id);
CREATE INDEX IF NOT EXISTS ledger_notice_mission_idx ON ledger.notice (mission_id);

-- The board. Counts only notices from entries that legitimately exist: a
-- VOIDED entry never happened, and a withdrawn notice is no longer given.
CREATE OR REPLACE VIEW public.mission_board AS
SELECT
  m.slug,
  m.title,
  m.practice,
  m.threshold,
  m.state,
  m.position,
  m.opened_at,
  count(n.id) FILTER (
    WHERE n.withdrawn_at IS NULL AND e.lifecycle <> 'VOIDED'
  )::integer AS notice_count
FROM ledger.mission m
LEFT JOIN ledger.notice n ON n.mission_id = m.id
LEFT JOIN ledger.entry e ON e.id = n.entry_id
WHERE m.state <> 'RETIRED'
GROUP BY m.id, m.slug, m.title, m.practice, m.threshold, m.state, m.position, m.opened_at
ORDER BY notice_count DESC, m.position ASC;

-- The record: who gave notice on what. Public identity only - the same
-- projection rule as public.founding_ledger, so a tombstoned place shows its
-- ordinal and nothing else.
CREATE OR REPLACE VIEW public.notice_record AS
SELECT
  e.ordinal,
  CASE WHEN e.display_state = 'TOMBSTONED' THEN NULL ELSE e.display_name END AS display_name,
  m.slug AS mission_slug,
  m.title AS mission_title,
  CASE WHEN e.display_state = 'TOMBSTONED' THEN NULL ELSE n.condition_text END AS condition_text,
  n.given_at
FROM ledger.notice n
JOIN ledger.entry e ON e.id = n.entry_id
JOIN ledger.mission m ON m.id = n.mission_id
WHERE n.withdrawn_at IS NULL AND e.lifecycle <> 'VOIDED'
ORDER BY n.given_at DESC;

CREATE OR REPLACE VIEW public.notice_totals AS
SELECT
  (SELECT count(*) FROM ledger.notice n
     JOIN ledger.entry e ON e.id = n.entry_id
     WHERE n.withdrawn_at IS NULL AND e.lifecycle <> 'VOIDED')::integer AS notices,
  (SELECT count(DISTINCT n.entry_id) FROM ledger.notice n
     JOIN ledger.entry e ON e.id = n.entry_id
     WHERE n.withdrawn_at IS NULL AND e.lifecycle <> 'VOIDED')::integer AS people,
  (SELECT count(*) FROM ledger.mission WHERE state <> 'RETIRED')::integer AS missions;

-- Seed missions. Every practice below is a factual description of how a
-- category ordinarily operates, and names no company.
INSERT INTO ledger.mission (slug, title, practice, threshold, position) VALUES
  ('professional-network',
   'The professional network',
   'Your CV, your contacts and your reputation live in a system you cannot leave without losing all three.',
   1000, 1),
  ('freelance-marketplace',
   'The freelance marketplace',
   'You find the client, you do the work, and a percentage of every invoice is taken for as long as the relationship lasts.',
   1000, 2),
  ('app-store',
   'The app store',
   'Up to 30% of what a person pays you, for a distribution channel you are not permitted to bypass.',
   1000, 3),
  ('mailing-list',
   'The mailing list',
   'You built the audience. Reaching it costs more every year, and the list is yours only until the terms change.',
   1000, 4),
  ('photo-archive',
   'The family photo archive',
   'Twenty years of a life, held at a price that only rises, in an export format designed to be inconvenient.',
   1000, 5),
  ('booking-commission',
   'The booking commission',
   'The room costs the same either way. A commission of 15-20% decides who receives the difference.',
   1000, 6),
  ('the-ride',
   'The ride',
   'Two people agree on a journey. A third party sets the price, takes the difference, and can change both.',
   1000, 7),
  ('the-stream',
   'The stream',
   'A thousand plays buys a coffee, and the catalogue is owned by people who never played a note.',
   1000, 8)
ON CONFLICT (slug) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ours_app_runtime') THEN
    GRANT SELECT ON public.mission_board, public.notice_record, public.notice_totals
      TO ours_app_runtime;
    GRANT SELECT, INSERT, UPDATE ON ledger.notice TO ours_app_runtime;
    GRANT SELECT ON ledger.mission TO ours_app_runtime;
  END IF;
END $$;
