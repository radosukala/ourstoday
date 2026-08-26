/**
 * Minimal structured logger with hard redaction rules.
 * Never log: email addresses, raw tokens, magic URLs, session cookies,
 * IP addresses, user agents or private display-name drafts.
 */

type Level = "info" | "warn" | "error";

const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /(email|token|secret|password|cookie|authorization|ip|useragent|user_agent|referrer)/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[DEPTH]";
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY_PATTERN.test(k) ? REDACTED : scrub(v, depth + 1);
  }
  return out;
}

function emit(level: Level, event: string, fields?: Record<string, unknown>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(fields ? (scrub(fields) as Record<string, unknown>) : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};
