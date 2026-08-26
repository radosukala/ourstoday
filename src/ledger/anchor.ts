import { getSql, jsonParam, tsParam, toDate, type DbTimestamp, type OurSql } from "@/db/sqltype";
import { sha256Hex } from "@/security/digest";
import { appendCanonicalEvent } from "./append";
import { digestEvent } from "./events";

/**
 * Merkle roots over the canonical event log.
 *
 * The event log lives in PostgreSQL at one provider. A record a single company
 * can lose is not a public record. Publishing a root at a fixed cadence, and
 * depositing the annual root somewhere whose durability does not depend on
 * OURS existing, is what turns an ordinal from a vanity number into something
 * a member can prove to a third party WITHOUT OURS.
 *
 * The tree is deliberately boring so a stranger can reimplement it in an
 * afternoon, in any language, from the published description alone.
 */
export const ANCHOR_ALGORITHM = "sha256-merkle-binary/1";

const LEAF_PREFIX = "ours.anchor.leaf/1 ";
const NODE_PREFIX = "ours.anchor.node/1 ";

/** Domain-separated leaf hash of one event digest. */
export function anchorLeaf(eventDigest: string): string {
  return sha256Hex(LEAF_PREFIX + eventDigest);
}

/**
 * Merkle root of an ordered list of event digests.
 *
 * Leaves and internal nodes use different prefixes, so no leaf can be
 * reinterpreted as a node. An odd node at any level is promoted unchanged
 * rather than duplicated, which avoids the classic duplicate-leaf ambiguity
 * where two different logs yield the same root. An empty log has no root.
 */
export function merkleRoot(eventDigests: readonly string[]): string | null {
  if (eventDigests.length === 0) return null;
  let level = eventDigests.map(anchorLeaf);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i] as string;
      const right = level[i + 1];
      next.push(right === undefined ? left : sha256Hex(NODE_PREFIX + left + right));
    }
    level = next;
  }
  return level[0] as string;
}

export type AnchorPeriodKind = "DAILY" | "MONTHLY" | "ANNUAL";

export interface AnchorRow {
  periodKind: AnchorPeriodKind;
  periodLabel: string;
  algorithm: string;
  merkleRoot: string;
  eventSeqFrom: number;
  eventSeqTo: number;
  eventCount: number;
  locations: unknown[];
  evidenceUri: string | null;
  publishedAt: Date;
}

/** UTC period label for an instant: 2026-08-26 | 2026-08 | 2026. */
export function periodLabelFor(kind: AnchorPeriodKind, at: Date): string {
  const iso = at.toISOString();
  if (kind === "DAILY") return iso.slice(0, 10);
  if (kind === "MONTHLY") return iso.slice(0, 7);
  return iso.slice(0, 4);
}

/** Inclusive UTC bounds of a period label. */
export function periodBounds(kind: AnchorPeriodKind, label: string): { from: Date; to: Date } {
  if (kind === "DAILY") {
    return { from: new Date(label + "T00:00:00.000Z"), to: new Date(label + "T23:59:59.999Z") };
  }
  if (kind === "MONTHLY") {
    const from = new Date(label + "-01T00:00:00.000Z");
    const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1) - 1);
    return { from, to };
  }
  return {
    from: new Date(label + "-01-01T00:00:00.000Z"),
    to: new Date(Date.UTC(Number(label) + 1, 0, 1) - 1),
  };
}

export interface ComputedAnchor {
  merkleRoot: string | null;
  eventSeqFrom: number;
  eventSeqTo: number;
  eventCount: number;
  /** True when every event in range recomputes to its stored digest. */
  chainVerified: boolean;
}

/**
 * Compute the root for a period, verifying each event's digest on the way.
 *
 * A root over digests nobody checked would anchor whatever the database
 * happens to hold. Recomputing as we go means a published root attests to a
 * chain that actually reproduces.
 */
export async function computeAnchor(
  kind: AnchorPeriodKind,
  label: string,
  sql: Pick<OurSql, "unsafe"> = getSql(),
): Promise<ComputedAnchor> {
  const { from, to } = periodBounds(kind, label);
  const rows = await sql.unsafe<EventDigestRow[]>(
    // ORDER BY the bigint column. Selecting `seq::text AS seq` and ordering by
    // a bare `seq` makes PostgreSQL resolve the ORDER BY to the OUTPUT column,
    // sorting lexicographically (1, 10, 2, 3) and silently producing a root
    // over a reordered log the moment it passes nine events.
    "SELECT seq, type, occurred_at, payload, prev_digest, digest FROM ledger.event WHERE occurred_at >= $1::timestamptz AND occurred_at <= $2::timestamptz ORDER BY seq ASC",
    [tsParam(from), tsParam(to)],
  );
  return rollUp(rows);
}

interface EventDigestRow {
  seq: string | number;
  type: string;
  occurred_at: DbTimestamp;
  payload: Record<string, unknown>;
  prev_digest: string | null;
  digest: string;
}

/**
 * Recompute the root over an explicit sequence range.
 *
 * Verification MUST use the stored range, never the period. Publishing an
 * anchor appends `anchor.published` to the very period it covers, so a root
 * recomputed over "that day" will never again match the root that was
 * published for that day. The range is what the root actually commits to.
 */
export async function computeAnchorForRange(
  seqFrom: number,
  seqTo: number,
  sql: Pick<OurSql, "unsafe"> = getSql(),
): Promise<ComputedAnchor> {
  const rows = await sql.unsafe<EventDigestRow[]>(
    "SELECT seq, type, occurred_at, payload, prev_digest, digest FROM ledger.event WHERE seq >= $1 AND seq <= $2 ORDER BY seq ASC",
    [seqFrom, seqTo],
  );
  return rollUp(rows);
}

function rollUp(rows: EventDigestRow[]): ComputedAnchor {
  let chainVerified = true;
  const digests: string[] = [];
  for (const row of rows) {
    const expected = digestEvent({
      type: row.type,
      payload: row.payload,
      occurredAt: toDate(row.occurred_at),
      prevDigest: row.prev_digest,
    });
    if (expected !== row.digest) chainVerified = false;
    digests.push(row.digest);
  }

  const first = rows[0];
  const last = rows[rows.length - 1];
  return {
    merkleRoot: merkleRoot(digests),
    eventSeqFrom: first ? Number(first.seq) : 0,
    eventSeqTo: last ? Number(last.seq) : 0,
    eventCount: rows.length,
    chainVerified,
  };
}

export class AnchorError extends Error {}

/**
 * Publish a period's root and append `anchor.published`.
 *
 * Refuses to publish over a chain that does not verify: an anchor is a claim
 * that this is the record, and publishing one over known-bad data makes the
 * claim worthless everywhere else it appears.
 */
export async function publishAnchor(args: {
  kind: AnchorPeriodKind;
  label: string;
  actorLabel: string;
  locations?: unknown[];
  evidenceUri?: string | null;
}): Promise<{ merkleRoot: string; eventCount: number; alreadyPublished: boolean }> {
  if (!args.actorLabel.trim())
    throw new AnchorError("Publishing an anchor requires a named actor.");

  return getSql().begin(async (tx: OurSql) => {
    const computed = await computeAnchor(args.kind, args.label, tx);
    if (computed.eventCount === 0) {
      throw new AnchorError(
        "No canonical events in " + args.kind + " " + args.label + "; nothing to anchor.",
      );
    }
    if (!computed.chainVerified) {
      throw new AnchorError(
        "The event digest chain does not verify over " +
          args.kind +
          " " +
          args.label +
          ". Refusing to publish a root over a record that does not reproduce.",
      );
    }
    const root = computed.merkleRoot as string;

    const existing = await tx.unsafe<
      { merkle_root: string; event_seq_from: string | number; event_seq_to: string | number }[]
    >(
      "SELECT merkle_root, event_seq_from, event_seq_to FROM ledger.anchor WHERE period_kind = $1 AND period_label = $2",
      [args.kind, args.label],
    );
    const prior = existing[0];
    if (prior) {
      // Compare against the RANGE the published root committed to, not against
      // the period: publishing appended anchor.published to this same period,
      // so the period has grown and its recomputed root legitimately differs.
      const recomputed = await computeAnchorForRange(
        Number(prior.event_seq_from),
        Number(prior.event_seq_to),
        tx,
      );
      if (recomputed.merkleRoot === prior.merkle_root) {
        return {
          merkleRoot: prior.merkle_root,
          eventCount: recomputed.eventCount,
          alreadyPublished: true,
        };
      }
      throw new AnchorError(
        "The anchor already published for " +
          args.kind +
          " " +
          args.label +
          " no longer reproduces from the events it covered. The canonical past has changed. " +
          "Treat this as an integrity incident.",
      );
    }

    await tx.unsafe(
      "INSERT INTO ledger.anchor (period_kind, period_label, algorithm, merkle_root, event_seq_from, event_seq_to, event_count, locations, evidence_uri, published_by_actor) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text::jsonb, $9, $10)",
      [
        args.kind,
        args.label,
        ANCHOR_ALGORITHM,
        root,
        computed.eventSeqFrom,
        computed.eventSeqTo,
        computed.eventCount,
        jsonParam(args.locations ?? []),
        args.evidenceUri ?? null,
        args.actorLabel,
      ],
    );

    await appendCanonicalEvent(tx, {
      type: "anchor.published",
      actorType: args.actorLabel.toUpperCase().includes("FOUNDER") ? "FOUNDER_STEWARD" : "STEWARD",
      actorRef: args.actorLabel,
      subjectType: "ledger.anchor",
      subjectRef: args.kind + ":" + args.label,
      authorityRef: "ours.vision-escalation/0.1",
      privacyClass: "PUBLIC",
      payload: {
        periodKind: args.kind,
        periodLabel: args.label,
        algorithm: ANCHOR_ALGORITHM,
        merkleRoot: root,
        eventSeqFrom: computed.eventSeqFrom,
        eventSeqTo: computed.eventSeqTo,
        eventCount: computed.eventCount,
      },
    });

    return { merkleRoot: root, eventCount: computed.eventCount, alreadyPublished: false };
  });
}

export async function listAnchors(limit = 100): Promise<AnchorRow[]> {
  const rows = await getSql().unsafe<
    {
      period_kind: AnchorPeriodKind;
      period_label: string;
      algorithm: string;
      merkle_root: string;
      event_seq_from: string;
      event_seq_to: string;
      event_count: number;
      locations: unknown[];
      evidence_uri: string | null;
      published_at: DbTimestamp;
    }[]
  >("SELECT * FROM public.anchors LIMIT $1", [limit]);
  return rows.map((row) => ({
    periodKind: row.period_kind,
    periodLabel: row.period_label,
    algorithm: row.algorithm,
    merkleRoot: row.merkle_root,
    eventSeqFrom: Number(row.event_seq_from),
    eventSeqTo: Number(row.event_seq_to),
    eventCount: row.event_count,
    locations: row.locations,
    evidenceUri: row.evidence_uri,
    publishedAt: toDate(row.published_at),
  }));
}
