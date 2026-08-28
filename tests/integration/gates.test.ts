import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDatabase } from "./helpers";

let teardown: () => Promise<void> = async () => {};

beforeAll(async () => {
  ({ teardown } = await setupTestDatabase());
});

afterAll(async () => {
  await teardown();
  vi.resetModules();
});

describe("canonical write gates", () => {
  it("refuse to seal when both gates are closed (default)", async () => {
    process.env.ALLOW_CANONICAL_WRITES = "false";
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const person = await fixtureVerifiedPerson(1);
    await expect(
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Gate Tester",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.2",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "gate-test-key-1",
      }),
    ).rejects.toMatchObject({ mode: "CLOSED" });
  });

  it("refuse when only the environment gate is open", async () => {
    process.env.ALLOW_CANONICAL_WRITES = "true";
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const person = await fixtureVerifiedPerson(2);
    await expect(
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Env Only",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.2",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "gate-test-key-2",
      }),
    ).rejects.toMatchObject({ mode: "CLOSED" });
  });

  it("refuse when only the database gate is open", async () => {
    process.env.ALLOW_CANONICAL_WRITES = "false";
    const { rawQuery } = await import("@/db/sqltype");
    await rawQuery("UPDATE ledger.system_state SET mode = 'OPEN' WHERE id = 1");
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const person = await fixtureVerifiedPerson(3);
    await expect(
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Db Only",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.2",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "gate-test-key-3",
      }),
    ).rejects.toBeInstanceOf(Object);
  });
});
