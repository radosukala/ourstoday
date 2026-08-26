
import { getSql } from "@/db/sqltype";
import { foundingState } from "@/ledger/state";
import { jsonError, jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Liveness + dependency state. Exposes no private configuration. */
export async function GET() {
  try {
    await getSql()`SELECT 1`;
  } catch {
    return jsonError("DATABASE_UNAVAILABLE", "The database is not reachable.", 503);
  }
  const state = await foundingState();
  return jsonOk({
    service: "OURS TODAY",
    ledger: state.ledgerState,
    canAcceptEntries: state.canAcceptEntries,
    time: new Date().toISOString(),
  });
}

