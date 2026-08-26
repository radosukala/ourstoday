import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { config } from "@/config";
import { checkMutationOrigin } from "@/security/origin";
import { consumeRateLimit } from "@/security/ratelimit";
import { ensurePerson, getPersonByAuthUserId, resolvePredecessorForSeal } from "@/lib/person";
import { revalidatePath } from "next/cache";
import { sealEntry } from "@/ledger/seal";
import {
  AlreadySealedError,
  IdempotencyConflictError,
  InvalidRelayError,
  InvalidWitnessError,
  LedgerClosedError,
  SelfReferralBlockedError,
  StaleConsentError,
} from "@/ledger/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { sealRequestSchema } from "@/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Canonical entry seal. Requires a full server session and performs every
 * gate before invoking the single transaction. The ordinal exists only in
 * the response AFTER commit.
 */
export async function POST(req: Request) {
  const origin = checkMutationOrigin(req);
  if (!origin.ok)
    return jsonError("ORIGIN_REJECTED", "This request failed its origin checks.", 403);

  let cfg: ReturnType<typeof config>;
  try {
    cfg = config();
  } catch {
    return jsonError("NOT_CONFIGURED", "This environment is not configured for entry.", 503);
  }

  // Full session validation - cookie presence is never authorization.
  const session = await getAuth().api.getSession({ headers: endpointContext(req) });
  if (!session?.user?.id) return jsonError("NO_SESSION", "Sign in before sealing your entry.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_JSON", "The request body must be JSON.", 400);
  }
  const parsed = sealRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "INVALID_INPUT",
      "Check the public name, accepted versions and idempotency key.",
      400,
    );
  }

  const person = await getPersonByAuthUserId(session.user.id);
  if (!person) return jsonError("NO_SESSION", "Sign in before sealing your entry.", 401);

  await ensurePerson({
    authUserId: session.user.id,
    email: session.user.email,
    emailVerified: true,
  });

  const limited = await consumeRateLimit("seal:" + person.id, 60 * 60 * 1000, 10);
  if (!limited.allowed)
    return jsonError("RATE_LIMITED", "Too many attempts. Try again later.", 429);

  const predecessor = await resolvePredecessorForSeal({
    personId: person.id,
    cookieHeader: req.headers.get("cookie"),
  });

  try {
    const result = await sealEntry({
      authUserId: session.user.id,
      displayName: parsed.data.displayName,
      acceptedVersions: parsed.data.acceptedVersions,
      idempotencyKey: parsed.data.idempotencyKey,
      ...(predecessor ? { predecessor } : {}),
      ...(parsed.data.witnessOrdinal !== undefined
        ? { witnessOrdinal: parsed.data.witnessOrdinal }
        : {}),
    });

    // The public pages are cached to keep a crawler from holding the database
    // awake (see the revalidate note on those pages). A seal is the one event
    // that must not wait for a timer: the person who just entered, and anyone
    // they immediately tell, should see the ledger showing it. Sealing happens
    // once per person, so busting the cache here costs one render, not one per
    // request.
    revalidatePath("/");
    revalidatePath("/status");

    const relayUrl = result.relayToken
      ? cfg.appUrl.replace(/\/+$/, "") + "/r/" + result.relayToken
      : null;

    return jsonOk({
      state: result.state,
      ordinal: result.ordinal,
      ordinalLabel: String(result.ordinal).padStart(6, "0"),
      displayName: result.displayName,
      sealTs: result.sealTs.toISOString(),
      predecessorOrdinal:
        result.predecessorOrdinal !== undefined
          ? String(result.predecessorOrdinal).padStart(6, "0")
          : null,
      isFirstContinuation: result.isFirstContinuation,
      witnessOrdinal:
        result.witnessOrdinal !== undefined ? String(result.witnessOrdinal).padStart(6, "0") : null,
      // The member's own stable identifier. Returned to them, never public.
      memberRoot: result.memberRoot,
      receipt: result.receipt,
      relayUrl,
      legalStatusLine: "OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED",
    });
  } catch (error) {
    if (error instanceof LedgerClosedError) {
      return jsonError(
        error.mode === "PAUSED" ? "LEDGER_PAUSED" : "LEDGER_CLOSED",
        error.message + " Your draft is safe; nothing was sealed.",
        423,
      );
    }
    if (error instanceof AlreadySealedError) {
      return jsonError(
        "ALREADY_SEALED",
        error.existingOrdinal !== null
          ? "This account already sealed entry #" +
              String(error.existingOrdinal).padStart(6, "0") +
              "."
          : error.message,
        409,
      );
    }
    if (error instanceof IdempotencyConflictError) {
      return jsonError("IDEMPOTENCY_CONFLICT", error.message, 409);
    }
    if (error instanceof StaleConsentError) {
      return jsonError("STALE_VERSIONS", error.message, 409);
    }
    if (error instanceof SelfReferralBlockedError || error instanceof InvalidRelayError) {
      return jsonError("RELAY_NOT_USABLE", error.message, 400);
    }
    if (error instanceof InvalidWitnessError) {
      // One neutral sentence for every reason. Distinguishing "no such entry"
      // from "not sealed" from "that is you" would turn the field into an
      // oracle for probing which ordinals belong to whom.
      return jsonError(
        "WITNESS_NOT_USABLE",
        "That number cannot witness this entry. Leave it blank to enter without a witness - your place is identical either way.",
        400,
      );
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "DISPLAY_NAME_LENGTH") {
      return jsonError("INVALID_NAME", "The public name must be 2-40 characters.", 400);
    }
    throw error;
  }
}
