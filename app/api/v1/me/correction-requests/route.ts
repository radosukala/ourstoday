import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { checkMutationOrigin } from "@/security/origin";
import { getPersonByAuthUserId } from "@/lib/person";
import { normalizeDisplayName } from "@/ledger/seal";
import { getSql, toDate, type DbTimestamp } from "@/db/sqltype";
import { jsonError, jsonOk } from "@/lib/http";
import { correctionRequestSchema } from "@/validation/schemas";

export const dynamic = "force-dynamic";

/** Public-name correction request. Append-only and receipted. */
export async function POST(req: Request) {
  const origin = checkMutationOrigin(req);
  if (!origin.ok)
    return jsonError("ORIGIN_REJECTED", "This request failed its origin checks.", 403);
  const session = await getAuth().api.getSession({ headers: endpointContext(req) });
  if (!session?.user?.id) return jsonError("NO_SESSION", "Sign in first.", 401);
  const person = await getPersonByAuthUserId(session.user.id);
  if (!person) return jsonError("NO_SESSION", "Sign in first.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_JSON", "The request body must be JSON.", 400);
  }
  const parsed = correctionRequestSchema.safeParse(body);
  if (!parsed.success)
    return jsonError("INVALID_INPUT", "Check the proposed name and idempotency key.", 400);

  const proposed = normalizeDisplayName(parsed.data.proposedDisplayName);
  if (proposed.length < 2 || proposed.length > 40) {
    return jsonError("INVALID_NAME", "The public name must be 2-40 characters.", 400);
  }

  const dupes = await getSql().unsafe<{ id: string }[]>(
    "SELECT id FROM private.correction_request WHERE person_id = $1 AND state = 'REQUESTED' AND proposed_display_name = $2 LIMIT 1",
    [person.id, proposed],
  );
  if (dupes[0])
    return jsonError("ALREADY_REQUESTED", "This exact correction is already open.", 409);

  const entryRows = await getSql().unsafe<{ ordinal: number | null }[]>(
    "SELECT ordinal FROM ledger.entry WHERE person_id = $1 AND lifecycle <> 'VOIDED' LIMIT 1",
    [person.id],
  );

  const inserted = await getSql().unsafe<{ id: string; requested_at: DbTimestamp }[]>(
    "INSERT INTO private.correction_request (person_id, subject_ordinal, proposed_display_name, reason_detail) VALUES ($1, $2, $3, $4) RETURNING id, requested_at",
    [person.id, entryRows[0]?.ordinal ?? null, proposed, parsed.data.reasonDetail ?? null],
  );
  if (!inserted[0]) return jsonError("STORE_FAILED", "The request could not be recorded.", 500);

  return jsonOk({
    requestId: inserted[0].id,
    requestedAt: toDate(inserted[0].requested_at).toISOString(),
    state: "REQUESTED",
    notice: "Your correction request is recorded for human review.",
  });
}
