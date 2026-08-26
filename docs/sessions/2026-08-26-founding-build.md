# Session Record · Founding build

```yaml
record: ours.session-record/0.1
session_id: 2026-08-26-founding-build
date: 2026-08-26
principal:
  human: founder-steward
  ordinal: "000001"
instrument:
  kind: AI_CODING_AGENT
  identity: Claude Opus 5 (claude-opus-5)
  interface: Claude Code
authority:
  granted: BUILD inside the repository working tree
  withheld:
    - deploy or provision anything external
    - spend money
    - change DNS or domain registration
    - publish the repository
    - collect real identity data
    - open canonical writes
```

This is the retrospective record for the sessions that produced the working
application, written under [Instrument Disclosure 0.1](../INSTRUMENT-DISCLOSURE-0.1.md).
It is written *after* the fact, which is itself a weakness of this particular
record: it was reconstructed from the work rather than kept as it happened.
Every later record is written during its own session.

---

## What a person can now do that they could not before

Verify control of an email address, choose a public name or pseudonym,
optionally name a witness, read the exact document versions, and seal an entry
that receives its number inside the committed transaction. Carry a relay. Enter
through someone else's relay and have that lineage recorded, with exactly one
successor becoming that place's First Continuation. Export their own records,
request a correction, request withdrawal. Take the entire public record away
and verify it offline.

None of that worked at the start of the day. Most of it appeared to.

---

## What the instrument decided alone

Ordinary implementation choices, made without escalation:

- the shape of the connection-string normalizer, and that a remote plaintext
  connection should be refused in production rather than warned about;
- separating `predecessorOrdinal` from `isFirstContinuation` after finding that
  one field carried both facts;
- promoting `sslmode=verify-ca` to `verify-full`, on the grounds that verifying
  a chain while ignoring the hostname buys nothing;
- publishing the witness graph as a degree distribution and never as an edge
  list;
- deriving the member root from the private entry id rather than the public
  ordinal, so nobody can compute another person's root from the front page;
- adding `--yes` to opening canonical writes so no deploy script can do it in
  passing;
- the wording of most of the operations runbooks.

## What the instrument escalated

- **Whether to store session IP addresses.** Resolving the client IP makes rate
  limiting per-caller instead of one global bucket, and the cost is an IP on
  every session row. That is a privacy decision, not a configuration detail.
  Escalated; the founder-steward decided to enable it; the data map and privacy
  notice now say so, including that the retention period is still unanswered.
- **Article Zero and the dead-man's switch.** The escalation proposal asked for
  both. Writing them as Markdown would publish a promise with no mechanism,
  which is the thing this project exists to oppose. The *capability* was
  shipped and tested; the instruments were escalated as human decision 13.
- **The repository name, the domain, and every external service.** Withheld by
  the authority envelope, and correctly so.

---

## What it got wrong

This section is required and is the reason the format exists.

1. **Chased a phantom for roughly an hour.** A homepage crash
   (`entered.toISOString is not a function`) reproduced reliably under the test
   suite and never under manual inspection. The instrument theorised about
   React Server Component boundaries, Turbopack minification and cross-realm
   `Date` identity — at length — before checking the simplest thing: the e2e
   harness ran `next start` without building, so the suite was testing a stale
   artifact. The real lesson was one line in a shell script.
2. **Wrote a test assertion that tested nothing.** In the concurrency suite,
   the digest-chain check built its `material` string and then discarded it with
   `void material`. It had been passing for a while, asserting nothing. When it
   was made real it failed immediately — which is how the canonical-JSON defect
   was found. An assertion that cannot fail is worse than no assertion, because
   it occupies the space where a real one would go.
3. **Wrote a second assertion that was merely weak.** `expect(memberRoot).not.toContain(String(ordinal))`
   against a 64-character hex string — which will contain almost any digit by
   chance. Caught only because it failed on the first run.
4. **Broke the integration suite while fixing the runtime.** The first jsonb fix
   used `$n::jsonb`, which makes the driver double-encode into a JSON string
   scalar. Four tests went red before `$n::text::jsonb` proved correct. The
   verification was done afterwards rather than first.
5. **Shipped a layout defect into a page it had just built.** `.page-shell`
   reserved `60vh`, which is presence on a single-section page and a
   screen-height hole on `/status` once it stacked four. Found only by looking
   at the rendered page — after declaring the page done.
6. **Did not question the release matrix early enough.** Unit and integration
   suites ran under plain Node while the application runs in the Next.js server
   runtime. That gap is what hid six defects, including a completely dead
   authentication path. The instrument ran those green suites and reported
   progress before establishing that the e2e suite had never passed.

The pattern in 1, 4, 5 and 6 is the same: **preferring an elegant hypothesis to
a cheap check.** The defects were found in the end, but several were found
later and more expensively than they needed to be.

---

## What remains unproven

- **No real person has entered.** Every entry in every test was created by the
  build itself.
- **Nothing has been deployed** at the time this record was written. The
  application has never served a request it did not generate.
- **No backup exists.** The restore rehearsal passes against a local dump,
  which is a rehearsal of the mechanism, not of a backup.
- **No Fork Drill has been performed by a human.** The command works and its
  tamper detection is tested; nobody who is not the founder-steward has run it.
- **No anchor has left the database.** No paper deposit exists, so the archive
  is a capability rather than an archive.
- **Fifteen of sixteen launch gates are unmet**, and four of them wait on a
  named human who does not yet exist: a legal controller, an incident owner, a
  legal reviewer, a backup owner.

---

## Attribution

The instrument holds no place in the Founding Ledger, no ordinal, no vote and
no standing. Everything above is attributed to the principal, ordinal `000001`,
who is accountable for all of it — including the errors. "The agent did it" is
not available as a defence, and this record exists partly to make sure it never
becomes one.
