# OURS TODAY

> **THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.**
>
> **The record cannot be bought into. Not now, not later, not by us.**

OURS is a member-owned network that builds its own software in public.

**Day 1:** 26 August 2026
**Ownership status:** COMMITTED · **Legal membership:** NOT YET ISSUED
**Canonical intended domain:** `ourstoday.com`

---

## Truthful status

**This runs locally. Nothing is deployed.** No Git remote, no hosting, no
database outside a developer's machine, no domain, no email sending domain.
Current external cost: **0.00 EUR**.

Canonical writes are closed behind two independent gates and stay closed until
a founder-steward readiness receipt is published. Passing tests is not
authorization to open them.

**One of sixteen launch gates is met.** The live list, with the evidence each
one requires and the named human decision blocking it, is at `/status`.

---

## What works today

A person can, against a real PostgreSQL database:

1. read the founding declaration and the current legal status before giving
   anything;
2. verify control of an email address with a magic link whose token lives in
   the URL fragment, so a mail scanner that fetches the link authenticates
   nobody;
3. choose a public name or pseudonym, optionally name a **witness** who
   attests they are a person and receives nothing for it, accept the exact
   document versions, and seal;
4. receive a number assigned inside the committed transaction and not one
   moment earlier, plus a **member root** — a stable identifier that
   authorizes nothing and exists so a credential they control can be rooted
   here later;
5. carry a relay, or not. Someone entering through it records lineage, and
   exactly one successor becomes that place's **First Continuation**;
6. export their own records, request a name correction, request withdrawal.

A steward can, from the command line, work the review queue, resolve a
correction or withdrawal, void an entry after review, move a launch gate,
record a deployment, publish an anchor, and pause or open canonical writes —
each naming a human actor and a reason, each appending a receipted event in
the same transaction as the change.

Anyone can take the whole public record and check it without us.

---

## Run it

Requires Node 22.12+, pnpm and a local PostgreSQL 16+.

```bash
pnpm install
cp .env.example .env.local     # fill in local values
pnpm db:migrate
pnpm db:seed:local             # the declared origin row, as LOCAL CONCEPT DATA
pnpm dev
```

## Commands

| | |
|---|---|
| `pnpm steward` | review queue, corrections, withdrawals, gates, write-gate transitions |
| `pnpm conformance check` | run the ten invariants and print |
| `pnpm conformance run` | run them and **append the result, pass or fail** |
| `pnpm anchor publish DAILY --actor "..."` | publish a Merkle root over the canonical log |
| `pnpm fork export` | the complete public state, schema and governing documents |
| `pnpm fork verify <dir>` | recompute the chain and every root **offline** |
| `pnpm db:restore:verify` | dump, restore clean, recompute the chain, prove append-only survived |
| `pnpm security:audit` | dependency advisories plus a committed-secret tripwire |

Release gates: `format:check` · `lint` · `typecheck` · `test:unit` ·
`test:integration` · `test:e2e` · `build` · `db:migrate:check` ·
`db:restore:verify` · `security:audit`.

## Leaving

```bash
pnpm fork export && pnpm fork verify ./fork-export
```

Verification needs no database, no network and no permission from OURS. That is
the point: an export you have to trust us about is not an export. The quarterly
[Fork Drill](docs/operations/FORK-DRILL.md) is performed by someone who is not
the founder-steward, and if it fails, the ledger does not open.

---

## Source package

**Governing**

- [Founding direction v0.2](docs/OURS.md)
- [Founding Constitution 0.1](docs/CONSTITUTION-0.1.md)
- [Founding Relay Protocol](docs/FOUNDING-RELAY-PROTOCOL.md)
- [**Event Schema 1.0**](docs/EVENT-SCHEMA-1.0.md) — published standard; a
  breaking change to it is a constitutional amendment
- [Proposal and Deliberation Protocol](docs/PROPOSAL-AND-DELIBERATION-PROTOCOL.md)
- [Agent Build Contract](docs/AGENT-BUILD-CONTRACT.md)
- [Day 1 record](docs/DAY-1.md)

**Direction and build**

- [Founding Ledger backend build handoff](docs/FOUNDING-LEDGER-BUILD-HANDOFF.md)
- [Vision Escalation 0.1](docs/OURS-VISION-ESCALATION-0.1.md) — proposal, as
  written
- [Vision Escalation adoption receipt](docs/receipts/2026-08-26-vision-escalation-adoption.md)
  — what was adopted, what was not, and why
- [Build receipt 0.1](docs/receipts/2026-08-26-build-receipt-0.1.md)

**Operations** — published with their unanswered questions intact, because
those questions are the point

- [Data map](docs/operations/DATA-MAP.md) — every field stored, its class, its
  retention
- [Privacy notice draft](docs/operations/PRIVACY-NOTICE-DRAFT.md) — seven gaps
  block publication
- [Conformance](docs/operations/CONFORMANCE.md) ·
  [Fork Drill](docs/operations/FORK-DRILL.md) ·
  [Pause the ledger](docs/operations/PAUSE-LEDGER.md) ·
  [Incident](docs/operations/INCIDENT.md) ·
  [Backup and restore](docs/operations/BACKUP-RESTORE.md) ·
  [Migrations](docs/operations/MIGRATIONS.md) ·
  [Deploy](docs/operations/DEPLOY.md) ·
  [Email deliverability](docs/operations/EMAIL-DELIVERABILITY.md) ·
  [Secret rotation](docs/operations/SECRET-ROTATION.md) ·
  [Support and review](docs/operations/SUPPORT-AND-REVIEW.md)

**Prehistory**

- [Founding direction v0.1](docs/OURS-v0.1.md) (superseded)
- `archive/day-1-static-v0.2/` — the Day 1 static instrument, unchanged, and
  the rollback target
- `archive/mission-market-v0.1/`

---

## What this is not

A Founding Ledger entry is not a share, a security, a token, an ownership
certificate, a legal member register or a promise of profit. No number is
reserved, previewed, sold, transferred or reassigned. A verified entrant keeps
their place without recruiting anyone. Referral count creates no vote,
ownership or economic right. There is no follower count, no like and no
popularity measure — not because they are hidden, but because they are not
fields.

Success looks like being as boring as a land registry, and as hard to delete.
