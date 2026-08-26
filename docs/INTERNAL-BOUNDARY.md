# What is not published, and why

**Status:** OPERATIVE
**Applies to:** this repository, from first publication

OURS builds its own software in public. The default is therefore **publish**,
and this document exists to keep the exceptions few, named and reviewable —
not to create a comfortable place to put things.

## Currently withheld: nothing

At first publication, **every document in this repository is public.** That
includes the ones an ordinary company would keep back: the data map listing
every field stored, the privacy notice with its seven unanswered questions,
the incident runbook, the launch gates showing one of sixteen met, and the
conformance results whether they pass or fail.

That is deliberate. A runbook is not a secret, and an institution whose
defence depends on nobody reading its operations documents does not have a
defence.

## `docs-internal/` — the only excluded path

`docs-internal/` is gitignored. It exists for material that **cannot** be
public without harming a specific person or breaking a legal obligation:

| Belongs there | Why |
|---|---|
| Integrity review case notes | An accusation about a named person, before and after review. `private.review_case` already holds this in the database; anything written down about a case belongs here too. |
| Support correspondence | Someone's email to us is theirs, not ours. |
| Unexecuted legal drafts | A draft succession instrument or membership instrument, before a lawyer has finished it. Publishing a half-written legal promise is worse than publishing nothing. |
| Vendor contracts and invoices | Counterparty terms we do not own. |
| Credentials, connection strings, key material | Never anywhere, but named here so the list is complete. |

Nothing else. In particular, these do **not** belong there:

- anything embarrassing about how the system works;
- a failing test, a failing conformance run, or a missed gate;
- a decision that turned out to be wrong;
- an unfinished feature, or a claim we have not earned yet.

Those are the substance of building in public. If the reason for moving a file
to `docs-internal/` is "it makes us look bad", the file stays where it is.

## Moving something out of public

Removing a published document is an act with a receipt, like any other. Name
what moved, which row of the table above justifies it, and who decided. A file
that quietly stops being public is indistinguishable from a file that was
never there.

## What the repository still never contains

Independently of this boundary, and enforced by `pnpm security:audit`:

- no `.env` file with values — `.env.example` documents names and shapes only;
- no captured email (`.email-capture/` is gitignored and holds usable
  magic-link URLs during local development);
- no database dump — a dump contains every private field in
  [DATA-MAP.md](./operations/DATA-MAP.md);
- no fork export checked in — regenerate with `pnpm fork export`.
