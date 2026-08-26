
/**
 * LOCAL CONCEPT DATA ONLY.
 *
 * Seeds the declared origin row (#000001 RADO) exactly as displayed on the
 * Day 1 instrument, plus its receipt event. Production genesis treatment is
 * a recorded FUTURE DECISION (handoff section 16.3) - this script must never
 * run against a production or shared database. It refuses to do anything if
 * any entry already exists, so re-running is safe and honest.
 */
import { createHash } from "node:crypto";
import postgres from "postgres";
import { directUrl } from "./dbadmin";

const ORIGIN_DECLARATION_VERSION = "ours-founding-declaration/0.1";
const ORIGIN_PROTOCOL_VERSION = "ours.founding-relay/0.1";
const ORIGIN_LEGAL_STATUS_VERSION = "ours-legal-status/0.1";

async function main() {
  const sql = postgres(directUrl(), { max: 1 });
  try {
    const existing = await sql.unsafe<{ count: string }[]>("SELECT count(*)::text AS count FROM ledger.entry");
    if (Number(existing[0]?.count ?? "0") > 0) {
      console.log("seed-local: entries exist; refusing to add origin again.");
      return;
    }
    await sql.begin(async (tx) => {
      const inserted = await tx.unsafe<{ id: string }[]>("INSERT INTO ledger.entry (ordinal, person_id, display_name, seal_ts, declaration_version, protocol_version, legal_status_version, origin_kind) VALUES (1, NULL, 'RADO', '2026-08-26T00:00:00Z', $1, $2, $3, 'DECLARED_ORIGIN') RETURNING id",
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
      const material = JSON.stringify({
        type: "ledger.entry.sealed",
        payload,
        occurredAt: occurredAt.toISOString(),
        prevDigest: null,
      });
      const digest = createHash("sha256").update(material).digest("hex");
      await tx.unsafe(
        "INSERT INTO ledger.event (id, type, schema_version, occurred_at, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, payload, prev_digest, digest) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
        [
          crypto.randomUUID(),
          "ledger.entry.sealed",
          "ours.founding-relay/0.1",
          occurredAt,
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

void main();

