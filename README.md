# OURS TODAY

> **THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.**

OURS is a member-owned network that builds its own software in public.

This repository contains the Day 1 founding instrument and the source package
that governs its next builds.

**Day 1:** 26 August 2026  
**Current ownership status:** COMMITTED  
**Legal membership:** NOT YET ISSUED  
**Canonical intended domain:** `ourstoday.com`

## Open locally

The site has no build step or dependencies.

```text
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

The Content Security Policy blocks network requests. Entry and proposal
interactions save private drafts only in the current browser. They do not issue
a canonical ledger number, submit a response, create legal membership or grant
ownership.

## Source package

- [Founding direction v0.2](docs/OURS.md)
- [Founding Constitution 0.1](docs/CONSTITUTION-0.1.md)
- [Founding Relay Protocol](docs/FOUNDING-RELAY-PROTOCOL.md)
- [Proposal and Deliberation Protocol](docs/PROPOSAL-AND-DELIBERATION-PROTOCOL.md)
- [Agent Build Contract](docs/AGENT-BUILD-CONTRACT.md)
- [Day 1 record](docs/DAY-1.md)
- [Founding Ledger backend build handoff](docs/FOUNDING-LEDGER-BUILD-HANDOFF.md)
- [Copy-ready prompt for the next coding session](docs/FOUNDING-LEDGER-NEXT-SESSION-PROMPT.md)

These documents explicitly distinguish:

- adopted decisions;
- constitutional commitments;
- hypotheses;
- future decisions;
- concept data;
- observed evidence.

## Homepage

The Day 1 homepage is a working civic instrument rather than a SaaS landing
page.
It contains:

- the founding declaration;
- the origin ledger record;
- an honest local entry-draft preview;
- Formation Tape;
- Build Tape;
- Constitution Diff;
- proposal P-0001 and the six structured response types;
- direct access to every governing document.

The local entry form intentionally copies only an **intention**. It cannot
generate social copy falsely claiming that a canonical entry was sealed.

## Files

```text
index.html                                      Day 1 instrument
assets/styles.css                               visual and responsive system
assets/app.js                                   private local draft interactions
assets/og.png                                   1200 x 630 founding share image
docs/OURS.md                                    adopted direction v0.2
docs/CONSTITUTION-0.1.md                        operative project charter
docs/FOUNDING-RELAY-PROTOCOL.md                 entry and relay mechanics
docs/PROPOSAL-AND-DELIBERATION-PROTOCOL.md      proposal and external-discussion mechanics
docs/AGENT-BUILD-CONTRACT.md                    prompt, authority and receipt format
docs/DAY-1.md                                   Day 1 decision/build record
docs/FOUNDING-LEDGER-BUILD-HANDOFF.md           backend architecture and implementation plan
docs/FOUNDING-LEDGER-NEXT-SESSION-PROMPT.md     copy-ready coding-session prompt
```

## Prehistory and reversibility

The earlier Mission Market was preserved rather than erased:

- [Founding direction v0.1](docs/OURS-v0.1.md)
- [Mission Market design proposal](docs/mission-market.html)
- `archive/mission-market-v0.1/` — the previous multi-file homepage

Version 0.1 contains reusable cell, migration, commitment, economics and
governance work. It is superseded as the first public experience, not presented
as a public failure.

## Production boundary

Before the canonical Founding Ledger can open, the project still needs:

- legal and privacy review;
- a public/private data map;
- identity verification and recovery;
- transactional number allocation and idempotency;
- signed relays and atomic First Continuation;
- abuse review and appeal;
- correction, withdrawal and export;
- backups and tested recovery;
- monitoring, support and an incident owner;
- an explicit production-readiness receipt.

The acceptance matrix is in the
[Founding Relay Protocol](docs/FOUNDING-RELAY-PROTOCOL.md#16-acceptance-tests).
