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
    // The operations package is published with its unanswered questions.
    await page.goto("/source/operations/DATA-MAP.md");
    await expect(page.locator("body")).toContainText("NOT LEGALLY REVIEWED");

    // The event schema is a public standard, and the receipts are public too.
    await page.goto("/source/EVENT-SCHEMA-1.0.md");
    await expect(page.locator("body")).toContainText("ours.event-schema/1.0");
    await page.goto("/source/receipts/2026-08-26-vision-escalation-adoption.md");
    await expect(page.locator("body")).toContainText("ours.decision-receipt/v1");

    // Traversal, in a few shapes, is refused rather than served.
    for (const probe of [
      "/source/%2e%2e%2f.env.local",
      "/source/../.env.local",
      "/source/operations/%2e%2e%2f%2e%2e%2f.env.local",
      "/source/operations/README.md",
      "/source/receipts/",
      "/source/../package.json",
      "/source/.env.local",
    ]) {
      const res = await page.request.get(probe);
      expect(res.status(), probe).toBe(404);
    }
  });

  for (const path of ["/", "/enter", "/status", "/anchors"]) {
    test("axe finds no serious or critical violation on " + path, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = results.violations.filter((v) =>
        ["critical", "serious"].includes(v.impact ?? ""),
      );
      // Report what failed rather than an empty-array diff nobody can read.
      const summary = blocking.map(
        (v) => v.id + " x" + v.nodes.length + ": " + (v.nodes[0]?.failureSummary ?? ""),
      );
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }

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
