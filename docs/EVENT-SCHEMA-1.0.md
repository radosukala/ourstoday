# OURS Canonical Event Schema

**Version:** `ours.event-schema/1.0`
**Status:** PUBLISHED STANDARD · CONSTITUTIONAL TIER
**Adopted:** 26 August 2026 · Vision Escalation 0.1, section 2
**Implementation status:** IMPLEMENTED LOCALLY · NOT DEPLOYED · CANONICAL WRITES CLOSED

---

## 0. Why this is a standard and not documentation

There is no "main database" at OURS. There is a public constitutional event
log, and every surface — the entry page, the Formation Tape, governance, the
treasury, whatever exists in 2031 — is a **read model over that log**.

That has three consequences, and they are the reason this document exists:

1. **OURS never performs a data migration again.** It publishes new
   projections.
2. **Anyone may build their own read model without permission.** A member, a
   journalist, a regulator or a rival can consume this log and answer their own
   questions. They are entitled to a stable, versioned description of it — not
   to an internal design note that changes silently.
3. **Every future feature argument becomes one narrow question:** *what event
   does this append?*

**A breaking change to this schema is a constitutional amendment, not a
refactor.** It requires a founder-steward decision and a published receipt, and
it gets its own version line and diff, in the same tier as the Constitution.

---

## 1. The event

Every canonical event is one row in `ledger.event`.

| Field | Type | Meaning |
|---|---|---|
| `seq` | bigint | Position in the log. Strictly ascending. **Gaps are normal**: a rolled-back transaction consumes sequence values and writes nothing. |
| `id` | uuid | Stable identity of this event |
| `type` | text | One of the types in section 3 |
| `schema_version` | text | The protocol version that wrote it |
| `occurred_at` | timestamptz | **Authoritative server time.** Never a client clock |
| `actor_type` | text | `PERSON` · `STEWARD` · `SERVICE` · `SYSTEM` · `FOUNDER_STEWARD` |
| `actor_ref` | text? | Opaque person id, steward label, or service name. **Never an email** |
| `subject_type` | text | What the event is about, e.g. `ledger.entry` |
| `subject_ref` | text | Opaque id or ordinal of the subject |
| `authority_ref` | text? | The protocol, decision or receipt this acted under |
| `prior_event_id` | uuid? | The event this corrects or supersedes |
| `privacy_class` | text | `PUBLIC` · `INTERNAL` · `PRIVATE` (section 4) |
| `idempotency_key` | text? | Links an event to the request that caused it |
| `payload` | jsonb | The body. Per-type shapes in section 3 |
| `prev_digest` | text? | The previous event's digest. Null only for the first |
| `digest` | text | This event's digest (section 2) |

`ledger.event` rejects `UPDATE` and `DELETE` by database trigger. **Corrections
append.** There is no product operation that edits a canonical event and there
will not be one.

---

## 2. The integrity chain

Every event carries a digest over its own body and its predecessor's digest, so
omission or rewriting is detectable — including after a restore from backup.

```
material = canonicalJson({
  type,          // the event type string
  payload,       // the event body
  occurredAt,    // ISO-8601 with milliseconds, e.g. "2026-08-26T00:00:00.000Z"
  prevDigest     // the previous event's digest, or null
})

digest = lowercase_hex(SHA-256(material))
```

### canonicalJson

Deterministic JSON, defined so that two independent implementations produce
identical bytes:

- object keys sorted ascending by code unit, **recursively**;
- keys whose value is `undefined` are omitted;
- arrays keep their order;
- no insignificant whitespace;
- strings escaped as `JSON.stringify` escapes them.

**This is not `JSON.stringify`.** PostgreSQL `jsonb` does not preserve key
insertion order, so an order-dependent digest cannot be recomputed from a
stored row, and the chain would be decorative. Canonicalisation is what makes
the record verifiable by someone who was not there when it was written.

### Reading the log correctly

Order by the **numeric** sequence column. In PostgreSQL, a bare `ORDER BY seq`
after `SELECT seq::text AS seq` resolves to the *text* output column and sorts
lexicographically — `1, 10, 2, 3` — silently reordering the chain past nine
events. This is a real defect that was found and fixed here; it is documented
because any reimplementation can make it too.

### Verifying

```
prev = null
for each event ordered by seq ascending:
    assert event.prev_digest == prev
    assert event.digest == sha256(canonicalJson({...}))
    prev = event.digest
```

`pnpm conformance check` does exactly this against a live database. `pnpm fork
verify` does it offline against an exported copy.

---

## 3. Event types

### 3.1 Implemented

| Type | Privacy | Payload |
|---|---|---|
| `ledger.entry.sealed` | PUBLIC | `ordinal`, `entryId`, `declarationVersion`, `protocolVersion`, `legalStatusVersion`, `foundingRightVersion`, `predecessorOrdinal?`, `witnessOrdinal?` |
| `ledger.entry.witnessed` | PUBLIC | `ordinal`, `witnessOrdinal`, `confers: "NOTHING"`, `note` |
| `ledger.entry.corrected` | PUBLIC | `ordinal`, `fieldChanged`, `previousName`, `newName` |
| `ledger.entry.withdrawn` | PUBLIC | `ordinal`, `outcome`, `note` |
| `ledger.entry.review_opened` | INTERNAL | `caseId`, `kind` |
| `ledger.entry.voided` | PUBLIC | `ordinal`, `reason` |
| `relay.issued` | INTERNAL | `ordinal`, `channelHint`, `keyVersion` |
| `relay.revoked` | INTERNAL | `reason` |
| `relay.arrival.recorded` | PUBLIC | `ordinal`, `predecessorOrdinal`, `outcome: "ATTRIBUTED_ARRIVAL"` |
| `relay.first_continuation.recorded` | PUBLIC | `ordinal`, `predecessorOrdinal`, `outcome: "FIRST_CONTINUATION"` |
| `ledger.system_state.changed` | PUBLIC | `from`, `to`, `reason` |
| `ledger.gate.changed` | PUBLIC | `gate`, `title`, `from`, `to`, `reason`, `evidenceUri` |
| `anchor.published` | PUBLIC | `periodKind`, `periodLabel`, `algorithm`, `merkleRoot`, `eventSeqFrom`, `eventSeqTo`, `eventCount` |
| `build.deployed` | PUBLIC | `commitRef`, `migrations`, `environment`, `actor` |
| `conformance.verified` | PUBLIC | `passed: true`, `checkCount`, `eventSeqHigh`, `environment`, `commitRef?` |
| `conformance.failed` | PUBLIC | `passed: false`, `failedChecks`, `failed: string[]`, `checkCount`, `eventSeqHigh`, `environment` |

### 3.2 Reserved and deliberately unimplemented

These names are fixed now and refused at the append path. Reserving them fixes
the shape **before** there is money to be embarrassed about or an agent
population to argue over. Implementing one requires documenting it here first.

| Type | Intent |
|---|---|
| `treasury.received` | Money in |
| `treasury.disbursed` | Money out |
| `treasury.reimbursed` | A steward reimbursed |
| `instrument.registered` | An agent admitted as the disclosed instrument of exactly one human entry |
| `instrument.acted` | An instrument acted, naming its principal's ordinal |
| `instrument.revoked` | A human revoked their instrument; its past actions remain in the log, attributed |

**The treasury reservation exists so that this claim can become checkable:**
if the OURS share of revenue ever exceeds 5%, it appears in the ledger before
anyone announces it, because there is no other place for it to go.

**The instrument reservation exists because every network is about to fill with
agents and every one of them will handle it by pretending otherwise.** The rule
that follows from the existing lock: an instrument acts only as the named agent
of exactly one human entry; it has no ordinal, no place, no vote, no
continuation, no lineage and no standing; and it is *disclosed*, not hidden and
not shamed.

---

## 4. Privacy classes

| Class | Meaning |
|---|---|
| `PUBLIC` | Served by public projections and exported by `ours-fork` in full |
| `INTERNAL` | Operational. Never served publicly; appears in an export only as a position and a digest |
| `PRIVATE` | About a specific person. Never served publicly; never in an export body |

A non-public event still participates in the chain and in every Merkle root.
An export therefore publishes a **chain skeleton** — position, privacy class
and the two digests for every event — alongside full bodies for public ones.
That is what lets an outsider verify the whole chain and every anchor without
learning anything about a private event beyond the fact that it exists.

---

## 5. What never appears in an event

- an email address, in any field, in any class;
- a raw relay token or a raw magic-link token;
- a session token or cookie;
- an IP address or user agent;
- a private display-name draft;
- a risk score, a suspicion, or the content of a review case;
- a follower count, a like, a referral count or any popularity measure — those
  are not fields here, because a field is a claim that something is counted.

---

## 6. Anchors

At a fixed cadence a Merkle root over the event digests is published, so the
record is provable without OURS. `ours.anchor.merkle/1`:

- **leaf:** `SHA-256("ours.anchor.leaf/1 " + event_digest)`
- **node:** `SHA-256("ours.anchor.node/1 " + left + right)`
- an odd node at any level is **promoted unchanged**, never duplicated — which
  is what prevents the classic forgery where a three-leaf log and a four-leaf
  log share a root;
- an empty range has no root;
- output is lowercase hex.

A root commits to a **sequence range**, not a calendar period. Publishing an
anchor appends `anchor.published` to the very period it covers, so the period
always grows afterwards; the range is the thing that verifies.

Full algorithm and worked steps: [`/anchors`](https://ourstoday.com/anchors).

---

## 7. The member root

A stable, opaque identifier a member holds:

```
memberRoot = lowercase_hex(SHA-256("ours.member-root/1 " + entry_uuid))
```

It is **derived, never stored**, so it survives a restore, a fork and a
migration without a column, a backfill or a rotation. It is an *identifier, not
a credential*: possessing it authorizes nothing.

It derives from the private entry uuid and deliberately **not** from the public
ordinal, so nobody can compute another person's root from the front page.

Its purpose is forward compatibility. A credential the person controls can be
rooted here later — without renumbering anyone, reissuing anything, or asking a
single person to enter twice.

---

## 8. Compatibility rules

**Non-breaking** (minor version):

- adding a new event type;
- adding an optional payload field;
- adding a public projection.

**Breaking** (major version, constitutional amendment, receipt required):

- removing or renaming an event type or payload field;
- changing the meaning of an existing field;
- changing the digest material or `canonicalJson`;
- changing a privacy class in a way that publishes something previously
  withheld;
- changing the Merkle construction.

A reader that encounters an unknown event type must **ignore it and continue**,
not fail. That is what makes adding a type non-breaking.

---

## 9. Getting a copy

```bash
pnpm fork export          # the complete public state, schema and documents
pnpm fork verify <dir>    # recompute the chain and every root, offline
```

Verification needs no database, no network and no permission from OURS. That
is the point: an export you have to trust us about is not an export.
