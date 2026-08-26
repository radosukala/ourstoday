import { listAnchors, ANCHOR_ALGORITHM } from "@/ledger/anchor";
import { jsonOk, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Published Merkle roots, as JSON.
 *
 * An anchor is only worth something if a stranger can check it against their
 * own copy without asking permission, so this endpoint is public, unauthenticated
 * and carries the algorithm identifier and the sequence range each root covers.
 */
export async function GET() {
  try {
    const anchors = await listAnchors(500);
    return jsonOk({
      algorithm: ANCHOR_ALGORITHM,
      leafPrefix: "ours.anchor.leaf/1 ",
      nodePrefix: "ours.anchor.node/1 ",
      note: "A root commits to its SEQUENCE RANGE, not to the calendar period: publishing an anchor appends an event to that same period.",
      anchors: anchors.map((a) => ({
        periodKind: a.periodKind,
        periodLabel: a.periodLabel,
        algorithm: a.algorithm,
        merkleRoot: a.merkleRoot,
        eventSeqFrom: a.eventSeqFrom,
        eventSeqTo: a.eventSeqTo,
        eventCount: a.eventCount,
        locations: a.locations,
        evidenceUri: a.evidenceUri,
        publishedAt: a.publishedAt.toISOString(),
      })),
    });
  } catch {
    return jsonError(
      "ANCHORS_UNAVAILABLE",
      "Anchor state is unavailable in this environment.",
      503,
    );
  }
}
