# Runbook · Email deliverability

The only email this application sends is a magic link. If it does not arrive,
nobody can enter. That makes deliverability an availability concern, not a
marketing one.

## Two modes

```
EMAIL_DELIVERY_MODE=capture   writes messages to .email-capture/ (gitignored)
EMAIL_DELIVERY_MODE=resend    delivers through Resend
```

Capture is the default for local work and the e2e suite, which reads the
captured message to complete the entry ritual. **Never** point a shared preview
or production at capture mode: it silently succeeds and delivers nothing.

## Before public magic-link use

- [ ] verify an OURS-owned sending subdomain — `updates.ourstoday.com` —
      isolated from the apex so a delivery problem cannot damage the main
      domain's reputation;
- [ ] `RESEND_FROM="OURS TODAY <enter@updates.ourstoday.com>"`;
- [ ] SPF and DKIM verified in Resend;
- [ ] DMARC published and monitored;
- [ ] **open and click tracking disabled.** Tracking rewrites links; a rewritten
      verification link breaks the scanner-safe confirmation flow and adds
      behavioural data with no purpose in the data map.

Resend's test domain delivers only to the account owner's address. That is fine
for a first smoke test and useless for anyone else.

## Rate ceilings that will bite first

Resend Free currently lists 3,000 messages per month **capped at 100 per day**.
A viral entry loop hits the daily cap long before the monthly one. Model the
launch against 100/day and decide, before opening, what happens on message 101 —
a queue, a paid tier, or an honest "try again tomorrow" that does not look like
a bug.

## The scanner problem

Corporate mail scanners follow links in email. A verification link that
authenticates on `GET` is consumed by the scanner and dead before the human
clicks.

This build is structured against that:

- the emailed link points at `/enter/confirm`, an OURS-owned page;
- the token travels in the **URL fragment**, so it is never sent in the HTTP
  request or the referrer;
- the initial `GET` performs no authentication and loads no third-party script;
- authentication happens only when the person presses **Continue**, which posts
  the token from first-party code.

`tests/e2e/entry-ritual.spec.ts` asserts this directly: it issues a `GET` and a
`HEAD` against the bare confirm URL and fails if either sets a session cookie.
Keep that test. It is the whole defence.

## The email must say

- who it is from (OURS TODAY);
- what was requested;
- an explicit expiry;
- a plain-text alternative;
- "This authenticates your email. It does not create a Founding Ledger entry or
  legal membership.";
- what to do if you did not request it, without revealing whether an account
  exists.

The request endpoint returns the **same** neutral response whether or not the
address is known. Do not add a "no account found" message; it would turn the
form into an address oracle.

## When mail is not arriving

1. `EMAIL_DELIVERY_MODE` — is this environment silently capturing?
2. Resend dashboard: accepted, bounced, complained, or over the daily cap?
3. Domain still verified? SPF/DKIM records still present?
4. Locally, check `.email-capture/` — if the message is there, the failure is
   delivery, not the application.
5. Logs will show `magic_link.request_failed` or `magic_link.handler_error` with
   no detail, by redaction policy. Reproduce locally to see more.

Never print a reusable magic URL into a shared preview or production log.

## Monitoring before launch

Bounce and complaint rates must be watched and acted on. Publish no raw
email-based metrics; aggregate counts only.
