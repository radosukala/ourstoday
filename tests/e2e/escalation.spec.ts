import { test, expect } from "@playwright/test";
import { emailField, publicNameField, newestCapturedConfirmUrl, uniqueEmail } from "./helpers";

test.describe("the escalated instrument", () => {
  test("status publishes the sixteen launch gates and what blocks them", async ({ page }) => {
    await page.goto("/status");

    // The primary content of this section is what is NOT yet true.
    await expect(
      page.getByRole("heading", { name: /what is not yet true about us/i }),
    ).toBeVisible();
    await expect(page.locator(".gate-list li")).toHaveCount(16);

    // Each gate states the evidence that would make it true, and names the
    // human decision blocking it where one exists.
    const gates = page.locator(".gate-list");
    await expect(gates).toContainText("Legal status and privacy notice reviewed");
    await expect(gates).toContainText(/BLOCKED BY: a named legal reviewer/i);
    await expect(gates).toContainText("Encrypted backup exists and clean restore rehearsal passes");

    // And it never leaks private data while doing so.
    const body = await page.content();
    expect(body).not.toMatch(/@e2e\.example|session_token|email_digest/i);
  });

  test("anchors page explains verification without requiring trust", async ({ page }) => {
    await page.goto("/anchors");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/provable without us/i);
    // The construction must be reproducible from the page alone.
    await expect(page.locator("body")).toContainText("ours.anchor.leaf/1");
    await expect(page.locator("body")).toContainText("ours.anchor.node/1");
    await expect(page.locator("body")).toContainText("sha256-merkle-binary/1");
  });

  test("an entrant may name a witness, and the witness gains nothing", async ({ page }) => {
    const email = uniqueEmail("witnessed");
    await page.goto("/enter");
    await emailField(page).fill(email);
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page).toHaveURL(/check-email/);

    const captured = await newestCapturedConfirmUrl();
    await page.goto(captured.url);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/enter\/continue/, { timeout: 20000 });

    // The declared origin #000001 is the only entry guaranteed to exist.
    await publicNameField(page).fill("Witnessed Entrant");
    await page.getByRole("textbox", { name: /witness number/i }).fill("1");
    for (const box of await page.getByRole("checkbox").all()) {
      if (!(await box.isChecked())) await box.check();
    }
    await page.getByRole("button", { name: /seal/i }).click();

    const receipt = page.locator("article.receipt-block").first();
    await expect(receipt).toBeVisible({ timeout: 20000 });
    await expect(receipt).toContainText(/WITNESSED BY/i);
    await expect(receipt).toContainText(/#000001/);
    // Saying so on the receipt is the whole reward the witness receives.
    await expect(receipt).toContainText(/they gained nothing/i);

    // The public ledger shows the edge and confers no rank on the witness.
    await page.goto("/");
    await expect(page.locator(".ledger-table")).toContainText("Witnessed Entrant");
  });

  test("health is shallow by default and deep only on request", async ({ request, baseURL }) => {
    // Shallow is a COST control: Neon bills compute time and only stops
    // billing once the compute suspends. A monitor polling a
    // database-touching endpoint every minute keeps it awake permanently.
    const shallow = await request.get(baseURL + "/api/health");
    expect(shallow.status()).toBe(200);
    const shallowBody = (await shallow.json()) as Record<string, unknown>;
    expect(shallowBody.checks).toBe("shallow");
    // It must not report ledger state, because it did not look.
    expect(shallowBody.ledger).toBeUndefined();

    const deep = await request.get(baseURL + "/api/health?deep=1");
    expect(deep.status()).toBe(200);
    const deepBody = (await deep.json()) as Record<string, unknown>;
    expect(deepBody.checks).toBe("deep");
    expect(deepBody.ledger).toBe("OPEN");

    // Neither form leaks the database endpoint or the user.
    for (const body of [shallowBody, deepBody]) {
      expect(JSON.stringify(body)).not.toMatch(/postgres|neon\.tech|password|@/i);
    }
  });

  test("a sealed entry appears on the public ledger immediately, not after the cache window", async ({
    page,
  }) => {
    // The public pages are cached so a crawler cannot hold the database awake.
    // A seal must still be visible at once - waiting a minute to appear on the
    // ledger you just joined would read as broken.
    const email = uniqueEmail("cachebust");
    await page.goto("/enter");
    await emailField(page).fill(email);
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page).toHaveURL(/check-email/);

    const captured = await newestCapturedConfirmUrl();
    await page.goto(captured.url);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/enter\/continue/, { timeout: 20000 });

    const name = "Cache Bust " + Date.now().toString(36);
    await publicNameField(page).fill(name);
    for (const box of await page.getByRole("checkbox").all()) {
      if (!(await box.isChecked())) await box.check();
    }
    await page.getByRole("button", { name: /seal/i }).click();
    await expect(page.locator("article.receipt-block").first()).toBeVisible({ timeout: 20000 });

    await page.goto("/");
    await expect(page.locator(".ledger-table")).toContainText(name);
  });

  test("refusing to seal moves focus to what is blocking, not just a message", async ({ page }) => {
    // Reported from the real launch: pressing SEAL appeared to do nothing.
    // The message rendered, but below a full-width button and outside where
    // the eye was, so to the person the button was simply dead.
    const email = uniqueEmail("blocked");
    await page.goto("/enter");
    await emailField(page).fill(email);
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page).toHaveURL(/check-email/);
    const captured = await newestCapturedConfirmUrl();
    await page.goto(captured.url);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page).toHaveURL(/enter\/continue/, { timeout: 20000 });

    // A name but no acknowledgments: the refusal must name the real blocker
    // and put the cursor on it.
    await publicNameField(page).fill("Blocked Entrant");
    await page.getByRole("button", { name: /seal/i }).click();
    await expect(page.locator(".form-status")).toContainText(/ACCEPT BOTH ACKNOWLEDGMENTS/i);
    await expect(page.locator(".check-row input").first()).toBeFocused();

    // Checking one is not enough, and focus moves to the SECOND one.
    await page.locator(".check-row input").first().check();
    await page.getByRole("button", { name: /seal/i }).click();
    await expect(page.locator(".check-row input").nth(1)).toBeFocused();

    // An empty name is a different blocker and says so.
    await page.locator(".check-row input").nth(1).check();
    await publicNameField(page).fill("");
    await page.getByRole("button", { name: /seal/i }).click();
    await expect(page.locator(".form-status")).toContainText(/ADD A PUBLIC NAME/i);
    await expect(publicNameField(page)).toBeFocused();

    // The checkbox must be a real target, not a hairline: 24px is the
    // accessible minimum and the original was 18px.
    const box = await page.locator(".check-row input").first().boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
  });

  test("the entry form treats a witness as optional, not as a lesser path", async ({ page }) => {
    await page.goto("/enter");
    // Nothing on the first step demands a witness or implies one is expected.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/witness/i);
  });
});
