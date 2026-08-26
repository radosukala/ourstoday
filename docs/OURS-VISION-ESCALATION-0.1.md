# OURS · Vision Escalation 0.1

**Status:** PROPOSAL · NOT ADOPTED · NOT AUTHORITATIVE
**Companion to:** [Founding Ledger Build Handoff 0.1](./FOUNDING-LEDGER-BUILD-HANDOFF.md)
**Prepared:** 26 August 2026
**Purpose:** escalate the vision without weakening a single mechanic in the handoff

The handoff is disciplined and correct. Nothing below asks it to be less careful.
Every escalation here is written to be *implementable inside the existing
constraints*: no token, no tradable position, no referral rights, no invented
authority, no claim that outruns its receipt.

The handoff describes how to build the thing safely. This describes what the
thing should be big enough to become.

---

## 0. The reframe

### What it currently says it is

> A member-owned network that builds its own software in public.

That is a company with unusually good governance. It is defensible, honest, and
roughly two orders of magnitude smaller than what the mechanics already support.

### What it actually is

> **OURS is the first public register of verified human participation built for a
> world where most participants will not be human.**

Everything already in the handoff — no reservation, no transfer, no purchase, no
recruiting rights, no referral economics, position assigned only inside a
verified transaction — reads today as caution. It is not caution. It is the
entire product.

Between now and the end of the decade, every identity surface on the internet
gets flooded with synthetic participants. The scarce asset stops being audience,
attention or reach. The scarce asset becomes **provenance**: a record of who
showed up, in what order, witnessed by whom, that nobody can buy into
retroactively.

You are not building a signup list with good hygiene. You are building the
artifact that will be *impossible to manufacture later*.

That reframe costs nothing to adopt and changes what every constraint means.

### The sentence to put under the lock

> # THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.
>
> **The record cannot be bought into. Not now, not later, not by us.**

---

## 1. Escalation table

| # | Currently | Escalated | Cost |
|---|---|---|---|
| 1 | Ledger is a record | Ledger is the only database that ever exists | schema discipline |
| 2 | Entry is an email proof | Entry is a witnessed act | one field, one event |
| 3 | Legal status is a disclaimer | Legal status is a live public countdown | one page |
| 4 | Software is built in public | Software is *provably* the software running | CI work |
| 5 | Member-owned by assertion | Fork right shipped, rehearsed, receipted | one CLI, one drill |
| 6 | Stewards are trusted | Stewards are on a dead-man's switch | legal instrument |
| 7 | Data lives in Postgres | Record is anchored on paper in many jurisdictions | ~€500/year |
| 8 | Treasury is private | Treasury is a public projection of the same log | one view |
| 9 | Entry is a place in a list | Entry is the root of a key you carry everywhere | Ctrl AI convergence |
| 10 | Agents are prohibited | Agents are admitted as a named non-person class | one register |

---

## 2. The ledger is not a feature of the product. It is the product's ground.

**Adopt:** there is no "main database." There is a public constitutional event
log, and every surface — the entry page, the Formation Tape, governance,
profession pages, PI, the treasury, whatever exists in 2031 — is a **read model
over that log**.

Consequences worth wanting:

- OURS never performs a data migration again. It publishes new projections.
- Any member, journalist, regulator or rival can build their own read model
  without permission. The public event schema ships as a versioned standard on
  day one, not as documentation of an internal choice.
- There is nothing to acquire. An acquirer would be buying a team and a domain
  while the state stays public and the graph stays with the people in it.
- Every future feature argument becomes a narrow question — *what event does
  this append?* — instead of a product debate.

**Handoff delta:** publish `docs/EVENT-SCHEMA-1.0.md` as a public standard with
its own version line and diff, in the same tier as the Constitution. Treat a
breaking change to it as a constitutional amendment, not a refactor.

---

## 3. Entry becomes a witnessed act

Right now entry proves control of an email address. That is a low bar and the
handoff says so honestly.

**Escalate:** an entry may optionally name a **Witness** — an existing entry that
attests the entrant is a person. The witness signs nothing economic. There is no
reward, no count, no rank, no vote, no revenue, no visibility bonus. The
handoff's "referral count creates no additional right" rule holds completely and
should be restated more loudly here, not relaxed.

What the witness produces is **structure**. The ledger stops being a list and
becomes a graph of attestation.

That graph is worth far more than the list:

- Sybil resistance becomes a property of shape, not of KYC.
- Juries, quorums and review panels can be sampled from graph distance with no
  election, no campaigning and no token.
- Disputes get an answer to "who vouched for this?" without anyone owning a
  reputation score.
- The First Continuation edge you already have stops being a viral counter and
  becomes lineage — the thing people actually screenshot.

**Constraint that must survive:** a person who names no witness still enters and
is in no way lesser. A verified entrant keeps their place without recruiting
anyone. That rule is already in the lock. Keep it exactly.

**Handoff delta:** `ledger.entry.witness_entry_id` (nullable), event
`entry.witnessed`, and one public projection field. Two afternoons. Publish the
degree distribution, never the identities.

---

## 4. Make the disclaimer the most interesting page on the internet

Today: `OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED`

That is a footer. It reads as legal defensiveness, which is exactly backwards —
it is the most honest sentence any network has ever put on its front page and it
is being whispered.

**Escalate:** section 17 of the handoff already contains sixteen canonical launch
gates. Put them on the homepage. Live. With dates.

```
MEMBERSHIP ISSUANCE       GATE 7 OF 16
LAST RECEIPT              4 days ago
OLDEST OPEN GATE          encrypted backup restore rehearsal · 31 days
BLOCKED BY                a human decision, named below
```

Nobody has ever shipped a landing page whose primary content is *what is not yet
true about itself*. It is disarming, it is unfakeable, and it converts better
than a promise because it is checkable.

Then commit to the harder half: when a gate slips, the slip appends an event and
the page says so, without spin, before anyone asks.

**Handoff delta:** gate state becomes rows, not checkboxes in a Markdown file.
`/status` becomes the second most visited page and the reason people come back.

---

## 5. Conformance: prove the software is the software

"Builds its own software in public" currently means the repository is visible.
Every company can say that.

**Escalate to three claims almost nobody can make:**

1. **Every deploy appends a ledger event** — commit hash, migration set, actor,
   authority reference, timestamp. Deployment becomes a constitutional act.
2. **The running artifact is verifiable.** Publish the build's hash and a
   reproducible build procedure. Anyone can confirm that what is deployed is what
   was published. The gap between "our GitHub is public" and "the binary serving
   you is provably that code" is the entire trust gap of the modern internet.
3. **A nightly Conformance Receipt.** Re-run the invariant suite — ordinal
   uniqueness, append-only enforcement, private-column leakage, First
   Continuation exclusivity — against production and append the result. **Pass or
   fail. Published either way, automatically, before anyone asks.**

Point 3 is the one that will unsettle people, which is how you know it is right.
An institution that publishes its own failures on a cron job is making a claim
no marketing department would ever approve, and it is the cheapest permanent
credibility available.

**Handoff delta:** events `build.deployed`, `conformance.verified`,
`conformance.failed`. The nightly job is the handoff's section 13 matrix with a
different trigger. You already wrote it.

---

## 6. Article Zero: ship the exit

Member-owned is currently a promise about intent. Promises about intent are what
every platform made before it enclosed its users.

**Escalate:** the right to leave with everything is Article Zero of the
Constitution, and it is a *shipped, tested, rehearsed capability*, not a clause.

- `ours-fork` is a public command that pulls the complete public state, the event
  log, the schema and the projections, and stands up a working instance.
- The **Fork Drill** runs quarterly. A named person who is not the founder-steward
  performs it from a clean machine, and the receipt is published: date, operator,
  duration, what broke.
- If the drill fails, the ledger does not open. The drill has the same standing as
  the restore rehearsal already in section 14.

This inverts the entire competitive posture. Most networks defend against exit.
OURS *maintains the exit as infrastructure* and dares itself to stay worth
staying in. That is the only version of anti-feudalism that is falsifiable.

The strategic point is not that anyone forks. It is that they always could, which
disciplines every future decision by people who are not yet in the room.

---

## 7. The dead-man's switch

Every constitution written by founders eventually meets the founders' own
incentives. Pre-commit now, while it costs nothing, because you currently hold
100% of the power and that is the only moment when giving it away is credible.

**Constitutional liveness:**

- If no steward receipt is published for **90 days**, the ledger auto-pauses.
  Public reading and data rights continue. Canonical writes stop.
- If no steward receipt is published for **365 days**, a pre-executed instrument
  releases the software under an irrevocable licence to the member body and
  triggers the documented transfer of the domain and the anchoring
  responsibility.

This is the single most WTF thing in this document and it is also the most
ordinary: it is a succession plan. The reason it lands is that nobody in software
writes one, because everyone assumes they are the permanent case.

**Requires:** an actual legal instrument, not Markdown. Add it to section 16 as
human decision 13. Cheap to draft now, impossible to draft later.

---

## 8. Anchor it on paper

The event log lives in Postgres on a provider whose free tier is discussed on
page four of the handoff. That is fine for now and fatal as a permanent posture.
A record that a single company can lose is not a public record.

**Escalate:**

- Publish a **Merkle root of the canonical event log** at a fixed cadence —
  daily digest, monthly root, annual root.
- Anchor the annual root in places whose durability does not depend on OURS
  existing, on any provider existing, or on any network being up:
  - a printed notice in a newspaper of record;
  - **legal deposit with national libraries in multiple jurisdictions**;
  - a physical annual volume: the roots, the constitution, the gate history,
    printed and deposited.

A member's founding position becomes provable to a third party **without OURS**.
That is what turns an ordinal from a vanity number into a portable credential.

It is also, in the most direct sense available, samizdat: an institution that
cannot be deleted because it exists on paper in a dozen countries, held by
librarians who have no idea what OURS is and no reason to care. Someone who
watched a state lose control of a country in six weeks should find this obvious.
Almost nobody else will.

Cost: a few hundred euros a year and one ritual. Value: unbounded, and it only
accrues if you start with volume one.

**Handoff delta:** `ledger.anchor` (period, root, algorithm, published_at,
locations, evidence_uri), event `anchor.published`, and one page at `/anchors`
that anyone can verify against their own copy.

---

## 9. Publish the money the same way you publish the record

From the wider OURS direction: one cent per day, 95% revenue share.

Those numbers are strong. They are also, right now, claims — the same category of
claim every platform makes before the take rate moves.

**Escalate:** the treasury is a projection of the same event log. Every cent in,
every cent out, every steward reimbursement, appended and public, in near real
time, with the same append-only guarantee as the ordinals.

The claim becomes checkable:

> **If our share ever exceeds 5%, you will see it in the ledger before we announce
> it. There is no other place for it to be.**

A revenue share is a promise. A public treasury projection is a mechanism. The
handoff correctly puts payments out of scope for this slice — good. Reserve the
event types now so the shape is fixed before there is money to be embarrassed
about.

---

## 10. The entry becomes a key

This is the convergence that makes OURS structurally larger than a network.

Ctrl AI's Context Key is a credential the person holds and grants to agents,
rather than a server the agent optionally consults. The Founding Ledger is a
verified, witnessed, anchored record of human participation that nobody can buy
into.

Those are the two halves of the same object.

> **Your OURS entry is not an account on a network. It is the root of a credential
> you carry to every other system, that proves a human is present, that no company
> issues and no company can revoke.**

What that unlocks:

- Any site, agent or counterparty can verify *a real human with provenance since
  2026* without learning who, without contacting OURS, and without OURS learning
  where they went.
- The person grants scope. The person revokes scope. OURS holds no session on
  their behalf elsewhere.
- Ctrl AI stops needing to explain why anyone would want a context layer — the
  ledger gives it the one thing it has been missing for three years across fifteen
  iterations, which is a reason for the first thousand people to hold one.
- OURS stops needing to win a network effect against incumbents. It becomes
  infrastructure they eventually have to accept.

**Sequencing matters and this is not the first slice.** Keep it out of the current
handoff. But make the entry receipt forward-compatible: a stable, opaque,
member-held identifier with a documented derivation path, so the key can be
rooted in the founding entry later without renumbering, reissuing, or asking
anyone to enter twice.

---

## 11. Admit agents. As instruments, not members.

The handoff says no agent may issue legal membership. Correct. Now go further and
turn a prohibition into an institution.

Every network is about to be filled with agents and every one of them will handle
it by pretending it is not happening.

**Escalate:** OURS maintains a second, explicitly separate register.

```
ledger.entry        humans. ordinal. witnessed. irrevocable place.
ledger.instrument   agents. no ordinal. no place. named principal, always.
```

- An instrument acts only as the named agent of exactly one human entry.
- Every instrument action appends an event naming the principal's ordinal.
- An instrument has no vote, no place, no continuation, no lineage, no standing.
- A human may revoke an instrument at any time; the actions remain in the log,
  attributed.
- Instruments are not hidden and not shamed. They are *disclosed*.

This is a governance primitive nobody has shipped, it follows directly from a
rule already in your lock, and it is going to be a legal requirement within five
years. Being three years early to a compliance regime is a strategic position.

---

## 12. What you are allowed to say out loud

The current copy is careful because the legal status is honest. Keep that. But
carefulness about *legal claims* has been leaking into smallness about *ambition*,
and those are separable.

Permitted, true, and much larger:

> We are not competing with a professional network. We are building the register
> underneath one, and we intend it to outlive every application built on top of
> it, including ours.

> The first million verified human professional identities that no company owns.

> Ownership is not a feeling we are cultivating. It is a fork command, a public
> treasury, a paper archive and a succession instrument.

And the end state to aim at, which is the least glamorous and most radical thing
in this document:

> **Success is when OURS is as boring as a land registry and as hard to delete as
> one.**

---

## 13. Honest costs of going this big

You asked for bolder. Bolder is not free, and pretending otherwise would waste
the discipline you have already built.

1. **The claim/reality gap gets more dangerous, not less.** "Ownership: committed"
   is survivable. Louder ownership language, a treasury and a succession
   instrument move you closer to territory where a regulator asks whether you have
   been offering an interest in an enterprise. Sections 16 and 17 already gate
   this. Escalation raises the priority of decision 12 (licensed review) from late
   to *before the ledger opens*. Get a securities-aware read in Czechia and one in
   the US.
2. **Article Zero and the dead-man's switch are legal instruments.** In Markdown
   they are worse than nothing — they are a promise with no mechanism, which is
   the exact thing the whole project exists to oppose. Either execute them
   properly or do not publish them.
3. **The witness graph is personal data.** Publish the shape, never the edges.
   Section 12's data map has to cover graph publication before, not after.
4. **Publishing failures is easy to announce and hard to survive.** The first
   red Conformance Receipt with 40,000 people watching is a real day. Decide now,
   in writing, that it publishes anyway. That decision is only cheap today.
5. **Anchoring only means anything if volume one exists.** An archive started in
   year three is a marketing artifact. Started in month one, it is a record.
6. **None of this beats shipping section 15 Milestone A.** The largest risk to
   this vision remains a beautiful constitution with no entrant. Everything here
   is designed to be additive to the existing milestones, not a reason to reopen
   them.

---

## 14. Smallest set of changes to the handoff

If only these land, the vision is already twice the size:

| Change | Where | Effort |
|---|---|---|
| `EVENT-SCHEMA-1.0.md` published as a standard with its own diff | docs tier | half day |
| `ledger.entry.witness_entry_id` + `entry.witnessed` | §7, §8 | one day |
| `ledger.anchor` + `anchor.published` + `/anchors` | §7, §10 | two days |
| `build.deployed`, `conformance.verified`, `conformance.failed` | §12, §14 | two days |
| Gate state as rows; `/status` shows the sixteen gates live | §17 | two days |
| `ours-fork` command + Fork Drill as a §14 rehearsal | §14, §15F | three days |
| Entry receipt carries a stable member-held identifier | §8 | half day |
| Treasury and instrument event types reserved, unimplemented | §7 | half day |
| Succession instrument added as human decision 13 | §16 | legal, not code |

Milestones A through H stay exactly as written. Nothing above opens a gate
earlier or asks the agent to invent a policy.

---

**This document has no authority.** It proposes. Adoption requires a
founder-steward decision and a receipt, like everything else.
