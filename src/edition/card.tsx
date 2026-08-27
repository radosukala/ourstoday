import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Edition } from "./compose";

/**
 * The edition card: one fixed visual format, generated from the ledger, so a
 * feed can recognize an OURS day before reading a word of it. Same skeleton
 * every day; only the truth changes.
 *
 * Rendered with next/og (satori). Fonts are committed files — the CSP
 * philosophy applies to generation too: no third-party fetch at render time.
 * Archivo Black stands in for the site's heavy system grotesk; IBM Plex Mono
 * for its mono stack. Both are OFL-licensed (see fonts/README.md).
 */

export const CARD_SIZES = {
  /** 4:5 portrait for X and LinkedIn feed posts. */
  feed: { width: 1080, height: 1350 },
  /** Standard share-preview size for /today. */
  og: { width: 1200, height: 630 },
} as const;

export type CardVariant = keyof typeof CARD_SIZES;

const PAPER = "#f2efe6";
const INK = "#11110f";
const SIGNAL_INK = "#c43a18";
const ACID = "#d8ff45";
const QUIET = "rgba(17, 17, 15, 0.62)";

const DISPLAY = "Archivo Black";
const MONO = "IBM Plex Mono";

interface FontSpec {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

let fontsPromise: Promise<FontSpec[]> | null = null;

/** Committed font files; failing to find them is a build defect, so fail loudly. */
export function loadEditionFonts(): Promise<FontSpec[]> {
  fontsPromise ??= (async () => {
    const dir = path.join(process.cwd(), "src", "edition", "fonts");
    const [display, mono, monoBold] = await Promise.all([
      readFile(path.join(dir, "ArchivoBlack-Regular.ttf")),
      readFile(path.join(dir, "IBMPlexMono-Regular.ttf")),
      readFile(path.join(dir, "IBMPlexMono-Bold.ttf")),
    ]);
    const buf = (b: Buffer): ArrayBuffer =>
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    return [
      { name: DISPLAY, data: buf(display), weight: 400 as const, style: "normal" as const },
      { name: MONO, data: buf(mono), weight: 400 as const, style: "normal" as const },
      { name: MONO, data: buf(monoBold), weight: 700 as const, style: "normal" as const },
    ];
  })();
  return fontsPromise;
}

function TapeRow({
  label,
  value,
  variant,
  hot,
}: {
  label: string;
  value: string;
  variant: CardVariant;
  hot?: boolean;
}) {
  const feed = variant === "feed";
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: feed ? 28 : 20 }}>
      <div
        style={{
          display: "flex",
          width: feed ? 232 : 184,
          flexShrink: 0,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: feed ? 27 : 21,
          letterSpacing: 1,
          color: hot ? SIGNAL_INK : INK,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "block",
          flexGrow: 1,
          fontFamily: MONO,
          fontSize: feed ? 27 : 21,
          lineHeight: 1.45,
          color: INK,
          lineClamp: feed ? 3 : 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function editionCard(edition: Edition, variant: CardVariant) {
  const { width, height } = CARD_SIZES[variant];
  const feed = variant === "feed";
  const dayText = `DAY ${edition.day}`;
  // "DAY 2" fills the measure at 216px; longer counters shrink to keep fitting.
  const daySize = dayText.length <= 5 ? 216 : dayText.length <= 6 ? 186 : 158;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: PAPER,
        color: INK,
        padding: feed ? "56px 64px" : "44px 52px",
      }}
    >
      {/* Masthead */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: DISPLAY,
            fontSize: feed ? 92 : 64,
            letterSpacing: -5,
            lineHeight: 1,
          }}
        >
          OURS
        </div>
        {!feed && (
          <div
            style={{
              display: "flex",
              backgroundColor: ACID,
              padding: "8px 18px",
              fontFamily: DISPLAY,
              fontSize: 40,
              lineHeight: 1,
            }}
          >
            {dayText}
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            fontFamily: MONO,
            fontSize: feed ? 23 : 19,
            lineHeight: 1.4,
            letterSpacing: 1,
          }}
        >
          <div style={{ display: "flex", fontWeight: 700 }}>THE EDITION</div>
          <div style={{ display: "flex", color: QUIET }}>{edition.dateLabel}</div>
          {feed && (
            <div
              style={{
                display: "flex",
                backgroundColor: ACID,
                marginTop: 10,
                padding: "7px 12px",
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: 2,
              }}
            >
              FORMING IN PUBLIC
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          height: feed ? 8 : 6,
          backgroundColor: INK,
          marginTop: feed ? 26 : 20,
        }}
      />

      {/* Day counter (feed) */}
      {feed && (
        <div
          style={{
            display: "flex",
            fontFamily: DISPLAY,
            fontSize: daySize,
            lineHeight: 0.95,
            letterSpacing: -8,
            color: SIGNAL_INK,
            marginTop: 36,
          }}
        >
          {dayText}
        </div>
      )}

      {/* Tapes */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: feed ? 34 : 22,
          marginTop: feed ? 52 : 30,
        }}
      >
        <TapeRow label="FORMED" value={edition.formed} variant={variant} />
        <TapeRow label="BUILT" value={edition.built} variant={variant} />
        <TapeRow label="NOT YET" value={edition.notYet} variant={variant} hot />
        <TapeRow label="OPEN" value={edition.open} variant={variant} />
      </div>

      <div style={{ display: "flex", flexGrow: 1 }} />

      {/* Lock */}
      <div
        style={{
          display: "block",
          fontFamily: DISPLAY,
          fontSize: feed ? 40 : 27,
          lineHeight: 1.12,
          letterSpacing: -1,
        }}
      >
        {edition.lockLine}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          height: feed ? 4 : 3,
          backgroundColor: INK,
          marginTop: feed ? 30 : 18,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: feed ? 20 : 14,
          fontFamily: MONO,
          fontSize: feed ? 18 : 15,
          letterSpacing: 1,
        }}
      >
        <div style={{ display: "flex", color: QUIET }}>{edition.statusLine}</div>
        <div style={{ display: "flex", fontWeight: 700 }}>OURSTODAY.COM/TODAY</div>
      </div>
    </div>
  );
}
