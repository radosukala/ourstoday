
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDatabase } from "./helpers";

let teardown: () => Promise<void>;

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

describe("idempotent sealing", () => {
  it("returns the SAME entry for the same key and input", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const person = await fixtureVerifiedPerson(1);

    const first = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Idem Potent",
      acceptedVersions: {
          declaration: "ours-founding-declaration/0.1",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
      idempotencyKey: "same-key-001",
    });
    const second = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Idem Potent",
      acceptedVersions: {
          declaration: "ours-founding-declaration/0.1",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
      idempotencyKey: "same-key-001",
    });

    expect(second.ordinal).toBe(first.ordinal);
    expect(second.entryId).toBe(first.entryId);

    const { rawQuery } = await import("@/db/sqltype");
    const rows = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.entry WHERE ordinal IN ($1, $2)",
      [first.ordinal, second.ordinal],
    );
    expect(Number(rows[0]?.count ?? "0")).toBe(1);
  });

  it("conflicts when the same key carries different input", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { IdempotencyConflictError } = await import("@/ledger/errors");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const person = await fixtureVerifiedPerson(2);

    await sealEntry({
      authUserId: person.authUserId,
      displayName: "Original Name",
      acceptedVersions: {
          declaration: "ours-founding-declaration/0.1",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
      idempotencyKey: "conflict-key-1",
    });

    // Different person would violate one-entry-per-person; use the error path
    // by changing input on a fresh person whose FIRST attempt conflicts via
    // digest mismatch before the entry check.
    await expect(
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Different Name",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.1",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "conflict-key-1",
      }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it("rolls back the ordinal allocation when the transaction fails", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { rawQuery } = await import("@/db/sqltype");
    const { fixtureVerifiedPerson } = await import("./helpers");

    const before = await rawQuery<{ next_ordinal: number }>(
      "SELECT next_ordinal FROM ledger.ordinal_counter WHERE id = 1",
    );

    // Stale consent versions fail AFTER the counter row lock is acquired but
    // BEFORE any insert; the whole transaction must roll back.
    await expect(
      sealEntry({
        authUserId: (await fixtureVerifiedPerson(3)).authUserId,
        displayName: "Stale Consent",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.0",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "stale-key-1",
      }),
    ).rejects.toMatchObject({});

    const after = await rawQuery<{ next_ordinal: number }>(
      "SELECT next_ordinal FROM ledger.ordinal_counter WHERE id = 1",
    );
    expect(after[0]?.next_ordinal).toBe(before[0]?.next_ordinal);
  });
});

