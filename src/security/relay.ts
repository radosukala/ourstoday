import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Signed opaque relay tokens.
 *
 * Public shape: <base64url(payload)>.<base64url(hmac)>
 *   payload: { v: 1, jti: <random opaque id>, kv: <signing key version> }
 *
 * The predecessor identity NEVER appears in the URL; authority derives from
 * the server-held signing key plus the private.relay_token_record row keyed
 * by the JTI digest. Tokens are capabilities for attribution only - they
 * authorize no private read and no mutation by themselves.
 */
export interface RelayTokenPayload {
  v: 1;
  jti: string;
  kv: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function hmacFor(payload: RelayTokenPayload, secret: string): string {
  return createHmac("sha256", secret)
    .update(b64url(JSON.stringify(payload)))
    .digest("base64url");
}

export function signRelayToken(secrets: Map<number, string>): {
  token: string;
  payload: RelayTokenPayload;
} {
  const versions = [...secrets.keys()].sort((a, b) => b - a);
  const currentVersion = versions[0];
  if (currentVersion === undefined) throw new Error("No relay signing secret configured");
  const secret = secrets.get(currentVersion);
  if (!secret) throw new Error("No relay signing secret configured");
  const payload: RelayTokenPayload = {
    v: 1,
    jti: randomBytes(24).toString("base64url"),
    kv: currentVersion,
  };
  const mac = hmacFor(payload, secret);
  return { token: `${b64url(JSON.stringify(payload))}.${mac}`, payload };
}

export type RelayTokenVerification =
  | { ok: true; payload: RelayTokenPayload }
  | { ok: false; reason: "MALFORMED" | "UNKNOWN_KEY_VERSION" | "BAD_SIGNATURE" };

/** Constant-time MAC comparison; never throws on attacker input. */
export function verifyRelayToken(
  token: string,
  secrets: Map<number, string>,
): RelayTokenVerification {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "MALFORMED" };
  let payload: RelayTokenPayload;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Record<string, unknown>).v !== 1 ||
      typeof (parsed as Record<string, unknown>).jti !== "string" ||
      typeof (parsed as Record<string, unknown>).kv !== "number"
    ) {
      return { ok: false, reason: "MALFORMED" };
    }
    payload = parsed as RelayTokenPayload;
  } catch {
    return { ok: false, reason: "MALFORMED" };
  }
  const secret = secrets.get(payload.kv);
  if (!secret) return { ok: false, reason: "UNKNOWN_KEY_VERSION" };
  const expected = Buffer.from(hmacFor(payload, secret));
  const provided = Buffer.from(parts[1]);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: "BAD_SIGNATURE" };
  }
  return { ok: true, payload };
}

/** Short-lived signed cookie value for relay context on the same device. */
export function signContextCookie(value: string, secret: string): string {
  const issuedAtMs = Date.now();
  const mac = createHmac("sha256", secret)
    .update(`ctx-cookie|${value}|${issuedAtMs}`)
    .digest("base64url");
  return `${value}.${issuedAtMs}.${mac}`;
}

export function verifyContextCookie(
  signed: string | undefined,
  secret: string,
  maxAgeMs: number,
): { value: string } | null {
  if (!signed) return null;
  const parts = signed.split(".");
  if (parts.length !== 3) return null;
  const [value, issuedAtRaw, mac] = parts as [string, string, string];
  const issuedAtMs = Number.parseInt(issuedAtRaw, 10);
  if (!Number.isFinite(issuedAtMs)) return null;
  if (Date.now() - issuedAtMs > maxAgeMs) return null;
  const expected = createHmac("sha256", secret)
    .update(`ctx-cookie|${value}|${issuedAtMs}`)
    .digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(mac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { value };
}
