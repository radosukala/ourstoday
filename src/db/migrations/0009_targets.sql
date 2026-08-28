-- Name them.
--
-- Missions previously named only a category, to keep the objection about a
-- business model rather than a firm. The objection is unchanged — but a person
-- deciding whether they are angry cannot recognise "the professional network",
-- and a target registry that will not say who it means is not a registry.
--
-- So each mission now carries the incumbents it refers to, and every practice
-- below is stated as the ordinary, publicly documented operation of that
-- category. Nothing here alleges wrongdoing by any company: these are business
-- models operating exactly as designed and disclosed, and that is the point.

ALTER TABLE ledger.mission ADD COLUMN IF NOT EXISTS incumbents text NOT NULL DEFAULT '';

-- Replaced rather than amended: CREATE OR REPLACE cannot insert a column into
-- the middle of an existing view's column list.
DROP VIEW IF EXISTS public.mission_board;

CREATE VIEW public.mission_board AS
SELECT
  m.slug,
  m.title,
  m.practice,
  m.incumbents,
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
GROUP BY m.id, m.slug, m.title, m.practice, m.incumbents, m.threshold, m.state, m.position,
         m.opened_at
ORDER BY notice_count DESC, m.position ASC;

INSERT INTO ledger.mission (slug, title, practice, incumbents, threshold, position) VALUES
  ('professional-network',
   'The professional network',
   'Your CV, your contacts and your reputation live in one company''s database. Leaving costs you all three at once.',
   'LinkedIn', 1000, 1),
  ('social-feed',
   'The social feed',
   'You built the audience. The reach you get to it is set by them, sold back to you, and changed without notice.',
   'Facebook · Instagram · X · TikTok', 1000, 2),
  ('app-store',
   'The app store toll',
   'Up to 30% of what a person pays you, on a distribution channel you are not permitted to bypass.',
   'App Store · Google Play', 1000, 3),
  ('freelance-marketplace',
   'The freelance marketplace',
   'You find the client and do the work. A percentage of every invoice is taken for as long as the relationship lasts.',
   'Upwork · Fiverr', 1000, 4),
  ('marketplace-fees',
   'The marketplace',
   'Listing fees, transaction fees, and advertising to be seen in a shop you stocked. The customer is never yours.',
   'Amazon · Etsy · eBay', 1000, 5),
  ('booking-commission',
   'The booking commission',
   'The room costs the same either way. A commission of roughly 15-20% decides who receives the difference.',
   'Booking.com · Airbnb · Expedia', 1000, 6),
  ('the-ride',
   'The ride',
   'Two people agree on a journey. A third party sets both sides of the price and keeps the spread.',
   'Uber · Bolt · Lyft', 1000, 7),
  ('the-stream',
   'The stream',
   'A thousand plays buys a coffee, and the catalogue is owned by people who never played a note.',
   'Spotify · Apple Music · YouTube Music', 1000, 8),
  ('mailing-list',
   'The mailing list',
   'You built the list. Reaching it costs more every year, and the terms change without you.',
   'Substack · Mailchimp · beehiiv', 1000, 9),
  ('photo-archive',
   'The family photo archive',
   'Twenty years of a life, held at a price that only rises, behind an export designed to be inconvenient.',
   'Google Photos · iCloud', 1000, 10),
  ('the-cloud-drive',
   'The drive',
   'Your documents, priced per gigabyte forever, in formats that make leaving a project rather than a click.',
   'Google Drive · Dropbox · OneDrive', 1000, 11),
  ('food-delivery',
   'The delivery',
   'The restaurant loses up to 30% of the order. The courier carries the risk. Neither sets the price.',
   'Uber Eats · Deliveroo · DoorDash · Wolt', 1000, 12)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  practice = EXCLUDED.practice,
  incumbents = EXCLUDED.incumbents,
  position = EXCLUDED.position;
