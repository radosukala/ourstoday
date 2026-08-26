# OURS Founding Ledger · Next Coding Session Prompt

Copy the prompt below into a new coding session rooted at
the repository working tree.

---

```text
You are building the first working backend for OURS TODAY in:

<repository working tree>

Your authority is BUILD inside this local workspace. You may inspect, edit,
install justified dependencies, run local PostgreSQL and execute tests. You do
not have authority to deploy, publish a repository, create paid/external
services, change DNS, collect production identity data, or open canonical
writes. Stop only when an external credential/action or a genuinely
product-defining human decision is required; ordinary implementation choices
are yours.

Before editing, completely read these files in this order:

1. docs/CONSTITUTION-0.1.md
2. docs/OURS.md
3. docs/FOUNDING-RELAY-PROTOCOL.md
4. docs/AGENT-BUILD-CONTRACT.md
5. docs/FOUNDING-LEDGER-BUILD-HANDOFF.md
6. docs/DAY-1.md
7. README.md

Then inspect the whole current workspace, any uncommitted/user-owned changes,
and whether Git has been initialized. Do not claim repository history if it has
not.

Primary lock:

THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.

OURS is a member-owned network that builds its own software in public.

Every relevant surface must also say:

OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED

The Founding Ledger is not legal membership, a share, security, token, promise
of profit or extra vote.

Objective:

Convert the existing static Day 1 instrument into a tested Next.js App Router
application with:

- strict TypeScript;
- the existing visual system preserved, not replaced with SaaS styling;
- provider-neutral PostgreSQL and Drizzle migrations;
- Better Auth email magic links;
- Resend plus a safe local/test email-capture adapter;
- a scanner-safe two-step magic-link confirmation page whose GET/HEAD cannot
  authenticate or consume the token;
- database-backed auth/application rate limits;
- private identity and public ledger separation;
- explicit consent/document versions;
- an atomic idempotent seal transaction with a row-locked ordinal allocator;
- append-only canonical events and safe public projections;
- signed opaque relay URLs;
- zero state change on relay GET/HEAD;
- cross-device relay attribution through a short-lived email-bound private
  entry context, never by embedding the raw relay token in email;
- atomic First Continuation under concurrent successors;
- account export, correction and withdrawal requests;
- a minimal receipted steward review/pause path;
- privacy, migration, backup/restore, incident, email and secret runbooks;
- unit, real-PostgreSQL integration, Playwright and accessibility tests;
- a complete ours.build-receipt/v1.

Database architecture:

- Code against standard PostgreSQL URLs and Drizzle, not a provider browser SDK.
- Use DATABASE_URL for pooled runtime and DIRECT_DATABASE_URL for migrations and
  controlled dumps.
- Neon is the recommended external provider when provisioning is authorized;
  Supabase must remain compatible through connection configuration.
- Do not use Supabase Auth or expose a browser Data API.
- Use distinct local, preview and production databases/branches.
- Default ALLOW_CANONICAL_WRITES=false and database ledger state CLOSED.
- Never run migrations automatically from a production request or app startup.

Preservation:

1. Archive the current Day 1 static implementation under
   archive/day-1-static-v0.2 before replacing it.
2. Preserve all docs and the Mission Market archive.
3. Scaffold Next.js in the existing repository root, not a nested project.
4. Keep the existing share image and direct governing-document access.
5. Add dependencies only when justified and record exact versions.

Critical mechanics:

- No ordinal reservation or exact next-number preview.
- Verification and explicit seal are different actions.
- Magic-link authentication creates an auth account, not a ledger entry.
- A single verified auth user can seal at most one active entry.
- Only the committed transaction may reveal the ordinal or relay.
- Same idempotency key and input returns the same entry.
- Same idempotency key with different input conflicts.
- All concurrent valid entrants enter with distinct ordinals.
- All concurrent valid successors enter; exactly one becomes First
  Continuation.
- Referral count never changes votes, ownership or rights.
- Public views cannot expose email, auth IDs, sessions, tokens, IPs, recovery or
  risk data.
- Corrections, withdrawals and voids append events; ordinals are never reused.
- An agent/service cannot issue legal membership.

Work milestone by milestone as defined in
docs/FOUNDING-LEDGER-BUILD-HANDOFF.md. Keep the plan updated and send concise
progress notes. Run the tests for each milestone before continuing. Use a real
PostgreSQL database for concurrency; do not substitute SQLite.

Do not wait for Neon/Supabase/Vercel/Resend credentials to build the local
application. Use local PostgreSQL and the capture email adapter. When local
work is complete, stop at the external provisioning/deployment gate and report
the exact smallest approvals and credentials needed.

Do not weaken a test to make it pass. Do not invent legal/privacy policy, users,
events, numbers or live claims. Mark unresolved policy FUTURE DECISION and keep
canonical writes closed.

Definition of done for this BUILD authority:

- the full local application works against disposable PostgreSQL;
- the original Day 1 design remains recognizable and responsive;
- auth, seal, relay, rights and pause flows pass automated tests;
- concurrency and idempotency invariants pass on PostgreSQL;
- public/private non-disclosure tests pass;
- clean database migration and restore verification pass locally;
- all operations documents exist and are honest about missing external/legal
  gates;
- production remains undeployed and CLOSED unless I separately authorize
  DEPLOY.

At the end, create docs/receipts/TASK-20260826-002.md using the Build Receipt
format in docs/AGENT-BUILD-CONTRACT.md and hand off:

- outcome first;
- what is actually tested;
- what was not run;
- costs and external services still needed;
- risks and decisions required;
- exact commands to run locally;
- exact rollback path;
- the next approval required.
```
