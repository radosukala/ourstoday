import { LOCK_LINE, STATUS_LINE } from "@/legal/documents";

/**
 * The Edition: the daily public record, composed from the canonical ledger.
 *
 * OURS.md §7 adopts that external networks distribute and never hold memory
 * or authority. The Edition is the distribution instrument for that rule: a
 * fixed four-line skeleton (FORMED / BUILT / NOT YET / OPEN) generated from
 * what the ledger actually contains, so the daily post cannot drift from the
 * record it describes. Composition is pure and takes its inputs as data; the
 * database is consulted only in `data.ts`.
 *
 * Every line degrades to an explicit UNAVAILABLE statement rather than a
 * plausible invention, for the same reason /status does: a marketing surface
 * that guesses is indistinguishable from one that lies.
 */

/** Day 1 of OURS, in UTC. The day counter is chronology, not a countdown. */
export const DAY_ONE_UTC = "2026-08-26";

const MS_PER_DAY = 86_400_000;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function parseUtcDate(dateUtc: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateUtc)) {
    throw new Error("Edition dates are UTC calendar days in YYYY-MM-DD form, got " + dateUtc);
  }
  return new Date(dateUtc + "T00:00:00.000Z");
}

/** 2026-08-26 → 1, 2026-08-27 → 2. Dates before Day 1 are a caller bug. */
export function editionDayNumber(dateUtc: string): number {
  const diff = parseUtcDate(dateUtc).getTime() - parseUtcDate(DAY_ONE_UTC).getTime();
  if (diff < 0) {
    throw new Error("There is no edition before Day 1 (" + DAY_ONE_UTC + ")");
  }
  return Math.floor(diff / MS_PER_DAY) + 1;
}

/** 2026-08-27 → "27 AUG 2026", the masthead date form used across the site. */
export function editionDateLabel(dateUtc: string): string {
  const d = parseUtcDate(dateUtc);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** 3 → "#000003", the public ordinal form from the ledger pages. */
export function formatOrdinal(ordinal: number): string {
  return "#" + String(ordinal).padStart(6, "0");
}

/**
 * The current open case. A founder-steward maintained constant until
 * canonical proposals exist (Phase B); updating it is an edit with a diff,
 * not a database write.
 */
export const OPEN_CASE = {
  id: "P-0001",
  title: "When does the Founding Era end?",
  url: "https://ourstoday.com/#decision",
} as const;

export interface EditionInputs {
  /** The UTC calendar day this edition describes. */
  dateUtc: string;
  /** Ledger-derived total, or null when no projection can answer. */
  totals: { entries: number } | null;
  /** Participation for `dateUtc` specifically; zeros are a real answer. */
  today: { entries: number; arrivedThroughRelay: number; witnessed: number } | null;
  /** Highest sealed place, for "newest place" phrasing. */
  newestEntry: { ordinal: number; displayName: string | null; publicStatus: string } | null;
  gates: { met: number; total: number } | null;
  ledger: { state: "OPEN" | "CLOSED" | "PAUSED"; canAcceptEntries: boolean } | null;
  /** Today's PUBLIC non-entry receipt events, newest first. */
  builtEvents: { type: string; payload: Record<string, unknown> }[] | null;
}

export interface Edition {
  day: number;
  dateUtc: string;
  dateLabel: string;
  formed: string;
  built: string;
  notYet: string;
  open: string;
  openUrl: string;
  statusLine: string;
  lockLine: string;
}

const UNAVAILABLE = "Unavailable in this environment.";

function formedLine(inputs: EditionInputs): string {
  const { totals, today, newestEntry, ledger } = inputs;
  if (totals === null) return UNAVAILABLE;

  const parts: string[] = [];
  if (today === null || today.entries === 0) {
    parts.push("No new entries.");
  } else {
    const relay =
      today.arrivedThroughRelay > 0 ? `, ${today.arrivedThroughRelay} through a relay` : "";
    parts.push(`${today.entries} entered${relay}.`);
    if (newestEntry) {
      const name =
        newestEntry.publicStatus === "SEALED" && newestEntry.displayName
          ? " · " + newestEntry.displayName
          : "";
      parts.push(`Newest place ${formatOrdinal(newestEntry.ordinal)}${name}.`);
    }
  }
  parts.push(`${totals.entries} ${totals.entries === 1 ? "person" : "people"} in the ledger.`);
  if (ledger !== null) {
    parts.push(
      ledger.canAcceptEntries
        ? "Entry is open."
        : ledger.state === "PAUSED"
          ? "Entry is paused."
          : "Entry is closed.",
    );
  }
  return parts.join(" ");
}

/** Human labels for receipt events. Unknown types stay visible, not hidden. */
function receiptLabel(event: { type: string; payload: Record<string, unknown> }): string {
  switch (event.type) {
    case "build.deployed": {
      const commit = typeof event.payload.commit === "string" ? event.payload.commit : null;
      return "New build deployed" + (commit ? ` (${commit.slice(0, 7)})` : "") + ".";
    }
    case "ledger.gate.changed": {
      const title = typeof event.payload.title === "string" ? event.payload.title : null;
      return title ? `Gate moved: ${title}.` : "A launch gate moved.";
    }
    case "anchor.published":
      return "Anchor published over the canonical log.";
    case "conformance.verified":
      return "Conformance run: PASS, published.";
    case "conformance.failed":
      return "Conformance run: FAIL, published anyway.";
    case "ledger.system_state.changed": {
      const to = typeof event.payload.to === "string" ? event.payload.to : null;
      return to ? `Write gate moved to ${to}.` : "Write gate moved.";
    }
    default:
      return `Receipt: ${event.type}.`;
  }
}

function builtLine(inputs: EditionInputs): string {
  if (inputs.builtEvents === null) return UNAVAILABLE;
  if (inputs.builtEvents.length === 0) return "No new receipts today.";
  const labels = inputs.builtEvents.map(receiptLabel);
  const shown = labels.slice(0, 2);
  const more = labels.length - shown.length;
  return (
    shown.join(" ") + (more > 0 ? ` +${more} more ${more === 1 ? "receipt" : "receipts"}.` : "")
  );
}

function notYetLine(inputs: EditionInputs): string {
  const gate =
    inputs.gates === null
      ? "Gate state unavailable."
      : `${inputs.gates.total - inputs.gates.met} of ${inputs.gates.total} launch gates open.`;
  return `Legal membership. ${gate}`;
}

export function composeEdition(inputs: EditionInputs): Edition {
  return {
    day: editionDayNumber(inputs.dateUtc),
    dateUtc: inputs.dateUtc,
    dateLabel: editionDateLabel(inputs.dateUtc),
    formed: formedLine(inputs),
    built: builtLine(inputs),
    notYet: notYetLine(inputs),
    open: `${OPEN_CASE.id} — ${OPEN_CASE.title}`,
    openUrl: OPEN_CASE.url,
    statusLine: STATUS_LINE,
    lockLine: LOCK_LINE,
  };
}

/**
 * Share texts. These are STARTING LANGUAGE: the person posting edits and
 * publishes under their own hand. OURS never publishes on anyone's behalf.
 */
export function buildXPost(edition: Edition): string {
  return [
    `OURS TODAY — DAY ${edition.day}`,
    "",
    `FORMED — ${edition.formed}`,
    `BUILT — ${edition.built}`,
    `NOT YET — ${edition.notYet}`,
    `OPEN — ${edition.open}`,
    "",
    edition.lockLine,
    "ourstoday.com/today",
  ].join("\n");
}

export function buildLinkedInPost(edition: Edition): string {
  return [
    `OURS TODAY — Day ${edition.day} of forming a member-owned network in public.`,
    "",
    "[One human sentence about today goes here — edit before posting.]",
    "",
    `FORMED — ${edition.formed}`,
    `BUILT — ${edition.built}`,
    `NOT YET — ${edition.notYet}`,
    `OPEN — ${edition.open}`,
    "",
    "Every number above comes from the canonical ledger, not from a dashboard of feelings. " +
      "The parts that are not true yet are listed on the page itself, every day, until they are.",
    "",
    edition.lockLine,
    "→ ourstoday.com/today",
  ].join("\n");
}

/** Alt text for the edition card. X allows 1,000 characters; stay under it. */
export function buildCardAltText(edition: Edition): string {
  const text =
    `OURS TODAY edition card, Day ${edition.day}, ${edition.dateLabel}. ` +
    `FORMED: ${edition.formed} ` +
    `BUILT: ${edition.built} ` +
    `NOT YET: ${edition.notYet} ` +
    `OPEN: ${edition.open}. ` +
    `${edition.statusLine}. ${edition.lockLine} ourstoday.com/today`;
  return text.length <= 1000 ? text : text.slice(0, 997) + "...";
}
