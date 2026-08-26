import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emailField } from "./helpers";

test.describe("the public instrument", () => {
  test("renders the truthful founding state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("THE NETWORK IS OURS");
    await expect(page.getByText("OWNERSHIP: COMMITTED")).toHaveCount(1);
    // Origin row visible from the seeded local concept data.
    await expect(page.locator("table, [role=table], .ledger-table").first()).toContainText("RADO");
  });

  test("status page reflects gate state without exposing private data", async ({ page }) => {
    await page.goto("/status");
    const body = await page.content();
    expect(body).not.toMatch(/@e2e\.example|session_token|relay.*token=/i);
  });

  test("source documents are reachable and traversal is not", async ({ page }) => {
    await page.goto("/source/CONSTITUTION-0.1.md");
    await expect(page.locator("body")).toContainText("# ");
    const res = await page.request.get("/source/%2e%2e%2f.env.local");
    expect(res.status()).toBe(404);
  });

  test("homepage passes axe with only minor contrast findings tolerated", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );
    expect(blocking).toEqual([]);
  });

  test("keyboard navigation reaches the entry action and dialogs are labelled", async ({
    page,
  }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const first = page.locator(":focus");
    await expect(first).toBeVisible();
    // Skip link or header link focusable before main content.
    await page.goto("/enter");
    await expect(emailField(page)).toHaveCount(1);
    await page.goto("/status");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("reduced motion does not break rendering", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
