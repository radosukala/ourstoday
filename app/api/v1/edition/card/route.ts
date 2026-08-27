import { ImageResponse } from "next/og";
import { loadEditionInputs } from "@/edition/data";
import { composeEdition } from "@/edition/compose";
import { CARD_SIZES, editionCard, loadEditionFonts } from "@/edition/card";
import { jsonError } from "@/lib/http";

/**
 * Today's edition card as a 4:5 feed image (1080×1350), for posting next to
 * the edition text. One fixed format, composed from the ledger, so the card
 * cannot say something the record does not.
 *
 * CDN-cached for the same Neon-suspend reason /status is: scrapers and
 * curious readers must not keep the database awake. Fifteen minutes of
 * staleness on a daily artifact is nothing.
 */
export async function GET() {
  try {
    const edition = composeEdition(await loadEditionInputs());
    return new ImageResponse(editionCard(edition, "feed"), {
      ...CARD_SIZES.feed,
      fonts: await loadEditionFonts(),
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=86400",
        "Content-Disposition": `inline; filename="ours-today-day-${edition.day}.png"`,
      },
    });
  } catch {
    return jsonError("EDITION_CARD_UNAVAILABLE", "The edition card cannot be rendered here.", 503);
  }
}
