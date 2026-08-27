import { readGates } from "@/ledger/gates";
import { foundingState } from "@/ledger/state";
import {
  entryStatsForWindow,
  formationTape,
  newestPublicEntryInWindow,
  totalEntriesBefore,
} from "@/ledger/queries";
import { dayToDateUtc, latestReportableDay, type EditionInputs } from "./compose";

/**
 * Gather one edition's inputs. FORMED and BUILT are computed for the
 * reported UTC day from the ledger itself, so every past edition is
 * recomputable in any environment — the log is the archive, nothing is
 * stored twice. NOT YET and OPEN are live lines by nature: what is not yet
 * true is always evaluated now, never replayed.
 *
 * Each source degrades independently to null so one unavailable projection
 * produces an honest UNAVAILABLE line, not a failed edition — the daily page
 * publishing through an incident is the point of having one.
 */

/** Receipt-bearing event types shown on the BUILT line. Entry and relay
 *  events belong to FORMED and are counted there from the ledger. */
const BUILT_EVENT_TYPES = new Set([
  "build.deployed",
  "ledger.gate.changed",
  "anchor.published",
  "conformance.verified",
  "conformance.failed",
  "ledger.system_state.changed",
]);

export class EditionRangeError extends Error {}

/**
 * Inputs for the edition of `day` (defaults to the latest completed day —
 * the morning edition reports yesterday). Throws EditionRangeError for a day
 * that has not completed yet or predates Day 1.
 */
export async function loadEditionInputs(
  day?: number,
  now: Date = new Date(),
): Promise<EditionInputs> {
  const latest = latestReportableDay(now);
  const reportedDay = day ?? latest;
  if (!Number.isInteger(reportedDay) || reportedDay < 1 || reportedDay > latest) {
    throw new EditionRangeError(
      `Editions exist for days 1 to ${latest}; day ${String(day)} has no completed record.`,
    );
  }

  const dateUtc = dayToDateUtc(reportedDay);
  const startIso = dateUtc + "T00:00:00.000Z";
  const endIso = dayToDateUtc(reportedDay + 1) + "T00:00:00.000Z";

  const [stats, total, newest, gates, state, tape] = await Promise.all([
    entryStatsForWindow(startIso, endIso).catch(() => null),
    totalEntriesBefore(endIso).catch(() => null),
    newestPublicEntryInWindow(startIso, endIso).catch(() => null),
    readGates().catch(() => null),
    foundingState().catch(() => null),
    // The tape returns the latest 200 PUBLIC events; a reported day whose
    // receipts have scrolled past that window shows fewer than it had. They
    // remain in the canonical log — the edition is a summary, not the record.
    formationTape(200).catch(() => null),
  ]);

  return {
    dateUtc,
    totals: total === null ? null : { entries: total },
    reportedDay: stats,
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
