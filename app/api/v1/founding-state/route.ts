import { foundingState } from "@/ledger/state";
import { listPublicEntries } from "@/ledger/queries";
import { jsonOk } from "@/lib/http";
import { STATUS_LINE } from "@/legal/documents";

export const dynamic = "force-dynamic";

/** Public founding state. No private data, ever. */
export async function GET() {
  const state = await foundingState();
  let entryCount: number | null = null;
  try {
    const entries = await listPublicEntries(1000);
    entryCount = entries.length;
  } catch {
    entryCount = null;
  }
  return jsonOk({
    state: {
      ledgerState: state.ledgerState,
      canAcceptEntries: state.canAcceptEntries,
      versions: state.versions,
    },
    entryCount,
    legalStatusLine: STATUS_LINE,
  });
}
