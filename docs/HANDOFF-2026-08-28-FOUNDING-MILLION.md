# OURS · Founding Million build handoff

**Date:** 28 August 2026  
**Workspace:** /Users/rado/code/ourstoday  
**Purpose:** hand this implementation to the next agent without losing the product decision, the legal boundary, or the remaining launch work.

## 1. Outcome

The homepage and entry flow were rebuilt around one compressed message:

> **NOBODY LEAVES FIRST. EVERYBODY LEAVES TOGETHER.**

The first one million people are now represented in the product as a finite,
canonical Founding Million. Each sealed place carries a concrete **Founding
Right 0.1** with equal, non-transferable project rights. The page feels like a
live formation terminal: it shows the cap, the canonical count, the next
number, what remains, the reason the moment matters, and the cost of waiting.

The implementation is intentionally honest about the boundary: this is an
operative project instrument, **not legal membership, an ownership share, a
security, a token, or a promise of profit**. The draft revenue/multiplier
economics remain unpublished and unadopted.

## 2. What is implemented

### Homepage / message

- app/page.tsx is now the minimal homepage.
- app/FoundingTerminal.tsx renders the live terminal and email entry CTA.
- The page leads with:
  - AI MADE SOFTWARE ALMOST FREE.
  - NOBODY LEAVES FIRST. EVERYBODY LEAVES TOGETHER.
  - THE LAST MOAT IS AGGREGATED DEMAND.
  - THE FIRST 1,000,000 FORM ENOUGH TO BUILD ANYTHING.
- The terminal shows FORMED, NEXT, and LEFT from the canonical ledger state. It
  never invents a number while the ledger is unavailable.
- The visible urgency is finite and explicit: when #1,000,000 seals, founding
  closes; a number can only move later, never earlier.
- The design was checked at 1440×900 and at 390×844. The mobile viewport fit
  exactly with no horizontal or vertical overflow.

### Finite Founding Million

- src/founding/right.ts defines:
  - FOUNDING_LIMIT = 1,000,000
  - FOUNDING_RIGHT_VERSION = ours-founding-right/0.1
  - capacity calculation from the next allocator ordinal.
- src/db/migrations/0010_founding_million.sql adds the right-version field and
  database checks for entry ordinals 1..1,000,000 and allocator state
  1..1,000,001.
- src/ledger/seal.ts allocates under the existing row lock, rejects an attempted
  #1,000,001 with FoundingEraFullError, and does not consume an ordinal on a
  failed transaction.
- src/ledger/errors.ts and app/api/v1/entries/seal/route.ts expose the full era
  as a terminal 410 condition.
- app/api/v1/founding-state/route.ts reports the canonical cap, issued count,
  next ordinal, remaining capacity, open/closed state, and right version.
- The local development database has migration 0010 applied after a db:doctor
  check confirmed it was the local 127.0.0.1/ours_today_dev database. No
  production database was migrated.

### Founding Right 0.1

- docs/FOUNDING-RIGHT-0.1.md is the operative project instrument.
- docs/CONSTITUTION-AMENDMENT-0.1-FOUNDING-MILLION.md adds the finite era and
  rights without rewriting the historical docs/CONSTITUTION-0.1.md.
- docs/receipts/2026-08-28-founding-million.md records the founder-steward
  decision.
- Rights attached to every legitimate sealed ordinal 1..1,000,000:
  1. permanent number; never sold, transferred, reassigned, or silently
     renumbered;
  2. one equal ballot on Constitution 1.0 and the initial legal membership
     instrument, once the published legal, assurance, and ballot-integrity
     gates are met;
  3. one equal first-mission authorization ballot;
  4. notice, proposal-record, version, dissent, and result rights for those
     decisions;
  5. access, export, correction, and withdrawal through the published process.
- Earliness changes access to formation work, not final voting weight:
  - 1..10,000: drafting-window participation;
  - 1..100,000: first-mission nomination-window participation;
  - 1..1,000,000: equal founding and first-mission ballots.
- Email authentication alone creates no entry and reserves no number.
- No referral, follower, wealth, publicity, contribution score, payment, or
  ordinal rank creates extra governance authority.

### Entry, receipt, and target flow

- /enter and /enter/continue retain the magic-link → consent → seal flow.
- app/enter/continue/SealForm.tsx now displays the Founding Right on the
  committed receipt, including the right version and legal boundary.
- After a successful seal, the entrant is offered MissionPicker rather than
  being asked to choose a target before having a place.
- app/enter/continue/MissionPicker.tsx and
  app/api/v1/missions/notices/route.ts record one or more target notices after
  entry. src/ledger/missions.ts writes the notice and public event in one
  transaction, is idempotent, requires an authenticated sealed entrant, and is
  rate-limited.
- The first post-entry targets are stored in 0008_missions.sql and
  0009_targets.sql. Notice counts are demand signals, not votes and not
  referral rewards.
- Public receipts and personal surfaces include the right version:
  - app/e/[ordinal]/page.tsx
  - app/api/v1/entries/[ordinal]/route.ts
  - app/me/page.tsx
  - app/api/v1/me/export/route.ts
  - src/ledger/state.ts
- docs/EVENT-SCHEMA-1.0.md includes foundingRightVersion on the sealed event.

### Sharing / distribution

- app/opengraph-image.tsx and app/twitter-image.tsx generate a 1200×630 share
  card using the same movement message.
- Homepage metadata points to those cards and uses the compressed Founding
  Million message.
- The cards use the default runtime font deliberately: a custom font attempt
  caused a 500 and was reverted. Do not reintroduce remote or unavailable font
  loading without testing the image route directly.

### Supporting documentation / declarations

- docs/OURS.md, README.md, docs/EVENT-SCHEMA-1.0.md, and the source-doc
  allowlist were updated to reference the new right and finite cap.
- src/legal/documents.ts is on declaration version 0.2 and presents the
  Founding Right terms during consent.
- The economics proposal remains at
  docs/P-0002-FOUNDING-COHORT-ECONOMICS.md, marked **DRAFT PROPOSAL · NOT
  ADOPTED · NOT LEGALLY REVIEWED** and explicitly not on the public surface.
  It must not be turned into public revenue-share or ownership language by the
  next agent.

## 3. Current runtime state

- The canonical write gate remains closed locally:
  - ledger state: CLOSED;
  - ALLOW_CANONICAL_WRITES=false by default.
- The homepage therefore truthfully renders FORMATION NOT OPEN locally. This is
  intentional. Do not flip the gate merely to make a screenshot look active.
- No production deployment, production migration, public opening, legal entity
  formation, or legal membership issuance has happened in this handoff.
- The worktree is intentionally dirty and contains both this build and
  pre-existing/user changes. Do not reset, clean, or delete unrelated files.

## 4. Verification already completed

Latest verification pass after the final surface edits:

- pnpm format:check — pass
- pnpm lint — pass
- pnpm typecheck — pass
- unit tests: **62/62 pass**;
- integration tests: **36/36 pass**;
- production build: pass, including /opengraph-image and /twitter-image;
- Playwright E2E: **22/22 pass**, including magic-link → seal → right receipt
  → target notice;

Earlier verification pass:

- migration rehearsal: pass through 0010_founding_million.sql;
- accessibility smoke check: no serious or critical axe violations;
- desktop and narrow-mobile visual checks: pass.

Before publishing, rerun the full suite because the repository is shared and
another agent may have changed files:

    pnpm format:check
    pnpm lint
    pnpm typecheck
    pnpm test:unit
    pnpm test:integration
    pnpm test:e2e
    pnpm build

Also run the repository's production-readiness checks before opening the
ledger (pnpm db:migrate:check, restore verification, security audit,
conformance, and the documented deploy rehearsal).

## 5. What remains / next agent checklist

### Must happen before a real public opening

1. **Human approval of the operative instrument.** Confirm the founder-steward
   decision receipt and the exact public wording are accepted; preserve the
   amendment instead of silently editing Constitution 0.1.
2. **Licensed legal review.** Review the Founding Right, consent copy, privacy
   boundary, human-assurance design, withdrawal/tombstone process, and any
   future economic instrument. The current right is intentionally not a legal
   share or security.
3. **Human-assurance and anti-duplicate design.** Email verification is not the
   final assurance gate. Implement and publish the stronger identity/correction
   and appeal process before any founding ballot opens.
4. **Production database rehearsal and migration.** Validate backups, restore,
   idempotency, row-lock behavior, and the cap on the actual production
   database. Apply 0010 only through the approved deployment process.
5. **Production gate approval.** Set ALLOW_CANONICAL_WRITES=true only after the
   documented launch gates are evidenced and an authorized human opens the
   ledger. Keep pause/rollback operations ready.
6. **Live-state monitoring.** Confirm the homepage count, allocator, public
   receipt, exports, notice counts, and terminal 410 behavior against the same
   production database.

### Product work still worth doing

- Decide whether the terminal should show a public live count while the ledger
  is closed, or keep the current unavailable/closed treatment until opening.
- Finish the target catalog and its threshold policy; the current notices are a
  formation mechanism, not the first-mission vote.
- Define the actual proposal, notice, human-assurance, and ballot UI before
  promising the rights that activate at those gates.
- Decide whether a future economic instrument is wanted at all. If yes, take
  the draft through legal/cooperative/tax review and publish a new adopted
  instrument; do not imply that the current Founding Right includes dividends,
  shares, revenue, or ownership.
- Test share-card rendering at the final deployment host and test the social
  copy with real distribution rather than assuming the previous LinkedIn/X
  posts will repeat.
- Consider adding an explicit public “why the cap is one million” source note
  if user research shows the number needs more context; keep the homepage
  itself compressed.

### Things the next agent must not do

- Do not lower or replace the 1,000,000 cap with a soft waitlist.
- Do not issue #1,000,001, reuse a withdrawn ordinal, or let referrals buy
  priority.
- Do not call the Founding Right ownership, equity, stock, a dividend, a
  revenue share, a token, or legal membership.
- Do not publish docs/P-0002-FOUNDING-COHORT-ECONOMICS.md as if it were adopted.
- Do not open canonical writes, deploy, migrate production, or send external
  announcements without the required human approval and evidence.
- Do not use a click, referral, impression, or notice count as a governance
  vote.

## 6. Files to read first

1. [Homepage](/Users/rado/code/ourstoday/app/page.tsx)
2. [Terminal component](/Users/rado/code/ourstoday/app/FoundingTerminal.tsx)
3. [Founding Right 0.1](/Users/rado/code/ourstoday/docs/FOUNDING-RIGHT-0.1.md)
4. [Founding Million amendment](/Users/rado/code/ourstoday/docs/CONSTITUTION-AMENDMENT-0.1-FOUNDING-MILLION.md)
5. [Hard-cap migration](/Users/rado/code/ourstoday/src/db/migrations/0010_founding_million.sql)
6. [Seal transaction](/Users/rado/code/ourstoday/src/ledger/seal.ts)
7. [Founding-state API](/Users/rado/code/ourstoday/app/api/v1/founding-state/route.ts)
8. [Decision receipt](/Users/rado/code/ourstoday/docs/receipts/2026-08-28-founding-million.md)
9. [Existing backend launch handoff](/Users/rado/code/ourstoday/docs/FOUNDING-LEDGER-BUILD-HANDOFF.md)

## 7. One-sentence continuation prompt

> Continue from docs/HANDOFF-2026-08-28-FOUNDING-MILLION.md: preserve the
> one-million hard cap and Founding Right 0.1 boundary, verify the current
> worktree and full test/build suite, then complete only the production,
> assurance, legal-review, and launch-gate work that can be evidenced—do not
> publish unadopted economics or open canonical writes by assumption.
