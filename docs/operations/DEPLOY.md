# Runbook · Deploy

**Status: DEPLOYED.** Verified 28 August 2026. `ourstoday.com` is served from
Vercel; the Git remote is public; a Neon PostgreSQL database holds canonical
entries; email sends through Resend from a verified `updates.ourstoday.com`.
Production canonical writes are **OPEN**.

This section said the opposite until 28 August, long after each of those
became true. A runbook that misdescribes the system it operates is worse than
no runbook, because it is trusted. Anyone editing this file: the status line is
part of the runbook, not decoration around it.

Everything below still holds — each deployment and each opening of the ledger
is a separate human decision with a receipt.

## Environments

```
LOCAL       disposable real-Postgres development data
PREVIEW     isolated test data, never presented as canonical
PRODUCTION  durable canonical data, writes closed until the readiness receipt
```

Vercel Preview and Production must **never** point at the same database or
branch. A preview that can write to the canonical ledger is not a preview.

## The two write gates

```
ALLOW_CANONICAL_WRITES=false        environment gate (default: closed)
ledger.system_state.mode='CLOSED'   database gate  (default: closed)
```

Both must allow a write. No deployment script may open either. Opening is a
steward action with a receipt (see [PAUSE-LEDGER.md](./PAUSE-LEDGER.md)).

## Preview checklist (Milestone G — requires approval)

- [ ] initialize and publish the approved Git repository;
- [ ] provision an isolated PREVIEW PostgreSQL database (Neon recommended; see
      the handoff's provider comparison);
- [ ] set every variable from `.env.example` in the Vercel Preview scope, with
      `ALLOW_CANONICAL_WRITES=false` and `APP_ENV=preview`;
- [ ] enable Vercel deployment protection so the preview is not publicly
      indexable;
- [ ] `pnpm db:migrate` against the preview database using its **direct**
      connection;
- [ ] confirm `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` and the trusted origins
      match the actual preview URL — Better Auth rejects mismatched origins, and
      a wrong value looks exactly like a broken login;
- [ ] `EMAIL_DELIVERY_MODE=resend` only with an authorized sending domain;
      otherwise leave it in capture mode. Resend's test domain delivers only to
      the account owner;
- [ ] run smoke, accessibility and security checks against the real preview URL;
- [ ] write the preview receipt: URL, commit, migrations applied, environment,
      tests run.

## Production checklist (Milestone H — separate decision)

Everything above, plus every box in section 17 of the handoff. Passing code
tests is not authorization to open canonical writes.

Additional runtime notes for whoever does this:

- **Connection pooling.** Use the provider's pooled URL for `DATABASE_URL` and
  the direct URL for `DIRECT_DATABASE_URL`. On a transaction-mode pooler
  (Supabase Supavisor), also set `DB_DISABLE_PREPARED_STATEMENTS=true`;
  prepared statements are incompatible with transaction pooling.
- **Client IP.** Better Auth currently logs that it cannot resolve a client IP
  and is using one shared rate-limit bucket. Configure the platform's trusted
  proxy header before public launch, or rate limiting is effectively global.
- **Cookies.** `useSecureCookies` and the `secure` cookie attribute switch on
  when `APP_ENV=production`. Setting `APP_ENV` correctly is a security control,
  not a label.
- **Vercel plan.** Hobby is described as personal, non-commercial use. Review
  eligibility before a professional public operation (handoff 16.9).

## Rollback

The Day 1 static instrument is preserved at `archive/day-1-static-v0.2/`. It is
dependency-free HTML, CSS and JavaScript and can be served by anything. Rolling
back to it removes all backend behaviour and tells the truth while doing so.

To roll back a bad application deploy, use the platform's previous-deployment
promotion. To stop canonical damage, pause the ledger first — a rollback that
leaves writes open has not stopped anything.
