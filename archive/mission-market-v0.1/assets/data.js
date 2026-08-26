/* OURS TODAY — concept seed data.
 *
 * EVERY NUMBER IN THIS FILE IS CONCEPT DATA (fictional design data, see OURS.md §1).
 * It exists to make the Mission Market mechanics inspectable before any live
 * evidence exists. Live data must visibly replace it, never quietly blend in.
 */
(function () {
  'use strict';

  const STAGES = [
    { id: 'signal',    label: 'SIGNAL' },
    { id: 'forming',   label: 'FORMING' },
    { id: 'building',  label: 'BUILDING' },
    { id: 'usable',    label: 'USABLE' },
    { id: 'ready',     label: 'READY' },
    { id: 'switching', label: 'SWITCHING' },
    { id: 'ours',      label: 'OURS' }
  ];

  const DIMENSIONS = [
    { id: 'product',     label: 'PRODUCT' },
    { id: 'migration',   label: 'MIGRATION' },
    { id: 'economics',   label: 'ECONOMICS' },
    { id: 'safety',      label: 'SAFETY' },
    { id: 'stewardship', label: 'STEWARDSHIP' }
  ];

  /* Condition status values: verified | progress | pending | blocked */

  const CELLS = [
    {
      id: 'community-home',
      num: '001',
      stage: 'forming',
      category: 'COMMUNITY',
      title: 'A COMMUNITY SHOULD OWN ITS HOME',
      mission: 'Let a community own its relationships, archive, rules, and operating home.',
      thesis: 'An established community can move together when the pledge is conditional and migration is concierge-assisted.',
      commitments: { verified: 640, trend: 18 },
      participants: { testers: 118, committers: 640, contributors: 41, stewards: 1 },
      readiness: {
        product:     { state: 'progress', note: 'Alpha configured on mature open-source community software.' },
        migration:   { state: 'pending',  note: 'Archive import rehearsal scheduled; not yet passed.' },
        economics:   { state: 'pending',  note: '50 paying members required; dues model drafted.' },
        safety:      { state: 'pass',     note: 'Adult-only cohort; moderation baseline adopted.' },
        stewardship: { state: 'blocked',  note: '1 of 3 named non-founder stewards accepted.' }
      },
      unlock: {
        summary: '900 committed · 3 named stewards · archive import rehearsal',
        conditions: [
          { id: 'committed',  label: 'Committed members',           current: 640, target: 900, verifier: 'Registry snapshot, weekly', status: 'progress' },
          { id: 'stewards',   label: 'Named non-founder stewards',  current: 1,  target: 3,   verifier: 'Constitution record',       status: 'blocked' },
          { id: 'import',     label: 'Archive import rehearsal',    current: 0,  target: 1,   unit: 'rehearsal', verifier: 'Independent migration audit', status: 'pending' },
          { id: 'alpha-use',  label: 'Members completing a real alpha task', current: 100, target: 100, verifier: 'Task receipts', status: 'verified' }
        ]
      },
      buildSteps: [
        'Import a 20-message archive sample into the alpha home',
        'Post one real reply in the alpha forum',
        'Run the weekly digest command and record the output'
      ],
      mandates: [
        { name: 'Archive import steward', duties: 'Own the import rehearsal; sign off the audit receipt.', review: 'Reviewed weekly by cell meeting' },
        { name: 'Moderation steward', duties: 'Hold the moderation baseline; report incidents publicly.', review: 'Reviewed monthly by stewards' }
      ],
      buildLog: [
        {
          date: '2026-08-24',
          change: 'Configured community engine v5 with single-tenant hosting',
          hypothesis: 'A mature open-source base covers 90% of Cell 001 requirements without forking',
          owner: 'Build steward (pseudonym: K.O.)',
          howToTry: 'Alpha link on the cell page — task 1 of the tester checklist',
          cost: '$420 infra this month',
          failed: 'Calendar sync — deferred to post-switch backlog',
          decision: 'Proceed to import rehearsal; calendar is not a gate'
        },
        {
          date: '2026-08-19',
          change: 'Published temporary constitution draft v0.2',
          hypothesis: 'Named steward boundaries can be written in one page',
          owner: 'Cell captain (pseudonym: M.R.)',
          howToTry: 'Linked from cell page footer; comments open to committers',
          cost: '$0 (founder time excluded until compensation vote)',
          failed: '',
          decision: 'Steward compensation cap vote closes with today’s edition'
        }
      ],
      ledger: {
        month: 'August 2026',
        currency: 'USD',
        revenue: [ { source: 'Pilot member dues (52 × $25)', amount: 1300 } ],
        costs: [
          { item: 'Hosting (single tenant)', amount: 420 },
          { item: 'Concierge migration support', amount: 900 },
          { item: 'Legal template review', amount: 600 }
        ],
        reserve: 1500,
        surplus: -1620
      },
      switchEvent: null
    },

    {
      id: 'creator-video',
      num: '002',
      stage: 'building',
      category: 'VIDEO',
      title: 'CREATOR VIDEO OWNED BY CREATORS + VIEWERS',
      mission: 'Let audiences fund culture directly while creators keep identity, reach, archive, and governance rights.',
      thesis: 'A creator can move an audience when the audience can arrive together and retain its relationships.',
      commitments: { verified: 8120, trend: 9 },
      participants: { testers: 903, committers: 8120, contributors: 210, stewards: 4 },
      readiness: {
        product:     { state: 'progress', note: 'Player + channel pages testable; uploads gated.' },
        migration:   { state: 'pending',  note: 'Portable subscription importer in build.' },
        economics:   { state: 'progress', note: 'Direct patronage split modeled at 92/8.' },
        safety:      { state: 'progress', note: 'Rights-clearance workflow drafted.' },
        stewardship: { state: 'pass',     note: '4 named stewards across ops, trust, and payments.' }
      },
      unlock: {
        summary: '100 creators · 25K viewer commitments · portable subscription importer',
        conditions: [
          { id: 'creators',   label: 'Creators with live channels',        current: 34,    target: 100,  verifier: 'Channel registry', status: 'progress' },
          { id: 'viewers',    label: 'Viewer commitments',                 current: 18204, target: 25000, verifier: 'Pledge registry snapshot', status: 'progress' },
          { id: 'importer',   label: 'Portable subscription importer',     current: 0,     target: 1,    unit: 'shipped + audited', verifier: 'Public build log', status: 'pending' }
        ]
      },
      buildSteps: [
        'Watch one creator channel end-to-end in the beta player',
        'Port one subscription via the importer preview',
        'File a playback quality report with your network stats'
      ],
      mandates: [
        { name: 'Trust & safety steward', duties: 'Own rights-clearance decisions; publish a weekly incident log.', review: 'Reviewed by member vote each cycle' }
      ],
      buildLog: [
        {
          date: '2026-08-25',
          change: 'Importer preview reads official subscription exports (CSV)',
          hypothesis: 'Official exports are enough for day-one portability without scraping',
          owner: 'Migration steward (pseudonym: A.V.)',
          howToTry: 'Beta → Settings → Import subscriptions',
          cost: '$310 infra · $0 acquisition',
          failed: 'Watch-history transfer — out of scope by consent policy',
          decision: 'Keep history out; subscriptions and lists only'
        }
      ],
      ledger: {
        month: 'August 2026',
        currency: 'USD',
        revenue: [ { source: 'Founding patronage pilot (340 patrons)', amount: 6800 } ],
        costs: [
          { item: 'Transcode + CDN', amount: 2400 },
          { item: 'Trust & safety contractor', amount: 1800 },
          { item: 'Payments fees', amount: 260 }
        ],
        reserve: 4000,
        surplus: -1660
      },
      switchEvent: null
    },

    {
      id: 'family-photos',
      num: '003',
      stage: 'usable',
      category: 'MEMORY',
      title: 'FAMILY PHOTOS THAT NEVER BECOME ADS',
      mission: 'Preserve family memory without turning private lives into an advertising asset.',
      thesis: 'Transparent cost and permanent export rights are worth paying for when the archive matters.',
      commitments: { verified: 5460, trend: 4 },
      participants: { testers: 2140, committers: 5460, contributors: 96, stewards: 3 },
      readiness: {
        product:     { state: 'pass',     note: 'Core upload/share/album loop stable for daily use.' },
        migration:   { state: 'pass',     note: 'Restore drill v3 passed 2026-08-21 (receipt public).' },
        economics:   { state: 'progress', note: 'Storage price covers cost at current growth; stress test pending.' },
        safety:      { state: 'pass',     note: 'No ad pipeline exists in the codebase; dependency audit clean.' },
        stewardship: { state: 'pass',     note: '3 named stewards; ops rota published.' }
      },
      unlock: {
        summary: '500 weekly families · restore drill passed · sustainable storage price',
        conditions: [
          { id: 'families', label: 'Weekly active families',            current: 412, target: 500, verifier: 'Use receipts, weekly cohort', status: 'progress' },
          { id: 'drill',    label: 'Full-archive restore drill',         current: 1,   target: 1,   unit: 'drill', verifier: 'Independent restore audit', status: 'verified' },
          { id: 'price',    label: 'Storage price passes 24-month stress test', current: 0, target: 1, unit: 'model', verifier: 'Ledger snapshot review', status: 'pending' }
        ]
      },
      buildSteps: [
        'Upload a real album and set sharing to family-only',
        'Export the album and verify checksums locally',
        'Complete the weekly “memory prompt” task'
      ],
      mandates: [
        { name: 'Cost-truth steward', duties: 'Publish the storage cost model monthly; flag drift early.', review: 'Reviewed against ledger snapshots' }
      ],
      buildLog: [
        {
          date: '2026-08-23',
          change: 'Restore drill v3: full archive restored from cold storage in 6h12m',
          hypothesis: 'Families can leave completely, so staying must be worth paying for',
          owner: 'Ops steward (pseudonym: T.B.)',
          howToTry: 'Drill receipts linked from cell page',
          cost: '$95 egress + $140 auditor time',
          failed: 'Two checksum mismatches found and fixed pre-signoff',
          decision: 'Mark migration dimension PASS'
        }
      ],
      ledger: {
        month: 'August 2026',
        currency: 'USD',
        revenue: [ { source: 'Family plans (1,204 × $4)', amount: 4816 } ],
        costs: [
          { item: 'Storage + egress', amount: 1980 },
          { item: 'Support rota', amount: 1200 },
          { item: 'Restore drill + audit', amount: 235 }
        ],
        reserve: 2200,
        surplus: 401
      },
      switchEvent: null
    },

    {
      id: 'local-delivery',
      num: '004',
      stage: 'switching',
      category: 'LOCAL',
      title: 'DELIVERY OWNED BY RIDERS + EATERS',
      mission: 'Keep delivery convenience while workers, restaurants, and customers govern the rules together.',
      thesis: 'One city can switch neighborhood by neighborhood when supply and demand commit on the same map.',
      commitments: { verified: 3960, trend: 12 },
      participants: { testers: 720, committers: 3960, contributors: 154, stewards: 5 },
      readiness: {
        product:     { state: 'pass',     note: 'Dispatch + payments run end-to-end in pilot district.' },
        migration:   { state: 'pass',     note: 'Rider + restaurant onboarding playbooks rehearsed.' },
        economics:   { state: 'pass',     note: '15% flat commission covers district operating cost.' },
        safety:      { state: 'progress', note: 'Insurance partner signed; incident protocol in first week of live use.' },
        stewardship: { state: 'pass',     note: '5 stewards incl. one elected rider representative.' }
      },
      unlock: {
        summary: 'One launch district · 40 riders · 30 restaurants · 2K households',
        conditions: [
          { id: 'riders',      label: 'Riders committed',      current: 38,   target: 40, verifier: 'Rider co-op roster', status: 'progress' },
          { id: 'restaurants', label: 'Restaurants committed', current: 26,   target: 30, verifier: 'Signed supply agreements', status: 'progress' },
          { id: 'households',  label: 'Households committed',  current: 1742, target: 2000, verifier: 'Pledge registry snapshot', status: 'progress' }
        ]
      },
      buildSteps: [
        'Place one real order inside the pilot district map',
        'Complete the rider shift-simulator task',
        'Verify the commission math on your own order receipt'
      ],
      mandates: [
        { name: 'Switch-week incident steward', duties: 'Run the rollback path if reliability drops below threshold during the window.', review: 'Debrief published within 72h of window close' }
      ],
      buildLog: [
        {
          date: '2026-08-22',
          change: 'District map locked to launch boundary; outside orders politely refused',
          hypothesis: 'Density inside one district beats coverage across the city',
          owner: 'Ground steward (pseudonym: J.P.)',
          howToTry: 'Enter an address inside the shaded pilot zone',
          cost: '$780 dispatch infra + stipends',
          failed: 'Cross-district demand rejected by design, not failure',
          decision: 'Schedule the switch window pending final rider count'
        }
      ],
      ledger: {
        month: 'August 2026',
        currency: 'USD',
        revenue: [ { source: 'Pilot commission (pre-switch trials)', amount: 3140 } ],
        costs: [
          { item: 'Dispatch infrastructure', amount: 780 },
          { item: 'Rider recruitment stipends', amount: 1500 },
          { item: 'Insurance retainer', amount: 1100 }
        ],
        reserve: 3000,
        surplus: -1240
      },
      switchEvent: {
        district: 'Pilot district (bounded launch zone)',
        windowStart: '2026-09-12',
        windowEnd: '2026-09-14',
        support: 'Concierge coverage 07:00–23:00 local, all three days',
        rollback: '48-hour dual-run; incumbent export retained until retention confirmed',
        thresholds: [
          { label: 'Riders', current: 38, target: 40 },
          { label: 'Restaurants', current: 26, target: 30 },
          { label: 'Households', current: 1742, target: 2000 }
        ]
      }
    },

    {
      id: 'chosen-news',
      num: '005',
      stage: 'signal',
      category: 'NEWS',
      title: 'A NEWS FEED WE CHOOSE',
      mission: 'Make staying informed useful without optimizing outrage or compulsive return.',
      thesis: 'People will trade infinite novelty for trusted, inspectable editorial rules they can help govern.',
      commitments: { verified: 2240, trend: -3 },
      participants: { testers: 380, committers: 2240, contributors: 33, stewards: 0 },
      readiness: {
        product:     { state: 'progress', note: 'Prototype renders rule-ranked digest twice daily.' },
        migration:   { state: 'pending',  note: 'Not started — depends on feed-rule freeze.' },
        economics:   { state: 'pending',  note: 'No price model yet.' },
        safety:      { state: 'blocked',  note: 'Editorial-accountability policy unwritten.' },
        stewardship: { state: 'blocked',  note: 'No named stewards have accepted responsibility.' }
      },
      unlock: {
        summary: 'Six public feed rules · 20 editors · four-week retention proof',
        conditions: [
          { id: 'rules',   label: 'Public feed rules drafted',        current: 4, target: 6,  verifier: 'Rule registry, versioned', status: 'progress' },
          { id: 'editors', label: 'Named editors accountable',        current: 7, target: 20, verifier: 'Editorial roster', status: 'blocked' },
          { id: 'retain',  label: 'Four-week retention proof',        current: 0, target: 1,  unit: 'cohort study', verifier: 'Retention receipts', status: 'pending' }
        ]
      },
      buildSteps: [
        'Read one full digest without infinite scroll',
        'Propose an edit to one public feed rule',
        'Log tomorrow whether you returned compulsively or deliberately'
      ],
      mandates: [
        { name: 'Founding editor (3 seats)', duties: 'Own two feed rules each; defend changes with evidence in public.', review: 'Reconfirmed by committers quarterly' }
      ],
      buildLog: [
        {
          date: '2026-08-20',
          change: 'Digest v0.3 ranks by rule score instead of engagement score',
          hypothesis: 'Inspectable editorial rules can match engagement feeds on usefulness',
          owner: 'Unowned — seeking founding editors',
          howToTry: 'Prototype link; twice-daily editions',
          cost: '$60 infra',
          failed: 'Rule 4 (“source diversity”) starves niche beats — needs weighting',
          decision: 'Momentum fell 3%; no steward means no advancement. Cell may go dormant.'
        }
      ],
      ledger: {
        month: 'August 2026',
        currency: 'USD',
        revenue: [],
        costs: [ { item: 'Prototype infrastructure', amount: 60 } ],
        reserve: 300,
        surplus: -60
      },
      switchEvent: null
    }
  ];

  const EDITION = {
    items: [
      { kind: 'TOP MOVER',        cell: 'community-home', text: 'Community Home ▲ 18% — steward search is the bottleneck' },
      { kind: 'BECAME TESTABLE',  cell: 'creator-video',  text: 'Subscription importer preview shipped — try porting one list' },
      { kind: 'CLOSING TODAY',    cell: 'community-home', text: 'Steward compensation cap vote closes with this edition' },
      { kind: 'ONE UNLOCK AWAY',  cell: 'local-delivery', text: 'Needs 4 riders · 4 restaurants · 258 households to schedule' }
    ]
  };

  const ACTION_NOTES = {
    market: 'EVERY ACTION MUST PRODUCE USE, EVIDENCE, OR ACCOUNTABILITY.',
    try: 'COMPLETE A REAL TASK BEFORE YOUR PREFERENCE COUNTS.',
    commit: 'YOUR COMMITMENT ACTIVATES WHEN YOUR GROUP USES THE PRODUCT.',
    bring: 'CREDIT VESTS WHEN INVITED PEOPLE BECOME RETAINED USERS — NOT ON IMPRESSIONS.',
    contribute: 'RECEIPTS RECORD WORK AND OUTCOME — THEY ARE NOT TRADEABLE ASSETS.',
    steward: 'STEWARDSHIP IS A NAMED, REVIEWABLE RESPONSIBILITY — NOT A BADGE.'
  };

  window.OURS_DATA = { stages: STAGES, dimensions: DIMENSIONS, cells: CELLS, edition: EDITION, actionNotes: ACTION_NOTES };
})();
