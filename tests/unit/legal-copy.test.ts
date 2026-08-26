
import { describe, expect, it } from "vitest";
import {
  assertNoForbiddenClaims,
  currentDocumentVersions,
  LOCK_LINE,
  STATUS_LINE,
  THESIS,
} from "@/legal/documents";
import { buildReceiptShape } from "./helpers/receipt-shape";

describe("institutional copy", () => {
  it("pins the exact lock, thesis and status lines", () => {
    expect(LOCK_LINE).toBe("THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.");
    expect(THESIS).toBe("OURS is a member-owned network that builds its own software in public.");
    expect(STATUS_LINE).toBe("OWNERSHIP: COMMITTED \u00b7 LEGAL MEMBERSHIP: NOT YET ISSUED");
  });

  it("document versions are pinned strings", () => {
    const v = currentDocumentVersions();
    expect(v.declaration).toMatch(/^ours-founding-declaration\//);
    expect(v.protocol).toMatch(/^ours\.founding-relay\//);
    expect(v.privacyNotice).toContain("draft");
  });

  it("forbidden live claims are caught by the scanner", () => {
    expect(assertNoForbiddenClaims("you are an owner now")).toEqual(["you are an owner"]);
    expect(assertNoForbiddenClaims("Your number is reserved for you.")).toContain("your number is reserved");
    expect(assertNoForbiddenClaims("Nothing is reserved; nothing is sold.")).toEqual([]);
  });

  it("receipts always carry the legal status line", () => {
    const receipt = buildReceiptShape(12);
    expect(receipt.legalStatus).toBe("OWNERSHIP: COMMITTED \u00b7 LEGAL MEMBERSHIP: NOT YET ISSUED");
    expect(receipt.shareCopySuggestion).toContain("#000012");
    expect(receipt.shareCopySuggestion).not.toMatch(/owner|member/i);
  });
});

