import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDatabase, fixtureVerifiedPerson } from "./helpers";
import { sha256Hex } from "@/security/digest";

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

async function sealPredecessor(label: string): Promise<{
  entryId: string;
  relayRecordId: string;
  ordinal: number;
}> {
  vi.resetModules();
  const { sealEntry } = await import("@/ledger/seal");
  const { rawQuery } = await import("@/db/sqltype");
  const person = await fixtureVerifiedPerson(1);
  void label;
  const sealed = await sealEntry({
    authUserId: person.authUserId,
    displayName: "Relay Owner",
    acceptedVersions: {
      declaration: "ours-founding-declaration/0.2",
      constitution: "ours-founding-constitution/0.1",
      protocol: "ours.founding-relay/0.1",
      privacyNotice: "ours-privacy-notice-draft/0.1",
      legalStatus: "ours-legal-status/0.1",
    },
    idempotencyKey: "pred-key-" + Math.random().toString(36).slice(2),
  });
  const jtiDigest = sha256Hex("itest-jti-" + sealed.entryId);
  const rec = await rawQuery<{ id: string }>(
    "INSERT INTO private.relay_token_record (jti_digest, predecessor_entry_id, signing_key_version) VALUES ($1, $2, 1) RETURNING id",
    [jtiDigest, sealed.entryId],
  );
  return { entryId: sealed.entryId, relayRecordId: rec[0]!.id, ordinal: sealed.ordinal };
}

describe("relay attribution and the First Continuation race", () => {
  it("crowns exactly ONE First Continuation among many concurrent successors", async () => {
    const pred = await sealPredecessor("fc");
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");

    const N = 25;
    const persons = [];
    for (let i = 0; i < N; i++) persons.push(await fixtureVerifiedPerson(200 + i));

    const results = await Promise.all(
      persons.map((p, i) =>
        sealEntry({
          authUserId: p.authUserId,
          displayName: "Successor " + i,
          acceptedVersions: {
            declaration: "ours-founding-declaration/0.2",
            constitution: "ours-founding-constitution/0.1",
            protocol: "ours.founding-relay/0.1",
            privacyNotice: "ours-privacy-notice-draft/0.1",
            legalStatus: "ours-legal-status/0.1",
          },
          idempotencyKey: "succ-key-" + String(i).padStart(3, "0"),
          predecessor: { entryId: pred.entryId, relayRecordId: pred.relayRecordId },
        }),
      ),
    );

    // All successors entered with distinct ordinals.
    const ordinals = results.map((r) => r.ordinal);
    expect(new Set(ordinals).size).toBe(N);

    // Every successor records the lineage it arrived through...
    expect(results.every((r) => r.predecessorOrdinal === pred.ordinal)).toBe(true);
    // ...but exactly one of them wins the First Continuation.
    const fcs = results.filter((r) => r.isFirstContinuation);
    expect(fcs.length).toBe(1);
    expect(fcs[0]?.ordinal).not.toBe(pred.ordinal);
    // Losing the race costs a successor nothing: they still hold their place.
    expect(results.filter((r) => !r.isFirstContinuation).length).toBe(N - 1);

    const { rawQuery } = await import("@/db/sqltype");
    const fcRows = await rawQuery<{ successor_entry_id: string; predecessor_entry_id: string }>(
      "SELECT successor_entry_id, predecessor_entry_id FROM ledger.first_continuation WHERE predecessor_entry_id = $1",
      [pred.entryId],
    );
    expect(fcRows.length).toBe(1);

    // Every arrival recorded exactly once.
    const arrivalRows = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.relay_arrival WHERE predecessor_entry_id = $1",
      [pred.entryId],
    );
    expect(Number(arrivalRows[0]?.count ?? "0")).toBe(N);

    // Public projection reflects CONTINUED state and FC ordinal.
    const viewRows = await rawQuery<{
      relay_state: string;
      first_continuation_ordinal: number | null;
    }>(
      "SELECT relay_state, first_continuation_ordinal FROM public.founding_ledger WHERE ordinal = $1",
      [pred.ordinal],
    );
    expect(viewRows[0]?.relay_state).toBe("CONTINUED");
    expect(viewRows[0]?.first_continuation_ordinal).toBe(fcs[0]?.ordinal);
  });

  it("blocks a person from continuing their own line", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson, openGates } = await import("./helpers");
    void openGates;
    const person = await fixtureVerifiedPerson(500);

    const sealed = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Self Referencer",
      acceptedVersions: {
        declaration: "ours-founding-declaration/0.2",
        constitution: "ours-founding-constitution/0.1",
        protocol: "ours.founding-relay/0.1",
        privacyNotice: "ours-privacy-notice-draft/0.1",
        legalStatus: "ours-legal-status/0.1",
      },
      idempotencyKey: "self-key-" + Math.random().toString(36).slice(2),
    });
    const { rawQuery } = await import("@/db/sqltype");
    const rec = await rawQuery<{ id: string }>(
      "INSERT INTO private.relay_token_record (jti_digest, predecessor_entry_id, signing_key_version) VALUES ($1, $2, 1) RETURNING id",
      [sha256Hex("self-jti-" + sealed.entryId), sealed.entryId],
    );

    await expect(
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Second Attempt",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.2",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "self-key-2-" + Math.random().toString(36).slice(2),
        predecessor: { entryId: sealed.entryId, relayRecordId: rec[0]!.id },
      }),
    ).rejects.toMatchObject({});
  });
});
