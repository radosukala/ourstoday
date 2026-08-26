# OURS Founding Relay Protocol

**Protocol version:** 0.1  
**Status:** ADOPTED MECHANICAL DIRECTION · PRODUCTION IMPLEMENTATION NOT YET BUILT  
**Date:** 26 August 2026  
**Constitutional parent:** [Founding Constitution 0.1](./CONSTITUTION-0.1.md)

This document defines the canonical mechanics for entering the Founding Ledger,
carrying a relay and recording a verified continuation. It is written so that a
human steward, designer, backend engineer or AI agent can implement the same
invariants without inventing product policy.

The current repository homepage is a frontend protocol preview. It does not
execute this production protocol and cannot create a canonical entry.

---

## 1. Protocol purpose

The relay must make early participation honorable and propagation legible
without making belonging depend on popularity.

The protocol separates four events that ordinary referral systems conflate:

1. **Entry** — a person makes and verifies their own declaration.
2. **Broadcast** — the entrant carries a unique relay URL into another context.
3. **Continuation** — another verified person enters through that relay.
4. **Contribution** — a person later produces real use, evidence or
   accountability.

Only the relevant event receives credit. A click is none of these.

---

## 2. Non-negotiable invariants

Implementations MUST preserve all of the following:

1. No public number is reserved before verified sealing.
2. A sealed place does not expire because nobody continues through it.
3. A click or page view never changes ledger or contribution state.
4. A public number is unique, chronological, non-tradable and never reassigned.
5. A relay token cannot be edited to impersonate another predecessor.
6. The first verified successor activates the edge, not the predecessor.
7. Concurrent successors are resolved atomically; nobody who validly enters is
   discarded.
8. Referral count creates no additional vote.
9. Private verification data never appears in the public ledger.
10. A withdrawal or correction is appended as a new event.
11. Public identity can be removed or pseudonymized where required without
    reassigning the ordinal.
12. Agents cannot issue, void or restore canonical entries without an explicit
    authorized service path and human-review policy.
13. The Founding Ledger is not the legal Member Register.
14. A local preview must never claim to have executed the canonical protocol.

---

## 3. Human-facing lifecycle

```text
VISITOR
  ↓ reads the declaration and current legal status
ENTRY DRAFT
  ↓ supplies public identity and private verification path
VERIFIED PERSON
  ↓ accepts declaration; canonical transaction commits
SEALED ENTRANT #000002
  ↓ signed relay is issued
RELAY OPEN
  ↓ first verified successor seals through the relay
CONTINUED
  ↓ completes a real task, supplies evidence or accepts responsibility
CONTRIBUTING
  ↓ separately meets adopted legal and constitutional criteria
MEMBER-ELIGIBLE
  ↓ legal membership instrument is issued and accepted
MEMBER
```

Side states:

- **WITHDRAWN** — public identity or participation is withdrawn under the
  applicable policy.
- **UNDER REVIEW** — suspected duplicate, coercion, fraud or integrity issue.
- **VOIDED** — a reviewed invalid event; ordinal remains as a tombstone and is
  not reassigned.
- **CLOSED** — a deceased or otherwise closed identity under a future policy.

`ACTIVATED PERSON` is not a valid state. People are not activated by other
people.

---

## 4. Entry data boundary

### Public entry data

The public ledger MAY contain:

- public ordinal;
- approved display name or pseudonym;
- entry date and public precision of time;
- predecessor ordinal, if any;
- relay state;
- First Continuation ordinal, if any;
- public status such as SEALED, WITHDRAWN or VOIDED;
- verified public contribution references;
- protocol version.

### Private verification data

Private services MAY contain only what is necessary for the declared purpose:

- internal person identifier;
- passkey credential material or verified email identifier;
- recovery and consent records;
- abuse and duplicate-review signals;
- later legal member identity in a separately controlled system.

The public and private records MUST use separate identifiers and access
boundaries. The public ordinal MUST NOT be used as an authentication secret.

### Identity assurance

Entry verification and legal member verification are distinct.

Initial production hypotheses:

- passkey-first with an email recovery option; or
- email verification with passkey enrollment after entry.

No KYC is assumed for initial entry. Stronger one-person assurance is required
before formal governance and membership issuance, but the method is a future
legal and product decision.

---

## 5. Canonical identifiers

Every entry has:

1. an internal opaque identifier, such as a UUID or equivalent;
2. a public ordinal, such as `000002`;
3. a public stable URL;
4. zero or one predecessor relationship at sealing;
5. zero or one First Continuation relationship after sealing.

The internal identifier exists for stable references and privacy-preserving
service boundaries. The ordinal exists for human chronology and ritual.

### Ordinal semantics

- The ordinal is assigned inside the canonical seal transaction.
- The interface MUST say “assigned when you enter,” never “reserved for you.”
- The implementation MUST NOT display an exact next number before commit.
- Sequence gaps caused by a failed transaction MUST NOT be hidden through
  reassignment. The implementation should avoid gaps where practical but
  correctness is more important than cosmetic continuity.
- Commit time, not client clock time, determines canonical order.

An early implementation should use one authoritative transactional writer. A
globally distributed ordering system is unnecessary until measured load proves
otherwise.

---

## 6. Entry transaction

### Required preconditions

Before sealing, the service MUST confirm:

- current declaration and protocol versions were presented;
- the entrant explicitly accepted them;
- current legal status was visible;
- the verification step completed;
- the request carries an idempotency key;
- rate and abuse controls permit the attempt;
- any predecessor token is valid but has not been treated as identity proof;
- consent and privacy records were written.

### Atomic effects

One canonical transaction MUST:

1. create the internal person/entry link;
2. obtain the next public ordinal;
3. write `ledger.entry.sealed`;
4. attach a valid predecessor relationship if supplied;
5. commit the public projection source;
6. make a repeat request with the same idempotency key return the same result.

Only after commit may the interface show the ordinal or issue a relay.

### Failure behavior

- Before commit: show no ordinal and provide a retry path.
- Unknown result after network interruption: query by idempotency key before
  retrying.
- Duplicate request: return the already-sealed entry.
- Verification expiry: return to verification; do not hold an ordinal.
- Suspected abuse: do not invent a public accusation. Place the attempt under a
  documented private review process.

---

## 7. Relay token

A relay URL contains an opaque signed token, not editable trusted query fields.

Example human form:

```text
https://ourstoday.com/r/<opaque-token>
```

Conceptual token claims:

```json
{
  "version": "ours.relay/v1",
  "predecessor_entry_id": "opaque-internal-id",
  "issued_at": "2026-08-26T08:14:03Z",
  "channel_hint": "x|linkedin|direct|web|unknown",
  "nonce": "random-value"
}
```

The token MUST be authenticated with a server-held signing key. Public ordinal
and channel labels MAY appear in the display URL or analytics projection, but
the server MUST derive authority from the verified token.

### Token behavior

- Opening a token records, at most, privacy-respecting aggregate reach.
- Opening never claims, consumes or activates the token.
- Link-preview fetches produce no human state.
- The relay remains usable after its First Continuation.
- Token revocation is permitted for compromise or abuse and creates a review
  receipt.
- An entrant may receive channel-specific variants for attribution, but those
  variants point to the same predecessor.

---

## 8. Continuation transaction

When a new entry seals with a valid predecessor token:

1. the new entry records its predecessor;
2. the service attempts an atomic compare-and-set on the predecessor's
   `first_continuation_entry_id` where it is currently empty;
3. if successful, the service writes `relay.first_continuation.recorded`;
4. if another transaction already won, the new entry remains a valid attributed
   arrival and writes `relay.arrival.recorded`;
5. both outcomes are visible to the new entrant after commit.

This rule resolves viral concurrency without reservations.

### Self-referral and duplicates

A person MUST NOT become their own continuation through a second credential.
The production system needs a reviewed duplicate policy that can use risk
signals without publicly exposing them.

Suspected duplicates enter **UNDER REVIEW**. If later voided:

- the ordinal remains as a tombstone;
- any invalid continuation edge is revoked through a new event;
- the predecessor returns to RELAY OPEN if no valid First Continuation remains;
- later valid entries are not renumbered.

---

## 9. Public projections

The event log is canonical. Public pages are projections.

### Ledger row

```text
000002 · PUBLIC NAME
ENTERED: 26 AUG 2026 · 10:14:03 CET
ARRIVED THROUGH: 000001
RELAY: CONTINUED
FIRST CONTINUATION: 000019
FIRST PROVEN ACT: TESTED BUILD D1.3
LEGAL MEMBERSHIP: NOT YET ISSUED
```

### Entry share receipt

```text
I entered the Founding Ledger of OURS as #000002.

The network is ours. Everything else can be built.

Continue the line from me: https://ourstoday.com/r/<token>
```

### Continuation receipt

```text
The line continued.

#000019 entered OURS through #000002.
```

Generated copy is a suggestion. A person must decide whether and where to
publish it. OURS MUST NOT silently post on their behalf.

---

## 10. Contribution and evangelism

Relay events record formation. They do not by themselves create economic
contribution credit.

Adoption contribution may be verified only after a declared outcome, such as:

- retained use after a stated period;
- a bounded cohort completing a real migration;
- a person completing a meaningful test;
- a person accepting and fulfilling stewardship responsibility.

Adopted guardrails:

- direct attribution only;
- no referral-of-referral economics;
- no impressions or click rewards;
- no transferable points;
- no extra governance votes;
- fraud, coercion, purchased traffic or misrepresentation voids credit;
- compensation rules require legal and constitutional adoption.

---

## 11. Event vocabulary

Minimum canonical event types:

```text
ledger.entry.sealed
ledger.entry.corrected
ledger.entry.withdrawn
ledger.entry.review_opened
ledger.entry.voided
relay.issued
relay.revoked
relay.arrival.recorded
relay.first_continuation.recorded
relay.first_continuation.revoked
contribution.submitted
contribution.verified
contribution.revoked
membership.eligibility_recorded
membership.issued
membership.ended
```

Every event contains:

- opaque event ID;
- event type and schema version;
- authoritative server timestamp;
- actor type and actor reference;
- subject reference;
- authority or policy reference;
- prior event reference when corrective;
- privacy classification;
- idempotency key where initiated by a request;
- integrity digest;
- human-readable receipt text or a reproducible projection input.

No event payload may treat a mutable display name as an identity key.

---

## 12. Storage and audit model

### Initial production shape

- one transactional relational database;
- append-only canonical event table;
- private identity tables with separate access controls;
- derived public ledger projection;
- encrypted backups and tested recovery;
- explicit retention schedules;
- administrative actions through audited service paths;
- periodic signed public snapshot of non-private ledger state.

A future version MAY add Merkle consistency proofs so independent observers can
detect omission or rewriting between signed snapshots. This does not require a
blockchain, token or public personal data.

### Administrative integrity

There is no direct “edit row” product operation for canonical events.
Corrections, withdrawals, voids and restorations are new authorized events.

Break-glass access must be rare, time-bounded and reviewed. The production
system must record which human used it and why.

---

## 13. Privacy behavior

Before production launch, document and implement:

- controller identity and contact;
- legal basis and declared purpose for every data category;
- retention and deletion schedules;
- export, correction, restriction and erasure flow;
- breach response;
- processor and transfer inventory;
- public/private field map;
- handling of withdrawn and deceased entrants;
- protection against enumeration of private identifiers.

“Forever ledger” copy must never promise permanent public personal data. The
promise is that a public ordinal will not be resold or reassigned.

---

## 14. Abuse and integrity controls

Production controls should be layered and proportionate:

- idempotency and transactional uniqueness;
- request and identity rate limits;
- bot challenge only when risk warrants it;
- verification replay protection;
- passkey/email ownership confirmation;
- signed, non-guessable relay tokens;
- duplicate and self-referral review;
- delayed economic-credit vesting;
- public reporting of aggregate void/review counts;
- appeal and correction path;
- no public exposure of risk scores.

The goal is credible human participation, not maximum identity surveillance.

---

## 15. API surface for the first production slice

Names are proposed implementation vocabulary, not a framework mandate.

```text
GET  /v1/founding-state
POST /v1/entry-drafts
POST /v1/entry-drafts/{id}/verify
POST /v1/entry-drafts/{id}/seal
GET  /v1/entries/{public-ordinal}
POST /v1/entries/{public-ordinal}/withdrawal-requests
GET  /v1/relays/{token}/context
POST /v1/entries/{public-ordinal}/relays
GET  /v1/formation-tape
GET  /v1/me/export
```

Production responses must include a machine state and plain-language receipt.
Mutation endpoints require idempotency keys. Public endpoints must not leak
verification or recovery data.

---

## 16. Acceptance tests

### Entry

- Two simultaneous valid entries receive different ordinals.
- Retried sealing with the same idempotency key returns the same entry.
- Failed verification issues no ordinal.
- A local/client clock change does not affect order.
- Current declaration and legal status are captured with the entry.

### Relay

- Preview-bot GET and HEAD requests create no continuation.
- A tampered token is rejected without revealing predecessor private data.
- Two simultaneous successors both enter; exactly one becomes First
  Continuation.
- Later arrivals remain attributed without changing First Continuation.
- Self-referral cannot vest continuation or contribution credit.

### Privacy and correction

- Public entry endpoints expose no email, passkey or risk data.
- Export returns the person's records in a documented format.
- Withdrawal removes or pseudonymizes public identity according to policy.
- Voiding never reassigns an ordinal or renumbers later people.
- Backup restoration preserves event order and idempotency.

### Governance truth

- No entry response uses “legal member” before issuance.
- Founding number and referral count do not affect voting fields.
- Agent/service credentials cannot call a member-ratification path.

### Accessibility

- Entry can be completed by keyboard and screen reader.
- Errors identify fields and preserve safe input.
- Status never depends on color alone.
- Reduced-motion settings disable nonessential formation animation.

---

## 17. Production launch gates

The canonical Founding Ledger MUST NOT open until all are true:

1. legal status and privacy notice reviewed;
2. public/private data map approved;
3. identity and recovery path tested;
4. atomic entry and continuation tests pass;
5. idempotency and abuse controls pass;
6. withdrawal, correction and export work;
7. backup and restore rehearsal passes;
8. incident owner and support path are named;
9. no interface claims legal membership;
10. a rollback or entry-pause mechanism is tested;
11. monitoring exposes failures without exposing private data;
12. the founder-steward signs a public readiness receipt.

Until then, the homepage remains a clearly labeled protocol preview.
