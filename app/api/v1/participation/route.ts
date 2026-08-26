import { readParticipation } from "@/ledger/participation";
import { jsonOk, jsonError } from "@/lib/http";

export const revalidate = 60;

/**
 * Participation, as JSON.
 *
 * Public and unauthenticated on purpose. If OURS is going to make claims
 * about how the network is forming, the numbers behind them belong to the
 * people reading the claim - and anyone who exported the log with
 * `ours-fork` can recompute every one of these offline and check them.
 *
 * There is no visitor data here and there is none to add: no script runs in
 * anyone's browser, so nothing about a reader is ever measured.
 */
export async function GET() {
  try {
    const { totals, daily } = await readParticipation();
    return jsonOk({
      note: "Derived from the canonical ledger, not from visitors. No script, no cookie, no session, no referrer, no address.",
      totals: {
        ...totals,
        firstEntryAt: totals.firstEntryAt?.toISOString() ?? null,
        latestEntryAt: totals.latestEntryAt?.toISOString() ?? null,
      },
      daily,
    });
  } catch {
    return jsonError("PARTICIPATION_UNAVAILABLE", "Participation is unavailable here.", 503);
  }
}
