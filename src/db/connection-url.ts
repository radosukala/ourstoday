/**
 * Connection-string normalization.
 *
 * A provider hands you a URL and you paste it into an environment variable.
 * Two things about that URL are hazardous with postgres.js, and both fail at
 * connection time in production rather than in any test:
 *
 * 1. postgres.js forwards every query parameter it does not recognize to the
 *    server as a STARTUP PARAMETER. libpq connection strings legitimately
 *    carry client-side options that are not server settings, so the server
 *    answers `unrecognized configuration parameter "channel_binding"` and the
 *    connection dies. Neon's default connection string contains exactly that
 *    parameter, so this is not hypothetical.
 *
 * 2. An explicit `ssl` option passed alongside the URL OVERRIDES the URL's
 *    own `sslmode`. Hardcoding one value therefore silently ignores what the
 *    provider asked for - including downgrading a `require` to a mode that
 *    will fall back to plaintext.
 *
 * This module resolves both, in one place, for every connection the
 * application makes.
 */

/**
 * libpq client-side options. They belong to the driver, never to the server.
 * Anything left here reaches PostgreSQL as a startup parameter and is refused.
 */
const CLIENT_ONLY_PARAMS = new Set([
  "channel_binding",
  "sslrootcert",
  "sslcert",
  "sslkey",
  "sslcrl",
  "sslcrldir",
  "sslpassword",
  "sslsni",
  "sslcompression",
  "sslnegotiation",
  "requiressl",
  "gssencmode",
  "gsslib",
  "krbsrvname",
  "passfile",
  "service",
  "hostaddr",
  "keepalives",
  "keepalives_idle",
  "keepalives_interval",
  "keepalives_count",
]);

/** What postgres.js accepts for its `ssl` option. */
export type SslSetting = false | "require" | "prefer" | "allow" | "verify-full";

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("/")
  );
}

/**
 * Map a libpq `sslmode` onto postgres.js's `ssl` option.
 *
 * `verify-ca` is deliberately promoted to `verify-full`: postgres.js has no
 * CA-only mode, and verifying a chain while ignoring the hostname is a
 * distinction without a security benefit here.
 */
function sslFromMode(mode: string | null, hostname: string): SslSetting {
  switch (mode) {
    case "disable":
      return false;
    case "allow":
      return "allow";
    case "prefer":
      return "prefer";
    case "require":
      return "require";
    case "verify-ca":
    case "verify-full":
      return "verify-full";
    default:
      // No sslmode given. Local development commonly runs without TLS; a
      // remote database must never be reached without it.
      return isLocalHost(hostname) ? false : "require";
  }
}

export interface NormalizedConnection {
  /** Safe to hand to postgres.js: client-only parameters removed. */
  connectionString: string;
  ssl: SslSetting;
  hostname: string;
  isLocal: boolean;
  /**
   * True when the endpoint looks like a transaction-mode connection pooler.
   * Named prepared statements do not survive one, so this disables them.
   */
  isTransactionPooler: boolean;
}

export function normalizeConnectionUrl(raw: string): NormalizedConnection {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // Unix socket paths and other non-URL forms: hand them through untouched
    // and let postgres.js deal with them, without TLS.
    return {
      connectionString: raw,
      ssl: false,
      hostname: "",
      isLocal: true,
      isTransactionPooler: false,
    };
  }

  const mode = url.searchParams.get("sslmode");
  const hostname = url.hostname;
  const ssl = sslFromMode(mode, hostname);

  for (const param of CLIENT_ONLY_PARAMS) url.searchParams.delete(param);
  // postgres.js reads `ssl` from the options object we pass, so leaving
  // sslmode in the string is redundant at best and contradictory at worst.
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    ssl,
    hostname,
    isLocal: isLocalHost(hostname),
    // Neon (`-pooler`), Supabase Supavisor (`pooler.supabase`) and pgbouncer
    // hosts all run transaction pooling.
    isTransactionPooler:
      /-pooler\./.test(hostname) ||
      /pooler\.supabase\./.test(hostname) ||
      /pgbouncer/i.test(hostname) ||
      url.searchParams.get("pgbouncer") === "true",
  };
}
