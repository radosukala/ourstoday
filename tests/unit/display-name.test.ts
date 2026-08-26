
import { describe, expect, it } from "vitest";
import { normalizeDisplayName } from "@/ledger/seal";

describe("normalizeDisplayName", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeDisplayName("  Ada   Lovelace ")).toBe("Ada Lovelace");
  });

  it("strips control and format characters", () => {
    expect(normalizeDisplayName("Ada\u0000Lovelace\u200b")).toBe("AdaLovelace");
  });

  it("keeps ordinary unicode names intact", () => {
    expect(normalizeDisplayName("\u5b89\u5ba4 \u5948\u7f8e")).toBe("\u5b89\u5ba4 \u5948\u7f8e");
  });
});

