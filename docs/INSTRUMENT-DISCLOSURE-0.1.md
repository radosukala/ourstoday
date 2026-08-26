# Instrument Disclosure 0.1

**Status:** PROPOSED · NOT YET ADOPTED
**Companion to:** [Event Schema 1.0](./EVENT-SCHEMA-1.0.md) §3.2, [Vision Escalation 0.1](./OURS-VISION-ESCALATION-0.1.md) §11
**Purpose:** a format for disclosing what an AI instrument did, under whose authority

---

## 0. The problem this solves

A large part of this software was written by an AI agent working for the
founder-steward. Every network is about to be in this position, and almost all
of them will handle it by not mentioning it.

OURS cannot do that, for a reason that is structural rather than moral: **the
Founding Ledger exists to record who is human.** A register of human
participation that is coy about which parts were built by a non-human is
undermining its own premise on its own front page.

The lock already contains the rule this follows from:

> No agent or service may issue legal membership.

And the escalation already fixed the vocabulary:

> `ledger.entry` — humans. ordinal. witnessed. irrevocable place.
> `ledger.instrument` — agents. no ordinal. no place. named principal, always.

What is missing is the **format**. This is it.

---

## 1. The principle

> **An instrument acts only as the disclosed agent of exactly one human, and
> everything it does is attributed to that human's ordinal.**

Concretely:

- an instrument has no ordinal, no place, no vote, no continuation, no lineage
  and no standing;
- every disclosed action names its principal;
- an instrument is **disclosed, not hidden and not shamed** — the record says
  what it did, in the same register it would use for a human contractor;
- the human remains responsible. "The agent did it" is not a defence, and this
  format must never be usable as one.

---

## 2. The Session Record

One record per working session between a principal and an instrument. It is
the existing Build Tape entry — INPUT / DECISION / CHANGE / TRUTH — with the
agency made explicit.

```yaml
record: ours.session-record/0.1
session_id: 2026-08-26-002
date: 2026-08-26
principal:
  human: founder-steward
  ordinal: "000001"
instrument:
  kind: AI_CODING_AGENT
  identity: <model name and version, as reported>
  interface: <the tool it ran inside>
authority:
  granted: BUILD inside the repository working tree
  withheld:
    - deploy or provision anything external
    - spend money
    - change DNS
    - publish the repository
    - collect real identity data
    - open canonical writes
outcome:
  decided_by_instrument: []   # ordinary implementation choices it made alone
  escalated_to_principal: []  # what it refused to decide, and why
  changed: []                 # what actually changed
  got_wrong: []               # REQUIRED. see section 3
  unverified: []              # what it did NOT prove, stated plainly
```

Prose sections follow the block, in this order: **what a person can now do**
that they could not before; **what the instrument decided alone**; **what it
escalated**; **what it got wrong**; **what remains unproven**.

Records live in `docs/sessions/`. They are public.

---

## 3. `got_wrong` is required and may not be empty without a reason

A session record that lists only accomplishments is a changelog with a
conscience bolted on. The field that makes this format worth anything is the
one that records what the instrument did badly: the wrong diagnosis it chased,
the assertion it wrote that tested nothing, the fix that broke something else.

If a session genuinely produced no error worth recording, the field says so
explicitly and the reader can judge that claim. It is never simply absent.

The same logic already governs the conformance receipt: **published either
way, before anyone asks.** This is that decision applied to the building of
the thing rather than to its running.

---

## 4. What this is NOT

- **Not a credit claim.** An instrument does not earn a place, a mention in the
  ledger, or standing of any kind. It is disclosed the way a tool is disclosed.
- **Not an excuse.** The principal is accountable for everything in the record.
- **Not a transcript.** A session record is a structured account, not a raw
  conversation dump. Raw transcripts contain half-formed ideas, dead ends and
  sometimes third-party material; publishing them wholesale would be volume
  mistaken for transparency. The record states what was decided and what was
  got wrong, which is the part that can be checked.
- **Not personal data about anyone but the principal.** If a session touched a
  named person's case, that stays in `docs-internal/` per
  [INTERNAL-BOUNDARY.md](./INTERNAL-BOUNDARY.md).

---

## 5. Relationship to the canonical log

This format is deliberately **documents first, events later**.

`instrument.registered`, `instrument.acted` and `instrument.revoked` are
reserved in [Event Schema 1.0](./EVENT-SCHEMA-1.0.md) and refused at the append
path. Implementing them means deciding questions this format does not yet
answer:

1. Is an instrument registered once and long-lived, or per session?
2. Does every action append, or only a session boundary? (Every tool call is
   noise; every session is probably right.)
3. What does revocation mean for actions already in the log? (They remain,
   attributed — but that needs stating in the schema, not here.)

Writing session records in `docs/sessions/` answers those questions with
evidence rather than speculation. When the shape has stopped changing, promote
it to the event log and amend the schema with a receipt.

---

## 6. Adoption

This document is a proposal. Adopting it requires a founder-steward decision
and a receipt, like everything else. Adoption means:

- every future session between a principal and an instrument produces a record;
- records are published, including the ones that went badly;
- the retrospective record for the sessions that built this application is
  written and published alongside them, rather than the practice starting
  conveniently after the messy part.
