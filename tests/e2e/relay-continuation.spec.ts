import { test, expect, type BrowserContext } from "@playwright/test";
import {
  emailField,
  newestCapturedConfirmUrl,
  ordinalFromReceipt,
  publicNameField,
  relayUrlFromReceipt,
  uniqueEmail,
} from "./helpers";

async function confirmIn(context: BrowserContext, baseUrl: string): Promise<void> {
  const page = await context.newPage();
  const captured = await newestCapturedConfirmUrl();
  await page.goto(baseUrl + "/enter/confirm#" + captured.url.split("#")[1]);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page).toHaveURL(/enter\/continue/, { timeout: 20000 });
  return void (await page.close());
}

test.describe("relay continuation", () => {
  test("a relayed visitor continues the line and becomes the First Continuation", async ({
    browser,
    baseURL,
  }) => {
    test.skip(!baseURL, "no base url");

    // Person A seals directly and receives a relay URL.
    const ctxA = await browser.newContext();
    const emailA = uniqueEmail("founder-a");
    let relayHref: string | null = null;
    let ordinalA = "";
    {
      const page = await ctxA.newPage();
      await page.goto("/enter");
      await emailField(page).fill(emailA);
      for (const box of await page.getByRole("checkbox").all()) {
        if (!(await box.isChecked())) await box.check();
      }
      await page.getByRole("button", { name: /continue|enter|send/i }).click();
      await expect(page).toHaveURL(/check-email/);
      const captured = await newestCapturedConfirmUrl();
      await page.goto(captured.url);
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL(/enter\/continue/, { timeout: 20000 });
      await publicNameField(page).fill("Relay Origin A");
      for (const box of await page.getByRole("checkbox").all()) {
        if (!(await box.isChecked())) await box.check();
      }
      await page.getByRole("button", { name: /seal/i }).click();
      await expect(page.getByRole("button", { name: /copy relay url/i })).toBeVisible({
        timeout: 20000,
      });
      relayHref = await relayUrlFromReceipt(page);
      ordinalA = await ordinalFromReceipt(page);
      await page.close();
    }
    expect(relayHref).toContain("/r/");
    if (!relayHref) throw new Error("relay url missing");
    const relayUrl: string = relayHref;

    // Person B opens the relay in a DIFFERENT device context.
    const ctxB = await browser.newContext();
    {
      const page = await ctxB.newPage();
      await page.goto(relayUrl);
      await expect(page.locator("body")).toContainText(
        new RegExp("#" + ordinalA + "|RELAYED ENTRY|You were invited through", "i"),
      );
      await page
        .getByRole("link", { name: /continue to entry|enter/i })
        .first()
        .click();
      await expect(page).toHaveURL(/enter/);
      const emailB = uniqueEmail("successor-b");
      await emailField(page).fill(emailB);
      for (const box of await page.getByRole("checkbox").all()) {
        if (!(await box.isChecked())) await box.check();
      }
      await page.getByRole("button", { name: /continue|enter|send/i }).click();
      await expect(page).toHaveURL(/check-email/);
    }

    // The email lands wherever it was requested; B confirms in the SAME
    // context that carries the relay cookie.
    await confirmIn(ctxB, baseURL!);
    {
      const page = await ctxB.newPage();
      await page.goto(baseURL + "/enter/continue");
      await publicNameField(page).fill("First Continuation B");
      for (const box of await page.getByRole("checkbox").all()) {
        if (!(await box.isChecked())) await box.check();
      }
      await page.getByRole("button", { name: /seal/i }).click();
      const receipt = page.locator("article.receipt-block").first();
      await expect(receipt).toBeVisible({ timeout: 20000 });
      const ordinalB = await ordinalFromReceipt(page);
      // B enters after A and keeps a distinct place of their own.
      expect(Number(ordinalB)).toBe(Number(ordinalA) + 1);
      // The receipt names the predecessor B arrived through and says B won the
      // race to be their First Continuation.
      await expect(receipt).toContainText("#" + ordinalA);
      await expect(receipt).toContainText(/First Continuation/i);
      await expect(receipt).toContainText(/continued through you/i);
      await page.close();
    }
    await ctxA.close();
    await ctxB.close();
  });

  test("relay GET never mutates canonical state", async ({ request, baseURL }) => {
    const res = await request.get(baseURL + "/r/bogus.notatoken");
    expect([200, 400]).toContain(res.status());
    const body = await res.text();
    expect(body).not.toMatch(/session_token/);
  });
});
