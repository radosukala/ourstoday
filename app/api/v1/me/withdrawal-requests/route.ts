
import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { checkMutationOrigin } from "@/security/origin";
import { getPersonByAuthUserId } from "@/lib/person";
import { getSql } from "@/db/sqltype";
import { jsonError, jsonOk } from "@/lib/http";
import { withdrawalRequestSchema } from "@/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Withdrawal / pseudonymization request. The request itself is append-only
 * and receipted. Reviewed actions append ledger events; the final erasure /
 * retention schedule is a FUTURE DECISION awaiting licensed review.
 */
export async function POST(req: Request) {
  const origin = checkMutationOrigin(req);
  if (!origin.ok) return jsonError("ORIGIN_REJECTED", "This request failed its origin checks.", 403);
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
  const parsed = withdrawalRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("INVALID_INPUT", "Check the reason and idempotency key.", 400);

  const dupes = await getSql().unsafe<{ id: string }[]>(
    "SELECT id FROM private.withdrawal_request WHERE person_id = $1 AND state = 'REQUESTED' LIMIT 1",
    [person.id],
  );
  if (dupes[0]) {
    return jsonError("ALREADY_REQUESTED", "A withdrawal request is already open.", 409);
  }

  const entryRows = await getSql().unsafe<{ ordinal: number | null }[]>(
    "SELECT ordinal FROM ledger.entry WHERE person_id = $1 AND lifecycle <> 'VOIDED' LIMIT 1",
    [person.id],
  );

  const inserted = await getSql().unsafe<{ id: string; requested_at: Date }[]>(
    "INSERT INTO private.withdrawal_request (person_id, subject_ordinal, reason_code, reason_detail) VALUES ($1, $2, $3, $4) RETURNING id, requested_at",
    [person.id, entryRows[0]?.ordinal ?? null, parsed.data.reasonCode, parsed.data.reasonDetail ?? null],
  );
  if (!inserted[0]) return jsonError("STORE_FAILED", "The request could not be recorded.", 500);

  return jsonOk({
    requestId: inserted[0].id,
    requestedAt: inserted[0].requested_at.toISOString(),
    state: "REQUESTED",
    notice:
      "Your request is recorded. A human steward reviews it; public identity can be tombstoned without reassigning any number.",
  });
}

