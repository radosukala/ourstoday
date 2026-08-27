import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { EditionRangeError, loadEditionInputs } from "@/edition/data";
import { composeEdition } from "@/edition/compose";
import { CARD_SIZES, editionCard, loadEditionFonts } from "@/edition/card";
import { jsonError } from "@/lib/http";

/**
 * The edition card as a 4:5 feed image (1080×1350), for posting next to the
 * edition text. One fixed format, composed from the ledger, so the card
 * cannot say something the record does not. `?day=N` renders any archived
 * day; the default is the latest completed day.
 *
 * CDN-cached for the same Neon-suspend reason /status is: scrapers and
 * curious readers must not keep the database awake. Fifteen minutes of
 * staleness on a daily artifact is nothing.
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
    return new ImageResponse(editionCard(edition, "feed"), {
      ...CARD_SIZES.feed,
      fonts: await loadEditionFonts(),
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400",
        "Content-Disposition": `inline; filename="ours-today-day-${edition.day}.png"`,
      },
    });
  } catch (error) {
    if (error instanceof EditionRangeError) {
      return jsonError("EDITION_OUT_OF_RANGE", error.message, 404);
    }
    return jsonError("EDITION_CARD_UNAVAILABLE", "The edition card cannot be rendered here.", 503);
  }
}
