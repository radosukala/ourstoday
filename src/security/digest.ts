
import { createHash } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function sha256Email(email: string): string {
  return sha256Hex(email.trim().toLowerCase());
}

/**
 * Deterministic JSON with recursively sorted object keys.
 * Used for event integrity digests and idempotency request digests so the
 * same logical request always produces the same bytes.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(",")}}`;
}

export function digestOf(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

