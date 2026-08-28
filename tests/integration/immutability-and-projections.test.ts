import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDatabase } from "./helpers";

let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ teardown } = await setupTestDatabase());
});

afterAll(async () => {
  await teardown();
  vi.resetModules();
});

describe("append-only canonical events", () => {
  it("reject UPDATE and DELETE at the database level", async () => {
    const { rawQuery } = await import("@/db/sqltype");
    // Seed one event directly.
    await rawQuery(
      "INSERT INTO ledger.event (id, type, schema_version, actor_type, subject_type, subject_ref, privacy_class, payload, digest) VALUES ($1, 'ledger.entry.sealed', 'ours.founding-relay/0.1', 'SYSTEM', 'test', 't', 'PUBLIC', '{}', 'd')",
      [crypto.randomUUID()],
    );
    const seqRow = await rawQuery<{ seq: number }>("SELECT min(seq)::int AS seq FROM ledger.event");
    const seq = seqRow[0]?.seq as number;

    await expect(
      rawQuery("UPDATE ledger.event SET type = 'tampered' WHERE seq = $1", [seq]),
    ).rejects.toThrow(/append-only/i);
    await expect(rawQuery("DELETE FROM ledger.event WHERE seq = $1", [seq])).rejects.toThrow(
      /append-only/i,
    );
  });
});

describe("safe public projections", () => {
  it("expose only allowlisted columns and never private data", async () => {
    const { rawQuery } = await import("@/db/sqltype");

    const columns = await rawQuery<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'founding_ledger' ORDER BY ordinal_position",
    );
    const names = columns.map((c) => c.column_name).sort();
    expect(names).toEqual([
      "declaration_version",
      "display_name",
      "entered_at",
      "first_continuation_ordinal",
      "legal_membership_status",
      "ordinal",
      "origin_kind",
      "predecessor_ordinal",
      "protocol_version",
      "public_status",
      "relay_state",
      "witness_ordinal",
    ]);

    // Word-safe private fragments (bare "ip" would false-positive on
    // "legal_membership_status").
    for (const forbidden of [
      "email",
      "auth_user_id",
      "person_id",
      "token",
      "session",
      "addr",
      "_ip_",
      "jti",
    ]) {
      expect(names.some((n) => n.includes(forbidden))).toBe(false);
    }

    // Participation is aggregate BY CONSTRUCTION. If a per-person column ever
    // appears in it, the thing stops being a count of what happened and
    // becomes a measurement of individuals.
    const participation = await rawQuery<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('participation_totals', 'participation_daily')",
    );
    for (const row of participation) {
      expect(row.column_name).not.toMatch(/ordinal|display_name|person|entry_id|email|ip|agent/i);
    }

    // Every public view, not just this one: a new projection is precisely
    // where a private column arrives without anyone deciding to publish it.
    const allPublic = await rawQuery<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'",
    );
    for (const row of allPublic) {
      for (const forbidden of [
        "email",
        "auth_user_id",
        "person_id",
        "token",
        "session",
        "addr",
        "_ip_",
        "jti",
        "digest_of",
        "risk",
      ]) {
        expect(
          row.column_name.includes(forbidden),
          row.table_name + "." + row.column_name + " looks private",
        ).toBe(false);
      }
    }

    const statusColumns = await rawQuery<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'system_status'",
    );
    const statusNames = statusColumns.map((c) => c.column_name);
    for (const required of ["mode", "entry_count", "withdrawn_count"]) {
      expect(statusNames).toContain(required);
    }
  });

  it("renders withdrawn entries as tombstones without leaking the name", async () => {
    process.env.ALLOW_CANONICAL_WRITES = "true";
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson, openGates } = await import("./helpers");
    void openGates;
    const { rawQuery } = await import("@/db/sqltype");
    await rawQuery("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");

    const person = await fixtureVerifiedPerson(700);
    const sealed = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Vanishing Person",
      acceptedVersions: {
        declaration: "ours-founding-declaration/0.2",
        constitution: "ours-founding-constitution/0.1",
        protocol: "ours.founding-relay/0.1",
        privacyNotice: "ours-privacy-notice-draft/0.1",
        legalStatus: "ours-legal-status/0.1",
      },
      idempotencyKey: "tomb-key-" + Math.random().toString(36).slice(2),
    });

    // Steward-approved withdrawal resolution (same transaction semantics).
    const reqRows = await rawQuery<{ id: string }>(
      "INSERT INTO private.withdrawal_request (person_id, subject_ordinal, reason_code) VALUES ((SELECT id FROM private.person WHERE auth_user_id = $1), $2, 'PERSONAL_CHOICE') RETURNING id",
      [person.authUserId, sealed.ordinal],
    );
    const { resolveWithdrawalRequest } = await import("@/ledger/steward");
    await resolveWithdrawalRequest({
      requestId: reqRows[0]!.id,
      actorLabel: "itest-steward",
      approve: true,
    });

    const view = await rawQuery<{ display_name: string | null; public_status: string }>(
      "SELECT display_name, public_status FROM public.founding_ledger WHERE ordinal = $1",
      [sealed.ordinal],
    );
    expect(view[0]?.display_name).toBeNull();
    expect(view[0]?.public_status).toBe("WITHDRAWN");

    // The next entrant receives a NEW ordinal; the retired one is never reused.
    const nextPerson = await fixtureVerifiedPerson(701);
    const nextSeal = await sealEntry({
      authUserId: nextPerson.authUserId,
      displayName: "After Withdrawal",
      acceptedVersions: {
        declaration: "ours-founding-declaration/0.2",
        constitution: "ours-founding-constitution/0.1",
        protocol: "ours.founding-relay/0.1",
        privacyNotice: "ours-privacy-notice-draft/0.1",
        legalStatus: "ours-legal-status/0.1",
      },
      idempotencyKey: "after-tomb-" + Math.random().toString(36).slice(2),
    });
    expect(nextSeal.ordinal).toBeGreaterThan(sealed.ordinal);

    // Withdrawal receipt event exists in canonical history.
    const events = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.event WHERE type = 'ledger.entry.withdrawn' AND payload->>'ordinal' = $1",
      [String(sealed.ordinal)],
    );
    expect(Number(events[0]?.count ?? "0")).toBe(1);
  });

  it("applies approved corrections through a receipted event", async () => {
    process.env.ALLOW_CANONICAL_WRITES = "true";
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const { rawQuery } = await import("@/db/sqltype");
    await rawQuery("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");

    const person = await fixtureVerifiedPerson(800);
    const sealed = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Typo Namee",
      acceptedVersions: {
        declaration: "ours-founding-declaration/0.2",
        constitution: "ours-founding-constitution/0.1",
        protocol: "ours.founding-relay/0.1",
        privacyNotice: "ours-privacy-notice-draft/0.1",
        legalStatus: "ours-legal-status/0.1",
      },
      idempotencyKey: "corr-key-" + Math.random().toString(36).slice(2),
    });

    const req = await rawQuery<{ id: string }>(
      "INSERT INTO private.correction_request (person_id, subject_ordinal, proposed_display_name) VALUES ((SELECT id FROM private.person WHERE auth_user_id = $1), $2, 'Correct Name') RETURNING id",
      [person.authUserId, sealed.ordinal],
    );
    const { resolveCorrectionRequest } = await import("@/ledger/steward");
    const result = await resolveCorrectionRequest({
      requestId: req[0]!.id,
      actorLabel: "itest-steward",
      approve: true,
    });
    expect(result.requestState).toBe("APPROVED");

    const view = await rawQuery<{ display_name: string | null }>(
      "SELECT display_name FROM public.founding_ledger WHERE ordinal = $1",
      [sealed.ordinal],
    );
    expect(view[0]?.display_name).toBe("Correct Name");

    const events = await rawQuery<{ payload: { previousName?: string; newName?: string } }>(
      "SELECT payload FROM ledger.event WHERE type = 'ledger.entry.corrected' ORDER BY seq DESC LIMIT 1",
    );
    expect(events[0]?.payload.previousName).toBe("Typo Namee");
    expect(events[0]?.payload.newName).toBe("Correct Name");
  });

  it("voids reviewed-invalid entries and retires the ordinal", async () => {
    process.env.ALLOW_CANONICAL_WRITES = "true";
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const { openReviewCase, voidEntryAfterReview } = await import("@/ledger/steward");
    const { rawQuery } = await import("@/db/sqltype");
    await rawQuery("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");

    const person = await fixtureVerifiedPerson(900);
    const sealed = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Bad Actor",
      acceptedVersions: {
        declaration: "ours-founding-declaration/0.2",
        constitution: "ours-founding-constitution/0.1",
        protocol: "ours.founding-relay/0.1",
        privacyNotice: "ours-privacy-notice-draft/0.1",
        legalStatus: "ours-legal-status/0.1",
      },
      idempotencyKey: "void-key-" + Math.random().toString(36).slice(2),
    });

    const caseId = await openReviewCase({
      kind: "DUPLICATE_SELF_REFERRAL",
      subjectOrdinal: sealed.ordinal,
      openedByActor: "itest-steward",
      openedReason: "Pattern matches self-referral abuse.",
    });
    await voidEntryAfterReview({
      ordinal: sealed.ordinal,
      caseId,
      actorLabel: "itest-steward",
      reason: "Confirmed integrity violation.",
    });

    const view = await rawQuery<{ display_name: string | null; public_status: string }>(
      "SELECT display_name, public_status FROM public.founding_ledger WHERE ordinal = $1",
      [sealed.ordinal],
    );
    expect(view[0]?.display_name).toBeNull();
    expect(view[0]?.public_status).toBe("WITHDRAWN");

    // The person may not seal again while voided rows exist is NOT required -
    // but one-active-per-person still holds against their non-voided rows.
    const activeRows = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.entry WHERE person_id = (SELECT id FROM private.person WHERE auth_user_id = $1) AND lifecycle <> 'VOIDED'",
      [person.authUserId],
    );
    expect(Number(activeRows[0]?.count ?? "0")).toBe(0);

    const voidEvents = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.event WHERE type = 'ledger.entry.voided' AND payload->>'ordinal' = $1",
      [String(sealed.ordinal)],
    );
    expect(Number(voidEvents[0]?.count ?? "0")).toBe(1);
  });
});
