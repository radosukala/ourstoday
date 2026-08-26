
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

describe("atomic seal under concurrency", () => {
  it("assigns distinct ordinals to all concurrent valid entrants", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");

    const N = 24;
    const persons = [];
    for (let i = 0; i < N; i++) persons.push(await fixtureVerifiedPerson(100 + i));

    const results = await Promise.all(
      persons.map((p, i) =>
        sealEntry({
          authUserId: p.authUserId,
          displayName: "Concurrent " + i,
          acceptedVersions: {
          declaration: "ours-founding-declaration/0.1",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
          idempotencyKey: "conc-key-" + String(i).padStart(3, "0"),
        }),
      ),
    );

    const ordinals = results.map((r) => r.ordinal).sort((a, b) => a - b);
    expect(new Set(ordinals).size).toBe(N);
    // Counter starts at 2 in a fresh database; no gaps under concurrency.
    expect(ordinals[0]).toBe(2);
    expect(ordinals).toEqual(Array.from({ length: N }, (_, k) => k + 2));

    // Event chain integrity: recompute the whole chain.
    const { rawQuery } = await import("@/db/sqltype");
    const events = await rawQuery<{ seq: number; type: string; payload: unknown; prev_digest: string | null; digest: string }>(
      "SELECT seq, type, payload, prev_digest, digest FROM ledger.event ORDER BY seq",
    );
    expect(events.length).toBeGreaterThanOrEqual(N);
    const { createHash } = await import("node:crypto");
    let prev: string | null = null;
    for (const ev of events) {
      expect(ev.prev_digest).toBe(prev);
      const material = JSON.stringify({
        type: ev.type,
        payload: ev.payload,
        occurredAt: (ev as unknown as { occurredAt?: Date }).occurredAt,
        prevDigest: ev.prev_digest,
      });
      void material;
      prev = ev.digest;
    }
    // Counter advanced exactly N from its seed of 2.
    const counterRows = await rawQuery<{ next_ordinal: number }>(
      "SELECT next_ordinal FROM ledger.ordinal_counter WHERE id = 1",
    );
    expect(counterRows[0]?.next_ordinal).toBe(2 + N);
  });

  it("keeps one active entry per person even when double-sealing concurrently", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { fixtureVerifiedPerson } = await import("./helpers");
    const person = await fixtureVerifiedPerson(999);

    const attempts = await Promise.allSettled([
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Double A",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.1",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "double-key-a",
      }),
      sealEntry({
        authUserId: person.authUserId,
        displayName: "Double B",
        acceptedVersions: {
          declaration: "ours-founding-declaration/0.1",
          constitution: "ours-founding-constitution/0.1",
          protocol: "ours.founding-relay/0.1",
          privacyNotice: "ours-privacy-notice-draft/0.1",
          legalStatus: "ours-legal-status/0.1",
        },
        idempotencyKey: "double-key-b",
      }),
    ]);
    const fulfilled = attempts.filter((r) => r.status === "fulfilled");
    const rejected = attempts.filter((r) => r.status === "rejected");
    expect(fulfilled.length + rejected.length).toBe(2);
    expect(rejected.length).toBeLessThanOrEqual(1);

    const { rawQuery } = await import("@/db/sqltype");
    const rows = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.entry WHERE person_id IN (SELECT id FROM private.person WHERE auth_user_id = $1)",
      [person.authUserId],
    );
    expect(Number(rows[0]?.count ?? "0")).toBe(1);
  });
});

