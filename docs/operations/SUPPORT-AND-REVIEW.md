# Runbook · Support and review

**Named support contact and review capacity: NOT YET NAMED** (handoff 16.7).
This blocks canonical launch. A rights mechanism nobody answers is not a right.

## What a person can do without asking anyone

At `/me`, signed in:

- see their private account state and their public entry, separately;
- export a JSON package of their own records (`GET /api/v1/me/export`);
- request a public-name correction;
- request withdrawal;
- see the status of their requests.

These are self-service by design. Support exists for what they cannot do alone.

## The queue

```bash
pnpm steward queue
```

Lists open correction requests, withdrawal requests and integrity review cases.
Deliberately omits `reason_detail` and proposed names: the queue is a work list,
not a place to browse private drafts. Read the detail when you work the item.

## Corrections

A person asks for a different public name.

```bash
pnpm steward correction <requestId> approve --actor "..." --reason "..."
pnpm steward correction <requestId> reject  --actor "..." --reason "..."
```

Approving updates `ledger.entry.display_name` and appends
`ledger.entry.corrected` carrying **both** the previous and the new name, in one
transaction. History is not silently edited; the correction is part of it.

Display-name moderation rules are undecided (handoff 16.4). Until they exist,
reject only what is unambiguously abusive and record why.

## Withdrawals

```bash
pnpm steward withdrawal <requestId> approve --actor "..." --reason "..."
```

Approving:

- sets the entry to `WITHDRAWN` / `TOMBSTONED`, so the public projection shows a
  tombstone instead of the name;
- revokes every active relay issued from that place, since attribution can no
  longer flow through it;
- appends `ledger.entry.withdrawn`.

**The ordinal is permanently retired and never reassigned.** Chronology is the
one thing the ledger promises; renumbering would break it for everyone else.

Whether withdrawal also erases private auth records is a **policy decision, not
a mechanism decision** (handoff 16.6). The mechanism is built. Do not invent the
retention rule — mark it awaiting licensed review and say so to the person.

## Integrity reviews

Suspected duplicate people, self-referral loops or automated entry open a
**private** `review_case`. While a case is open:

- the person is not publicly marked in any way;
- no accusation appears in any projection;
- no risk score reaches a public view — the projection test enforces this.

If a review concludes an entry should not exist:

```bash
pnpm steward void <ordinal> --actor "..." --reason "..."
```

Voiding tombstones the public identity and appends `ledger.entry.voided`. The
ordinal stays consumed. There is no path that makes an entry never have
happened, because there should not be one.

## Tone

Every reply says what was done, under whose authority, and what the person can
do next. Nobody is told they are suspected of anything by a machine, and nobody
learns their status from a public page before a human has spoken to them.

## Escalation

| Situation | Who |
|---|---|
| Canonical integrity doubt | Incident owner — **unnamed** — pause first ([INCIDENT.md](./INCIDENT.md)) |
| Suspected private-data exposure | Incident owner + legal reviewer — **unnamed** |
| Legal request or data-rights dispute | Legal controller — **unnamed** (handoff 16.2) |
| Anything the runbooks do not cover | Founder-steward |

Three of those four are blank. That is the honest state, and each one is a named
launch gate.
