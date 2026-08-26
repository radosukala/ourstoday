
/**
 * Session-bound CSRF controls for OURS mutation routes. Better Auth protects
 * its own endpoints; ledger endpoints must not assume that middleware does it
 * for them.
 *
 * Layers: exact-origin match, Fetch-Metadata site check, custom header that a
 * cross-site form cannot send without a CORS preflight, and SameSite=Lax
 * cookies configured at the auth layer.
 */

export type OriginCheckResult = { ok: true } | { ok: false; status: 403; reason: string };

function allowedOrigins(): string[] {
  const origins = new Set<string>();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  if (appUrl) origins.add(new URL(appUrl).origin);
  if (betterAuthUrl) origins.add(new URL(betterAuthUrl).origin);
  return [...origins];
}

export function checkMutationOrigin(req: Request): OriginCheckResult {
  const host = req.headers.get("host");
  if (!host) return { ok: false, status: 403, reason: "missing-host" };

  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");

  if (site && !["same-origin", "none"].includes(site)) {
    return { ok: false, status: 403, reason: "cross-site-request" };
  }

  if (origin) {
    try {
      const parsed = new URL(origin);
      const allowList = allowedOrigins();
      const matchesAllowList = allowList.includes(parsed.origin);
      if (parsed.host !== host && !matchesAllowList) {
        return { ok: false, status: 403, reason: "origin-mismatch" };
      }
    } catch {
      return { ok: false, status: 403, reason: "bad-origin" };
    }
  } else if (site === undefined) {
    // Non-browser clients (curl/tests) must send either Origin or the custom
    // header checked next; nothing is rejected here without evidence.
  }

  const marker = req.headers.get("x-ours-request");
  if (marker !== "1") {
    return { ok: false, status: 403, reason: "missing-csrf-marker" };
  }
  return { ok: true };
}

