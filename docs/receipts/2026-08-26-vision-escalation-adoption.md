# Decision Receipt · Vision Escalation 0.1 (partial adoption)

```yaml
receipt: ours.decision-receipt/v1
decision_id: VISION-ESCALATION-0.1-ADOPTION
date: 2026-08-26
authority: founder-steward
document: docs/OURS-VISION-ESCALATION-0.1.md
prior_status: PROPOSAL · NOT ADOPTED · NOT AUTHORITATIVE
new_status: PARTIALLY ADOPTED
truthful_status: LOCAL · NOT DEPLOYED · CANONICAL WRITES CLOSED
```

## The decision

The founder-steward agreed with the Vision Escalation 0.1 proposal and asked
for it to be carried into development. The proposal itself states that it has
no authority and that adoption requires a founder-steward decision and a
receipt, like everything else. This is that receipt.

**What is adopted:** the section 14 "smallest set of changes to the handoff",
in full, as code.

**What is NOT adopted here:** anything requiring a legal instrument or money.
Section 13.2 of the proposal is explicit that Article Zero and the dead-man's
switch, published as Markdown, are *worse than nothing* — a promise with no
mechanism, which is the exact thing this project exists to oppose. They are
therefore recorded as human decisions, not written as prose.

## Adopted and implemented

| Change | Where it lives |
|---|---|
| Event schema published as a versioned standard | [`docs/EVENT-SCHEMA-1.0.md`](../EVENT-SCHEMA-1.0.md) |
| `ledger.entry.witness_entry_id` + `ledger.entry.witnessed` | migration 0005, `src/ledger/seal.ts` |
| `ledger.anchor` + `anchor.published` + `/anchors` | `src/ledger/anchor.ts`, `app/anchors/page.tsx` |
| `build.deployed`, `conformance.verified`, `conformance.failed` | `src/ledger/events.ts`, `src/ledger/conformance.ts` |
| Gate state as rows; `/status` shows the sixteen gates live | `src/ledger/gates.ts`, `app/status/page.tsx` |
| `ours-fork` command | `scripts/fork.ts` |
| Fork Drill as a rehearsal with restore-rehearsal standing | [`docs/operations/FORK-DRILL.md`](../operations/FORK-DRILL.md) |
| Entry receipt carries a stable member-held identifier | `src/ledger/member-root.ts` |
| Treasury and instrument event types reserved, unimplemented | `src/ledger/events.ts`, refused at the append path |
| Succession instrument as human decision 13 | handoff section 16 |

## Adopted as direction, not yet as mechanism

- **The reframe** (section 0): OURS as a public register of verified human
  participation built for a world where most participants will not be human.
  Nothing in the interface claims this yet. It changes what the existing
  constraints *mean*, and it costs nothing to hold.
- **Anchoring on paper** (section 8): the mechanism ships; the deposits do not
  exist. `pnpm anchor publish ANNUAL` warns when no deposit location is
  recorded, because an annual root that exists only in this database anchors
  nothing.
- **The public treasury** (section 9): event types reserved. No money exists,
  so no projection does.
- **Agents as a named non-person class** (section 11): event types reserved.
  The second register is not built.
- **The entry as a key** (section 10): explicitly out of scope, as the proposal
  itself sequences it. Only the forward-compatibility hook is implemented.

## Not adopted, and why

**Article Zero as a constitutional clause** and **the dead-man's switch**
(sections 6 and 7) are legal instruments. Writing them in Markdown would
publish a promise with no mechanism. The *capability* under Article Zero —
leaving with everything, and being able to prove it is everything — is shipped
and tested. The clause itself, and the succession instrument, are added to
handoff section 16 as human decision 13 and require a lawyer.

## Constraints that survived unchanged

The proposal insists these are not relaxed, and they are not:

- a verified entrant keeps their place **without recruiting anyone**;
- a witness receives no reward, count, rank, vote, revenue or visibility, and an
  entrant who names no witness enters identically — the entry form does not
  mention a witness until after authentication, and never implies one is
  expected;
- referral count creates no additional vote, ownership or economic right;
- no number is reserved, previewed, sold, transferred or reassigned;
- public and private identity data remain separate — the witness *shape* is
  published as a degree distribution, the *edges* never as a dataset;
- no crypto token and no tradable founding position;
- no interface claims legal membership.

## The decision this receipt makes permanent

Section 13.4 of the proposal asks for one thing to be decided in writing while
it is still cheap:

> **A failing conformance receipt publishes anyway.**

It is decided. `runAndRecordConformance` appends `conformance.failed` and there
is deliberately no flag, environment variable or argument that suppresses it.
An integration test asserts that a broken invariant is *recorded* rather than
swallowed. Adding a suppression later would be a visible, reviewable act
against this receipt.

## Risks accepted with this adoption

1. **The claim/reality gap widens.** Louder ownership language plus a treasury
   and a succession instrument move closer to territory where a regulator asks
   whether an interest in an enterprise has been offered. The proposal raises
   handoff decision 12 (licensed review) from late to **before the ledger
   opens**; that is accepted, and gate 1 is unchanged and open.
2. **The witness graph is personal data.** [DATA-MAP.md](../operations/DATA-MAP.md)
   must cover graph publication before, not after. The shape is published; the
   edges are not exposed as a dataset. A per-entry witness ordinal *is* public
   on the ledger row, and that is a deliberate, reviewable choice.
3. **Publishing failures is easy to announce and hard to survive.** See above;
   decided.
4. **Anchoring only means anything if volume one exists.** No paper deposit has
   happened. Until one does, the anchor mechanism is a capability, not an
   archive, and `/anchors` says so.

## What this receipt does not authorize

Nothing here deploys anything, provisions anything, spends anything, collects
identity data, or opens a canonical write gate. Both gates remain closed. The
sixteen launch gates are now rows on `/status`; **one** of sixteen is met.

## Amendment

Vision Escalation 0.1 remains published unchanged at
[`docs/OURS-VISION-ESCALATION-0.1.md`](../OURS-VISION-ESCALATION-0.1.md) with
its original `PROPOSAL` header intact. A proposal is not rewritten by its
adoption; the record of what was proposed and the record of what was adopted
are two different documents, and this is the second one.
