import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDatabase, fixtureVerifiedPerson } from "./helpers";

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

async function seal(seed: number, noticeSlugs?: string[]) {
  vi.resetModules();
  const { sealEntry } = await import("@/ledger/seal");
  const person = await fixtureVerifiedPerson(seed);
  return sealEntry({
    authUserId: person.authUserId,
    displayName: "Notice Giver " + String(seed),
    acceptedVersions: VERSIONS,
    idempotencyKey: "notice-key-" + String(seed),
    ...(noticeSlugs ? { noticeSlugs } : {}),
  });
}

describe("notices are sealed with the entry", () => {
  it("records the notice in the same transaction and counts it on the board", async () => {
    const sealed = await seal(900, ["professional-network", "app-store"]);
    const { readMissionBoard, readNoticeRecord } = await import("@/ledger/missions");

    const board = await readMissionBoard();
    const byslug = new Map(board.map((m) => [m.slug, m.noticeCount]));
    expect(byslug.get("professional-network")).toBe(1);
    expect(byslug.get("app-store")).toBe(1);
    expect(byslug.get("the-ride")).toBe(0);

    const record = await readNoticeRecord();
    const mine = record.filter((r) => r.ordinal === sealed.ordinal);
    expect(mine.map((r) => r.missionSlug).sort()).toEqual(["app-store", "professional-network"]);
  });

  it("appends one PUBLIC notice.given event naming the missions", async () => {
    const sealed = await seal(901, ["the-ride"]);
    const { rawQuery } = await import("@/db/sqltype");
    const events = await rawQuery<{
      privacy_class: string;
      payload: { missions: string[]; ordinal: number };
    }>(
      "SELECT privacy_class, payload FROM ledger.event WHERE type = 'notice.given' AND subject_ref = $1",
      [sealed.entryId],
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.privacy_class).toBe("PUBLIC");
    expect(events[0]!.payload.missions).toEqual(["the-ride"]);
    expect(events[0]!.payload.ordinal).toBe(sealed.ordinal);
  });

  it("still seals a place when the selection is empty or unknown", async () => {
    // A stale or hostile form must never cost someone the entry they came to
    // make: unknown slugs are dropped, and the entry is unaffected.
    const none = await seal(902);
    expect(none.ordinal).toBeGreaterThan(0);

    const bogus = await seal(903, ["not-a-real-mission", "another-fake"]);
    expect(bogus.ordinal).toBeGreaterThan(0);

    const { rawQuery } = await import("@/db/sqltype");
    const notices = await rawQuery<{ count: string }>(
      "SELECT count(*) AS count FROM ledger.notice WHERE entry_id = ANY($1)",
      [[none.entryId, bogus.entryId]],
    );
    expect(Number(notices[0]!.count)).toBe(0);

    const events = await rawQuery<{ count: string }>(
      "SELECT count(*) AS count FROM ledger.event WHERE type = 'notice.given' AND subject_ref = ANY($1)",
      [[none.entryId, bogus.entryId]],
    );
    expect(Number(events[0]!.count)).toBe(0);
  });

  it("cannot record the same person twice on one mission", async () => {
    const sealed = await seal(904, ["the-stream", "the-stream"]);
    const { rawQuery } = await import("@/db/sqltype");
    const rows = await rawQuery<{ count: string }>(
      "SELECT count(*) AS count FROM ledger.notice WHERE entry_id = $1",
      [sealed.entryId],
    );
    expect(Number(rows[0]!.count)).toBe(1);
  });

  it("records an authenticated target choice after the place is already safe", async () => {
    vi.resetModules();
    const { sealEntry } = await import("@/ledger/seal");
    const { giveNotices } = await import("@/ledger/missions");
    const { rawQuery } = await import("@/db/sqltype");
    const person = await fixtureVerifiedPerson(905);
    const sealed = await sealEntry({
      authUserId: person.authUserId,
      displayName: "Post Entry Notice",
      acceptedVersions: VERSIONS,
      idempotencyKey: "post-entry-seal",
    });

    const result = await giveNotices({
      authUserId: person.authUserId,
      noticeSlugs: ["professional-network", "the-stream"],
      idempotencyKey: "post-entry-notice",
    });
    expect(result.ordinal).toBe(sealed.ordinal);
    expect(result.givenSlugs.sort()).toEqual(["professional-network", "the-stream"]);

    // A transport retry returns the same result and creates no second notice.
    const replay = await giveNotices({
      authUserId: person.authUserId,
      noticeSlugs: ["the-stream", "professional-network"],
      idempotencyKey: "post-entry-notice",
    });
    expect(replay).toEqual(result);

    const rows = await rawQuery<{ notices: string; events: string }>(
      `SELECT
         (SELECT count(*)::text FROM ledger.notice WHERE entry_id = $1) AS notices,
         (SELECT count(*)::text FROM ledger.event WHERE subject_ref = $1::text AND type = 'notice.given') AS events`,
      [sealed.entryId],
    );
    expect(rows[0]).toEqual({ notices: "2", events: "1" });
  });
});
