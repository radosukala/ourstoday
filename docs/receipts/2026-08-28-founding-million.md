# OURS · Decision and build receipt — The Founding Million

```yaml
receipt: ours.build-receipt/v1
task_id: TASK-20260828-004
title: One-screen entrance and finite Founding Million
date: 2026-08-28
authority: founder-steward instruction ("minimal homepage, real Founding
  Million with actual, finite rights ... Please build it")
agent: OpenAI Codex
truthful_status: LOCAL
deployed: false
canonical_writes_open: unchanged
supersedes: docs/receipts/2026-08-28-terminal.md (homepage only)
```

## Adopted direction

The front door carries one proposition and one action:

> **NOBODY LEAVES FIRST. EVERYBODY LEAVES TOGETHER.**

The first 1,000,000 sealed places form the finite Founding Million. Every
active place carries Founding Right 0.1: a permanent non-transferable ordinal,
one equal ballot in the founding ratification, one equal ballot in first-
mission authorization, notice and record rights, and data and exit rights.

This is a founder-steward project instrument. It is not member ratification,
legal membership, a share, a security, a token or an economic promise.
It is adopted as a separately published amendment to Constitution 0.1, so the
previous constitutional source is not silently overwritten.

## Technical enforcement

- The row-locked ordinal allocator rejects ordinal 1,000,001.
- Database checks reject entry ordinals outside 1—1,000,000 and allocator
  values outside 1—1,000,001.
- Every new entry records `ours-founding-right/0.1` in its canonical row and
  sealed-event payload.
- Public capacity comes from the allocator: formed, next and left cannot drift
  from the seal transaction.
- Founding Declaration 0.2 incorporates the right and passes through the
  existing version-consent gate.

## Interface

The previous split manifesto, target catalogue, acquisition-cost slider and
public record have been removed from the entrance. Targets remain available
after entry and in the daily record. The new screen shows the message, the
finite live counter, the right in one line and one email action.

The social preview is generated from the same system at 1200×630, so sharing
the page carries the movement message rather than a generic product card.
After seal, the suggested share text begins with the entrant's actual ordinal
and the same `Nobody leaves first. Everybody leaves together.` line.

Target choice is now a separate authenticated act after sealing. It cannot
block or alter the place. The resulting notice and its public event commit in
one transaction and are idempotent on retry.

## Verification

| Gate | Result |
|---|---|
| formatting | PASS |
| lint | PASS |
| TypeScript | PASS |
| unit tests | PASS · 62/62 |
| integration tests | PASS · 36/36 |
| browser tests | PASS · 22/22, including entry → right → post-entry notice |
| accessibility | PASS · no serious or critical Axe finding on the tested public surfaces |
| migration rehearsal | PASS · fresh database through `0010_founding_million.sql` |
| production build | PASS · root Open Graph and Twitter image routes generated |
| desktop visual | PASS · 1440×900, no overflow, complete one-screen composition |
| phone visual | PASS · 390×844, exact viewport fit, no horizontal or vertical overflow |

## Truth

- deployed: NO
- local migration: YES · `0010_founding_million.sql` applied to
  `ours_today_dev` on `127.0.0.1`
- canonical writes changed: NO; the existing steward and environment gates
  remain controlling
- legal membership changed: NO
- economic entitlement created: NO
- real demand proved: NO
- founder-steward decision: YES
- member ratification: NO

## Reversal

The homepage is isolated in `app/page.tsx`, `app/FoundingTerminal.tsx` and the
`.fm-*` CSS block. The Founding Million database constraints and already
recorded right versions must not be removed or rewritten after a new 0.2 entry
has sealed; any later change requires a new version and public receipt.
