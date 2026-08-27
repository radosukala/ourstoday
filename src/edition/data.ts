import { readParticipation } from "@/ledger/participation";
import { readGates } from "@/ledger/gates";
import { foundingState } from "@/ledger/state";
import { formationTape, newestPublicEntry } from "@/ledger/queries";
import { getSql } from "@/db/sqltype";
import type { EditionInputs } from "./compose";

/**
 * Gather the edition's inputs from the same public projections the rest of
 * the site reads. Each source degrades independently to null so one
 * unavailable projection produces an honest UNAVAILABLE line, not a failed
 * edition — the daily page publishing through an incident is the point of
 * having one.
 */

/** Receipt-bearing event types shown on the BUILT line. Entry and relay
 *  events belong to FORMED and are counted there via participation. */
const BUILT_EVENT_TYPES = new Set([
  "build.deployed",
  "ledger.gate.changed",
  "anchor.published",
  "conformance.verified",
  "conformance.failed",
  "ledger.system_state.changed",
]);

/**
 * The participation projection arrived in migration 0007; an environment can
 * run newer code against a database that predates it. The older system_status
 * view still answers "how many entries", so the FORMED line keeps its total
 * instead of going dark for the whole edition.
 */
async function entryCountFallback(): Promise<{ entries: number } | null> {
  try {
    const rows = await getSql().unsafe<{ entry_count: number }[]>(
      "SELECT entry_count FROM public.system_status",
    );
    return rows[0] ? { entries: rows[0].entry_count } : null;
  } catch {
    return null;
  }
}

export async function loadEditionInputs(now: Date = new Date()): Promise<EditionInputs> {
  const dateUtc = now.toISOString().slice(0, 10);

  const [participation, newest, gates, state, tape] = await Promise.all([
    readParticipation().catch(() => null),
    newestPublicEntry().catch(() => null),
    readGates().catch(() => null),
    foundingState().catch(() => null),
    // The tape returns the latest 50 PUBLIC events; on a day with more events
    // than that, older same-day receipts fall off the BUILT line. They remain
    // in the canonical log — the edition is a summary, not the record.
    formationTape(50).catch(() => null),
  ]);

  return {
    dateUtc,
    totals: participation ? { entries: participation.totals.entries } : await entryCountFallback(),
    today: participation
      ? (participation.daily.find((d) => d.day === dateUtc) ?? {
          entries: 0,
          arrivedThroughRelay: 0,
          witnessed: 0,
        })
      : null,
    newestEntry: newest
      ? {
          ordinal: newest.ordinal,
          displayName: newest.displayName,
          publicStatus: newest.publicStatus,
        }
      : null,
    gates: gates ? { met: gates.met, total: gates.total } : null,
    ledger: state ? { state: state.ledgerState, canAcceptEntries: state.canAcceptEntries } : null,
    builtEvents: tape
      ? tape
          .filter(
            (item) =>
              BUILT_EVENT_TYPES.has(item.type) &&
              item.occurredAt.toISOString().slice(0, 10) === dateUtc,
          )
          .map((item) => ({ type: item.type, payload: item.payloadSummary }))
      : null,
  };
}
