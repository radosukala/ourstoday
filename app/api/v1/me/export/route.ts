import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { getSql } from "@/db/sqltype";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Complete personal export as documented JSON. Includes private records OWNED by the person. */
export async function GET(req: Request) {
  const session = await getAuth().api.getSession({ headers: endpointContext(req) });
  if (!session?.user?.id) {
    return NextResponse.json({ status: "ERROR", state: "NO_SESSION" }, { status: 401 });
  }

  const personRows = await getSql().unsafe<Record<string, unknown>[]>(
    "SELECT id, auth_user_id AS auth_user_ref_present, lifecycle, email_verified_at, created_at FROM private.person WHERE auth_user_id = $1",
    [session.user.id],
  );
  const personIdRow = await getSql().unsafe<{ id: string }[]>(
    "SELECT id FROM private.person WHERE auth_user_id = $1",
    [session.user.id],
  );
  const personId = personIdRow[0]?.id;
  if (!personId) return NextResponse.json({ status: "ERROR", state: "NO_PERSON" }, { status: 404 });

  const consents = await getSql().unsafe<Record<string, unknown>[]>(
    "SELECT document_versions, accepted_at, superseded_by_id FROM private.consent_record WHERE person_id = $1 ORDER BY accepted_at ASC",
    [personId],
  );
  const drafts = await getSql().unsafe<Record<string, unknown>[]>(
    "SELECT display_name_draft, declaration_version, protocol_version, state, created_at FROM private.entry_draft WHERE person_id = $1 ORDER BY created_at ASC",
    [personId],
  );
  const withdrawals = await getSql().unsafe<Record<string, unknown>[]>(
    "SELECT reason_code, reason_detail, state, requested_at, resolved_at FROM private.withdrawal_request WHERE person_id = $1 ORDER BY requested_at ASC",
    [personId],
  );
  const corrections = await getSql().unsafe<Record<string, unknown>[]>(
    "SELECT proposed_display_name, reason_detail, state, requested_at, resolved_at FROM private.correction_request WHERE person_id = $1 ORDER BY requested_at ASC",
    [personId],
  );
  const entryRows = await getSql().unsafe<Record<string, unknown>[]>(
    "SELECT ordinal, display_name, seal_ts, lifecycle, declaration_version, protocol_version, predecessor_entry_id IS NOT NULL AS has_predecessor FROM ledger.entry WHERE person_id = $1 ORDER BY ordinal ASC",
    [personId],
  );
  const eventRows = await getSql().unsafe<Record<string, unknown>[]>(
    "SELECT e.type, e.occurred_at, e.payload FROM ledger.event e WHERE e.privacy_class = 'PUBLIC' AND e.subject_type = 'ledger.entry' AND e.subject_ref IN (SELECT id::text FROM ledger.entry WHERE person_id = $1) ORDER BY e.seq ASC",
    [personId],
  );
  void personRows;

  const pkg = {
    schema: "ours.account-export/v1",
    exportedAt: new Date().toISOString(),
    notice:
      "Personal export of YOUR records. Founding Ledger participation is not legal membership.",
    account: {
      authUserRefPresent: true,
      emailOnFile: session.user.email,
      emailVerified: session.user.emailVerified === true,
    },
    entry: entryRows,
    consentRecords: consents,
    entryDrafts: drafts,
    withdrawalRequests: withdrawals,
    correctionRequests: corrections,
    publicEventsAboutYou: eventRows,
    yourRights:
      "You may request correction or withdrawal at any time; actions append receipted events and ordinals are never reassigned.",
  };

  return new NextResponse(JSON.stringify(pkg, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="ours-account-export.json"',
    },
  });
}
