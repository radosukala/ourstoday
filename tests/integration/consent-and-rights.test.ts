import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDatabase } from "./helpers";

let teardown: () => Promise<void> = async () => {};

beforeAll(async () => {
  ({ teardown } = await setupTestDatabase());
  process.env.ALLOW_CANONICAL_WRITES = "true";
  const { rawQuery } = await import("@/db/sqltype");
  await rawQuery("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");
});

afterAll(async () => {
  await teardown();
  vi.resetModules();
});

const VERSIONS = {
  declaration: "ours-founding-declaration/0.1",
  constitution: "ours-founding-constitution/0.1",
  protocol: "ours.founding-relay/0.1",
  privacyNotice: "ours-privacy-notice-draft/0.1",
  legalStatus: "ours-legal-status/0.1",
};

describe("consent is recorded with the entry", () => {
  it("writes the exact accepted versions inside the seal transaction", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const { rawQuery } = await import("@/db/sqltype");
    const person = await fixtureVerifiedPerson(1);

    const sealed = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Consent Giver",
      acceptedVersions: VERSIONS,
      idempotencyKey: "consent-key-001",
    });

    const rows = await rawQuery<{
      subject_type: string;
      subject_id: string;
      document_versions: Record<string, string>;
    }>(
      `SELECT c.subject_type, c.subject_id, c.document_versions
         FROM private.consent_record c
         JOIN private.person p ON p.id = c.person_id
        WHERE p.auth_user_id = $1`,
      [person.authUserId],
    );

    // Exactly one consent, bound to the entry that was actually created, and
    // carrying every version the person was shown - an export that returns an
    // empty consent list is not a lawful record of what they accepted.
    expect(rows.length).toBe(1);
    expect(rows[0]?.subject_type).toBe("ledger.entry");
    expect(rows[0]?.subject_id).toBe(sealed.entryId);
    expect(rows[0]?.document_versions).toEqual(VERSIONS);
  });

  it("leaves no consent behind when the seal is rejected", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");
    await rawQuery("UPDATE ledger.system_state SET mode = 'CLOSED' WHERE id = 1");

    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const person = await fixtureVerifiedPerson(2);

    await expect(
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Rejected Entrant",
        acceptedVersions: VERSIONS,
        idempotencyKey: "consent-key-002",
      }),
    ).rejects.toBeTruthy();

    const rows = await rawQuery<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM private.consent_record c
         JOIN private.person p ON p.id = c.person_id
        WHERE p.auth_user_id = $1`,
      [person.authUserId],
    );
    expect(rows[0]?.count).toBe("0");

    await rawQuery("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");
  });
});
