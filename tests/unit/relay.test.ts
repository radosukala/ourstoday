import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  signContextCookie,
  signRelayToken,
  verifyContextCookie,
  verifyRelayToken,
} from "@/security/relay";
import { sha256Hex } from "@/security/digest";

const SECRET_V1 = "unit-test-secret-0123456789abcdef0123456789abcdef";
const SECRET_V2 = "new-secret-0123456789abcdef0123456789abcdef";
const SECRETS = new Map([[1, SECRET_V1]]);
const ROTATED = new Map<number, string>([
  [2, SECRET_V2],
  [1, SECRET_V1],
]);

describe("relay tokens", () => {
  it("round-trips a valid token", () => {
    const { token, payload } = signRelayToken(SECRETS);
    const result = verifyRelayToken(token, SECRETS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.jti).toBe(payload.jti);
  });

  it("rejects tampered tokens with BAD_SIGNATURE", () => {
    const { token } = signRelayToken(SECRETS);
    const parts = token.split(".");
    const forged = parts[0] + "." + sha256Hex(parts[0] ?? "").slice(0, 43);
    const result = verifyRelayToken(forged, SECRETS);
    expect(result).toEqual({ ok: false, reason: "BAD_SIGNATURE" });
  });

  it("never leaks via malformed input", () => {
    for (const bad of ["", "...", "garbage", "a.b.c", "e30.x"]) {
      expect(verifyRelayToken(bad, SECRETS).ok).toBe(false);
      expect(verifyRelayToken(bad, SECRETS)).toEqual({ ok: false, reason: "MALFORMED" });
    }
  });

  it("supports rotation: old keys still verify, signing uses newest", () => {
    const oldToken = signRelayToken(SECRETS);
    expect(verifyRelayToken(oldToken.token, ROTATED).ok).toBe(true);
    const newToken = signRelayToken(ROTATED);
    expect(verifyRelayToken(newToken.token, ROTATED).ok).toBe(true);
    expect(newToken.payload.kv).toBe(2);
    expect(verifyRelayToken(newToken.token, SECRETS)).toEqual({
      ok: false,
      reason: "UNKNOWN_KEY_VERSION",
    });
  });

  it("jti is opaque high entropy; two tokens never share jtis", () => {
    const a = signRelayToken(SECRETS);
    const b = signRelayToken(SECRETS);
    expect(a.payload.jti).not.toBe(b.payload.jti);
    expect(a.payload.jti.length).toBeGreaterThanOrEqual(24);
  });
});

describe("context cookie", () => {
  it("signs and verifies within max age", () => {
    const signed = signContextCookie("some-record-id", SECRET_V1);
    const verified = verifyContextCookie(signed, SECRET_V1, 60_000);
    expect(verified?.value).toBe("some-record-id");
  });

  it("expires after maxAge", () => {
    const secret = SECRET_V1;
    const issuedAtMs = Date.now() - 120_000;
    const mac = createHmac("sha256", secret)
      .update("ctx-cookie|record|" + String(issuedAtMs))
      .digest("base64url");
    const signed = "record." + issuedAtMs + "." + mac;
    expect(verifyContextCookie(signed, secret, 60_000)).toBeNull();
  });

  it("rejects forged cookies", () => {
    const secret = SECRETS.get(1) as string;
    const signed = signContextCookie("record", secret);
    const parts = signed.split(".");
    const forged = parts[0] + "." + parts[1] + "." + sha256Hex(parts[1] ?? "").slice(0, 43);
    expect(verifyContextCookie(forged, secret, 60_000)).toBeNull();
  });
});
