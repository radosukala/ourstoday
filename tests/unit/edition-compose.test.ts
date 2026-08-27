import { describe, expect, it } from "vitest";
import {
  buildCardAltText,
  buildLinkedInPost,
  buildXPost,
  composeEdition,
  DAY_ONE_UTC,
  editionDateLabel,
  editionDayNumber,
  formatOrdinal,
  type EditionInputs,
} from "@/edition/compose";
import { assertNoForbiddenClaims, LOCK_LINE, STATUS_LINE } from "@/legal/documents";

function fullInputs(overrides: Partial<EditionInputs> = {}): EditionInputs {
  return {
    dateUtc: "2026-08-27",
    totals: { entries: 3 },
    today: { entries: 1, arrivedThroughRelay: 1, witnessed: 0 },
    newestEntry: { ordinal: 3, displayName: "ol1ver", publicStatus: "SEALED" },
    gates: { met: 0, total: 16 },
    ledger: { state: "OPEN", canAcceptEntries: true },
    builtEvents: [{ type: "anchor.published", payload: {} }],
    ...overrides,
  };
}

describe("edition chronology", () => {
  it("counts days from Day 1 inclusively", () => {
    expect(editionDayNumber(DAY_ONE_UTC)).toBe(1);
    expect(editionDayNumber("2026-08-27")).toBe(2);
    expect(editionDayNumber("2026-09-26")).toBe(32);
  });

  it("refuses a date before Day 1 instead of inventing an edition", () => {
    expect(() => editionDayNumber("2026-08-25")).toThrow(/Day 1/);
  });

  it("labels dates in the masthead form and ordinals in the ledger form", () => {
    expect(editionDateLabel("2026-08-27")).toBe("27 AUG 2026");
    expect(formatOrdinal(3)).toBe("#000003");
  });
});

describe("edition lines", () => {
  it("reports formation with exact counts and the entry gate", () => {
    const edition = composeEdition(fullInputs());
    expect(edition.formed).toBe(
      "1 entered, 1 through a relay. Newest place #000003 · ol1ver. 3 people in the ledger. Entry is open.",
    );
  });

  it("says plainly when nobody entered", () => {
    const edition = composeEdition(
      fullInputs({ today: { entries: 0, arrivedThroughRelay: 0, witnessed: 0 } }),
    );
    expect(edition.formed).toContain("No new entries.");
    expect(edition.formed).toContain("3 people in the ledger.");
  });

  it("never invents a number when a projection is unavailable", () => {
    const edition = composeEdition(
      fullInputs({ totals: null, today: null, newestEntry: null, builtEvents: null }),
    );
    expect(edition.formed).toBe("Unavailable in this environment.");
    expect(edition.built).toBe("Unavailable in this environment.");
    expect(edition.formed).not.toMatch(/\d/);
  });

  it("does not attach a display name to an unsealed newest place", () => {
    const edition = composeEdition(
      fullInputs({
        newestEntry: { ordinal: 4, displayName: "gone", publicStatus: "WITHDRAWN" },
      }),
    );
    expect(edition.formed).toContain("#000004");
    expect(edition.formed).not.toContain("gone");
  });

  it("keeps NOT YET about legal membership in every state", () => {
    expect(composeEdition(fullInputs()).notYet).toBe(
      "Legal membership. 16 of 16 launch gates open.",
    );
    expect(composeEdition(fullInputs({ gates: { met: 12, total: 16 } })).notYet).toBe(
      "Legal membership. 4 of 16 launch gates open.",
    );
    expect(composeEdition(fullInputs({ gates: null })).notYet).toBe(
      "Legal membership. Gate state unavailable.",
    );
  });

  it("summarizes receipts and admits quiet days", () => {
    expect(composeEdition(fullInputs({ builtEvents: [] })).built).toBe("No new receipts today.");
    const busy = composeEdition(
      fullInputs({
        builtEvents: [
          { type: "build.deployed", payload: { commit: "abcdef1234" } },
          { type: "conformance.failed", payload: {} },
          { type: "ledger.gate.changed", payload: { title: "Backups restore" } },
        ],
      }),
    );
    expect(busy.built).toBe(
      "New build deployed (abcdef1). Conformance run: FAIL, published anyway. +1 more receipt.",
    );
  });
});

describe("share language", () => {
  it("carries the lock, the day and the canonical address", () => {
    const edition = composeEdition(fullInputs());
    const x = buildXPost(edition);
    expect(x).toContain("OURS TODAY — DAY 2");
    expect(x).toContain(LOCK_LINE);
    expect(x).toContain("ourstoday.com/today");
    expect(buildLinkedInPost(edition)).toContain("edit before posting");
  });

  it("pins the status line and never claims issued membership", () => {
    const edition = composeEdition(fullInputs());
    expect(edition.statusLine).toBe(STATUS_LINE);
    // The scanner's substrings target affirmative claims; the only "legal
    // member..." text an edition may carry is the NOT YET disclosure itself.
    for (const text of [buildXPost(edition), buildLinkedInPost(edition)]) {
      expect(text).toContain("NOT YET — Legal membership.");
      expect(assertNoForbiddenClaims(text.replace(/Legal membership\./g, ""))).toEqual([]);
    }
    expect(buildCardAltText(edition)).toContain(STATUS_LINE);
  });

  it("keeps card alt text inside X's 1,000 character limit", () => {
    const edition = composeEdition(fullInputs());
    expect(buildCardAltText(edition).length).toBeLessThanOrEqual(1000);
    const bloated = { ...edition, formed: "x".repeat(600), built: "y".repeat(600) };
    expect(buildCardAltText(bloated).length).toBeLessThanOrEqual(1000);
  });
});
