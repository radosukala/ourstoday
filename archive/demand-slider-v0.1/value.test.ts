import { describe, expect, it } from "vitest";
import {
  ACQUISITION_COST_EUR,
  acquisitionValueEur,
  compactEur,
  DEFAULT_STOP_INDEX,
  DEMAND_STOPS,
  unlockFor,
} from "@/edition/value";

describe("what aggregated demand is worth", () => {
  it("multiplies the cohort by an ordinary acquisition cost band", () => {
    expect(acquisitionValueEur(10_000)).toEqual({
      low: 10_000 * ACQUISITION_COST_EUR.low,
      high: 10_000 * ACQUISITION_COST_EUR.high,
    });
    // The band must stay a band: a single confident figure would be invented.
    expect(ACQUISITION_COST_EUR.low).toBeLessThan(ACQUISITION_COST_EUR.high);
  });

  it("formats money at a length a person would say aloud", () => {
    expect(compactEur(500)).toBe("€500");
    expect(compactEur(50_000)).toBe("€50K");
    expect(compactEur(2_500_000)).toBe("€2.5M");
    expect(compactEur(5_000_000)).toBe("€5M");
  });

  it("says nothing is triggered below the first threshold", () => {
    expect(unlockFor(0).atLeast).toBe(0);
    expect(unlockFor(999).line).toContain("Nothing is triggered");
    expect(unlockFor(1_000).atLeast).toBe(1_000);
  });

  it("never skips backwards as the cohort grows", () => {
    let last = -1;
    for (const stop of DEMAND_STOPS) {
      const at = unlockFor(stop).atLeast;
      expect(at).toBeGreaterThanOrEqual(last);
      last = at;
    }
  });

  it("opens past the threshold rule but short of the ambition", () => {
    expect(DEMAND_STOPS[DEFAULT_STOP_INDEX]).toBe(100_000);
  });

  it("reaches the scale the incumbents actually operate at", () => {
    // A slider that stopped in the hundreds of thousands would concede that
    // this is a niche project. The categories on the registry are not niche.
    expect(Math.max(...DEMAND_STOPS)).toBeGreaterThanOrEqual(100_000_000);
    expect(unlockFor(100_000_000).line).toContain("scale the incumbents themselves");
  });
});
