
import { describe, expect, it } from "vitest";
import {
  displayNameSchema,
  documentVersionsSchema,
  emailSchema,
  idempotencyKeySchema,
  sealRequestSchema,
} from "@/validation/schemas";

const VERSIONS = {
  declaration: "ours-founding-declaration/0.1",
  constitution: "ours-founding-constitution/0.1",
  protocol: "ours.founding-relay/0.1",
  privacyNotice: "ours-privacy-notice-draft/0.1",
  legalStatus: "ours-legal-status/0.1",
};

describe("validation schemas", () => {
  it("accepts valid emails and lowercases them", () => {
    expect(emailSchema.parse(" Person@Example.COM ")).toBe("person@example.com");
  });

  it("rejects bad emails", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
    // zod v4 requires a dot-separated host; bare hosts are rejected.
    expect(emailSchema.safeParse("a@b").success).toBe(false);
    expect(emailSchema.safeParse("person@example.com").success).toBe(true);
  });

  it("enforces display name bounds", () => {
    expect(displayNameSchema.safeParse("ab").success).toBe(true);
    expect(displayNameSchema.safeParse("a").success).toBe(false);
    expect(displayNameSchema.safeParse("x".repeat(41)).success).toBe(false);
  });

  it("restricts idempotency keys to safe characters", () => {
    expect(idempotencyKeySchema.safeParse("key-2026.08:26_01").success).toBe(true);
    expect(idempotencyKeySchema.safeParse("bad key!").success).toBe(false);
  });

  it("requires every accepted version on seal requests", () => {
    expect(sealRequestSchema.safeParse({
      displayName: "RADO",
      acceptedVersions: VERSIONS,
      idempotencyKey: "12345678",
    }).success).toBe(true);
    const missing = { ...VERSIONS, privacyNotice: undefined };
    expect(documentVersionsSchema.safeParse(missing).success).toBe(false);
  });
});

