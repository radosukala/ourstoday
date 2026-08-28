import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fixtureVerifiedPerson, setupTestDatabase } from "./helpers";

let teardown: () => Promise<void>;

const VERSIONS = {
  declaration: "ours-founding-declaration/0.2",
  constitution: "ours-founding-constitution/0.1",
  protocol: "ours.founding-relay/0.1",
  privacyNotice: "ours-privacy-notice-draft/0.1",
  legalStatus: "ours-legal-status/0.1",
};

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

describe("the Founding Million hard ceiling", () => {
  it("issues #1,000,000 with the right, then rejects every later seal", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");
    const { sealEntry } = await import("@/ledger/seal");
    const { FoundingEraFullError } = await import("@/ledger/errors");

    await rawQuery("UPDATE ledger.ordinal_counter SET next_ordinal = 1000000 WHERE id = 1");

    const lastPerson = await fixtureVerifiedPerson(990);
    const last = await sealEntry({
      authUserId: lastPerson.authUserId,
      displayName: "Last Founding Place",
      acceptedVersions: VERSIONS,
      idempotencyKey: "founding-million-last",
    });

    expect(last.ordinal).toBe(1_000_000);
    expect(last.foundingRightVersion).toBe("ours-founding-right/0.1");

    const stored = await rawQuery<{ founding_right_version: string }>(
      "SELECT founding_right_version FROM ledger.entry WHERE id = $1",
      [last.entryId],
    );
    expect(stored[0]?.founding_right_version).toBe("ours-founding-right/0.1");

    const tooLate = await fixtureVerifiedPerson(991);
    await expect(
      sealEntry({
        authUserId: tooLate.authUserId,
        displayName: "Too Late",
        acceptedVersions: VERSIONS,
        idempotencyKey: "founding-million-too-late",
      }),
    ).rejects.toBeInstanceOf(FoundingEraFullError);

    const counter = await rawQuery<{ next_ordinal: number }>(
      "SELECT next_ordinal FROM ledger.ordinal_counter WHERE id = 1",
    );
    expect(counter[0]?.next_ordinal).toBe(1_000_001);

    const rejectedEntries = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.entry WHERE ordinal > 1000000",
    );
    expect(rejectedEntries[0]?.count).toBe("0");
  });
});
