import { config } from "@/config";
import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { checkMutationOrigin } from "@/security/origin";
import { consumeRateLimit } from "@/security/ratelimit";
import { sha256Email } from "@/security/digest";
import { ensurePerson } from "@/lib/person";
import { jsonError, jsonOk } from "@/lib/http";
import { magicLinkConfirmSchema } from "@/validation/schemas";
import { getSql, toDate, type DbTimestamp } from "@/db/sqltype";
import { log } from "@/observability/logger";

export const dynamic = "force-dynamic";

/**
 * Explicit human confirmation. Link scanners only ever GET /enter/confirm
 * (the token lives in the fragment and never reaches any server), so nothing
 * is consumed until this POST is performed by the person pressing Continue.
 *
 * After successful verification: provision the private person, mark email
 * verified, and - when present and matching - consume the entry context so
 * cross-device relay attribution works without exposing anything public.
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
  const parsed = magicLinkConfirmSchema.safeParse(body);
  if (!parsed.success) return jsonError("TOKEN_MISSING", "This confirmation is incomplete.", 400);

  const limited = await consumeRateLimit(
    "confirm:" + sha256Email(req.headers.get("x-forwarded-for") ?? "local").slice(0, 20),
    60 * 1000,
    10,
  );
  if (!limited.allowed)
    return jsonError("RATE_LIMITED", "Too many attempts. Try again shortly.", 429);

  const cfg = config();
  // No callbackURL on purpose. better-auth's magic-link/verify returns the
  // verified user as JSON only when callbackURL is absent; supplying one makes
  // it answer 302 instead, which this route cannot read and would report as an
  // expired link. Failures still redirect, so !upstream.ok remains the generic
  // expired/used/invalid signal. This route owns the redirect to /enter/continue.
  const verifyUrl =
    cfg.appUrl.replace(/\/+$/, "") +
    "/api/auth/magic-link/verify?token=" +
    encodeURIComponent(parsed.data.token);

  const forwardedHeaders = endpointContext(req);

  let upstream: Response;
  try {
    upstream = await getAuth().handler(new Request(verifyUrl, { headers: forwardedHeaders }));
  } catch (error) {
    void error;
    return jsonError("VERIFY_FAILED", "This link could not be confirmed.", 400);
  }

  if (!upstream.ok) {
    // Same message for expired, used, invalid - no enumeration.
    return jsonError("LINK_NOT_USABLE", "This link is expired or was already used.", 400);
  }

  let user: { id: string; email: string; emailVerified?: boolean };
  try {
    const payload = (await upstream.json()) as {
      user?: { id: string; email: string; emailVerified?: boolean };
    };
    if (!payload.user?.id || !payload.user.email) throw new Error("no user");
    user = payload.user;
  } catch {
    return jsonError("VERIFY_FAILED", "This link could not be confirmed.", 400);
  }

  const person = await ensurePerson({
    authUserId: user.id,
    email: user.email,
    emailVerified: true,
  });

  // Consume the email-bound entry context when it matches THIS identity.
  if (parsed.data.ctxId) {
    const rows = await getSql().unsafe<
      {
        state: string;
        email_digest: string;
        expires_at: DbTimestamp;
        consumed_by_person_id: string | null;
      }[]
    >(
      "SELECT state, email_digest, expires_at, consumed_by_person_id FROM private.entry_context WHERE id = $1",
      [parsed.data.ctxId],
    );
    const ctx = rows[0];
    if (
      ctx &&
      ctx.state === "ACTIVE" &&
      !ctx.consumed_by_person_id &&
      toDate(ctx.expires_at).getTime() > Date.now() &&
      ctx.email_digest === sha256Email(user.email)
    ) {
      await getSql().unsafe(
        "UPDATE private.entry_context SET state = 'CONSUMED', consumed_by_person_id = $2, consumed_at = now() WHERE id = $1",
        [parsed.data.ctxId, person.id],
      );
    } else if (ctx) {
      await getSql().unsafe(
        "UPDATE private.entry_context SET state = 'INVALID' WHERE id = $1 AND state = 'ACTIVE'",
        [parsed.data.ctxId],
      );
      log.warn("entry_context.mismatch_or_expired", {});
    }
  }

  const res = jsonOk({ next: "/enter/continue" });
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) res.headers.append("set-cookie", cookie);
  return res;
}
