
import { rawQuery } from "@/db/sqltype";
import { log } from "@/observability/logger";

/**
 * Database-backed application rate limits. State lives in PostgreSQL - never
 * process memory - so limits hold across serverless instances.
 */
export async function consumeRateLimit(
  bucketKey: string,
  windowMs: number,
  max: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const rows = await rawQuery<{ count: string }>(
    "INSERT INTO private.app_rate_limit (bucket_key, window_start_ms, count) VALUES ($1, $2, 1) ON CONFLICT (bucket_key) DO UPDATE SET count = CASE WHEN private.app_rate_limit.window_start_ms + $3 <= $2 THEN 1 ELSE private.app_rate_limit.count + 1 END, window_start_ms = CASE WHEN private.app_rate_limit.window_start_ms + $3 <= $2 THEN $2 ELSE private.app_rate_limit.window_start_ms END RETURNING count",
    [bucketKey, now, windowMs],
  );
  const count = Number(rows[0]?.count ?? "1");
  if (count > max) log.warn("ratelimit.blocked", {});
  return { allowed: count <= max, remaining: Math.max(0, max - count) };
}
