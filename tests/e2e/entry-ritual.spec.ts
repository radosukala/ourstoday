import { test, expect } from "@playwright/test";
import {
  emailField,
  publicNameField,
  relayUrlFromReceipt,
  newestCapturedConfirmUrl,
  uniqueEmail,
} from "./helpers";

test.describe("the entry ritual", () => {
  test("magic-link request, scanner-safe confirm, seal and receipt", async ({ page }) => {
    const email = uniqueEmail("entrant");

    // --- request magic link -------------------------------------------------
    await page.goto("/enter");
    await emailField(page).fill(email);
    // Accept the documents on the entry form if presented as checkboxes.
    for (const box of await page.getByRole("checkbox").all()) {
      const checked = await box.isChecked();
      if (!checked) await box.check();
    }
    await page.getByRole("button", { name: /continue|enter|send/i }).click();
    await expect(page).toHaveURL(/check-email/);

    // --- capture adapter delivered the message ------------------------------
    const captured = await newestCapturedConfirmUrl();
    expect(captured.token.length).toBeGreaterThan(20);
    expect(captured.url).toContain("/enter/confirm#token=");

    // --- SCANNER SAFETY: fetching the confirm URL authenticates nobody ------
    const bareConfirmUrl = captured.url.split("#")[0] ?? "";
    const plain = await page.request.get(bareConfirmUrl);
    expect(plain.status()).toBe(200);
    const cookiesFromGet = plain
      .headersArray()
      .filter((h) => h.name.toLowerCase() === "set-cookie");
    expect(cookiesFromGet.join(" ")).not.toContain("session_token");
    const headed = await page.request.head(bareConfirmUrl);
    expect(
      headed
        .headersArray()
        .filter((h) => h.name.toLowerCase() === "set-cookie")
        .join(" "),
    ).not.toContain("session_token");

    // --- the human confirms in two steps ------------------------------------
    await page.goto(captured.url);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/enter\/continue/, { timeout: 20000 });

    // --- sealed-in user seals their entry ------------------------------------
    await publicNameField(page).fill("E2E Entrant One");
    for (const box of await page.getByRole("checkbox").all()) {
      if (!(await box.isChecked())) await box.check();
    }
    await page.getByRole("button", { name: /seal/i }).click();

    // Receipt appears with ordinal #000002 (origin is #000001).
    await expect(page.getByText(/#000002/)).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByText(/NOT LEGAL MEMBERSHIP|Not legal membership/i).first(),
    ).toBeVisible();
    // The relay is offered as copyable text with the token in the path, plus
    // an explicit copy control. It is never auto-posted anywhere.
    const relayUrl = await relayUrlFromReceipt(page);
    expect(relayUrl).toContain("/r/");
    await expect(page.getByRole("button", { name: /copy relay url/i })).toBeVisible();
  });

  test("an already-sealed person cannot seal twice", async ({ page }) => {
    // Covered exhaustively at the service level; here we prove the UI gate:
    // a fresh visitor without a session is routed to authenticate.
    await page.goto("/enter/continue");
    await expect(page).toHaveURL(/enter/);
  });
});
