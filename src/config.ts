
/**
 * Server-side environment configuration. Never imported by browser code.
 * Missing configuration fails loudly and descriptively; nothing defaults open.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value.trim();
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export type AppEnv = "local" | "preview" | "production";

function parseAppEnv(raw: string | undefined): AppEnv {
  switch ((raw ?? "local").toLowerCase()) {
    case "local":
      return "local";
    case "preview":
      return "preview";
    case "production":
      return "production";
    default:
      throw new Error(`Invalid APP_ENV ${String(raw)}`);
  }
}

/** Parse RELAY_SIGNING_SECRET forms: "1:secret" or "2:new,1:old". */
export function parseSigningSecrets(raw: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) throw new Error("RELAY_SIGNING_SECRET entries must look like \"<version>:<secret>\"");
    const version = Number.parseInt(trimmed.slice(0, idx), 10);
    const secret = trimmed.slice(idx + 1);
    if (!Number.isInteger(version) || version < 1) throw new Error("Invalid relay signing key version");
    if (secret.length < 32) throw new Error("Relay signing secrets must be at least 32 characters");
    map.set(version, secret);
  }
  if (map.size === 0) throw new Error("RELAY_SIGNING_SECRET contained no usable entries");
  return map;
}

let cached: AppConfig | undefined;

export interface AppConfig {
  appEnv: AppEnv;
  databaseUrl: string;
  directDatabaseUrl: string;
  /** Disable prepared statements when running behind a transaction pooler. */
  disablePreparedStatements: boolean;
  allowCanonicalWrites: boolean;
  emailDeliveryMode: "capture" | "resend";
  resendApiKey: string | undefined;
  resendFrom: string;
  relaySecrets: Map<number, string>;
  appUrl: string;
  captureDir: string;
}

export function config(): AppConfig {
  if (cached) return cached;
  const appEnv = parseAppEnv(process.env.APP_ENV);
  const emailModeRaw: string = (process.env.EMAIL_DELIVERY_MODE ?? "capture").toLowerCase();
  if (emailModeRaw !== "capture" && emailModeRaw !== "resend") {
    throw new Error("EMAIL_DELIVERY_MODE must be 'capture' or 'resend'");
  }
  const emailDeliveryMode: "capture" | "resend" = emailModeRaw;
  const cfg = {
    appEnv,
    databaseUrl: requireEnv("DATABASE_URL"),
    directDatabaseUrl: optionalEnv("DIRECT_DATABASE_URL") ?? requireEnv("DATABASE_URL"),
    disablePreparedStatements:
      (process.env.DB_DISABLE_PREPARED_STATEMENTS ?? "").toLowerCase() === "true",
    allowCanonicalWrites:
      (process.env.ALLOW_CANONICAL_WRITES ?? "false").toLowerCase() === "true",
    emailDeliveryMode,
    resendApiKey: optionalEnv("RESEND_API_KEY"),
    resendFrom: optionalEnv("RESEND_FROM") ?? "OURS TODAY <enter@updates.ourstoday.invalid>",
    relaySecrets: parseSigningSecrets(requireEnv("RELAY_SIGNING_SECRET")),
    appUrl: optionalEnv("NEXT_PUBLIC_APP_URL") ?? optionalEnv("BETTER_AUTH_URL") ?? "http://127.0.0.1:3000",
    captureDir: optionalEnv("EMAIL_CAPTURE_DIR") ?? ".email-capture",
  };
  if (cfg.emailDeliveryMode === "resend" && !cfg.resendApiKey) {
    throw new Error("EMAIL_DELIVERY_MODE=resend requires RESEND_API_KEY");
  }
  // Fail closed: production must never inherit an accidental open gate.
  if (cfg.appEnv === "production" && process.env.ALLOW_CANONICAL_WRITES === undefined) {
    cfg.allowCanonicalWrites = false;
  }
  cached = cfg;
  return cached;
}

