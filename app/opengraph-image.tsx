import { ImageResponse } from "next/og";
import { loadEditionFonts } from "@/edition/card";

export const alt = "Nobody leaves first. Everybody leaves together. The Founding Million.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card, in the site's own two faces.
 *
 * It previously asked for weight 900 of Arial and got satori's default face,
 * which has no such weight — so the card rendered light and wide beside a
 * homepage set in a heavy grotesque, and the two did not look like one
 * project. Arimo is the Arial-metric twin used for `--sans`; DejaVu Sans Mono
 * is the Menlo ancestor used for `--mono`. Both are committed to the repo and
 * read from disk, because the CSP forbids fetching a font at render time.
 */
const DISPLAY = "Arimo";
const MONO = "DejaVu Sans Mono";

export default async function OpenGraphImage() {
  const fonts = await loadEditionFonts();
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "38px 48px 42px",
        background: "#11110f",
        color: "#f2efe6",
        fontFamily: DISPLAY,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 22,
          borderBottom: "1px solid rgba(242,239,230,.24)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-2px" }}>OURS</span>
          <span
            style={{
              color: "#cfff4a",
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "2px",
            }}
          >
            FOUNDING MILLION
          </span>
        </div>
        <span
          style={{
            color: "rgba(242,239,230,.58)",
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: "1.5px",
          }}
        >
          000001—1,000,000
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div
          style={{
            maxWidth: 1090,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-5px",
            lineHeight: 0.9,
          }}
        >
          NOBODY LEAVES FIRST.
        </div>
        <div
          style={{
            maxWidth: 1090,
            marginTop: 12,
            color: "#ff4b1f",
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-5px",
            lineHeight: 0.9,
          }}
        >
          EVERYBODY LEAVES TOGETHER.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 36,
          paddingTop: 22,
          borderTop: "1px solid rgba(242,239,230,.24)",
          fontFamily: MONO,
          fontWeight: 700,
        }}
      >
        <span style={{ maxWidth: 720, fontSize: 17, lineHeight: 1.35, letterSpacing: "1px" }}>
          THE FIRST 1,000,000 FORM ENOUGH DEMAND TO BUILD ANYTHING.
        </span>
        <span
          style={{
            color: "#cfff4a",
            fontSize: 13,
            lineHeight: 1.45,
            letterSpacing: "1px",
            textAlign: "right",
          }}
        >
          ONE PERSON · ONE FOUNDING RIGHT · FREE
        </span>
      </div>
    </div>,
    { ...size, fonts },
  );
}
