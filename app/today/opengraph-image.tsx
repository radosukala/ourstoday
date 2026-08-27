import { ImageResponse } from "next/og";
import { loadEditionInputs } from "@/edition/data";
import { composeEdition } from "@/edition/compose";
import { CARD_SIZES, editionCard, loadEditionFonts } from "@/edition/card";

/** Share preview for /today: the edition card itself, freshly composed. */

export const revalidate = 900;
export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt =
  "OURS TODAY edition card: the day number and the four tapes — formed, built, not yet, open — composed from the canonical ledger.";

export default async function OpenGraphImage() {
  const edition = composeEdition(await loadEditionInputs());
  return new ImageResponse(editionCard(edition, "og"), {
    ...CARD_SIZES.og,
    fonts: await loadEditionFonts(),
  });
}
