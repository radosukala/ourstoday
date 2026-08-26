/**
 * LOCAL CONCEPT DATA ONLY.
 *
 * Seeds the declared origin row (#000001 RADO) exactly as displayed on the
 * Day 1 instrument, plus its receipt event. Production genesis treatment is
 * a recorded FUTURE DECISION (handoff section 16.3) - this script must never
 * run against a production or shared database. It refuses to do anything if
 * any entry already exists, so re-running is safe and honest.
 */
import { connect, directUrl } from "./dbadmin";
import { normalizeConnectionUrl } from "../../src/db/connection-url";
import { digestEvent } from "../../src/ledger/events";

const ORIGIN_DECLARATION_VERSION = "ours-founding-declaration/0.1";
const ORIGIN_PROTOCOL_VERSION = "ours.founding-relay/0.1";
const ORIGIN_LEGAL_STATUS_VERSION = "ours-legal-status/0.1";

/** Exported so the e2e provisioning script can reuse identical seeding. */
export async function seedLocal(): Promise<void> {
  const target = directUrl();
  const { isLocal, hostname } = normalizeConnectionUrl(target);
  // Production genesis treatment is handoff decision 3 and is UNRESOLVED. This
  // script writes ordinal #000001 as local concept data; running it against a
  // remote database would quietly answer a question a human has not answered.
  if (!isLocal) {
    throw new Error(
      "seed-local refuses to write to the remote host '" +
        hostname +
        "'. It seeds the declared origin as LOCAL CONCEPT DATA, and how #000001 " +
        "exists in production is an open founder-steward decision (handoff 16.3).",
    );
  }
  const sql = connect(target, { max: 1 });
  try {
    const existing = await sql.unsafe<{ count: string }[]>(
      "SELECT count(*)::text AS count FROM ledger.entry",
    );
    if (Number(existing[0]?.count ?? "0") > 0) {
      console.log("seed-local: entries exist; refusing to add origin again.");
      return;
    }
    await sql.begin(async (tx) => {
      const inserted = await tx.unsafe<{ id: string }[]>(
        "INSERT INTO ledger.entry (ordinal, person_id, display_name, seal_ts, declaration_version, protocol_version, legal_status_version, origin_kind) VALUES (1, NULL, 'RADO', '2026-08-26T00:00:00Z', $1, $2, $3, 'DECLARED_ORIGIN') RETURNING id",
        [ORIGIN_DECLARATION_VERSION, ORIGIN_PROTOCOL_VERSION, ORIGIN_LEGAL_STATUS_VERSION],
      );
      const entryId = inserted[0]?.id;
      if (!entryId) throw new Error("origin insert failed");

      await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('ledger.event.chain'))");
      const payload = {
        ordinal: 1,
        entryId,
        displayName: "RADO",
        declarationVersion: ORIGIN_DECLARATION_VERSION,
        protocolVersion: ORIGIN_PROTOCOL_VERSION,
        legalStatusVersion: ORIGIN_LEGAL_STATUS_VERSION,
        declaredBy: "FOUNDER_STEWARD",
      };
      const occurredAt = new Date("2026-08-26T00:00:00Z");
      const digest = digestEvent({
        type: "ledger.entry.sealed",
        payload,
        occurredAt,
        prevDigest: null,
      });
      await tx.unsafe(
        "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, payload, prev_digest, digest) VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, $10, $11::text::jsonb, $12, $13)",
        [
          crypto.randomUUID(),
          "ledger.entry.sealed",
          "ours.founding-relay/0.1",
          occurredAt.toISOString(),
          "FOUNDER_STEWARD",
          "RADO",
          "ledger.entry",
          entryId,
          "DAY-1-DECLARATION · LOCAL CONCEPT SEED",
          "PUBLIC",
          JSON.stringify(payload),
          null,
          digest,
        ],
      );
    });
    console.log("seed-local: DECLARED_ORIGIN #000001 RADO seeded as LOCAL CONCEPT DATA.");
    console.log("seed-local: production genesis treatment remains a recorded future decision.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// Run directly only via `pnpm run db:seed:local`; imports (e2e provision) call seedLocal().
if (process.argv[1]?.endsWith("seed-local.ts")) void seedLocal();
