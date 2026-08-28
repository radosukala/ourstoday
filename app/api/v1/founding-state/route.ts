import { foundingState } from "@/ledger/state";
import { jsonOk } from "@/lib/http";
import { STATUS_LINE } from "@/legal/documents";

export const dynamic = "force-dynamic";

/** Public founding state. No private data, ever. */
export async function GET() {
  const state = await foundingState();
  return jsonOk({
    state: {
      ledgerState: state.ledgerState,
      canAcceptEntries: state.canAcceptEntries,
      capacity: state.capacityAvailable ? state.capacity : null,
      versions: state.versions,
    },
    entryCount: state.capacityAvailable ? state.capacity.issued : null,
    legalStatusLine: STATUS_LINE,
  });
}
