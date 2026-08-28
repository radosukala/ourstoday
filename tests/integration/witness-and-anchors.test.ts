import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestDatabase, fixtureVerifiedPerson, openGates } from "./helpers";

let teardown: () => Promise<void> = async () => {};

beforeAll(async () => {
  ({ teardown } = await setupTestDatabase());
  await openGates();
});

afterAll(async () => {
  await teardown();
  vi.resetModules();
});

const VERSIONS = {
  declaration: "ours-founding-declaration/0.2",
  constitution: "ours-founding-constitution/0.1",
  protocol: "ours.founding-relay/0.1",
  privacyNotice: "ours-privacy-notice-draft/0.1",
  legalStatus: "ours-legal-status/0.1",
};

async function seal(n: number, extra: Record<string, unknown> = {}) {
  const { sealEntry } = await import("@/ledger/seal");
  const person = await fixtureVerifiedPerson(n);
  return sealEntry({
    authUserId: person.authUserId,
    displayName: "Entrant " + n,
    acceptedVersions: VERSIONS,
    idempotencyKey: "wa-key-" + String(n).padStart(4, "0"),
    ...extra,
  });
}

describe("witness attestation", () => {
  it("records the edge, confers nothing, and leaves the witness untouched", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");

    const witness = await seal(1);
    const witnessed = await seal(2, { witnessOrdinal: witness.ordinal });

    expect(witnessed.witnessOrdinal).toBe(witness.ordinal);

    const rows = await rawQuery<{ witness_ordinal: number | null; ordinal: number }>(
      "SELECT ordinal, witness_ordinal FROM public.founding_ledger ORDER BY ordinal",
    );
    expect(rows.find((r) => r.ordinal === witnessed.ordinal)?.witness_ordinal).toBe(
      witness.ordinal,
    );

    // The attestation is its own event, so a reader building their own model of
    // the graph never has to parse entry payloads to find the edges.
    const events = await rawQuery<{ payload: Record<string, unknown> }>(
      "SELECT payload FROM ledger.event WHERE type = 'ledger.entry.witnessed'",
    );
    expect(events.length).toBe(1);
    expect(events[0]?.payload.witnessOrdinal).toBe(witness.ordinal);
    expect(events[0]?.payload.confers).toBe("NOTHING");

    // Being a witness creates no count, rank or standing anywhere. The witness
    // row is byte-identical to an entry nobody named.
    const unchanged = await rawQuery<{ lifecycle: string; display_state: string }>(
      "SELECT lifecycle, display_state FROM ledger.entry WHERE ordinal = $1",
      [witness.ordinal],
    );
    expect(unchanged[0]?.lifecycle).toBe("SEALED");
    expect(unchanged[0]?.display_state).toBe("PUBLIC");
  });

  it("lets an entrant who names no witness enter identically", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");
    const plain = await seal(3);
    expect(plain.witnessOrdinal).toBeUndefined();
    const rows = await rawQuery<{ witness_ordinal: number | null }>(
      "SELECT witness_ordinal FROM public.founding_ledger WHERE ordinal = $1",
      [plain.ordinal],
    );
    // A null witness is a null column, not a lesser status.
    expect(rows[0]?.witness_ordinal).toBeNull();
  });

  it("refuses a witness that does not exist", async () => {
    vi.resetModules();
    const { InvalidWitnessError } = await import("@/ledger/errors");
    await expect(seal(4, { witnessOrdinal: 999999 })).rejects.toBeInstanceOf(InvalidWitnessError);
  });

  it("publishes the graph's shape and never its edges as a dataset", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");
    const shape = await rawQuery<{ degree: number; entries_with_this_degree: number }>(
      "SELECT * FROM public.witness_shape",
    );
    // A degree distribution answers the Sybil-resistance question. An edge
    // list would answer "who knows whom", which is nobody's business.
    expect(shape.length).toBeGreaterThan(0);
    const columns = await rawQuery<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'witness_shape'",
    );
    expect(columns.map((c) => c.column_name).sort()).toEqual([
      "degree",
      "entries_with_this_degree",
    ]);
  });
});

describe("member root identifier", () => {
  it("is stable, derived, and never the ordinal", async () => {
    vi.resetModules();
    const { memberRootFor } = await import("@/ledger/member-root");
    const sealed = await seal(5);

    expect(sealed.memberRoot).toBe(memberRootFor(sealed.entryId));
    expect(sealed.memberRoot).toHaveLength(64);
    // Stable across calls, and different for a different entry.
    expect(memberRootFor(sealed.entryId)).toBe(memberRootFor(sealed.entryId));
    expect(memberRootFor(sealed.entryId)).not.toBe(memberRootFor(crypto.randomUUID()));
    // Derived from the PRIVATE entry id, never from the public ordinal, so a
    // stranger reading the front page cannot compute anyone else's root.
    expect(sealed.memberRoot).not.toBe(memberRootFor(String(sealed.ordinal)));
    expect(sealed.memberRoot).not.toBe(memberRootFor(String(sealed.ordinal).padStart(6, "0")));
  });
});

describe("anchors", () => {
  it("publishes a root that reproduces, and refuses a second, different root", async () => {
    vi.resetModules();
    const { publishAnchor, computeAnchor, computeAnchorForRange, AnchorError, periodLabelFor } =
      await import("@/ledger/anchor");
    const { rawQuery } = await import("@/db/sqltype");
    const label = periodLabelFor("DAILY", new Date());

    const published = await publishAnchor({ kind: "DAILY", label, actorLabel: "itest-steward" });
    expect(published.merkleRoot).toHaveLength(64);
    expect(published.alreadyPublished).toBe(false);

    // The root reproduces over the RANGE it committed to...
    const stored = await rawQuery<{ event_seq_from: string; event_seq_to: string }>(
      "SELECT event_seq_from::text AS event_seq_from, event_seq_to::text AS event_seq_to FROM ledger.anchor WHERE period_label = $1",
      [label],
    );
    const range = await computeAnchorForRange(
      Number(stored[0]?.event_seq_from),
      Number(stored[0]?.event_seq_to),
    );
    expect(range.merkleRoot).toBe(published.merkleRoot);

    // ...and NOT over the period, because publishing appended an event to that
    // very period. Verifying against the period would fail forever; this is why
    // the stored range is the thing a root commits to.
    const byPeriod = await computeAnchor("DAILY", label);
    expect(byPeriod.merkleRoot).not.toBe(published.merkleRoot);

    // Re-publishing is idempotent while the covered range still reproduces.
    const again = await publishAnchor({ kind: "DAILY", label, actorLabel: "itest-steward" });
    expect(again.alreadyPublished).toBe(true);
    expect(again.merkleRoot).toBe(published.merkleRoot);
    expect(AnchorError).toBeTruthy();
  });

  it("cannot be updated or deleted", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");
    await expect(rawQuery("UPDATE ledger.anchor SET merkle_root = 'x'")).rejects.toBeTruthy();
    await expect(rawQuery("DELETE FROM ledger.anchor")).rejects.toBeTruthy();
  });

  it("builds a root nobody can forge by reordering or duplicating a leaf", async () => {
    vi.resetModules();
    const { merkleRoot } = await import("@/ledger/anchor");
    const a = "a".repeat(64);
    const b = "b".repeat(64);
    const c = "c".repeat(64);

    expect(merkleRoot([])).toBeNull();
    expect(merkleRoot([a])).toBe(merkleRoot([a]));
    expect(merkleRoot([a, b])).not.toBe(merkleRoot([b, a]));
    // The classic duplicate-leaf ambiguity: an odd node is promoted, never
    // duplicated, so a three-leaf log cannot be forged as a four-leaf one.
    expect(merkleRoot([a, b, c])).not.toBe(merkleRoot([a, b, c, c]));
  });
});

describe("conformance", () => {
  it("passes on a healthy ledger and records the result", async () => {
    vi.resetModules();
    const { runAndRecordConformance } = await import("@/ledger/conformance");
    const { rawQuery } = await import("@/db/sqltype");

    const result = await runAndRecordConformance({ environment: "itest", commitRef: null });
    for (const check of result.checks) {
      expect(check.passed, check.id + ": " + check.detail).toBe(true);
    }
    expect(result.passed).toBe(true);

    const runs = await rawQuery<{ passed: boolean }>("SELECT passed FROM ledger.conformance_run");
    expect(runs.length).toBe(1);

    const events = await rawQuery<{ type: string }>(
      "SELECT type FROM ledger.event WHERE type LIKE 'conformance.%'",
    );
    expect(events.map((e) => e.type)).toEqual(["conformance.verified"]);
  });

  it("records a FAILING run rather than swallowing it", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");
    const { runAndRecordConformance } = await import("@/ledger/conformance");

    // Break an invariant the checks are supposed to notice: wind the allocator
    // back so it would hand out a number that already exists.
    await rawQuery("UPDATE ledger.ordinal_counter SET next_ordinal = 1 WHERE id = 1");
    try {
      const result = await runAndRecordConformance({ environment: "itest", commitRef: "deadbeef" });
      expect(result.passed).toBe(false);
      expect(result.checks.find((c) => c.id === "ordinal-never-reused")?.passed).toBe(false);

      // The point of the whole mechanism: the failure is IN the canonical log.
      const events = await rawQuery<{ type: string; payload: Record<string, unknown> }>(
        "SELECT type, payload FROM ledger.event WHERE type = 'conformance.failed'",
      );
      expect(events.length).toBe(1);
      expect(events[0]?.payload.failed).toContain("ordinal-never-reused");
    } finally {
      const max = await rawQuery<{ max: number }>("SELECT max(ordinal) AS max FROM ledger.entry");
      await rawQuery("UPDATE ledger.ordinal_counter SET next_ordinal = $1 WHERE id = 1", [
        Number(max[0]?.max ?? 1) + 1,
      ]);
    }
  });
});

describe("chain ordering past nine events", () => {
  it("reads the log in numeric sequence order, not lexicographic", async () => {
    vi.resetModules();
    const { rawQuery } = await import("@/db/sqltype");
    const { runConformanceChecks } = await import("@/ledger/conformance");

    const total = await rawQuery<{ count: string }>(
      "SELECT count(*)::text AS count FROM ledger.event",
    );
    // The bug this guards only appears past nine events, because that is when
    // lexicographic order first diverges: 1, 10, 2, 3. Earlier suites here have
    // already pushed the log well past it, but assert the precondition so this
    // test cannot quietly stop testing anything.
    expect(Number(total[0]?.count)).toBeGreaterThan(9);

    // `SELECT seq::text AS seq ... ORDER BY seq` resolves the ORDER BY to the
    // TEXT output column and reorders the chain. Prove the real query does not.
    const wrong = await rawQuery<{ seq: string }>(
      "SELECT seq::text AS seq FROM ledger.event ORDER BY seq ASC",
    );
    const right = await rawQuery<{ seq: string }>("SELECT seq FROM ledger.event ORDER BY seq ASC");
    const asNumbers = (rows: { seq: string }[]): number[] => rows.map((r) => Number(r.seq));
    expect(asNumbers(right)).toEqual([...asNumbers(right)].sort((a, b) => a - b));
    // The shadowed form really is broken; if PostgreSQL ever changed this, the
    // guard below would be testing nothing and we would want to know.
    expect(asNumbers(wrong)).not.toEqual(asNumbers(right));

    // And the chain check, which walks the log, still verifies end to end.
    const result = await runConformanceChecks();
    const chain = result.checks.find((c) => c.id === "digest-chain-intact");
    expect(chain?.passed, chain?.detail).toBe(true);
  });
});

describe("reserved event types", () => {
  it("cannot be appended to the canonical log", async () => {
    vi.resetModules();
    const { assertAppendable, isReservedEventType, RESERVED_EVENT_TYPES } =
      await import("@/ledger/events");
    for (const type of RESERVED_EVENT_TYPES) {
      expect(isReservedEventType(type)).toBe(true);
      // Reserving a name fixes the shape before there is money to be
      // embarrassed about. It must not quietly become a feature.
      expect(() => assertAppendable(type)).toThrow(/RESERVED/);
    }
    expect(() => assertAppendable("ledger.entry.sealed")).not.toThrow();
  });
});

describe("launch gates", () => {
  it("start open, refuse MET without evidence, and receipt every move", async () => {
    vi.resetModules();
    const { readGates, setGateState, GateError } = await import("@/ledger/gates");
    const { rawQuery } = await import("@/db/sqltype");

    const before = await readGates();
    expect(before.total).toBe(16);
    expect(before.met).toBe(0);
    expect(before.oldestOpen?.position).toBe(1);

    // A gate marked met on assertion alone is the Markdown checkbox again.
    await expect(
      setGateState({
        key: "atomic-entry-tests",
        state: "MET",
        actorLabel: "itest-steward",
        reason: "tests pass",
      }),
    ).rejects.toBeInstanceOf(GateError);

    const moved = await setGateState({
      key: "atomic-entry-tests",
      state: "MET",
      actorLabel: "itest-steward",
      reason: "concurrency and continuation suites pass on real PostgreSQL",
      evidenceUri: "/source/FOUNDING-LEDGER-BUILD-HANDOFF.md",
    });
    expect(moved.state).toBe("MET");

    const events = await rawQuery<{ payload: Record<string, unknown> }>(
      "SELECT payload FROM ledger.event WHERE type = 'ledger.gate.changed'",
    );
    expect(events.length).toBe(1);
    expect(events[0]?.payload.from).toBe("OPEN");
    expect(events[0]?.payload.to).toBe("MET");

    // A slip is a state, not an absence: it appends and it shows.
    await setGateState({
      key: "atomic-entry-tests",
      state: "SLIPPED",
      actorLabel: "itest-steward",
      reason: "a regression reopened this",
    });
    const after = await readGates();
    expect(after.slipped).toBe(1);
    expect(after.met).toBe(0);
  });
});
