import { describe, expect, it } from "vitest";
import { NOTICE_COOKIE_NAME, parseNoticeIntent, serializeNoticeIntent } from "@/lib/notice-intent";

function cookie(value: string): string {
  return `other=x; ${NOTICE_COOKIE_NAME}=${encodeURIComponent(value)}; another=y`;
}

describe("notice intent", () => {
  it("round-trips a selection across the magic link", () => {
    const slugs = ["professional-network", "app-store"];
    expect(parseNoticeIntent(cookie(serializeNoticeIntent(slugs)))).toEqual(slugs);
  });

  it("returns nothing when the cookie is absent", () => {
    expect(parseNoticeIntent(null)).toEqual([]);
    expect(parseNoticeIntent("other=x; another=y")).toEqual([]);
  });

  it("drops anything that is not a slug, rather than trusting it", () => {
    // The cookie is unsigned by design, so the parser is the boundary.
    expect(parseNoticeIntent(cookie("app-store,DROP TABLE,../etc,ok-slug,UPPER"))).toEqual([
      "app-store",
      "ok-slug",
    ]);
  });

  it("de-duplicates and caps the selection", () => {
    expect(serializeNoticeIntent(["a-b", "a-b", "c-d"])).toBe("a-b,c-d");
    const many = Array.from({ length: 40 }, (_, i) => "mission-" + String(i));
    expect(parseNoticeIntent(cookie(serializeNoticeIntent(many)))).toHaveLength(20);
  });

  it("never lets a malformed cookie throw", () => {
    expect(() => parseNoticeIntent("=;;;=x")).not.toThrow();
    expect(parseNoticeIntent("=;;;=x")).toEqual([]);
  });
});
