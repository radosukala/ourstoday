import { getPublicEntry } from "@/ledger/queries";
import { jsonError, jsonOk } from "@/lib/http";
import { STATUS_LINE } from "@/legal/documents";
import { FOUNDING_LIMIT, FOUNDING_RIGHT_VERSION } from "@/founding/right";

export const dynamic = "force-dynamic";

/** Safe public entry projection. Serialized explicitly; never a raw row. */
export async function GET(_req: Request, ctx: { params: Promise<{ ordinal: string }> }) {
  const { ordinal } = await ctx.params;
  const parsed = Number.parseInt(ordinal, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > FOUNDING_LIMIT) {
    return jsonError("BAD_ORDINAL", "No such entry.", 404);
  }
  const entry = await getPublicEntry(parsed).catch(() => null);
  if (!entry) return jsonError("NOT_FOUND", "No such entry.", 404);
  return jsonOk({
    entry: {
      ordinalLabel: String(entry.ordinal).padStart(6, "0"),
      displayName:
        entry.displayName ?? (entry.publicStatus === "WITHDRAWN" ? "[WITHDRAWN]" : "[UNAVAILABLE]"),
      enteredAt: entry.enteredAt.toISOString(),
      predecessorOrdinal:
        entry.predecessorOrdinal !== null
          ? String(entry.predecessorOrdinal).padStart(6, "0")
          : null,
      relayState: entry.relayState,
      firstContinuationOrdinal:
        entry.firstContinuationOrdinal !== null
          ? String(entry.firstContinuationOrdinal).padStart(6, "0")
          : null,
      publicStatus: entry.publicStatus,
      foundingRightVersion: FOUNDING_RIGHT_VERSION,
    },
    legalStatusLine: STATUS_LINE,
  });
}
