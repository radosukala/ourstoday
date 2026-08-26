import { describe, expect, it } from "vitest";
import { canonicalJson, digestOf, sha256Email, sha256Hex } from "@/security/digest";

describe("canonicalJson", () => {
  it("is key-order independent", () => {
    expect(canonicalJson({ a: 1, b: { c: 2, d: 3 } })).toBe(
      canonicalJson({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it("produces stable bytes for identical logical payloads", () => {
    const a = canonicalJson({ ordinal: 7, displayName: "RADO", nested: { x: [1, 2] } });
    const b = canonicalJson({ nested: { x: [1, 2] }, displayName: "RADO", ordinal: 7 });
    expect(a).toBe(b);
    expect(a).toContain('"displayName":"RADO"');
  });

  it("drops undefined values", () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("digests", () => {
  it("sha256Hex is deterministic and hex-encoded", () => {
    const d1 = sha256Hex("ours");
    expect(d1).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex("ours")).toBe(d1);
  });

  it("email digest normalizes case and surrounding whitespace", () => {
    expect(sha256Email("  Person@Example.COM ")).toBe(sha256Email("person@example.com"));
    expect(digestOf({})).toMatch(/^[0-9a-f]{64}$/);
  });
});
