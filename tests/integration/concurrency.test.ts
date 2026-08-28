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
            declaration: "ours-founding-declaration/0.2",
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
    // An UNSEEDED database issues #000001 first. This is not cosmetic: the
    // allocator used to start at 2 because the local seed writes the declared
    // origin as #000001, and a production database that never runs that seed
    // therefore skipped #000001 entirely and gave its first entrant #000002.
    // That happened on ourstoday.com. Assert the starting point, not a
    // remembered constant.
    expect(ordinals[0]).toBe(1);
    // Contiguous: allocation under concurrency leaves no gaps.
    expect(ordinals).toEqual(Array.from({ length: N }, (_, k) => k + 1));

    // Event chain integrity: recompute the whole chain.
    const { rawQuery } = await import("@/db/sqltype");
    const events = await rawQuery<{
      seq: number;
      type: string;
      occurred_at: Date | string;
      payload: Record<string, unknown>;
      prev_digest: string | null;
      digest: string;
    }>(
      "SELECT seq, type, occurred_at, payload, prev_digest, digest FROM ledger.event ORDER BY seq",
    );
    expect(events.length).toBeGreaterThanOrEqual(N);
    const { digestEvent } = await import("@/ledger/events");
    let prev: string | null = null;
    for (const ev of events) {
      expect(ev.prev_digest).toBe(prev);
      // Recompute the digest FROM THE STORED ROW. This only works because the
      // material is canonical JSON: PostgreSQL jsonb reorders keys, so an
      // order-dependent digest would be unverifiable after a restore.
      const occurredAt = ev.occurred_at;
      expect(
        digestEvent({
          type: ev.type,
          payload: ev.payload,
          occurredAt: occurredAt instanceof Date ? occurredAt : new Date(occurredAt),
          prevDigest: ev.prev_digest,
        }),
      ).toBe(ev.digest);
      prev = ev.digest;
    }
    // The allocator advanced exactly N and points one past the highest issued
    // ordinal, so no future seal can collide with one already handed out.
    const counterRows = await rawQuery<{ next_ordinal: number }>(
      "SELECT next_ordinal FROM ledger.ordinal_counter WHERE id = 1",
    );
    expect(counterRows[0]?.next_ordinal).toBe(1 + N);
    expect(counterRows[0]?.next_ordinal).toBe(Math.max(...ordinals) + 1);
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
          declaration: "ours-founding-declaration/0.2",
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
          declaration: "ours-founding-declaration/0.2",
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
