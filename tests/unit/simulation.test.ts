import { describe, expect, it } from "vitest";
import { PRODUCTS, RIGHTS } from "@/simulation/data";
import {
  decodeSelections,
  defaultSelections,
  encodeSelections,
  lineFor,
  money,
  productBySlug,
  simulate,
} from "@/simulation/model";

describe("the dataset is checkable or it is worthless", () => {
  it("gives every figure a publisher, a URL and a date", () => {
    for (const p of PRODUCTS) {
      expect(p.source.publisher, p.slug).toBeTruthy();
      expect(p.source.url, p.slug).toMatch(/^https:\/\//);
      expect(p.source.asOf, p.slug).toBeTruthy();
      expect(p.economics.rateNote.length, p.slug).toBeGreaterThan(40);
    }
  });

  it("keeps every rate inside the range a rate can occupy", () => {
    for (const p of PRODUCTS) {
      if (p.economics.kind !== "take") continue;
      expect(p.economics.rate, p.slug).toBeGreaterThan(0);
      expect(p.economics.rate, p.slug).toBeLessThan(1);
      if (p.economics.lowRate !== undefined) {
        // A "low tier" above the headline rate would be an editing mistake
        // that quietly overstates the cheaper option.
        expect(p.economics.lowRate, p.slug).toBeLessThan(p.economics.rate);
        expect(p.economics.lowRate, p.slug).toBeGreaterThan(0);
      }
    }
  });

  it("uses unique slugs so a selection can never be ambiguous", () => {
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
  });

  it("never claims a right is wholly absent where EU law granted part of it", () => {
    // Overclaiming here is the cheapest way to lose the argument: one link to
    // the DSA and the numbers go down with the rhetoric.
    const byId = Object.fromEntries(RIGHTS.map((r) => [r.id, r]));
    expect(byId.rules?.status).toBe("PARTIAL");
    expect(byId.appeal?.status).toBe("PARTIAL");
    // The one that is genuinely absolute.
    expect(byId.vote?.status).toBe("NO");
    for (const r of RIGHTS) expect(r.ours.length, r.id).toBeGreaterThan(20);
  });
});

describe("the arithmetic", () => {
  it("charges a take rate against the amount the person moves", () => {
    const fiverr = productBySlug("freelance-marketplace")!;
    const line = lineFor(fiverr, 40_000);
    expect(line.taken).toBeCloseTo(40_000 * 0.2, 6);
    expect(line.takenLow).toBeCloseTo(40_000 * 0.1, 6);
    expect(line.isAttention).toBe(false);
  });

  it("reports attention revenue as the published figure, not a function of input", () => {
    const meta = productBySlug("social-feed")!;
    // Whatever a person types, Meta reported what it reported.
    expect(lineFor(meta, 0).taken).toBe(lineFor(meta, 999_999).taken);
    expect(lineFor(meta, 1).isAttention).toBe(true);
  });

  it("treats a negative or broken amount as zero rather than inventing one", () => {
    const uber = productBySlug("rides")!;
    expect(lineFor(uber, -5000).taken).toBe(0);
    expect(lineFor(uber, Number.NaN).taken).toBe(0);
  });

  it("separates fees a person pays from revenue their attention makes", () => {
    const r = simulate([
      { slug: "social-feed", amount: 1 },
      { slug: "rides", amount: 30_000 },
    ]);
    expect(r.earnedFromAttention).toBeCloseTo(57.03, 2);
    expect(r.paidInFees).toBeCloseTo(30_000 * 0.299, 6);
    expect(r.total).toBeCloseTo(r.paidInFees + r.earnedFromAttention, 6);
  });

  it("never totals higher than the sum of its lines", () => {
    const r = simulate(defaultSelections());
    expect(r.total).toBeCloseTo(
      r.lines.reduce((s, l) => s + l.taken, 0),
      6,
    );
    expect(r.totalLow).toBeLessThanOrEqual(r.total + 1e-9);
  });

  it("drops an unknown product instead of guessing a rate for it", () => {
    const r = simulate([{ slug: "not-a-real-product", amount: 100_000 }]);
    expect(r.lines).toHaveLength(0);
    expect(r.total).toBe(0);
  });

  it("reports a blended take rate that cannot exceed what was moved", () => {
    // This replaced a "days you work for them" figure that divided fees by an
    // assumed salary and rendered 485 working days in a year. A visibly
    // impossible number beside carefully sourced ones discredits the sourced
    // ones, so the metric must be bounded by construction.
    const r = simulate([
      { slug: "app-store", amount: 250_000 },
      { slug: "rides", amount: 30_000 },
    ]);
    expect(r.moved).toBe(280_000);
    expect(r.keptPerHundred).toBeGreaterThan(0);
    expect(r.keptPerHundred).toBeLessThan(100);
    expect(r.keptPerHundred).toBeCloseTo((r.paidInFees / r.moved) * 100, 6);
  });

  it("reports no take rate when nothing was moved, rather than dividing by zero", () => {
    const r = simulate([{ slug: "social-feed", amount: 1 }]);
    expect(r.moved).toBe(0);
    expect(r.keptPerHundred).toBe(0);
    expect(Number.isFinite(r.keptPerHundred)).toBe(true);
  });
});

describe("money is formatted at a length a person would say aloud", () => {
  it("scales the unit with the size", () => {
    expect(money(57)).toBe("$57");
    expect(money(8000)).toBe("$8.0K");
    expect(money(12_400)).toBe("$12K");
    expect(money(2_500_000)).toBe("$2.5M");
    expect(money(40_000_000)).toBe("$40M");
  });

  it("honours a different currency symbol", () => {
    expect(money(1200, "€")).toBe("€1.2K");
  });
});

describe("a shared link reproduces the sender's result", () => {
  it("round-trips a selection", () => {
    const selections = [
      { slug: "app-store", amount: 50_000 },
      { slug: "rides", amount: 12_000 },
    ];
    expect(decodeSelections(encodeSelections(selections))).toEqual(selections);
  });

  it("refuses what arrives broken, because this string is pasted by anyone", () => {
    expect(decodeSelections(undefined)).toEqual([]);
    expect(decodeSelections("")).toEqual([]);
    expect(decodeSelections("nonsense")).toEqual([]);
    expect(decodeSelections("rides:not-a-number")).toEqual([]);
    expect(decodeSelections("rides:-40")).toEqual([]);
    // Absurd amounts are refused rather than rendered as a headline.
    expect(decodeSelections("rides:999999999999")).toEqual([]);
  });

  it("keeps the first of a duplicated product rather than double-counting", () => {
    expect(decodeSelections("rides:1000,rides:9000")).toEqual([{ slug: "rides", amount: 1000 }]);
  });

  it("opens on something real so nobody meets an empty screen", () => {
    const r = simulate(defaultSelections());
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.total).toBeGreaterThan(0);
  });
});
