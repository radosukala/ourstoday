import { revalidatePath } from "next/cache";
import { getAuth } from "@/auth/auth";
import { endpointContext } from "@/auth/session";
import { IdempotencyConflictError } from "@/ledger/errors";
import { EntryRequiredForNoticeError, giveNotices } from "@/ledger/missions";
import { jsonError, jsonOk } from "@/lib/http";
import { checkMutationOrigin } from "@/security/origin";
import { consumeRateLimit } from "@/security/ratelimit";
import { noticeGiveRequestSchema } from "@/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const origin = checkMutationOrigin(req);
  if (!origin.ok) {
    return jsonError("ORIGIN_REJECTED", "This request failed its origin checks.", 403);
  }

  const session = await getAuth().api.getSession({ headers: endpointContext(req) });
  if (!session?.user?.id) return jsonError("NO_SESSION", "Sign in first.", 401);

  const limited = await consumeRateLimit("notice:" + session.user.id, 60 * 60 * 1000, 30);
  if (!limited.allowed) {
    return jsonError("RATE_LIMITED", "Too many attempts. Try again later.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("BAD_JSON", "The request body must be JSON.", 400);
  }
  const parsed = noticeGiveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID_INPUT", "Choose at least one valid target.", 400);
  }

  try {
    const result = await giveNotices({
      authUserId: session.user.id,
      noticeSlugs: parsed.data.noticeSlugs,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    revalidatePath("/");
    revalidatePath("/today");
    revalidatePath("/status");
    return jsonOk({
      state: "NOTICE_GIVEN",
      ordinalLabel: String(result.ordinal).padStart(6, "0"),
      missions: result.givenSlugs,
    });
  } catch (error) {
    if (error instanceof EntryRequiredForNoticeError) {
      return jsonError("ENTRY_REQUIRED", error.message, 409);
    }
    if (error instanceof IdempotencyConflictError) {
      return jsonError("IDEMPOTENCY_CONFLICT", error.message, 409);
    }
    throw error;
  }
}
