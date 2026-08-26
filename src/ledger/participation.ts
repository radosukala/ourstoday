import { getSql, toDate, type DbTimestamp } from "@/db/sqltype";

/**
 * Participation, read from the canonical log.
 *
 * This is deliberately NOT analytics. Nothing here observes a visitor: no
 * script runs in anyone's browser, no cookie is set, no session, referrer,
 * device or address is recorded. Every number below is derived from entries
 * that people deliberately sealed, and each of those is already public.
 *
 * The published privacy notice says "no tracking, no analytics, no
 * third-party script" and the content security policy enforces it. That claim
 * stays true, because measuring what the ledger contains is a different act
 * from measuring the people who look at it.
 */
export interface ParticipationTotals {
  entries: number;
  relayArrivals: number;
  firstContinuations: number;
  witnessedEntries: number;
  /** Places someone has continued from. Not popularity: a property of the graph. */
  placesContinued: number;
  withdrawnOrVoided: number;
  firstEntryAt: Date | null;
  latestEntryAt: Date | null;
}

export interface ParticipationDay {
  day: string;
  entries: number;
  arrivedThroughRelay: number;
  witnessed: number;
}

export async function readParticipation(): Promise<{
  totals: ParticipationTotals;
  daily: ParticipationDay[];
}> {
  const sql = getSql();
  const totalRows = await sql.unsafe<
    {
      entries: number;
      relay_arrivals: number;
      first_continuations: number;
      witnessed_entries: number;
      places_continued: number;
      withdrawn_or_voided: number;
      first_entry_at: DbTimestamp | null;
      latest_entry_at: DbTimestamp | null;
    }[]
  >("SELECT * FROM public.participation_totals");
  const dailyRows = await sql.unsafe<
    { day: DbTimestamp; entries: number; arrived_through_relay: number; witnessed: number }[]
  >("SELECT * FROM public.participation_daily");

  const t = totalRows[0];
  return {
    totals: {
      entries: t?.entries ?? 0,
      relayArrivals: t?.relay_arrivals ?? 0,
      firstContinuations: t?.first_continuations ?? 0,
      witnessedEntries: t?.witnessed_entries ?? 0,
      placesContinued: t?.places_continued ?? 0,
      withdrawnOrVoided: t?.withdrawn_or_voided ?? 0,
      firstEntryAt: t?.first_entry_at ? toDate(t.first_entry_at) : null,
      latestEntryAt: t?.latest_entry_at ? toDate(t.latest_entry_at) : null,
    },
    daily: dailyRows.map((row) => ({
      // The view returns a date; normalize to a plain YYYY-MM-DD string so the
      // shape is identical whether the driver revives it or not.
      day: toDate(row.day).toISOString().slice(0, 10),
      entries: row.entries,
      arrivedThroughRelay: row.arrived_through_relay,
      witnessed: row.witnessed,
    })),
  };
}
