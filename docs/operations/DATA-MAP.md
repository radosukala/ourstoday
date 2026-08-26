# OURS TODAY · Data Map

**Version:** 0.1
**Status:** DRAFT · NOT LEGALLY REVIEWED
**Applies to:** the local/test build at commit time of the build receipt
**Required by:** [Build Handoff 0.1](../FOUNDING-LEDGER-BUILD-HANDOFF.md) section 12

This document lists every field the application stores, why it exists, who can
see it and what happens to it. The handoff requires it to exist and be approved
**before any external identity collection**. It is written from the actual
schema, not from intent: regenerate it against the database whenever migrations
change.

Legal basis entries are placeholders. A licensed reviewer must set them
(handoff section 16, decision 2 and decision 12).

## 0. Classes

| Class | Meaning |
|---|---|
| PUBLIC | Appears in `public.founding_ledger` or another allowlisted projection. Anyone can read it. |
| PRIVATE | Never leaves the server except to the person it belongs to, via `/api/v1/me/export`. |
| SENSITIVE | Private, plus: never logged, never in a receipt, never in a screenshot, never in a fixture. |
| OPERATIONAL | Service state with no personal content. |

The automated guard for this table is
`tests/integration/immutability-and-projections.test.ts`, which enumerates the
public view columns and fails if an email, auth user id, session, token, IP,
user agent or risk field ever appears there.

---

## 1. `auth` schema — Better Auth (better-auth 1.7.1)

Better Auth owns these tables. They are listed here rather than treated as
outside the map, because the library stores real personal data.

| Field | Class | Purpose | Retention | Export | Erasure |
|---|---|---|---|---|---|
| `auth.user.id` | PRIVATE | Internal account identifier | Life of account | Yes | On approved deletion |
| `auth.user.email` | SENSITIVE | The only login credential; proves control of an address | Life of account | Yes | On approved deletion |
| `auth.user.email_verified` | PRIVATE | Whether the address was proven | Life of account | Yes | With account |
| `auth.user.name` | PRIVATE | Empty in this slice; magic-link signup writes `""` | Life of account | Yes | With account |
| `auth.user.image` | PRIVATE | Unused; nullable | — | Yes | With account |
| `auth.user.created_at` / `updated_at` | PRIVATE | Account lifecycle | Life of account | Yes | With account |
| `auth.session.id`, `.token` | SENSITIVE | Session credential | Until expiry or revocation | **No** | On sign-out/expiry |
| `auth.session.expires_at` | PRIVATE | Session lifetime | Until expiry | Yes | With session |
| `auth.session.ip_address` | SENSITIVE | Session security and per-caller rate limiting | **Undecided — see below** | No | With session |
| `auth.session.user_agent` | SENSITIVE | Session security | **Undecided — see below** | No | With session |
| `auth.session.user_id` | PRIVATE | Session owner | With session | Yes | With session |
| `auth.account.*` | PRIVATE | Provider linkage. Unused in this slice: there is no social login and `emailAndPassword` is disabled, so `password` is always null | Life of account | Yes | With account |
| `auth.verification.identifier` | SENSITIVE | The email a magic link was issued for | Until consumed or expired | No | On consumption/expiry |
| `auth.verification.value` | SENSITIVE | **Hashed** magic-link token (`storeToken: "hashed"`) | Until consumed or expired | No | On consumption/expiry |
| `auth.rate_limit.key`, `.count`, `.last_request` | OPERATIONAL | Database-backed auth rate limiting | Rolling window | No | Window rollover |

> **DECIDED, 26 August 2026 — session IP is stored.** Better Auth writes
> `ip_address` and `user_agent` on every session. The founder-steward chose to
> resolve the client IP so that rate limiting is per-caller rather than one
> shared global bucket; a limit that cannot tell callers apart protects nobody
> in particular. The cost of that choice is that an IP address is stored on
> every session row.
>
> This is the most privacy-significant field in the system and it must be named
> in the privacy notice. Only a header the platform sets and overwrites is
> trusted (`x-vercel-forwarded-for`, overridable via `TRUSTED_IP_HEADERS`),
> because a client-supplied header would let anyone evade a limit by lying —
> which is worse than no limit, since it looks like one.
>
> **Still open:** how long these are kept. That is part of the retention
> schedule (handoff decision 6) and remains unanswered. Until it is answered,
> the honest statement is that we store them and have not decided for how long.
> See [PRIVACY-NOTICE-DRAFT.md](./PRIVACY-NOTICE-DRAFT.md).

---

## 2. `private` schema — application records

Never public. Reachable by the person themselves through
`GET /api/v1/me/export`, and by a named steward through the steward CLI.

| Field | Class | Purpose | Export | Notes |
|---|---|---|---|---|
| `person.id` | PRIVATE | Opaque person key used by every private table | Yes | Never used as an auth secret and never public |
| `person.auth_user_id` | PRIVATE | Link to the Better Auth account | Yes | The only join between `auth` and `private` |
| `person.email_digest` | SENSITIVE | SHA-256 of the lowercased address. Used to bind an entry context to an email without storing the address twice | No | Digest, not plaintext; still personal data |
| `person.lifecycle`, `email_verified_at`, `created_at`, `updated_at` | PRIVATE | Account state | Yes | |
| `entry_draft.display_name_draft` | PRIVATE | Proposed public name before sealing | Yes | Never logged; a draft is not a publication |
| `entry_draft.*_version` | PRIVATE | Documents shown at draft time | Yes | |
| `entry_draft.predecessor_relay_record_id` | PRIVATE | Relay the draft began through | Yes | |
| `entry_context.id` | SENSITIVE | High-entropy short-lived id carried beside the emailed confirmation | No | 15-minute expiry; single use |
| `entry_context.email_digest` | SENSITIVE | Binds the context to one address so another account cannot claim it | No | |
| `entry_context.relay_token_record_id` | PRIVATE | Preserves lineage across a cross-device confirmation | No | |
| `entry_context.state`, `consumed_by_person_id`, timestamps | PRIVATE | Single-use enforcement | No | |
| `consent_record.document_versions` | PRIVATE | The exact versions a person accepted | Yes | Written inside the seal transaction; the lawful record of what was agreed |
| `consent_record.subject_id`, `accepted_at`, `superseded_by_id` | PRIVATE | What was consented to, when | Yes | |
| `idempotency_record.key`, `request_digest` | PRIVATE | Makes a retried seal return the original entry | Yes | Digest of the request, not the request |
| `idempotency_record.result_snapshot` | PRIVATE | Public-safe fields of the committed result | Yes | Ordinal, entry id, seal time, display name |
| `relay_token_record.jti_digest` | SENSITIVE | Digest of the relay token id, for revocation and audit | No | **The reusable raw token is never stored** |
| `relay_token_record.predecessor_entry_id`, `channel_hint`, `signing_key_version`, `state`, timestamps | PRIVATE | Relay lifecycle and key rotation | Partial | |
| `withdrawal_request.reason_code`, `reason_detail` | PRIVATE | A person's own request in their own words | Yes | `reason_detail` is free text and may contain anything; never surfaced publicly |
| `correction_request.proposed_display_name`, `reason_detail` | PRIVATE | Requested public-name change | Yes | Becomes public only if approved |
| `*_request.state`, `resolved_by_actor`, `receipt_event_id` | PRIVATE | Review outcome and its receipt | Yes | |
| `review_case.*` | SENSITIVE | Integrity review. `opened_reason` and `resolution_notes` are free text about a person | **No** | An accusation is never published; the handoff forbids a private risk score in a public projection |
| `steward_assignment.actor_label`, `purpose`, `granted_by`, `granted_at`, `expires_at`, `revoked_at` | PRIVATE | Time-bounded steward authority | No | Authority is never a client-provided email list |
| `app_rate_limit.bucket_key`, `window_start_ms`, `count` | OPERATIONAL | Application rate limiting; key is a digest | No | |

---

## 3. `ledger` schema — canonical record

| Field | Class | Purpose | Notes |
|---|---|---|---|
| `entry.id` | PRIVATE | Opaque entry key | Not the public identifier |
| `entry.ordinal` | **PUBLIC** | The chronological place | Unique forever; never reassigned, not even after withdrawal or voiding |
| `entry.person_id` | PRIVATE | The only link from a public entry to a private person | **Never public.** Nullable: the declared origin row has no person |
| `entry.display_name` | **PUBLIC** | The name or pseudonym the person chose | Public only while `display_state = 'PUBLIC'` |
| `entry.seal_ts` | **PUBLIC** | Authoritative server time of commit | Public precision is an open decision (handoff 16.4) |
| `entry.lifecycle`, `display_state` | **PUBLIC** | SEALED / WITHDRAWN / VOIDED and PUBLIC / TOMBSTONED | A tombstone replaces the name, never the number |
| `entry.predecessor_entry_id` | **PUBLIC** (as ordinal) | Lineage | The view exposes the predecessor's ordinal, not its id |
| `entry.*_version` | **PUBLIC** | What this entrant accepted | |
| `entry.origin_kind` | **PUBLIC** | ORDINARY or DECLARED_ORIGIN | |
| `event.seq`, `id`, `type`, `schema_version`, `occurred_at` | PUBLIC when `privacy_class = 'PUBLIC'` | The append-only record | Updates and deletes are rejected by trigger |
| `event.actor_ref` | Depends | Opaque person id, steward label, or service | **PRIVATE-class events are never served by any route** |
| `event.payload` | Depends | Event body | Classified per event by `privacy_class` |
| `event.prev_digest`, `digest` | PUBLIC | Canonical-JSON hash chain | Recomputable from stored rows; verified by `db:restore:verify` |
| `first_continuation.*` | **PUBLIC** | Which successor vested the edge | At most one per predecessor, forever |
| `relay_arrival.*` | **PUBLIC** (as ordinals) | Arrival through a relay | Written only inside the seal transaction |
| `system_state.*` | **PUBLIC** | Write-gate mode and current versions | `changed_by_actor` is a steward label, not a person |
| `ordinal_counter.next_ordinal` | OPERATIONAL | Row-locked allocator | Rollback rolls back allocation |

### Public projections

`public.participation_totals` and `public.participation_daily` aggregate the
ledger and contain no per-person column - the projection test asserts that
directly, because an aggregate that acquires an identifier stops being a count
of what happened and becomes a measurement of individuals.

`public.founding_ledger` and `public.system_status` are the allowlisted
per-entry public reads. They expose ordinal, display name (or a withdrawn tombstone),
entry time, predecessor ordinal, relay state, First Continuation ordinal,
public status, document versions and the constant
`legal_membership_status = 'NOT YET ISSUED'`. No column joins to `private` or
`auth`.

---

## 4. Data that deliberately does not exist

Recording an absence is part of the map:

- no password anywhere (`emailAndPassword` is disabled);
- no plaintext relay token, only a digest of its id;
- no plaintext magic-link token, only a hash;
- no second copy of an email address in `private` or `ledger`;
- no analytics, advertising, visitor measurement or third-party script (CSP
  `default-src 'none'`,
  `connect-src 'self'`);
- no referral count, follower count, like or vote — these are not fields,
  because a field is a claim that something is being counted;
- no risk score in any public projection.

---

## 5. Recipients and processors

| Recipient | What it receives | When |
|---|---|---|
| PostgreSQL provider (Neon or Supabase — undecided, handoff 16.1) | Everything in this map | Always |
| Resend | Recipient email address and the message body, for magic-link delivery | Only in `EMAIL_DELIVERY_MODE=resend` |
| Vercel | Request metadata, including URL paths, in platform access logs | Always, once deployed |
| Local capture adapter | Emails written to `.email-capture/` (gitignored) | `EMAIL_DELIVERY_MODE=capture` only |

**Access-log note.** Relay URLs (`/r/<token>`) appear in provider access logs by
the nature of HTTP. The application never logs them itself. A relay URL is an
attribution capability, never an authentication capability: possessing one
authorizes no private read and no mutation, which bounds the consequence of that
retention. Open and click tracking must stay **disabled** in Resend for
authentication email, because tracking rewrites verification links.

---

## 6. Logging

`src/observability/logger.ts` redacts any field whose key matches
`email|token|secret|password|cookie|authorization|ip|useragent|user_agent|referrer`.
No email address, raw token, magic URL, session cookie, IP address, user agent
or private display-name draft is written to logs. Errors log an event name and
nothing else, which is why diagnosing a failure requires a local reproduction
rather than reading production logs. That trade is deliberate.

---

## 7. Open decisions this document cannot close

1. Legal basis for each field — needs a licensed reviewer (handoff 16.12).
   The controller is decided: **Ctrl AI, Inc.**
2. Whether `auth.session.ip_address` / `user_agent` are kept, and for how long.
3. Retention schedule for private auth and security records (handoff 16.6).
4. Public timestamp precision (handoff 16.4).
6. Provider choice and its sub-processor list (handoff 16.1).

The controller is named. Until the legal basis, the session-data retention
period and a licensed review are settled, this build must not collect real
identity data at scale.
