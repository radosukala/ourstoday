/**
 * Carrying "what I came here for" across the magic link.
 *
 * A person picks missions on the homepage, then leaves for their email and
 * comes back — possibly in a different tab, minutes later. The selection has
 * to survive that trip or the notice, which is the whole reason most people
 * arrive, is silently lost.
 *
 * This cookie is intent, not authorization: it is unsigned on purpose,
 * because forging it buys nothing. A notice only exists once it is bound to a
 * verified person's sealed entry inside the seal transaction, and unknown
 * slugs are dropped there.
 */

export const NOTICE_COOKIE_NAME = "ours_notice_intent";
export const NOTICE_COOKIE_MAX_AGE_SECONDS = 60 * 60;

/** Slugs are lowercase kebab-case; anything else is not one of ours. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function serializeNoticeIntent(slugs: readonly string[]): string {
  return [...new Set(slugs)]
    .filter((s) => SLUG_PATTERN.test(s))
    .slice(0, 20)
    .join(",");
}

export function parseNoticeIntent(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.split("=");
    if (rawName?.trim() !== NOTICE_COOKIE_NAME) continue;
    const value = decodeURIComponent(rest.join("=").trim());
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => SLUG_PATTERN.test(s))
      .slice(0, 20);
  }
  return [];
}
