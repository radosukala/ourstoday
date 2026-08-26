import { config, ConfigError } from "@/config";
import { getSql } from "@/db/sqltype";
import { checkEmailDeliverability } from "@/email/deliverability";
import { foundingState } from "@/ledger/state";
import { jsonError, jsonOk } from "@/lib/http";
import { log } from "@/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Classify a dependency failure into something an operator can act on.
 *
 * "The database is not reachable" covers a missing environment variable, a
 * typo in a hostname, a cold start, a firewall, a rejected password and an
 * unmigrated database. Those need six different fixes, and a health endpoint
 * that cannot tell them apart sends whoever is on call to read logs they
 * deliberately cannot see.
 *
 * The classification is deliberately coarse and carries NO raw error text,
 * because the raw message contains the host and the database user. What is
 * returned tells an operator where to look and tells an outsider nothing they
 * could use.
 */
interface Diagnosis {
  reason: string;
  /** Symbolic error code. Safe to publish: it names a class, not an address. */
  code: string;
}

/**
 * SQLSTATE codes the server itself returns. These are unambiguous, so they are
 * checked before any message matching.
 */
const SQLSTATE: Record<string, string> = {
  "28P01": "AUTH_REJECTED",
  "28000": "AUTH_REJECTED",
  "3D000": "DATABASE_MISSING",
  "3F000": "SCHEMA_NOT_MIGRATED",
  "42P01": "SCHEMA_NOT_MIGRATED",
  "53300": "CONNECTION_LIMIT_REACHED",
  "57P01": "SERVER_SHUTTING_DOWN",
  "57P03": "SERVER_STARTING",
  "08001": "CONNECTION_FAILED",
  "08004": "CONNECTION_REJECTED",
  "08006": "CONNECTION_FAILED",
  XX000: "SERVER_INTERNAL_ERROR",
};

/** Transport-level codes from the driver or from Node's networking stack. */
const TRANSPORT: Record<string, string> = {
  ENOTFOUND: "DNS_FAILURE",
  EAI_AGAIN: "DNS_FAILURE",
  ECONNREFUSED: "CONNECTION_REFUSED",
  ECONNRESET: "CONNECTION_RESET",
  EPIPE: "CONNECTION_RESET",
  EHOSTUNREACH: "NETWORK_UNREACHABLE",
  ENETUNREACH: "NETWORK_UNREACHABLE",
  ETIMEDOUT: "TIMEOUT",
  CONNECT_TIMEOUT: "TIMEOUT",
  CONNECTION_CLOSED: "CONNECTION_CLOSED",
  CONNECTION_ENDED: "CONNECTION_CLOSED",
  CONNECTION_DESTROYED: "CONNECTION_CLOSED",
  ERR_INVALID_ARG_TYPE: "DRIVER_SERIALIZATION",
  ERR_MODULE_NOT_FOUND: "BUNDLE_INCOMPLETE",
  MODULE_NOT_FOUND: "BUNDLE_INCOMPLETE",
};

/**
 * Classify a dependency failure into something an operator can act on.
 *
 * "The database is not reachable" covers a missing environment variable, a
 * hostname typo, a cold start, a firewall, rejected credentials and an
 * unmigrated database. Those need different fixes, and a health endpoint that
 * cannot tell them apart sends whoever is on call to read logs they
 * deliberately cannot see.
 *
 * The CODE is published; the MESSAGE never is. postgres.js builds connection
 * errors as `write <CODE> <host>:<port>`, so the message carries the database
 * endpoint while the code names only a failure class.
 */
function classify(error: unknown): Diagnosis {
  const err = error as { code?: unknown; name?: unknown; message?: unknown };
  const code = typeof err.code === "string" ? err.code : "";
  const name = typeof err.name === "string" ? err.name : "Error";
  const message = typeof err.message === "string" ? err.message : String(error);

  if (code && SQLSTATE[code]) return { reason: SQLSTATE[code] as string, code };
  if (code && TRANSPORT[code]) return { reason: TRANSPORT[code] as string, code };

  // Configuration failures throw before any socket is opened.
  if (/Missing required environment variable/i.test(message)) {
    return { reason: "CONFIG_MISSING", code: code || "CONFIG" };
  }
  if (/Refusing to connect/i.test(message)) {
    return { reason: "CONFIG_REFUSED_INSECURE", code: code || "CONFIG" };
  }
  if (/certificate|self.signed|SSL|TLS|pg_hba/i.test(message)) {
    return { reason: "TLS_FAILURE", code: code || name };
  }
  if (/timeout/i.test(message)) return { reason: "TIMEOUT", code: code || name };

  // Nothing matched. Publish the symbolic code and name so the next look is
  // not another guess.
  return { reason: "UNKNOWN", code: code || name };
}

/**
 * The commit this instance is running.
 *
 * "Our repository is public" and "the code serving you is provably that code"
 * are different claims. This is the cheap half of closing that gap, and it
 * also answers the ordinary operational question of whether a deployment
 * actually picked up the push you think it did. The commit hash of a public
 * repository is not a secret.
 */
function deployedCommit(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    process.env.SOURCE_COMMIT ??
    "unknown"
  );
}

/**
 * Liveness and dependency state. Exposes no private configuration: no host,
 * no user, no connection string, no raw driver message.
 *
 * SHALLOW BY DEFAULT, and that is a cost decision worth understanding.
 *
 * Neon bills compute time, and a serverless compute only stops costing when it
 * SUSPENDS. Suspension happens after a few minutes of no connections, so any
 * monitor polling a database-touching endpoint every minute keeps the compute
 * awake continuously - roughly 700 CU-hours a month to answer a question
 * nobody asked, on a ledger with no users.
 *
 * So: the default check proves the APPLICATION is alive and serving, and
 * touches no database. `?deep=1` runs the real dependency check and is what a
 * human uses when investigating. Continuous verification of the database is
 * the nightly conformance run's job - it already checks far more than a
 * SELECT 1, and it publishes the result either way.
 */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";

  try {
    config();
  } catch (error) {
    if (error instanceof ConfigError) {
      // The variable NAME is already public in .env.example. The value is not,
      // and is never included.
      log.error("health.config_invalid", { variable: error.variable });
      return jsonError(
        "CONFIGURATION_INVALID",
        "Configuration is invalid: " + error.variable + ". commit=" + deployedCommit(),
        503,
      );
    }
    const diag = classify(error);
    log.error("health.config_error", { ...diag });
    return jsonError(
      "CONFIGURATION_INVALID",
      "Configuration could not be read (" + diag.reason + "/" + diag.code + ").",
      503,
    );
  }

  if (!deep) {
    return jsonOk({
      service: "OURS TODAY",
      checks: "shallow",
      note: "Application liveness only. Add ?deep=1 for the database check.",
      commit: deployedCommit(),
      time: new Date().toISOString(),
    });
  }

  try {
    await getSql()`SELECT 1`;
  } catch (error) {
    const { reason, code } = classify(error);
    // The full error goes to the server log, where the redaction rules apply.
    log.error("health.database_unavailable", { reason, code });
    return jsonError(
      "DATABASE_UNAVAILABLE",
      "The database is not reachable (" + reason + "/" + code + "). commit=" + deployedCommit(),
      503,
    );
  }

  // Connected but unmigrated is its own state, and it is what a fresh
  // provisioning looks like. Reporting it as healthy would be a lie.
  try {
    await getSql()`SELECT 1 FROM ledger.system_state WHERE id = 1`;
  } catch (error) {
    const diag = classify(error);
    log.error("health.schema_unavailable", { ...diag });
    return jsonError(
      "SCHEMA_NOT_MIGRATED",
      "The database is reachable but has no ledger schema (" +
        diag.reason +
        "/" +
        diag.code +
        "). Run db:migrate against it. commit=" +
        deployedCommit(),
      503,
    );
  }

  let state: Awaited<ReturnType<typeof foundingState>>;
  try {
    state = await foundingState();
  } catch (error) {
    const diag = classify(error);
    log.error("health.state_unavailable", { ...diag });
    return jsonError(
      "STATE_UNAVAILABLE",
      "Ledger state could not be read (" + diag.reason + "/" + diag.code + ").",
      503,
    );
  }

  // Entry requires a magic link, so a ledger that can accept entries while
  // email is broken is a trap: every visitor sees "check your email" and
  // nothing arrives.
  const email = await checkEmailDeliverability();
  if (!email.deliverable) {
    log.error("health.email_undeliverable", { mode: email.mode, domain: email.fromDomain });
  }

  return jsonOk({
    service: "OURS TODAY",
    checks: "deep",
    ledger: state.ledgerState,
    email,
    /**
     * The single question that matters before opening: can a stranger who
     * arrives right now actually complete an entry?
     */
    entryUsable: state.canAcceptEntries && email.deliverable,
    canAcceptEntries: state.canAcceptEntries,
    commit: deployedCommit(),
    time: new Date().toISOString(),
  });
}
