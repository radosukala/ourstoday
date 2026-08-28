import { getSql, jsonParam, toDate, tsParam, type DbTimestamp, type OurSql } from "@/db/sqltype";
import { digestEvent, newEventId } from "@/ledger/events";
import { IdempotencyConflictError } from "@/ledger/errors";
import { sha256Hex } from "@/security/digest";

/**
 * Missions and notices: the demand side of the ledger.
 *
 * A mission is a thing that could be member-owned. A notice is one person's
 * conditional commitment to move when enough others will — an assurance
 * contract for leaving, which is the coordination problem no incumbent has
 * ever had to face. Nothing is triggered below the threshold, so nobody is
 * ever asked to leave alone.
 *
 * Reads come only from the allowlisted public views.
 */

export interface MissionRow {
  slug: string;
  title: string;
  practice: string;
  /** The named incumbents this target refers to. Empty until migration 0009. */
  incumbents: string;
  threshold: number;
  state: "OPEN" | "REACHED" | "ACTING" | "RETIRED";
  position: number;
  noticeCount: number;
}

export interface NoticeRecordRow {
  ordinal: number;
  displayName: string | null;
  missionSlug: string;
  missionTitle: string;
  conditionText: string | null;
  givenAt: Date;
}

export async function readMissionBoard(): Promise<MissionRow[]> {
  const rows = await getSql().unsafe<
    {
      slug: string;
      title: string;
      practice: string;
      incumbents: string | null;
      threshold: number;
      state: string;
      position: number;
      notice_count: number;
    }[]
  >("SELECT * FROM public.mission_board");
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    practice: r.practice,
    incumbents: r.incumbents ?? "",
    threshold: r.threshold,
    state:
      r.state === "REACHED" || r.state === "ACTING" || r.state === "RETIRED"
        ? (r.state as MissionRow["state"])
        : "OPEN",
    position: r.position,
    noticeCount: r.notice_count,
  }));
}

export async function readNoticeRecord(limit = 100): Promise<NoticeRecordRow[]> {
  const rows = await getSql().unsafe<
    {
      ordinal: number;
      display_name: string | null;
      mission_slug: string;
      mission_title: string;
      condition_text: string | null;
      given_at: DbTimestamp;
    }[]
  >("SELECT * FROM public.notice_record LIMIT $1", [limit]);
  return rows.map((r) => ({
    ordinal: r.ordinal,
    displayName: r.display_name,
    missionSlug: r.mission_slug,
    missionTitle: r.mission_title,
    conditionText: r.condition_text,
    givenAt: toDate(r.given_at),
  }));
}

export async function readNoticeTotals(): Promise<{
  notices: number;
  people: number;
  missions: number;
}> {
  const rows = await getSql().unsafe<{ notices: number; people: number; missions: number }[]>(
    "SELECT * FROM public.notice_totals",
  );
  return {
    notices: rows[0]?.notices ?? 0,
    people: rows[0]?.people ?? 0,
    missions: rows[0]?.missions ?? 0,
  };
}

/**
 * Resolve mission slugs to ids inside a caller's transaction. Unknown slugs
 * are dropped rather than throwing: a stale form must never cost someone the
 * entry they came to make.
 */
export async function resolveMissionIds(
  tx: OurSql,
  slugs: readonly string[],
): Promise<{ id: string; slug: string }[]> {
  if (slugs.length === 0) return [];
  const unique = [...new Set(slugs)].slice(0, 20);
  const rows = await tx.unsafe<{ id: string; slug: string }[]>(
    "SELECT id, slug FROM ledger.mission WHERE slug = ANY($1) AND state <> 'RETIRED'",
    [unique],
  );
  return rows;
}

export class EntryRequiredForNoticeError extends Error {
  constructor() {
    super("Seal a Founding Million place before giving notice.");
    this.name = "EntryRequiredForNoticeError";
  }
}

/**
 * Give notice after entry. This is deliberately separate from the front-door
 * decision: a person first joins the network, then says what the network
 * should make possible. The notice and its public event still commit in one
 * transaction and retry to one canonical result.
 */
export async function giveNotices(input: {
  authUserId: string;
  noticeSlugs: readonly string[];
  idempotencyKey: string;
}): Promise<{ ordinal: number; givenSlugs: string[] }> {
  const slugs = [...new Set(input.noticeSlugs)].sort().slice(0, 20);

  return getSql().begin(async (tx: OurSql) => {
    const person = await tx.unsafe<{ id: string }[]>(
      "SELECT id FROM private.person WHERE auth_user_id = $1",
      [input.authUserId],
    );
    if (!person[0]) throw new EntryRequiredForNoticeError();

    const entries = await tx.unsafe<{ id: string; ordinal: number }[]>(
      "SELECT id, ordinal FROM ledger.entry WHERE person_id = $1 AND lifecycle <> 'VOIDED' LIMIT 1",
      [person[0].id],
    );
    const entry = entries[0];
    if (!entry) throw new EntryRequiredForNoticeError();

    const requestDigest = sha256Hex(JSON.stringify({ op: "notice.give", slugs }));
    const claimed = await tx.unsafe<{ id: string }[]>(
      "INSERT INTO private.idempotency_record (person_id, operation, key, request_digest) VALUES ($1, 'notice.give', $2, $3) ON CONFLICT (person_id, operation, key) DO NOTHING RETURNING id",
      [person[0].id, input.idempotencyKey, requestDigest],
    );

    if (!claimed[0]) {
      const existing = await tx.unsafe<
        {
          request_digest: string;
          status: string;
          result_snapshot: Record<string, unknown> | null;
        }[]
      >(
        "SELECT request_digest, status, result_snapshot FROM private.idempotency_record WHERE person_id = $1 AND operation = 'notice.give' AND key = $2",
        [person[0].id, input.idempotencyKey],
      );
      if (existing[0]?.request_digest !== requestDigest) throw new IdempotencyConflictError();
      if (existing[0]?.status === "COMMITTED" && existing[0].result_snapshot) {
        const snapshot = existing[0].result_snapshot as {
          ordinal?: number;
          givenSlugs?: string[];
        };
        return {
          ordinal: snapshot.ordinal ?? entry.ordinal,
          givenSlugs: snapshot.givenSlugs ?? [],
        };
      }
      throw new Error("IDEMPOTENCY_PENDING");
    }

    const missions = await resolveMissionIds(tx, slugs);
    const insertedSlugs: string[] = [];
    for (const mission of missions) {
      const inserted = await tx.unsafe<{ id: string }[]>(
        "INSERT INTO ledger.notice (entry_id, mission_id) VALUES ($1, $2) ON CONFLICT (entry_id, mission_id) DO UPDATE SET withdrawn_at = NULL WHERE ledger.notice.withdrawn_at IS NOT NULL RETURNING id",
        [entry.id, mission.id],
      );
      if (inserted[0]) insertedSlugs.push(mission.slug);
    }

    if (insertedSlugs.length > 0) {
      await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('ledger.event.chain'))");
      const last = await tx.unsafe<{ digest: string | null }[]>(
        "SELECT digest FROM ledger.event ORDER BY seq DESC LIMIT 1",
      );
      const occurredAt = new Date();
      const payload = {
        ordinal: entry.ordinal,
        missions: insertedSlugs,
        note: "A conditional commitment to move when the threshold is reached. It binds nobody below it.",
      };
      const digest = digestEvent({
        type: "notice.given",
        payload,
        occurredAt,
        prevDigest: last[0]?.digest ?? null,
      });
      await tx.unsafe(
        "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, idempotency_key, payload, prev_digest, digest) VALUES ($1, 'notice.given', 'ours.founding-relay/0.1', $2::timestamptz, 'PERSON', $3, 'ledger.entry', $4, 'ours.founding-right/0.1', 'PUBLIC', $5, $6::text::jsonb, $7, $8)",
        [
          newEventId(),
          tsParam(occurredAt),
          person[0].id,
          entry.id,
          input.idempotencyKey,
          jsonParam(payload),
          last[0]?.digest ?? null,
          digest,
        ],
      );
    }

    const result = {
      ordinal: entry.ordinal,
      // Return every valid requested mission. An already-active notice is
      // still a successful, idempotent answer to the person's request.
      givenSlugs: missions.map((mission) => mission.slug),
    };
    await tx.unsafe(
      "UPDATE private.idempotency_record SET status = 'COMMITTED', result_snapshot = $1::text::jsonb WHERE person_id = $2 AND operation = 'notice.give' AND key = $3",
      [jsonParam(result), person[0].id, input.idempotencyKey],
    );
    return result;
  });
}
