import { getSql } from "@/db/sqltype";
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
function classify(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code ?? "";

  if (/Missing required environment variable/i.test(message)) return "CONFIG_MISSING";
  if (/Refusing to connect/i.test(message)) return "CONFIG_REFUSED_INSECURE";
  if (code === "ENOTFOUND" || /getaddrinfo/i.test(message)) return "DNS_FAILURE";
  if (code === "ECONNREFUSED") return "CONNECTION_REFUSED";
  if (code === "CONNECT_TIMEOUT" || code === "ETIMEDOUT" || /timeout/i.test(message)) {
    return "TIMEOUT";
  }
  if (/password authentication|SASL|SCRAM|role .* does not exist/i.test(message)) {
    return "AUTH_REJECTED";
  }
  if (/certificate|self signed|SSL|TLS|pg_hba/i.test(message)) return "TLS_FAILURE";
  if (/database .* does not exist/i.test(message)) return "DATABASE_MISSING";
  if (/relation .* does not exist|schema .* does not exist/i.test(message)) {
    return "SCHEMA_NOT_MIGRATED";
  }
  return "UNKNOWN";
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
 */
export async function GET() {
  try {
    await getSql()`SELECT 1`;
  } catch (error) {
    const reason = classify(error);
    // The full error goes to the server log, where the redaction rules apply.
    log.error("health.database_unavailable", { reason });
    return jsonError(
      "DATABASE_UNAVAILABLE",
      "The database is not reachable (" + reason + "). commit=" + deployedCommit(),
      503,
    );
  }

  // Connected but unmigrated is its own state, and it is what a fresh
  // provisioning looks like. Reporting it as healthy would be a lie.
  try {
    await getSql()`SELECT 1 FROM ledger.system_state WHERE id = 1`;
  } catch (error) {
    log.error("health.schema_unavailable", { reason: classify(error) });
    return jsonError(
      "SCHEMA_NOT_MIGRATED",
      "The database is reachable but has no ledger schema. Run db:migrate against it. commit=" +
        deployedCommit(),
      503,
    );
  }

  let state: Awaited<ReturnType<typeof foundingState>>;
  try {
    state = await foundingState();
  } catch (error) {
    log.error("health.state_unavailable", { reason: classify(error) });
    return jsonError("STATE_UNAVAILABLE", "Ledger state could not be read.", 503);
  }

  return jsonOk({
    service: "OURS TODAY",
    ledger: state.ledgerState,
    canAcceptEntries: state.canAcceptEntries,
    commit: deployedCommit(),
    time: new Date().toISOString(),
  });
}
