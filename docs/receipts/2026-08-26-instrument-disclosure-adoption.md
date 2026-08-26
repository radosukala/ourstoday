# Decision Receipt · Instrument Disclosure 0.1

```yaml
receipt: ours.decision-receipt/v1
decision_id: INSTRUMENT-DISCLOSURE-0.1-ADOPTION
date: 2026-08-26
authority: founder-steward
document: docs/INSTRUMENT-DISCLOSURE-0.1.md
prior_status: PROPOSED · NOT YET ADOPTED
new_status: ADOPTED
```

## The decision

The founder-steward agreed that the work done by AI instruments on this
project must be documented, and adopted the proposed format.

**Adopted in full**, including the condition the proposal attached to
adoption: the retrospective record for the sessions that built this
application is written and published *alongside* the practice starting, rather
than the practice beginning conveniently after the messy part.

That record is [`docs/sessions/2026-08-26-founding-build.md`](../sessions/2026-08-26-founding-build.md).
It names six things the instrument got wrong, including an hour spent on an
elegant wrong hypothesis and two test assertions that asserted nothing.

## What adoption obliges

1. Every session between a principal and an instrument produces a record in
   `docs/sessions/`, written during that session.
2. Records are public, including the ones that went badly.
3. `got_wrong` is never silently empty. If a session genuinely produced no
   error worth recording, the record says so explicitly so a reader can judge
   that claim.
4. A record is a structured account, not a transcript. Raw conversation dumps
   are volume mistaken for transparency.
5. Anything touching a named person's case goes to `docs-internal/` per
   [INTERNAL-BOUNDARY.md](../INTERNAL-BOUNDARY.md), not into a session record.

## Why this follows from the lock rather than from good intentions

The Founding Ledger exists to record **who is human**. A register that is coy
about which parts of itself a non-human built is undermining its own premise on
its own front page. The lock already says no agent may issue legal membership;
the escalation already fixed the vocabulary of humans as entries and agents as
instruments. This receipt supplies the missing format.

An instrument holds no ordinal, no place, no vote, no continuation and no
standing. The principal is accountable for everything the instrument did.

## Not yet decided

`instrument.registered`, `instrument.acted` and `instrument.revoked` remain
RESERVED in [Event Schema 1.0](../EVENT-SCHEMA-1.0.md) and are still refused at
the append path. Promoting session records into the canonical event log
requires answering, with evidence rather than speculation:

1. whether an instrument is registered once or per session;
2. what appends — every action is noise, a session boundary is probably right;
3. what revocation means for actions already recorded.

Documents first. When the shape stops changing, amend the schema with a
receipt.
