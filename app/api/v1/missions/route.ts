import { readMissionBoard, readNoticeTotals } from "@/ledger/missions";
import { jsonError, jsonOk } from "@/lib/http";

export const revalidate = 60;

/**
 * The board, as data.
 *
 * Public and unauthenticated for the same reason participation is: the
 * numbers behind a public claim belong to the people reading the claim, and
 * every one of them is recomputable from an exported log.
 */
export async function GET() {
  try {
    const [missions, totals] = await Promise.all([readMissionBoard(), readNoticeTotals()]);
    return jsonOk({
      note: "A notice is a conditional commitment to move when the threshold is reached. It binds nobody below it.",
      totals,
      missions: missions.map((m) => ({
        slug: m.slug,
        title: m.title,
        practice: m.practice,
        incumbents: m.incumbents,
        noticeCount: m.noticeCount,
        threshold: m.threshold,
        state: m.state,
      })),
    });
  } catch {
    return jsonError("BOARD_UNAVAILABLE", "The board is unavailable here.", 503);
  }
}
