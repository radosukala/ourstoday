import { getSql, toDate, type DbTimestamp } from "@/db/sqltype";

/** Safe public projections read ONLY from allowlisted views or serializers. */

export interface PublicEntry {
  ordinal: number;
  displayName: string | null;
  enteredAt: Date;
  predecessorOrdinal: number | null;
  relayState: "OPEN" | "CONTINUED";
  firstContinuationOrdinal: number | null;
  publicStatus: string;
  declarationVersion: string;
  protocolVersion: string;
  originKind: string;
}

function mapRow(row: {
  ordinal: number;
  display_name: string | null;
  entered_at: DbTimestamp;
  predecessor_ordinal: number | null;
  relay_state: string;
  first_continuation_ordinal: number | null;
  public_status: string;
  declaration_version: string;
  protocol_version: string;
  origin_kind: string;
}): PublicEntry {
  return {
    ordinal: row.ordinal,
    displayName: row.display_name,
    enteredAt: toDate(row.entered_at),
    predecessorOrdinal: row.predecessor_ordinal,
    relayState: row.relay_state === "CONTINUED" ? "CONTINUED" : "OPEN",
    firstContinuationOrdinal: row.first_continuation_ordinal,
    publicStatus: row.public_status,
    declarationVersion: row.declaration_version,
    protocolVersion: row.protocol_version,
    originKind: row.origin_kind,
  };
}

export async function listPublicEntries(limit = 200): Promise<PublicEntry[]> {
  const rows = await getSql().unsafe<Parameters<typeof mapRow>[0][]>(
    "SELECT * FROM public.founding_ledger ORDER BY ordinal ASC LIMIT $1",
    [limit],
  );
  return rows.map(mapRow);
}

/** Highest ordinal in the public projection; the edition's "newest place". */
export async function newestPublicEntry(): Promise<PublicEntry | null> {
  const rows = await getSql().unsafe<Parameters<typeof mapRow>[0][]>(
    "SELECT * FROM public.founding_ledger ORDER BY ordinal DESC LIMIT 1",
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/**
 * The edition's per-day formation facts, computed from the public ledger
 * itself so any past day is recomputable in any environment — the log is
 * the archive; nothing is stored twice.
 */
export async function entryStatsForWindow(
  startIso: string,
  endIso: string,
): Promise<{ entries: number; relayArrivals: number }> {
  const rows = await getSql().unsafe<{ entries: number; relay_arrivals: number }[]>(
    "SELECT count(*)::int AS entries, count(predecessor_ordinal)::int AS relay_arrivals FROM public.founding_ledger WHERE entered_at >= $1::timestamptz AND entered_at < $2::timestamptz",
    [startIso, endIso],
  );
  return { entries: rows[0]?.entries ?? 0, relayArrivals: rows[0]?.relay_arrivals ?? 0 };
}

/** Highest place sealed inside a window; the reported day's newest entry. */
export async function newestPublicEntryInWindow(
  startIso: string,
  endIso: string,
): Promise<PublicEntry | null> {
  const rows = await getSql().unsafe<Parameters<typeof mapRow>[0][]>(
    "SELECT * FROM public.founding_ledger WHERE entered_at >= $1::timestamptz AND entered_at < $2::timestamptz ORDER BY ordinal DESC LIMIT 1",
    [startIso, endIso],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/** Ledger size as of an instant; the edition's end-of-day total. */
export async function totalEntriesBefore(endIso: string): Promise<number> {
  const rows = await getSql().unsafe<{ entries: number }[]>(
    "SELECT count(*)::int AS entries FROM public.founding_ledger WHERE entered_at < $1::timestamptz",
    [endIso],
  );
  return rows[0]?.entries ?? 0;
}

export async function getPublicEntry(ordinal: number): Promise<PublicEntry | null> {
  const rows = await getSql().unsafe<Parameters<typeof mapRow>[0][]>(
    "SELECT * FROM public.founding_ledger WHERE ordinal = $1 LIMIT 1",
    [ordinal],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export interface TapeItem {
  seq: number;
  type: string;
  occurredAt: Date;
  subjectRef: string;
  payloadSummary: Record<string, unknown>;
}

/**
 * Formation tape: recent PUBLIC-class canonical events only.
 * INTERNAL/PRIVATE events never surface here.
 */
export async function formationTape(limit = 50): Promise<TapeItem[]> {
  const rows = await getSql().unsafe<
    {
      seq: number;
      type: string;
      occurred_at: DbTimestamp;
      subject_ref: string;
      payload: Record<string, unknown>;
    }[]
  >(
    "SELECT seq, type, occurred_at, subject_ref, payload FROM ledger.event WHERE privacy_class = 'PUBLIC' ORDER BY seq DESC LIMIT $1",
    [limit],
  );
  return rows.map((row) => ({
    seq: row.seq,
    type: row.type,
    occurredAt: toDate(row.occurred_at),
    subjectRef: row.subject_ref,
    payloadSummary: row.payload,
  }));
}
