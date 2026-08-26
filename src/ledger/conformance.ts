import { getSql, jsonParam, toDate, type DbTimestamp, type OurSql } from "@/db/sqltype";
import { appendCanonicalEvent } from "./append";
import { digestEvent } from "./events";

/**
 * The conformance suite: the institution's invariants, re-run against a real
 * database on a schedule, appending the result to the canonical log.
 *
 * PASS OR FAIL, PUBLISHED EITHER WAY, AUTOMATICALLY, BEFORE ANYONE ASKS.
 *
 * The first red receipt with a large audience watching will be a real day.
 * That it publishes anyway is decided here, in code, while the decision is
 * still cheap - which is the only time such a decision is worth anything.
 * There is deliberately no flag to suppress a failing run.
 */
export interface ConformanceCheck {
  id: string;
  /** What this asserts, in one sentence a non-engineer can check. */
  claim: string;
  passed: boolean;
  detail: string;
}

export interface ConformanceResult {
  passed: boolean;
  checks: ConformanceCheck[];
  failedChecks: number;
  eventSeqHigh: number;
  ranAt: Date;
}

type Sql = Pick<OurSql, "unsafe">;

async function count(sql: Sql, query: string, params: unknown[] = []): Promise<number> {
  const rows = await sql.unsafe<{ count: string }[]>(query, params as never);
  return Number(rows[0]?.count ?? "0");
}

/**
 * Run every invariant. Never throws for a failing check - a thrown error is a
 * broken runner, a failed check is a finding, and conflating them would let a
 * crash masquerade as "no result".
 */
export async function runConformanceChecks(sql: Sql = getSql()): Promise<ConformanceResult> {
  const checks: ConformanceCheck[] = [];
  const add = (id: string, claim: string, passed: boolean, detail: string): void => {
    checks.push({ id, claim, passed, detail });
  };

  // ---- 1. Ordinal uniqueness -------------------------------------------------
  const entries = await count(sql, "SELECT count(*)::text AS count FROM ledger.entry");
  const distinct = await count(
    sql,
    "SELECT count(DISTINCT ordinal)::text AS count FROM ledger.entry",
  );
  add(
    "ordinal-uniqueness",
    "No two entries share an ordinal.",
    entries === distinct,
    entries + " entries, " + distinct + " distinct ordinals",
  );

  // ---- 2. Ordinals are never reassigned --------------------------------------
  // A withdrawn or voided place stays consumed. If the counter ever sits at or
  // below the highest issued ordinal, a future seal would reuse a number.
  const maxOrdinalRows = await sql.unsafe<{ max: string | null }[]>(
    "SELECT max(ordinal)::text AS max FROM ledger.entry",
  );
  const counterRows = await sql.unsafe<{ next_ordinal: string }[]>(
    "SELECT next_ordinal::text AS next_ordinal FROM ledger.ordinal_counter WHERE id = 1",
  );
  const maxOrdinal = Number(maxOrdinalRows[0]?.max ?? "0");
  const nextOrdinal = Number(counterRows[0]?.next_ordinal ?? "0");
  add(
    "ordinal-never-reused",
    "The allocator can never hand out a number that already exists.",
    nextOrdinal > maxOrdinal,
    "highest issued " + maxOrdinal + ", next " + nextOrdinal,
  );

  // ---- 3. First Continuation exclusivity --------------------------------------
  const duplicateFc = await count(
    sql,
    "SELECT count(*)::text AS count FROM (SELECT predecessor_entry_id FROM ledger.first_continuation GROUP BY predecessor_entry_id HAVING count(*) > 1) d",
  );
  add(
    "first-continuation-exclusive",
    "One place vests at most one First Continuation, forever.",
    duplicateFc === 0,
    duplicateFc + " predecessors with more than one",
  );

  // ---- 4. Every First Continuation has a real arrival --------------------------
  const orphanFc = await count(
    sql,
    "SELECT count(*)::text AS count FROM ledger.first_continuation fc LEFT JOIN ledger.relay_arrival a ON a.successor_entry_id = fc.successor_entry_id AND a.predecessor_entry_id = fc.predecessor_entry_id WHERE a.successor_entry_id IS NULL",
  );
  add(
    "continuation-has-arrival",
    "No continuation exists without the arrival that produced it.",
    orphanFc === 0,
    orphanFc + " continuations without an arrival",
  );

  // ---- 5. Nobody witnesses themselves ------------------------------------------
  const selfWitness = await count(
    sql,
    "SELECT count(*)::text AS count FROM ledger.entry WHERE witness_entry_id = id",
  );
  add(
    "witness-not-self",
    "No entry attests its own personhood.",
    selfWitness === 0,
    selfWitness + " self-witnessing entries",
  );

  // ---- 6. Public projection leaks nothing private ------------------------------
  const leaky = await sql.unsafe<{ table_name: string; column_name: string }[]>(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ILIKE '%email%' OR column_name ILIKE '%auth_user%' OR column_name ILIKE '%person_id%' OR column_name ILIKE '%token%' OR column_name ILIKE '%session%' OR column_name ILIKE '%ip_address%' OR column_name ILIKE '%user_agent%' OR column_name ILIKE '%risk%')",
  );
  add(
    "no-private-columns-public",
    "No public projection exposes an email, an account id, a token, a session, an address or a risk field.",
    leaky.length === 0,
    leaky.length === 0 ? "clean" : leaky.map((r) => r.table_name + "." + r.column_name).join(", "),
  );

  // ---- 7. Append-only is enforced by the database, not by convention -----------
  const triggers = await count(
    sql,
    "SELECT count(*)::text AS count FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'ledger' AND c.relname = 'event' AND NOT t.tgisinternal",
  );
  add(
    "append-only-enforced",
    "The database itself refuses to update or delete a canonical event.",
    triggers >= 2,
    triggers + " non-internal triggers on ledger.event",
  );

  // ---- 8. The digest chain reproduces from stored rows -------------------------
  const rows = await sql.unsafe<
    {
      seq: string | number;
      type: string;
      occurred_at: DbTimestamp;
      payload: Record<string, unknown>;
      prev_digest: string | null;
      digest: string;
    }[]
  >(
    "SELECT seq, type, occurred_at, payload, prev_digest, digest FROM ledger.event ORDER BY seq ASC",
  );
  let chainOk = true;
  let breakDetail = "";
  let prev: string | null = null;
  for (const row of rows) {
    const expected = digestEvent({
      type: row.type,
      payload: row.payload,
      occurredAt: toDate(row.occurred_at),
      prevDigest: row.prev_digest,
    });
    // Say WHICH failure it is. "The chain is broken" without naming linkage or
    // digest, and without naming the event, is an alarm nobody can act on.
    if ((row.prev_digest ?? null) !== prev) {
      chainOk = false;
      breakDetail =
        "linkage breaks at seq " + row.seq + " (" + row.type + "): prev_digest does not follow";
      break;
    }
    if (expected !== row.digest) {
      chainOk = false;
      breakDetail =
        "digest breaks at seq " +
        row.seq +
        " (" +
        row.type +
        "): stored " +
        row.digest.slice(0, 12) +
        ", recomputed " +
        expected.slice(0, 12);
      break;
    }
    prev = row.digest;
  }
  add(
    "digest-chain-intact",
    "Every canonical event recomputes to its stored digest, in order.",
    chainOk,
    chainOk ? rows.length + " events verified" : breakDetail,
  );

  // ---- 9. Published anchors still describe the log they anchored ----------------
  const anchors = await sql.unsafe<
    {
      period_kind: string;
      period_label: string;
      merkle_root: string;
      event_seq_from: string | number;
      event_seq_to: string | number;
    }[]
  >(
    "SELECT period_kind, period_label, merkle_root, event_seq_from, event_seq_to FROM ledger.anchor ORDER BY published_at ASC",
  );
  let anchorsOk = true;
  const anchorDetail: string[] = [];
  if (anchors.length > 0) {
    const { computeAnchorForRange } = await import("./anchor");
    for (const anchor of anchors) {
      // Over the RANGE the root committed to. Recomputing over the period
      // would always fail, because publishing appends to that period.
      const recomputed = await computeAnchorForRange(
        Number(anchor.event_seq_from),
        Number(anchor.event_seq_to),
        sql,
      );
      if (recomputed.merkleRoot !== anchor.merkle_root) {
        anchorsOk = false;
        anchorDetail.push(anchor.period_kind + ":" + anchor.period_label + " ROOT MISMATCH");
      }
    }
  }
  add(
    "anchors-still-valid",
    "Every published Merkle root still recomputes from the events it covered.",
    anchorsOk,
    anchors.length === 0
      ? "no anchors published yet"
      : anchorDetail.join(", ") || anchors.length + " anchors verified",
  );

  // ---- 10. No reserved event type has been appended -----------------------------
  const reserved = await count(
    sql,
    "SELECT count(*)::text AS count FROM ledger.event WHERE type LIKE 'treasury.%' OR type LIKE 'instrument.%'",
  );
  add(
    "reserved-types-unused",
    "No reserved event type has been written to the canonical log.",
    reserved === 0,
    reserved + " reserved-type events",
  );

  const failedChecks = checks.filter((c) => !c.passed).length;
  const lastRow = rows[rows.length - 1];
  return {
    passed: failedChecks === 0,
    checks,
    failedChecks,
    eventSeqHigh: lastRow ? Number(lastRow.seq) : 0,
    ranAt: new Date(),
  };
}

/**
 * Run the suite and append the result. There is no path that runs the checks
 * and declines to record a failure.
 */
export async function runAndRecordConformance(args: {
  environment: string;
  commitRef?: string | null;
}): Promise<ConformanceResult> {
  const result = await runConformanceChecks(getSql());

  await getSql().begin(async (tx: OurSql) => {
    await tx.unsafe(
      "INSERT INTO ledger.conformance_run (passed, checks, failed_checks, event_seq_high, commit_ref, environment) VALUES ($1, $2::text::jsonb, $3, $4, $5, $6)",
      [
        result.passed,
        jsonParam(result.checks),
        result.failedChecks,
        result.eventSeqHigh,
        args.commitRef ?? null,
        args.environment,
      ],
    );
    await appendCanonicalEvent(tx, {
      type: result.passed ? "conformance.verified" : "conformance.failed",
      actorType: "SERVICE",
      actorRef: "conformance-runner",
      subjectType: "ledger.conformance_run",
      subjectRef: args.environment,
      authorityRef: "ours.vision-escalation/0.1",
      privacyClass: "PUBLIC",
      payload: {
        passed: result.passed,
        failedChecks: result.failedChecks,
        checkCount: result.checks.length,
        // The names of what failed, so the log is legible without the row.
        failed: result.checks.filter((c) => !c.passed).map((c) => c.id),
        eventSeqHigh: result.eventSeqHigh,
        environment: args.environment,
        ...(args.commitRef ? { commitRef: args.commitRef } : {}),
      },
    });
  });

  return result;
}

export interface ConformanceRunRow {
  ranAt: Date;
  passed: boolean;
  failedChecks: number;
  checks: ConformanceCheck[];
  eventSeqHigh: number;
  commitRef: string | null;
  environment: string;
}

export async function listConformanceRuns(limit = 30): Promise<ConformanceRunRow[]> {
  const rows = await getSql().unsafe<
    {
      ran_at: DbTimestamp;
      passed: boolean;
      failed_checks: number;
      checks: ConformanceCheck[];
      event_seq_high: string;
      commit_ref: string | null;
      environment: string;
    }[]
  >("SELECT * FROM public.conformance LIMIT $1", [limit]);
  return rows.map((row) => ({
    ranAt: toDate(row.ran_at),
    passed: row.passed,
    failedChecks: row.failed_checks,
    checks: row.checks,
    eventSeqHigh: Number(row.event_seq_high),
    commitRef: row.commit_ref,
    environment: row.environment,
  }));
}
