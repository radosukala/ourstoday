import { describe, expect, it } from "vitest";
import { fromAddressDomain } from "@/email/deliverability";

describe("sending domain extraction", () => {
  it("reads the domain from every From form the config accepts", () => {
    expect(fromAddressDomain("OURS TODAY <enter@updates.ourstoday.com>")).toBe(
      "updates.ourstoday.com",
    );
    expect(fromAddressDomain("enter@updates.ourstoday.com")).toBe("updates.ourstoday.com");
    expect(fromAddressDomain("  OURS <ENTER@Updates.OursToday.COM>  ")).toBe(
      "updates.ourstoday.com",
    );
  });

  it("distinguishes a subdomain from the apex", () => {
    // This is the whole point of the check: verifying ourstoday.com does NOT
    // make updates.ourstoday.com deliverable, and Resend refuses the send.
    expect(fromAddressDomain("OURS <enter@updates.ourstoday.com>")).not.toBe("ourstoday.com");
    expect(fromAddressDomain("OURS <enter@ourstoday.com>")).toBe("ourstoday.com");
  });

  it("returns empty for a malformed address rather than guessing", () => {
    expect(fromAddressDomain("not-an-address")).toBe("");
    expect(fromAddressDomain("")).toBe("");
  });
});
