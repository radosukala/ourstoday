# Runbook · Secret rotation

## The secrets

| Name | Used for | Rotatable without downtime? |
|---|---|---|
| `BETTER_AUTH_SECRET` | Signing sessions and tokens | No — see below |
| `RELAY_SIGNING_SECRET` | HMAC over relay tokens | **Yes**, by design |
| `RESEND_API_KEY` | Magic-link delivery | Yes |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` credentials | Database access | Yes, with a brief overlap |

None of these ever appears in `.env.example`, a log line, a receipt, a fixture
or a screenshot. `pnpm security:audit` runs a tripwire over tracked files and
fails the build on a credential-shaped string; it reports the location and
never the matched text, so CI logs cannot become the leak.

## Relay signing key — versioned, no downtime

`RELAY_SIGNING_SECRET` holds versioned keys, newest first:

```
RELAY_SIGNING_SECRET="2:<new-secret>,1:<old-secret>"
```

Every relay token carries its `keyVersion`, and
`private.relay_token_record.signing_key_version` records which key signed it.
Verification tries the named version, so tokens already in people's hands keep
working across a rotation.

1. generate a new high-entropy secret;
2. prepend it with the next version number, keeping the old entry;
3. deploy — new relays are signed with the new key, old relays still verify;
4. once every token signed by the old key has expired or been revoked, drop the
   old entry and deploy again.

Removing an old version invalidates every relay still signed with it. Those are
attribution capabilities people may have shared publicly, so retire a version
deliberately, not as cleanup.

## Better Auth secret

Rotating `BETTER_AUTH_SECRET` invalidates every existing session: everyone is
signed out and must request a new magic link. Nobody loses their entry — an
ordinal is not a session — but it is a visible event.

Better Auth supports a `BETTER_AUTH_SECRETS` list on versions that accept
multiple secrets; verify against the pinned version before relying on an
overlap window. Otherwise: rotate at a quiet hour, announce it on `/status`,
and expect a burst of magic-link requests afterwards (check the Resend daily
cap, currently 100/day on the free tier).

## Resend API key

Create the new key, deploy it, confirm one delivery, then revoke the old key.
Keep open and click tracking **disabled** for authentication email: tracking
rewrites verification links.

## Database credentials

Create a second role with the same grants, switch `DATABASE_URL`, confirm
health, then drop the old role. The runtime role must never be the migration
owner.

## After any rotation

- confirm `pnpm security:audit` is clean;
- confirm a magic link still completes end to end;
- record the rotation in `docs/receipts/` with the date, the secret rotated and
  who did it — never the value.
