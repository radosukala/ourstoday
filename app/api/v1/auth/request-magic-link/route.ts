import { config } from "@/config";
import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { checkMutationOrigin } from "@/security/origin";
import { consumeRateLimit } from "@/security/ratelimit";
import { sha256Email } from "@/security/digest";
import { createEntryContext, relayRecordFromDevice } from "@/lib/person";
import { jsonNeutral, jsonError, randomId } from "@/lib/http";
import { magicLinkRequestSchema } from "@/validation/schemas";
import { log } from "@/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Magic-link request. The response is identical whether or not the address
 * exists. When the request began through a relay, a short-lived private
 * entry context binds this email digest to that relay record so attribution
 * survives a cross-device confirmation - without the raw token in email.
 */
export async function POST(req: Request) {
  const origin = checkMutationOrigin(req);
  if (!origin.ok)
    return jsonError("ORIGIN_REJECTED", "This request failed its origin checks.", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_JSON", "The request body must be JSON.", 400);
  }
  const parsed = magicLinkRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("BAD_EMAIL", "Provide a valid email address.", 400);
  const email = parsed.data.email;

  // Rate limit per IP-hash + email-digest bucket (database-backed).
  const ipHash = sha256Email(req.headers.get("x-forwarded-for") ?? "local");
  const limited = await consumeRateLimit(
    "magic-link:" + ipHash.slice(0, 16) + ":" + sha256Email(email).slice(0, 16),
    15 * 60 * 1000,
    8,
  );
  if (!limited.allowed)
    return jsonError("RATE_LIMITED", "Too many sign-in requests. Try again later.", 429);

  // Bind relay provenance BEFORE dispatching the email.
  let ctxId: string | undefined;
  try {
    const relayRecordId = await relayRecordFromDevice(req.headers.get("cookie"));
    if (relayRecordId) {
      ctxId = await createEntryContext({
        emailDigest: sha256Email(email),
        relayTokenRecordId: relayRecordId,
      });
    }
  } catch (error) {
    log.warn("entry_context.bind_failed", {});
    void error;
  }

  const cfg = config();
  const internal = new Request(cfg.appUrl.replace(/\/+$/, "") + "/api/auth/sign-in/magic-link", {
    method: "POST",
    headers: (() => {
      const h = new Headers({ "content-type": "application/json" });
      for (const [k, v] of endpointContext(req)) h.set(k, v);
      return h;
    })(),
    body: JSON.stringify({
      email,
      callbackURL: cfg.appUrl.replace(/\/+$/, "") + "/enter/check-email",
      ...(ctxId ? { metadata: { ctxId } } : {}),
    }),
  });

  try {
    const res = await getAuth().handler(internal);
    if (!res.ok && res.status !== 429) {
      log.error("magic_link.request_failed", {});
    }
  } catch (error) {
    void error;
    log.error("magic_link.handler_error", {});
  }

  // Deliberately neutral in every path.
  void randomId;
  return jsonNeutral();
}
