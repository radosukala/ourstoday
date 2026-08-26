# Privacy notice · DRAFT

**Status: DRAFT · NOT LEGALLY REVIEWED · NOT PUBLISHED**
**Version:** `ours-privacy-notice-draft/0.1`

This draft exists so the mechanism can be built and tested against something
real. It is **not** a privacy notice. A licensed reviewer must set the legal
basis for every field, name the controller, and approve the retention schedule
before any real identity data is collected (handoff decisions 16.2, 16.6, 16.12).

Where this draft cannot answer a question, it says so rather than inventing a
policy. Every gap below is a launch gate.

---

## Who is responsible

**NOT YET DETERMINED.** The legal controller identity is handoff decision 16.2.
Until a controller exists, there is no one to be accountable to you, which is
precisely why this build does not collect real identity data.

## What is collected, and why

| What | Why | Public? |
|---|---|---|
| Your email address | The only way to prove you control an address and to send you a sign-in link. There is no password. | **No, never** |
| A hash of your email | Lets a sign-in started on one device finish on another without storing your address a second time | No |
| Your chosen public name or pseudonym | This is what appears on the ledger. A pseudonym is a first-class choice, not a workaround. | **Yes, once you seal** |
| Your ordinal and the time it was sealed | The chronological record itself | **Yes** |
| Which entry's relay you arrived through | Lineage between people | **Yes, as an ordinal** |
| The document versions you accepted | So it is always clear what you agreed to | No |
| Session data, including your IP address and browser user agent | Session security, and to rate-limit sign-in attempts per caller rather than globally | No |
| Requests you make (correction, withdrawal) | To act on them and show you their status | No |

Full field-level detail is in [DATA-MAP.md](./DATA-MAP.md).

## What is deliberately not collected

No password. No tracking. No analytics. No advertising. No third-party script —
the content security policy blocks every external origin. No follower count, no
likes, no referral count: those are not fields here, because a field is a claim
that something is being counted.

## What is public

Only what appears in the public ledger projection: your ordinal, your chosen
public name, your entry time, the ordinal you arrived through, your relay state
and your public status. **Your email address is never public.** A Founding
Ledger entry is not legal membership.

## What you can do

Signed in, at `/me`: export your records, request a name correction, request
withdrawal, and see the status of each request.

Withdrawal replaces your public name with a tombstone. **Your ordinal stays
retired and is never given to anyone else** — that is what keeps everyone else's
chronology true.

Whether withdrawal also deletes your private authentication records, and on what
schedule, is **NOT YET DECIDED** and awaits licensed review. The mechanism is
built; the policy is not written, and this draft will not pretend otherwise.

## How long things are kept

**NOT YET DECIDED** (handoff 16.6). Canonical ledger events are append-only and
permanent by design — that is the point of a chronological record. Private
authentication and security data must have a retention schedule, and does not
yet. That includes the IP address recorded with each session, which we do store
and have not yet decided how long to keep.

## Who else sees your data

A PostgreSQL host, an email provider for sign-in links, and a hosting platform
whose access logs record request paths. The specific companies are **NOT YET
CHOSEN** (handoff 16.1). Once chosen they must be named here.

## Contact

**NOT YET NAMED** (handoff 16.7).

---

## Gaps blocking publication

1. controller identity;
2. legal basis per field;
3. retention and erasure schedule;
4. how long session IP addresses and user agents are kept — **that they are
   kept is decided; the retention period is not**;
5. named processors;
6. support and rights contact;
7. licensed review of this document and of the boundary between Founding Ledger
   status and any future legal membership.
