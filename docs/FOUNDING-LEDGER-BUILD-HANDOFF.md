# OURS Founding Ledger · Backend Build Handoff

**Handoff version:** 0.1  
**Prepared:** 26 August 2026  
**Status:** AUTHORIZED BUILD PLAN · DEPLOYMENT NOT YET AUTHORIZED  
**Target workspace:** the repository working tree  
**Authority:** founder-steward request to prepare the complete next-session build  
**Primary protocol:** [Founding Relay Protocol 0.1](./FOUNDING-RELAY-PROTOCOL.md)

This document is the implementation handoff for converting the Day 1 static
instrument into the first working Founding Ledger application.

It authorizes a coding agent to inspect, design, edit and test inside the local
workspace. It does **not** authorize the agent to create paid services, alter
DNS, publish a Git repository, deploy externally, collect production identity
data or open the canonical Founding Ledger without a separate human approval.

---

## 0. The lock

The build must preserve these exact institutional statements:

> # THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.

> **OURS is a member-owned network that builds its own software in public.**

Until a reviewed legal membership instrument exists, every entry and receipt
surface must also show:

> **OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED**

The Founding Ledger is a chronological participation record. It is not a share,
security, token, ownership certificate, legal member register or promise of
profit.

### Non-negotiable mechanics

- A number is assigned only inside the verified canonical seal transaction.
- No number is reserved, previewed, sold, transferred or reassigned.
- A verified entrant keeps their place without recruiting anyone.
- A successor activates a connection, not the predecessor's belonging.
- A click, view, like or repost creates no ledger authority.
- Two concurrent valid entrants both enter and receive different ordinals.
- Two concurrent successors both enter; exactly one becomes First
  Continuation.
- Referral count creates no additional vote, ownership or economic right.
- Public and private identity data remain separate.
- Corrections, withdrawals and voids append events; canonical history is never
  silently edited.
- No agent or service may issue legal membership.

---

## 1. Current state

### Shipped locally

- dependency-free Day 1 HTML, CSS and JavaScript;
- founding declaration and declared origin row `000001 · RADO`;
- local-only entry and proposal drafts;
- Formation Tape, Build Tape and Constitution Diff;
- Constitution 0.1 and adopted implementation protocols;
- explicit local/unpublished and legal-status boundaries;
- archived Mission Market prehistory.

### Not shipped

- a Next.js application;
- authentication or email delivery;
- a shared PostgreSQL database;
- canonical entry, ordinal or event transactions;
- signed relay URLs and First Continuation;
- private/public data separation enforced by the database;
- export, correction, withdrawal or review operations;
- backups, restoration, monitoring or incident operation;
- Git history, GitHub publication, Vercel deployment or a connected domain;
- licensed privacy/legal review;
- a production readiness receipt.

The coding agent must archive the current Day 1 static implementation before
replacing it. It must not erase `docs/` or any existing `archive/` content.

---

## 2. Recommended technical architecture

| Layer | Decision | Reason |
|---|---|---|
| Application | Current stable Next.js, App Router, TypeScript strict mode on Node.js 22.12+ | Native Vercel path; current Better Auth CLI requirement is also satisfied |
| Styling | Preserve the existing CSS visual system | Prevent a return to generic SaaS styling |
| Hosting | Vercel; preview before production | Git previews, rollback and first-class Next.js support |
| Database contract | PostgreSQL 16+ through standard connection URLs | Transactions and provider portability |
| Database provider | **Neon recommended at provisioning; Supabase supported** | Better fit for DB-only use and current free/preview features |
| ORM/migrations | Drizzle ORM and committed SQL migrations | Type-safe application queries with reviewable SQL |
| Authentication | Better Auth, email magic-link only for the first slice | Verifies email control without passwords |
| Transactional email | Resend | Magic-link delivery and clear domain verification |
| Validation | Zod at every untrusted boundary | Shared server input contracts |
| Unit/integration tests | Vitest plus a real PostgreSQL test database | SQLite cannot prove PostgreSQL concurrency behavior |
| Browser tests | Playwright plus accessibility assertions | Entry ritual, failure states and keyboard behavior |
| CI | GitHub Actions after repository publication | Repeatable migration, test and build gates |

### 2.1 Database-provider decision

Application code must use Drizzle and standard PostgreSQL semantics. It must
not import a Supabase browser client, Supabase Auth or a provider-specific auth
SDK. Runtime configuration uses:

```text
DATABASE_URL          pooled application connection
DIRECT_DATABASE_URL   owner/direct connection for migrations and controlled dumps
```

This makes Neon and Supabase provisioning choices rather than product
rewrites.

#### Verified free-tier comparison on 26 August 2026

| Provider | Current free database facts | Important boundary |
|---|---|---|
| Neon | 0.5 GB storage per project; current pricing also lists per-project compute, scale-to-zero and a six-hour restore window | Good DB-only and Vercel-preview fit, but a short restore window is not sufficient canonical-ledger recovery |
| Supabase | 500 MB database per project, 5 GB egress and a wider platform bundle | Free projects have no automatic backups and may pause after low activity |

The original assumption that Supabase has a larger free database limit is not
currently true: both advertise approximately 0.5 GB per project.

**Recommendation:** provision Neon when an external preview database is needed.
It better matches this stack because Better Auth and Resend already replace
Supabase Auth and auth email, while Neon's pooled Postgres and Vercel preview
branching are useful directly. Keep the implementation provider-neutral.

If the founder-steward chooses Supabase instead:

- use the Supavisor transaction pooler for Vercel runtime traffic;
- disable prepared statements for that runtime connection;
- use the direct or appropriate session connection for migrations and dumps;
- do not expose the Supabase Data API to the browser;
- do not use Supabase Auth alongside Better Auth;
- do not open the canonical ledger on Supabase Free without an approved,
  rehearsed off-site backup path.

Useful current official references:

- [Neon pricing](https://neon.com/pricing)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Supabase pricing](https://supabase.com/pricing)
- [Supabase free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase serverless connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Drizzle guide](https://supabase.com/docs/guides/database/drizzle)

### 2.2 Hosting and email plan boundaries

- Vercel Hobby is currently described as personal, non-commercial use. It is
  suitable only if this use qualifies. Review or move to Pro before a
  professional/commercial public operation.
- Vercel currently lists Pro at USD 20 per month before extra usage and includes
  spend controls. Exact terms must be rechecked when provisioning.
- Resend Free currently lists 3,000 transactional emails per month, capped at
  100 per day, with one custom domain. A viral entry loop can hit the daily
  limit first.
- Resend's test domain sends only to the account owner's email. A verified
  OURS-owned sending domain is required before public magic-link use.

Use an isolated sending subdomain such as `updates.ourstoday.com`, with a sender
such as `OURS TODAY <enter@updates.ourstoday.com>`. Verify SPF and DKIM; add and
monitor DMARC before public launch.

Current official references:

- [Vercel pricing](https://vercel.com/pricing)
- [Vercel environments](https://vercel.com/docs/deployments/environments)
- [Vercel deployment protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments)
- [Resend pricing](https://resend.com/pricing)
- [Resend account limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
- [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction)

Free tiers may be used for local development and protected previews. They are
not evidence that canonical identity data has sufficient durability,
operations or support.

---

## 3. Authority envelope for the next coding session

```yaml
contract_version: ours.agent-build/v1
task_id: TASK-20260826-002
title: Build the Founding Ledger application and production-readiness package

authority:
  class: BUILD
  granted_by: founder-steward request on 26 August 2026
  decision_id: FOUNDING-LEDGER-HANDOFF-0.1

objective: >
  Convert the Day 1 static instrument into a tested Next.js application with
  Better Auth magic-link authentication, Resend email integration, a
  provider-neutral PostgreSQL/Drizzle ledger, signed relays, atomic First
  Continuation, data rights operations and deployment documentation.

human_outcome: >
  A verified person can safely enter in a test environment, receive a
  chronological place, carry a relay and create a causal connection without
  the interface inventing ownership, membership, popularity or authority.

source_hierarchy:
  constitution: docs/CONSTITUTION-0.1.md
  direction: docs/OURS.md
  protocols:
    - docs/FOUNDING-RELAY-PROTOCOL.md
    - docs/AGENT-BUILD-CONTRACT.md
  change_pack: docs/FOUNDING-LEDGER-BUILD-HANDOFF.md

adopted_decisions:
  - OURS / OURS TODAY / ourstoday.com
  - exact primary message and legal-status qualifier
  - Next.js on Vercel
  - standards-based PostgreSQL with Drizzle
  - Better Auth magic link and Resend
  - verified seal assigns the ordinal; no reservation
  - successor activates the edge; no referral rights
  - public and private identity data remain separate
  - no crypto token or tradable founding position

hypotheses:
  - email magic link is sufficient for initial entry integrity
  - First Continuation creates meaningful propagation
  - the Day 1 visual grammar remains effective as a working application

current_state:
  shipped: static Day 1 protocol preview and governing documents
  missing: backend, auth, database, operations, external preview and legal review
  evidence: local static validation only; no real entrant observed

scope:
  allowed_paths_or_systems:
    - <repository working tree>
    - local test services created for this task
  permitted_actions:
    - inspect current files
    - archive the current static implementation
    - initialize and edit the Next.js application
    - install justified dependencies
    - run local PostgreSQL, tests, builds and security checks
    - write migrations, fixtures, runbooks and build receipts
  prohibited_actions:
    - deploy to Vercel without a new explicit approval
    - create or purchase external services without approval
    - change DNS, domain registration or email records
    - push to GitHub or make the repository public without approval
    - open canonical production writes
    - collect real identity data in an unreviewed environment
    - seed fictional public people or activity
    - issue or imply legal membership or ownership
  out_of_scope:
    - proposals and voting backend
    - cells, product market or super-app functionality
    - legal member register and one-person governance assurance
    - payments, tokens, contribution economics or referral rewards
    - automated posting or social-network ingestion

people_and_data:
  affected_people:
    - prospective Founding Ledger entrants
    - people connected through a relay
    - founder-steward and future support/review operators
  data_classes:
    - public participation record
    - private authentication and recovery data
    - private consent and integrity-review data
  consent_and_purpose: collect only data needed for authentication, entry, relay, rights and integrity
  retention_or_cleanup: implement test cleanup; production schedule remains a reviewed gate

human_approvals:
  before_start: not required for local BUILD work
  before_deploy: required
  after_result: founder-steward
```

---

## 4. Repository conversion and preservation

### Required sequence

1. Inspect all current files and confirm the workspace is still not a Git
   repository before making Git claims.
2. Copy the current Day 1 static implementation into a new reversible archive,
   proposed path: `archive/day-1-static-v0.2/`.
3. Preserve the existing Mission Market archive and every governing Markdown
   document.
4. Scaffold Next.js **in the existing root**, not a nested app directory.
5. Record the exact Node, package-manager, Next.js, Better Auth, Drizzle and
   Resend versions in the build receipt; commit the lockfile once Git is
   authorized.
6. Pin Node.js 22.12 or newer through `engines` and the repository's chosen
   version file; recheck the installed Better Auth CLI requirement before
   scaffolding.
7. Port the existing visual system faithfully before adding backend UI.
8. Keep `/docs/*.md` reachable through an allowlisted Next.js route that returns
   `text/markdown`; reject traversal and unknown filenames. Configure output
   tracing so the documents exist in Vercel functions.
9. Move the share image to the Next.js public asset path without regenerating
   or redesigning it.

Do not introduce a component library or Tailwind solely because the scaffold
offers it. The existing warm-paper, hard-rule, black and signal-orange system is
part of the product direction.

### Proposed top-level shape

```text
app/
  api/
    auth/[...all]/route.ts
    v1/founding-state/route.ts
    v1/entries/seal/route.ts
    v1/entries/[ordinal]/route.ts
    v1/entries/[ordinal]/relays/route.ts
    v1/formation-tape/route.ts
    v1/me/export/route.ts
    v1/me/withdrawal-requests/route.ts
    health/route.ts
  e/[ordinal]/page.tsx
  enter/page.tsx
  enter/check-email/page.tsx
  enter/continue/page.tsx
  me/page.tsx
  r/[token]/page.tsx
  source/[document]/route.ts
  status/page.tsx
  layout.tsx
  page.tsx
  globals.css
src/
  auth/
  db/
    schema/
    migrations/
    queries/
  ledger/
  relay/
  email/
  security/
  validation/
  observability/
scripts/
tests/
docs/
archive/
```

Exact organization is an implementation choice. Public/private boundaries and
testability are not.

---

## 5. Environment and write-state model

Use three distinct data environments:

```text
LOCAL       disposable real-Postgres development data
PREVIEW     isolated test data; never presented as canonical
PRODUCTION  durable canonical data; writes closed until readiness receipt
```

Never point Vercel Preview and Production at the same database or branch.

Canonical writes require two independent conditions:

1. server environment `ALLOW_CANONICAL_WRITES=true`; and
2. database `ledger.system_state.mode = 'OPEN'`.

The default is false/closed. Supported database modes:

```text
CLOSED   public reading allowed; entry seal rejected with explanation
OPEN     canonical writes allowed if the environment gate also allows them
PAUSED   incident state; reading and data-rights requests remain available
```

No UI or generic deployment script may silently turn either gate on. Opening
and pausing require a steward receipt.

### Required environment variables

```text
DATABASE_URL
DIRECT_DATABASE_URL
BETTER_AUTH_SECRET or BETTER_AUTH_SECRETS
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
RESEND_FROM
RELAY_SIGNING_SECRET
ALLOW_CANONICAL_WRITES=false
APP_ENV=local|preview|production
EMAIL_DELIVERY_MODE=capture|resend
```

Rules:

- only `NEXT_PUBLIC_APP_URL` is intentionally browser-visible;
- `.env.example` contains names and explanations, never values;
- no secret is written to logs, fixtures, screenshots or receipts;
- preview and production secrets differ;
- relay and auth secrets have a documented rotation procedure;
- database owner credentials are never used as the application runtime role.

---

## 6. Authentication and email

### Adopted first-slice behavior

- Better Auth owns sessions and authentication tables.
- The only public login/signup mechanism is email magic link.
- Resend sends the link.
- Following a valid magic link proves control of an email address; it does not
  prove unique personhood or create a ledger entry.
- A person may authenticate and then decide not to seal an entry.
- One Better Auth user may seal at most one active founding entry.
- Passkeys, social login, passwords and KYC are outside this slice.

### Required Better Auth configuration

- mount the official Next.js handler at `/api/auth/[...all]`;
- use the supported Drizzle PostgreSQL adapter and generate its schema through
  the Better Auth CLI, then review and migrate through Drizzle;
- keep auth tables in an `auth` schema or equivalently isolated namespace;
- configure the magic-link plugin with hashed token storage;
- do not let the emailed URL itself execute authentication on `GET`;
- place the single-use token in a fragment on an OURS-owned, strict-CSP
  confirmation page and require an explicit human “Continue” action that
  submits it for verification; email/link scanners must not consume the token;
- use database-backed rate-limit storage, not process memory on Vercel;
- keep default CSRF/origin protections enabled;
- set an explicit base URL and exact trusted origins per environment;
- use secure, HTTP-only, host-only cookies in production;
- validate the full server session for protected pages and mutations; a cookie
  existence check is not authorization;
- never log an email, raw token, magic URL or session cookie;
- return the same public response whether an email exists or not;
- expire and consume links once; show understandable expired/used states;
- revoke sessions on account/security changes where supported.

Better Auth protects its own endpoints. OURS application mutation routes still
need session validation, exact-origin/Fetch-Metadata checks and a session-bound
CSRF control. Do not assume auth middleware protects ledger endpoints.

Official implementation references:

- [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth magic link](https://better-auth.com/docs/plugins/magic-link)
- [Better Auth database and schema generation](https://better-auth.com/docs/concepts/database)
- [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit)
- [Better Auth security](https://better-auth.com/docs/reference/security)
- [Better Auth 1.7 upgrade and CLI runtime requirements](https://better-auth.com/docs/guides/1-7-upgrade-guide)

### Email requirements

The magic-link email includes:

- OURS TODAY identity;
- the requested action;
- an explicit expiry;
- a plain-text alternative;
- “This authenticates your email. It does not create a Founding Ledger entry or
  legal membership.”;
- a support/ignore-this-message path without revealing whether an account
  existed.

Disable Resend open and click tracking for authentication email. Tracking can
rewrite verification links and adds unnecessary behavioral data.

The email must link first to an OURS-controlled confirmation page. Its initial
`GET` performs no authentication and contains no third-party scripts or
analytics. A practical pattern is to keep the Better Auth token in the URL
fragment so it is not sent in the initial HTTP request or referrer; the person
then explicitly presses **Continue**, and first-party code submits the token to
the Better Auth verifier. Test this against link-scanner GET/HEAD requests.

When entry began through a relay, create a private short-lived entry context at
the human's magic-link request. Bind it to the requested email digest and relay
record, and carry only its opaque ID alongside the emailed confirmation flow.
After authentication, resolve it only when the authenticated email matches.
This preserves attribution when the person opens email on another device
without placing the raw relay token in the email.

Locally and in automated tests, capture email into a test-only inbox adapter.
Do not print reusable magic URLs into shared preview or production logs.

Related official guidance:

- [Resend authentication-email deliverability and scanner guidance](https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails)
- [Resend open and click tracking](https://resend.com/docs/dashboard/domains/tracking)

---

## 7. Database boundaries and schema

Use separate PostgreSQL schemas and separate database roles where the provider
supports them:

```text
auth      Better Auth users, sessions, accounts, verification and rate limits
private   person link, drafts, consent, token records, requests and reviews
ledger    canonical entries, events, relay edges, counter and system state
public    safe read-only views used for public projections
```

The migration owner can change schemas. The runtime application role receives
only the grants needed by the service. Browser code receives no database
credential and makes no provider Data API calls.

### Minimum tables

#### Better Auth generated

- `auth.user`
- `auth.session`
- `auth.account`
- `auth.verification`
- database-backed auth rate-limit table

Use the exact names generated by the pinned Better Auth/Drizzle version; do not
hand-maintain an incompatible duplicate.

#### Private application records

`private.person`

- opaque UUID primary key;
- unique Better Auth user reference;
- timestamps and private lifecycle state;
- no public ordinal used as an auth secret.

`private.entry_draft`

- draft UUID and person reference;
- proposed display name/pseudonym;
- declaration, constitution, protocol, privacy and legal-status versions;
- predecessor relay reference if present;
- state and timestamps;
- no ordinal.

`private.entry_context`

- opaque, high-entropy context ID with a short expiry;
- requested-email digest, never a public email field;
- relay-token record reference where entry began through a relay;
- consumed/expired state and server timestamps;
- created only after the human requests a magic link, never by relay `GET`;
- allows cross-device continuation without embedding the raw relay token in
  email.

`private.consent_record`

- person and entry/draft reference;
- exact document versions accepted;
- purpose and server timestamp;
- withdrawal/supersession reference where applicable.

`private.idempotency_record`

- actor/person, operation and client-generated key;
- canonical request digest;
- stored result reference and status;
- unique `(actor, operation, key)` constraint;
- same key with different input returns conflict, never a second entry.

`private.relay_token`

- token/JTI digest, never the reusable raw token;
- predecessor entry, channel hint, issue/revocation timestamps and state;
- signing-key version for rotation.

`private.withdrawal_request`, `private.correction_request` and
`private.review_case`

- request/review state;
- subject, reason code, timestamps and authorized human actor;
- public-safe receipt reference;
- no private risk score in public projections.

#### Canonical ledger records

`ledger.system_state`

- singleton mode `CLOSED | OPEN | PAUSED`;
- protocol/declaration versions accepted for new entries;
- changed by, authority reference, reason and timestamp.

`ledger.ordinal_counter`

- one named row with the next available ordinal;
- incremented with a row lock inside the seal transaction;
- starts after the approved origin/genesis decision;
- rollback rolls back the counter update.

`ledger.entry`

- opaque entry UUID;
- unique public ordinal;
- unique private person reference;
- approved public display name or pseudonym;
- authoritative seal timestamp;
- lifecycle state;
- declaration/protocol/legal-status versions;
- predecessor entry reference if valid;
- first-continuation entry reference or separate projection;
- no email, session, recovery token or risk data.

`ledger.event`

- append-only event UUID, type and schema version;
- authoritative server timestamp;
- actor type and opaque actor reference;
- subject type and opaque subject reference;
- authority/policy reference;
- prior corrective event reference where relevant;
- privacy classification;
- idempotency key reference;
- canonical JSON payload and integrity digest.

Updates and deletes on canonical events must be rejected by grants and/or a
database trigger. Corrections append another event.

`ledger.relay_arrival`

- successor entry unique key;
- predecessor entry and relay reference;
- authoritative timestamp.

`ledger.first_continuation`

- predecessor entry primary/unique key;
- successor entry reference;
- insert with `ON CONFLICT DO NOTHING ... RETURNING` or equivalent atomic
  compare-and-set.

#### Public projections

Create allowlisted views exposing only:

- ordinal;
- approved public display name/pseudonym or withdrawn tombstone;
- public entry date/time precision;
- predecessor ordinal;
- relay state;
- First Continuation ordinal;
- public lifecycle state;
- declaration/protocol version;
- `LEGAL MEMBERSHIP: NOT YET ISSUED`.

Add an automated test that enumerates public-view columns and fails if email,
auth user ID, session, token, IP, user agent, risk or recovery data appears.

---

## 8. Atomic entry seal

The seal is the highest-risk operation. Implement it as one PostgreSQL
transaction through one reviewed service function.

### Preconditions

1. Ledger environment and database state both allow writes.
2. Full Better Auth server session is valid.
3. Email verification is complete.
4. Input passes schema and length validation.
5. Current legal status and exact document versions were shown and accepted.
6. The request includes an idempotency key and session-bound CSRF proof.
7. The person does not already have a sealed entry.
8. Rate/abuse controls allow the attempt.
9. A predecessor token, when supplied, passes signature, expiry/revocation and
   database checks.

### Transaction effects

1. Claim or load the idempotency record and compare the request digest.
2. Create/load the private person and consent records.
3. Lock and increment `ledger.ordinal_counter`.
4. Insert `ledger.entry` with the allocated ordinal.
5. Append `ledger.entry.sealed`.
6. If a valid predecessor exists, insert the arrival.
7. Attempt the atomic First Continuation insert.
8. Append either `relay.first_continuation.recorded` or
   `relay.arrival.recorded`.
9. Create the initial relay record and append `relay.issued`.
10. Persist the idempotent response reference.
11. Commit.

Only after commit may the response reveal the ordinal or a relay URL.

### Failure behavior

- Before commit: reveal no ordinal.
- Unknown network result: retrieve by idempotency key before retrying.
- Same key and same request: return the original result.
- Same key and different request: return conflict.
- Existing entry: return its safe receipt instead of creating another.
- Closed/paused ledger: preserve the draft and explain the state.
- Suspected abuse: open a private review; do not publish an accusation.

Use a row-locked counter rather than predicting `MAX(ordinal) + 1`. A Postgres
sequence is acceptable only if documented gaps are explicitly accepted; the
row counter is recommended for the first authoritative writer because rollback
also rolls back allocation.

---

## 9. Relay and First Continuation

### Token design

Use an opaque, URL-safe value authenticated with a server-held, versioned HMAC
key. Keep predecessor and channel data in the private token record rather than
revealing internal identifiers in the URL. The public token needs only a random
identifier, version and authenticator, conceptually:

```json
{
  "v": 1,
  "jti": "random-opaque-id",
  "keyVersion": 1
}
```

Store a digest of the JTI/token record for revocation and audit; do not store or
log a reusable raw token. Validate with constant-time comparison. Document key
rotation while preserving validation of active older versions.

### `/r/[token]` behavior

- `GET` and `HEAD` perform no database mutation.
- Validate the token and render only safe predecessor context.
- Do not count the request as a continuation or contribution.
- Preserve valid context for the later authenticated seal using a short-lived,
  signed, HTTP-only, SameSite cookie. When the human requests a magic link,
  exchange it for the private, email-bound `entry_context` described above so
  opening email on another device can preserve the lineage safely.
- Link-preview bots may receive public metadata but create no human state.
- Invalid/revoked tokens show a safe generic state and do not enumerate private
  information.

The seal transaction validates the relay again. It, not the page visit, writes
the arrival and races for First Continuation.

An entrant may explicitly request channel-specific relay variants. OURS never
posts automatically.

---

## 10. Routes and human flows

### Public routes

```text
/                         Day 1 instrument with truthful live/closed state
/status                   current public ledger and service status
/e/[ordinal]              safe public entry receipt
/r/[token]                safe relay context and entry invitation
/source/[document]        allowlisted governing Markdown source
```

### Authentication and entry

```text
/enter                    display name/declaration preview and email request
/enter/check-email        neutral delivery status and retry guidance
/enter/continue           authenticated consent review and seal action
/me                       private account, entry, export and request controls
```

Recommended sequence:

1. Visitor reads the exact thesis and current legal/ledger status.
2. Visitor can inspect the declaration before supplying email.
3. Visitor requests a magic link; UI returns a neutral response.
4. Valid link creates/authenticates an account but no ledger entry.
5. Authenticated person chooses public name/pseudonym and accepts exact versions.
6. UI says the number will be assigned only on successful entry.
7. Person explicitly seals.
8. Server transaction commits.
9. Receipt shows ordinal, legal status and explicit share controls.
10. Person may create/copy a relay or leave without sharing.

### API vocabulary

The protocol's `/v1` vocabulary may be mounted under Next.js `/api/v1`:

```text
GET  /api/v1/founding-state
POST /api/v1/entry-drafts
POST /api/v1/entries/seal
GET  /api/v1/entries/{ordinal}
POST /api/v1/entries/{ordinal}/relays
GET  /api/v1/formation-tape
GET  /api/v1/me/export
POST /api/v1/me/withdrawal-requests
POST /api/v1/me/correction-requests
GET  /api/health
```

All mutation responses include a machine state and plain-language receipt.
Ledger mutations require idempotency, session validation, CSRF/origin controls
and rate limits. Public endpoints use explicit safe serializers; never return a
raw ORM row.

---

## 11. Rights, correction, withdrawal and review

The first slice is incomplete without usable data rights.

### `/me`

An authenticated person can:

- see their private account state and public entry separately;
- export a documented JSON package of their own records;
- request public-name correction;
- request withdrawal/pseudonymization;
- revoke active sessions;
- see request status and a human support path.

### Policy boundary

Do not invent a final GDPR/legal erasure rule. Build the mechanism and mark the
policy as awaiting licensed review:

- request is append-only and receipted;
- reviewed action appends correction/withdrawal events;
- safe public projection can replace the name with a withdrawn tombstone;
- ordinal is never reassigned;
- deletion/retention of private auth and security records follows the approved
  schedule and lawful exceptions;
- every operator action names its authority and actor.

### Steward tools

Build the smallest internal surface or CLI needed to:

- view pending correction, withdrawal and integrity reviews;
- resolve a review with a reason and appended event;
- pause canonical writes;
- inspect a redacted entry transaction receipt;
- grant/revoke a time-bounded steward assignment.

Do not authorize stewards through a client-provided email list alone. Store
assignments in a private table, require a valid server session and provide a
controlled bootstrap command that writes a receipt.

There is no direct “edit canonical event” operation.

---

## 12. Security and privacy requirements

### Application controls

- strict Content Security Policy and standard security headers;
- no inline secrets or unsafe HTML rendering;
- exact trusted origins; no broad production wildcard;
- full server-side authorization on every private or steward operation;
- session-bound CSRF plus Origin/Fetch-Metadata checks for OURS mutations;
- database-backed auth and application rate limits;
- request size, field length and URL-scheme limits;
- generic auth/relay errors that avoid enumeration;
- HMAC token verification with constant-time comparison;
- relay URLs are intentionally shareable attribution capabilities, never
  authentication capabilities; they authorize no private read or mutation;
- set `Referrer-Policy: no-referrer` on relay and auth-confirmation pages and
  load no third-party resources there;
- acknowledge provider access-log URL retention in the data/processor map;
  application logs must not deliberately copy or echo raw relay or auth tokens;
- no raw database rows returned from routes;
- dependency and secret scanning in CI;
- structured redacted logging with request/receipt IDs;
- no email, token, cookie, IP address or private display-name draft in logs;
- a tested pause switch that does not remove public read access or rights
  requests.

### Data map required before any external identity collection

Create `docs/operations/DATA-MAP.md` with, for every field:

- system/table and field;
- public/private/sensitive class;
- purpose and legal-basis placeholder;
- source and recipients/processors;
- retention/deletion rule;
- export/correction/erasure behavior;
- logging and backup presence.

Better Auth may store session IP/user-agent data depending on configuration.
Inspect the pinned version and include those fields rather than pretending the
auth library is outside the data map.

---

## 13. Test matrix

Use a real PostgreSQL database for all transaction tests. Test fixtures are
concept data and must never reach the public production projection.

### Unit

- input normalization and validation;
- canonical request digest stability;
- relay signing, rotation, tampering and expiry/revocation;
- safe public serializers;
- event integrity digest;
- legal-status copy guard;
- redaction helper.

### PostgreSQL integration

- 25+ simultaneous valid seals receive unique ordinals;
- same idempotency key returns one result under concurrency;
- same key with different input conflicts;
- failed/expired verification issues no ordinal;
- changing client clocks does not change order;
- one auth user cannot seal twice;
- valid relay arrival is written only during seal;
- 25+ simultaneous successors all enter and exactly one becomes First
  Continuation;
- tampered or revoked token creates no edge;
- self-referral/duplicate path cannot vest First Continuation;
- event update/delete is rejected;
- void/withdrawal does not reassign an ordinal;
- public views expose no private columns;
- closed and paused modes reject seal without corrupting drafts;
- restore into a clean database preserves event order and idempotency.

### Browser/e2e

- magic-link request, captured delivery, verification and session;
- link-scanner GET/HEAD on the emailed confirmation URL cannot consume or verify
  the single-use magic token;
- relay entry context survives an authorized cross-device magic-link flow and
  cannot be claimed by a different authenticated email;
- entry completed by keyboard;
- screen-reader names, errors and live statuses;
- narrow mobile and desktop layouts;
- reduced motion;
- expired/used link;
- database or Resend failure state;
- closed/paused ledger state;
- receipt and explicit share copy;
- relay GET and HEAD produce no database changes;
- export and withdrawal request;
- no console errors or unintended network requests.

### Release commands

Provide scripts equivalent to:

```text
format:check
lint
typecheck
test:unit
test:integration
test:e2e
build
db:migrate:check
db:restore:verify
security:audit
```

CI runs them from a clean checkout against an isolated PostgreSQL service.
Tests must say `NOT RUN` when credentials or infrastructure are missing.

---

## 14. Operations package

Create and keep current:

```text
docs/operations/DATA-MAP.md
docs/operations/PRIVACY-NOTICE-DRAFT.md
docs/operations/DEPLOY.md
docs/operations/MIGRATIONS.md
docs/operations/BACKUP-RESTORE.md
docs/operations/PAUSE-LEDGER.md
docs/operations/INCIDENT.md
docs/operations/EMAIL-DELIVERABILITY.md
docs/operations/SECRET-ROTATION.md
docs/operations/SUPPORT-AND-REVIEW.md
docs/receipts/
```

### Backup rule

No canonical launch on a database tier without:

- automated encrypted backups outside the live database failure boundary;
- named retention;
- documented owner;
- a successful restoration into a clean environment;
- verification of entry order, event count, First Continuation and idempotency
  after restoration.

A provider dashboard saying “backup enabled” is not a restore rehearsal.

### Observability rule

Before production, define:

- health and dependency checks;
- seal success/failure/latency counters;
- idempotency conflict and review counts;
- Resend delivery/bounce/complaint monitoring;
- database capacity and connection-pool alerts;
- private-data redaction;
- persistent log/error retention beyond an ephemeral free log window;
- named incident owner and escalation path.

Do not publish raw email or IP-based metrics.

---

## 15. Build milestones

### Milestone A — Preserved Next.js shell

- archive static Day 1 v0.2;
- scaffold/pin Next.js and dependencies;
- port exact design and content;
- expose truthful `CLOSED · TEST BUILD` state;
- preserve source-document access;
- add local/test environment validation.

**Gate:** visual and semantic regression tests pass; no backend claim exists.

### Milestone B — Auth and email

- Better Auth schema and Next route;
- magic link with hashed storage;
- Resend adapter plus local capture adapter;
- database rate limits;
- neutral auth UI and all failure states;
- session/account page.

**Gate:** authentication works end-to-end in test and creates no ledger entry.

### Milestone C — Atomic ledger

- schemas, roles and migrations;
- drafts, consent and idempotency;
- system state and row-locked ordinal allocator;
- append-only events and safe public views;
- atomic seal service and receipt.

**Gate:** concurrency, idempotency and private-field tests pass on PostgreSQL.

### Milestone D — Relay

- signed token/key rotation;
- relay page with zero GET/HEAD writes;
- preserved context through auth;
- arrival and atomic First Continuation;
- channel-specific explicit share actions.

**Gate:** viral-race and token-tamper tests pass.

### Milestone E — Rights and stewardship

- export;
- correction and withdrawal request;
- reviewed append-only action path;
- private review queue;
- pause/unpause operation with receipts.

**Gate:** public identity can be safely tombstoned in test without renumbering.

### Milestone F — Operations and hardening

- data map and privacy draft;
- headers, CSRF, rate limits and logging redaction;
- backup/dump and clean restore rehearsal;
- incident, migration, secret and email runbooks;
- complete automated test matrix;
- build receipt.

**Gate:** every protocol acceptance test is PASS or explicitly blocked by a
named human/legal decision. No “should pass.”

### Milestone G — External preview

Requires a new human approval and credentials.

- initialize/publish the approved Git repository;
- provision isolated preview PostgreSQL;
- configure protected Vercel Preview;
- configure Resend test/verified sender as authorized;
- migrate preview database;
- run smoke, accessibility and security checks on the actual preview;
- keep canonical writes disabled and all data labeled test.

**Gate:** preview receipt records URL, commit, migration, environment and tests.

### Milestone H — Canonical launch

Requires a separate founder-steward readiness decision. It is not implied by
this handoff.

---

## 16. Human decisions required before canonical launch

Local implementation should proceed without inventing answers to these:

1. Neon or Supabase provisioning and paid/durability plan.
2. Approved legal controller identity and privacy notice.
3. Production treatment of declared origin `000001 · RADO`: reviewed genesis
   event or declaration outside the ordinary allocator.
4. Public timestamp precision and display-name moderation rules.
5. Email-change, duplicate-person and self-referral review policy.
6. Private-data retention, withdrawal and erasure schedule.
7. Incident owner, support contact and review capacity.
8. Off-site backup target and retention.
9. Vercel plan eligibility and spend limit.
10. Registration/control of `ourstoday.com` and the Resend sending subdomain.
11. Whether a risk-based bot challenge is required at launch.
12. Licensed review of entry copy and the boundary between Founding Ledger
    status and future legal membership eligibility.
13. **Succession and exit instruments.** Added 26 August 2026 by the Vision
    Escalation 0.1 adoption receipt. Two legal instruments, neither of which
    may be published as Markdown:
    - **Article Zero** — the right to leave with everything, as an enforceable
      clause rather than an intention. The *capability* is shipped and tested
      (`pnpm fork export` / `pnpm fork verify`, quarterly Fork Drill); the
      clause requires a lawyer.
    - **Constitutional liveness** — if no steward receipt is published for 90
      days the ledger auto-pauses, with public reading and data rights
      continuing; if none for 365 days, a pre-executed instrument releases the
      software under an irrevocable licence to the member body and triggers
      transfer of the domain and the anchoring responsibility.

    This is a succession plan. It is cheap to draft while the founder-steward
    holds all the power, and impossible to draft credibly afterwards. Publish
    it only when executed: a promise with no mechanism is the exact thing this
    project exists to oppose.

The agent implements safe extension points and marks these `FUTURE DECISION`.
It does not block ordinary local work and does not fabricate policy.

---

## 17. Canonical production launch gates

The Founding Ledger remains closed until all are evidenced.

> **These are now rows, not checkboxes.** `ledger.gate` holds all sixteen with
> the evidence each requires and what blocks it, and `/status` renders them
> live - including the day one slips, which appends `ledger.gate.changed`.
> A gate cannot be marked MET without an evidence URI. The list below is the
> canonical text; the database is the canonical state.


- [ ] legal status and privacy notice reviewed;
- [ ] public/private data map approved;
- [ ] identity and recovery path tested;
- [ ] atomic entry and continuation tests pass;
- [ ] idempotency and abuse controls pass;
- [ ] correction, withdrawal and export work;
- [ ] encrypted backup exists and clean restore rehearsal passes;
- [ ] incident owner and support path are named;
- [ ] no interface claims legal membership;
- [ ] pause/rollback path is tested;
- [ ] monitoring exposes failures without exposing private data;
- [ ] email domain, bounce and complaint handling work;
- [ ] production plan/cost and spend controls are accepted;
- [ ] genesis/origin treatment has a decision receipt;
- [ ] founder-steward signs and publishes the readiness receipt;
- [ ] environment and database write gates are deliberately opened.

Passing code tests alone is not authorization to open canonical writes.

---

## 18. Required final handoff from the coding agent

The coding session ends with:

1. working local application;
2. committed migrations and reproducible setup scripts;
3. automated test evidence;
4. exact list of external services that remain unprovisioned;
5. data map, runbooks and restore evidence;
6. dependency and current monthly-cost inventory;
7. known risks and unresolved human decisions;
8. rollback path to the archived Day 1 static site;
9. an `ours.build-receipt/v1` file in `docs/receipts/`;
10. truthful status: local, preview or production, never an implication.

The agent must lead its final report with what actually works for a person, not
the number of files or dependencies created.
