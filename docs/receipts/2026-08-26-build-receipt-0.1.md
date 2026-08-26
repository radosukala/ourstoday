# OURS TODAY · Build Receipt

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260826-002
decision_id: FOUNDING-LEDGER-HANDOFF-0.1
date: 2026-08-26
authority: founder-steward BUILD authorization (handoff section 3)
truthful_status: LOCAL
deployed: false
canonical_writes_open: false
```

## What actually works for a person

A person can, on a local machine, against a real PostgreSQL database:

1. read the founding declaration and the current legal status before giving
   anything;
2. give an email address and receive a sign-in link;
3. open that link, see a page that has authenticated nobody yet, and press
   **Continue** to sign in — a corporate mail scanner that fetches the same URL
   cannot consume the token, and the suite asserts that with a real `GET` and
   `HEAD`;
4. choose a public name or pseudonym, read the exact document versions, and
   seal;
5. receive a receipt with a number that was assigned inside the committed
   transaction and not one moment earlier;
6. copy a relay and carry it wherever they choose, or leave without sharing;
7. have someone else open that relay on a different device, enter through it,
   and see on their own receipt which place they arrived through and whether
   they became its First Continuation;
8. export their own records, request a name correction, request withdrawal.

A steward can, from the command line, see the review queue, resolve a
correction or a withdrawal, void an entry after review, and pause or open
canonical writes — each naming a human actor and a reason, each appending a
receipted event in the same transaction as the change, each writing a receipt
file.

None of this has been done by anyone other than the build itself. No real
person has entered. No deployment exists.

## Environment

| | |
|---|---|
| Node | 25.3.0 (`engines: >=22.12`, `.nvmrc` present) |
| Package manager | pnpm 10.19.0 |
| PostgreSQL | 16+ contract; local instance used for all transaction tests |
| Commit at receipt | `b2f973a` |

### Dependencies (pinned, exact)

**Runtime:** better-auth 1.7.1 · drizzle-orm 0.45.2 · next 16.3.3 ·
postgres 3.4.9 · react 19.2.8 · react-dom 19.2.8 · resend 6.22.1 · zod 4.4.3

**Development:** @axe-core/playwright 4.13.0 · @eslint/js 9.39.2 ·
@playwright/test 1.62.1 · @types/node 26.3.0 · @types/react 19.2.18 ·
@types/react-dom 19.2.5 · drizzle-kit 0.31.10 · eslint 9.39.2 · prettier 3.8.1 ·
tsx 4.23.12 · typescript 5.9.3 · typescript-eslint 8.53.1 · vitest 4.1.11

One `pnpm.overrides` entry lifts a transitive `esbuild` past
GHSA-67mh-4wv8-2f99. `pnpm audit --prod` reports no known vulnerabilities.

## Release commands

| Command | Result |
|---|---|
| `format:check` | PASS |
| `lint` | PASS |
| `typecheck` | PASS |
| `test:unit` | PASS — 25 tests |
| `test:integration` | PASS — 30 tests, real PostgreSQL |
| `test:e2e` | PASS — 17 tests, real browser, real database, canonical writes open in a disposable database |
| `conformance check` | PASS — 10 invariants against a real database |
| `build` | PASS |
| `db:migrate:check` | PASS — 4 migrations, 22 tables on an empty database |
| `db:restore:verify` | PASS — dump, clean restore, digest chain recomputed, append-only trigger still enforced after restore |
| `security:audit` | PASS — no advisories, secret scan clean |

## Defects found and fixed in this session

The unit and integration suites ran under plain Node while the application runs
in the Next.js server runtime. That gap hid real breakage, and the e2e suite —
which would have caught all of it — had never been green.

1. **Authentication was entirely dead.** The Drizzle adapter was never given
   the `rateLimit` model that `rateLimit.storage = "database"` requires, so
   every magic-link request threw inside the adapter.
2. **Every valid magic link reported itself expired.** better-auth's
   `magic-link/verify` answers `302` when `callbackURL` is supplied and JSON
   only when it is absent; the confirm route supplied one.
3. **The atomic seal could not run in the real runtime.** postgres.js infers
   parameter types with `instanceof`, which does not hold across the Next
   runtime's realm boundary. `Date` and plain-object parameters threw
   `ERR_INVALID_ARG_TYPE`, taking down the seal, the steward path and
   system-state transitions.
4. **Timestamp columns were typed as a lie.** Declared `Date`, they arrive as
   strings in that runtime, so `.toISOString()` threw in production only.
5. **The event integrity chain was not verifiable.** It was digested with
   `JSON.stringify`, but PostgreSQL `jsonb` does not preserve key order, so the
   digest could not be recomputed from stored rows. The correct
   canonical-JSON implementation already existed in the codebase and was unused.
6. **The First Continuation receipt was wrong.** One field carried both lineage
   and the race outcome, and rendered as "Entered through #\<your own number>".
7. **`private.consent_record` was read by the export route and written by
   nothing** — an export returned no record of what the person had accepted.
8. **`db:restore:verify` had never worked**, and its digest check used a local
   fake canonicaliser keyed on `seq` instead of `occurredAt`.
9. **Signal orange on paper measured 2.9:1**, below WCAG AA.
10. **The locked statement did not survive machine reading** — the `h1` spans
    concatenated to `THE NETWORKIS OURS.` in `textContent` and to assistive
    technology.

Two `package.json` scripts referenced files that did not exist
(`scripts/steward.ts`, `scripts/security/secret-scan.ts`); both are now written
and exercised.

Two more were found while implementing the escalation:

11. **`SELECT seq::text AS seq ... ORDER BY seq` sorts lexicographically.**
    PostgreSQL resolves a bare `ORDER BY` identifier to the *output* column, so
    the log came back as 1, 10, 2, 3. Every chain walk and every Merkle root
    would have been computed over a reordered log — silently, and never in a
    test small enough to notice. Found in five queries. The event schema
    standard documents the hazard, because any reimplementation can make it.
12. **Anchor verification could never pass.** It recomputed the root over the
    calendar period, but publishing an anchor appends `anchor.published` to
    that same period. Verification now uses the sequence range the root
    actually committed to.

## What the escalation added

Adopted by the founder-steward on 26 August 2026 and receipted separately:

- **Witness attestation** — an entry may name an existing entry that attests
  it is a person. The witness receives nothing, and an entrant who names
  nobody enters identically. The graph's *shape* is published as a degree
  distribution; its edges are never a dataset.
- **Anchors** — Merkle roots over the canonical log, append-only, refusing to
  publish over a chain that does not reproduce. `/anchors` describes the
  construction in enough detail to reimplement from the page alone.
- **Conformance** — ten invariants, appended pass or fail, with no suppression
  path. `/status` shows the last run.
- **Live launch gates** — the sixteen gates are rows with required evidence and
  a named blocker. `MET` without an evidence URI is refused. One is met.
- **`ours-fork`** — the complete public state, verifiable offline against two
  proven tamper cases.
- **Member root** — a derived, stable identifier, so a credential can be rooted
  in a founding entry later without renumbering or reissuing anything.
- **Reserved event types** — `treasury.*` and `instrument.*`, refused at the
  append path.

## Milestones

| | Status |
|---|---|
| A — preserved Next.js shell | COMPLETE |
| B — auth and email | COMPLETE (was broken; now verified end to end) |
| C — atomic ledger | COMPLETE |
| D — relay and First Continuation | COMPLETE (was never exercised; now verified end to end) |
| E — rights and stewardship | COMPLETE |
| F — operations and hardening | COMPLETE |
| Vision Escalation 0.1 (section 14) | COMPLETE — see the [adoption receipt](./2026-08-26-vision-escalation-adoption.md) |
| G — external preview | **NOT STARTED — requires a new human approval** |
| H — canonical launch | **NOT STARTED — separate founder-steward decision** |

## External services that remain unprovisioned

Nothing external exists. Specifically: no Git remote, no GitHub repository, no
Vercel project, no PostgreSQL outside this machine, no Resend account or
verified sending domain, no DNS record, no registered domain configuration, no
monitoring, no off-site backup target.

**Current external monthly cost: 0.00 EUR.** Everything runs locally.

## Known risks and unresolved decisions

- **Runtime-realm hazards are a class, not three bugs.** Anything that relies
  on `instanceof` across the application/driver boundary can fail only in
  production. `tsParam`, `jsonParam`, `DbTimestamp` and `toDate` exist to close
  the known cases; the e2e suite is the guard against new ones. Do not add a
  release command that runs only under Node and call the runtime tested.
- **Rate limiting is effectively global.** Better Auth cannot resolve a client
  IP in this runtime and falls back to one shared per-path bucket. It must be
  configured with a trusted proxy header before public launch.
- **`auth.session` stores IP address and user agent** by library default. Keep
  them and name them in the privacy notice, or disable the columns. Undecided.
- **CSP requires `script-src 'unsafe-inline'`** for the React flight payload.
  No third-party origin is permitted; this is the one relaxation.
- **Backups do not exist.** The restore rehearsal passes against a local dump.
  A rehearsal is not a backup.
- **No anchor has left this database.** The mechanism ships; no paper
  deposit exists, so the archive is a capability rather than a record. Volume
  one has to start somewhere, and it has not started.
- **The Fork Drill has never been performed by anyone but the build.** No
  named non-founder operator, no drill, no receipt.
- All thirteen human decisions in handoff section 16 remain open. Decisions 2
  (legal controller), 6 (retention), 7 (incident owner and support contact) and
  12 (licensed review) each block canonical launch on their own.

## Rollback

`archive/day-1-static-v0.2/` holds the Day 1 static instrument unchanged:
dependency-free HTML, CSS and JavaScript, servable by anything. Reverting to it
removes every backend behaviour and states that plainly while doing so.

## Authorization this receipt does NOT grant

Every release command passing is evidence that the code does what it says. It
is not authorization to deploy, to provision a paid service, to publish a
repository, to collect real identity data, or to open canonical writes. Both
write gates remain closed and opening them requires a separate founder-steward
readiness receipt.
