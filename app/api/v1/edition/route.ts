import type { NextRequest } from "next/server";
import { EditionRangeError, loadEditionInputs } from "@/edition/data";
import { buildCardAltText, buildLinkedInPost, buildXPost, composeEdition } from "@/edition/compose";
import { jsonOk, jsonError } from "@/lib/http";

export const revalidate = 300;

/**
 * The edition as data: the reported day's four tape lines plus starting
 * share language for X and LinkedIn. `pnpm edition` reads this instead of
 * the database so the text a person posts is composed from the same deployed
 * truth the public page shows — never from a laptop's memory of it.
 *
 * `?day=N` addresses the archive; the default is the latest completed day.
 *
 * Public and unauthenticated on purpose, like /api/v1/participation: the
 * numbers behind a public claim belong to the people reading the claim.
 */
export async function GET(request: NextRequest) {
  const dayParam = request.nextUrl.searchParams.get("day");
  let day: number | undefined;
  if (dayParam !== null) {
    day = Number.parseInt(dayParam, 10);
    if (!Number.isInteger(day) || String(day) !== dayParam) {
      return jsonError("EDITION_BAD_DAY", "day must be a positive integer.", 400);
    }
  }
  try {
    const edition = composeEdition(await loadEditionInputs(day));
    return jsonOk({
      note: "Starting language. Edit before posting; OURS never publishes on a person's behalf.",
      day: edition.day,
      dateUtc: edition.dateUtc,
      dateLabel: edition.dateLabel,
      lines: {
        formed: edition.formed,
        built: edition.built,
        notYet: edition.notYet,
        open: edition.open,
        openUrl: edition.openUrl,
      },
      statusLine: edition.statusLine,
      lockLine: edition.lockLine,
      posts: {
        x: buildXPost(edition),
        linkedin: buildLinkedInPost(edition),
      },
      cardAltText: buildCardAltText(edition),
      card: "/api/v1/edition/card" + (day !== undefined ? `?day=${day}` : ""),
    });
  } catch (error) {
    if (error instanceof EditionRangeError) {
      return jsonError("EDITION_OUT_OF_RANGE", error.message, 404);
    }
    return jsonError("EDITION_UNAVAILABLE", "The edition cannot be composed here.", 503);
  }
}
