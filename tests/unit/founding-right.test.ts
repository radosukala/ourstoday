import { describe, expect, it } from "vitest";
import { FOUNDING_LIMIT, capacityFromNextOrdinal } from "@/founding/right";

describe("Founding Million capacity", () => {
  it("derives the public counter from the canonical next ordinal", () => {
    expect(capacityFromNextOrdinal(2)).toEqual({
      limit: FOUNDING_LIMIT,
      issued: 1,
      nextOrdinal: 2,
      remaining: 999_999,
      full: false,
    });
  });

  it("closes exactly after ordinal one million", () => {
    expect(capacityFromNextOrdinal(1_000_000)).toMatchObject({
      issued: 999_999,
      nextOrdinal: 1_000_000,
      remaining: 1,
      full: false,
    });
    expect(capacityFromNextOrdinal(1_000_001)).toEqual({
      limit: FOUNDING_LIMIT,
      issued: FOUNDING_LIMIT,
      nextOrdinal: null,
      remaining: 0,
      full: true,
    });
  });

  it("fails closed without inventing a next number", () => {
    expect(capacityFromNextOrdinal(null)).toMatchObject({
      nextOrdinal: null,
      full: false,
    });
  });
});
