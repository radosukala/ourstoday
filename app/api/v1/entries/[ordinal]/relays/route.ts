import { createHash, randomBytes } from "node:crypto";
import { config } from "@/config";
import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { checkMutationOrigin } from "@/security/origin";
import { consumeRateLimit } from "@/security/ratelimit";
import { signRelayToken } from "@/security/relay";
import { getPersonByAuthUserId } from "@/lib/person";
import { getSql } from "@/db/sqltype";
import { jsonError, jsonOk } from "@/lib/http";
import { relayIssueSchema } from "@/validation/schemas";

export const dynamic = "force-dynamic";

/** Issue an additional channel-specific relay variant for YOUR OWN entry. */
export async function POST(req: Request, ctx: { params: Promise<{ ordinal: string }> }) {
  const origin = checkMutationOrigin(req);
  if (!origin.ok)
    return jsonError("ORIGIN_REJECTED", "This request failed its origin checks.", 403);

  const session = await getAuth().api.getSession({ headers: endpointContext(req) });
  if (!session?.user?.id) return jsonError("NO_SESSION", "Sign in first.", 401);
  const person = await getPersonByAuthUserId(session.user.id);
  if (!person) return jsonError("NO_SESSION", "Sign in first.", 401);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = relayIssueSchema.safeParse(body ?? {});
  if (!parsed.success) return jsonError("INVALID_INPUT", "Unknown channel.", 400);

  const { ordinal } = await ctx.params;
  const ordinalNum = Number.parseInt(ordinal, 10);
  if (!Number.isInteger(ordinalNum)) return jsonError("BAD_ORDINAL", "No such entry.", 404);

  const rows = await getSql().unsafe<{ id: string }[]>(
    "SELECT id FROM ledger.entry WHERE ordinal = $1 AND person_id = $2 AND lifecycle = 'SEALED'",
    [ordinalNum, person.id],
  );
  const entry = rows[0];
  if (!entry) return jsonError("FORBIDDEN", "This entry is not yours or is not active.", 403);

  const limited = await consumeRateLimit("relay-issue:" + person.id, 60 * 60 * 1000, 30);
  if (!limited.allowed)
    return jsonError("RATE_LIMITED", "Too many relays requested. Try later.", 429);

  const cfg = config();
  const signed = signRelayToken(cfg.relaySecrets);
  const jtiDigest = createHash("sha256").update(signed.payload.jti).digest("hex");
  void randomBytes;

  const inserted = await getSql().unsafe<{ id: string }[]>(
    "INSERT INTO private.relay_token_record (jti_digest, predecessor_entry_id, channel_hint, signing_key_version) VALUES ($1, $2, $3, $4) RETURNING id",
    [jtiDigest, entry.id, parsed.data.channelHint, signed.payload.kv],
  );
  if (!inserted[0]) return jsonError("STORE_FAILED", "The relay could not be recorded.", 500);

  // Receipt event (INTERNAL: token material never enters the log).
  await getSql().unsafe(
    "INSERT INTO ledger.event (id, type, schema_version, actor_type, actor_ref, subject_type, subject_ref, authority_ref, privacy_class, payload, prev_digest, digest) VALUES ($1,'relay.issued','ours.founding-relay/0.1','PERSON',$2,'private.relay_token_record',$3,'ours.founding-relay/0.1','INTERNAL',$4::jsonb,NULL,$5)",
    [
      crypto.randomUUID(),
      String(person.id),
      inserted[0].id,
      JSON.stringify({ ordinal: ordinalNum, channelHint: parsed.data.channelHint }),
      "unlinked-variant",
    ],
  );

  return jsonOk({
    relayUrl: cfg.appUrl.replace(/\/+$/, "") + "/r/" + signed.token,
    channelHint: parsed.data.channelHint,
    notice: "Carry it where you choose. OURS never posts for you.",
  });
}
