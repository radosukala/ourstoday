import { loadEditionInputs } from "@/edition/data";
import { buildCardAltText, buildLinkedInPost, buildXPost, composeEdition } from "@/edition/compose";
import { jsonOk, jsonError } from "@/lib/http";

export const revalidate = 300;

/**
 * The edition as data: the four tape lines plus starting share language for
 * X and LinkedIn. `pnpm edition` reads this instead of the database so the
 * text a person posts is composed from the same deployed truth the public
 * page shows — never from a laptop's memory of it.
 *
 * Public and unauthenticated on purpose, like /api/v1/participation: the
 * numbers behind a public claim belong to the people reading the claim.
 */
export async function GET() {
  try {
    const edition = composeEdition(await loadEditionInputs());
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
      card: "/api/v1/edition/card",
    });
  } catch {
    return jsonError("EDITION_UNAVAILABLE", "The edition cannot be composed here.", 503);
  }
}
