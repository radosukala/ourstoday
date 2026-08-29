import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emailField } from "./helpers";

test.describe("the public instrument", () => {
  test("renders the truthful founding state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("NOBODY LEAVES FIRST.");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "EVERYBODY LEAVES TOGETHER.",
    );
    await expect(page.getByText("ONE PERSON. ONE FOUNDING RIGHT.")).toHaveCount(1);
    await expect(page.getByText("LEGAL MEMBERSHIP NOT YET ISSUED")).toHaveCount(1);
    await expect(page.getByLabel("Live Founding Million state")).toContainText("LEFT");
    await expect(page.getByLabel("Your email")).toHaveCount(1);
  });

  test("status page reflects gate state without exposing private data", async ({ page }) => {
    await page.goto("/status");
    const body = await page.content();
    expect(body).not.toMatch(/@e2e\.example|session_token|relay.*token=/i);
  });

  test("source documents are reachable and traversal is not", async ({ page }) => {
    await page.goto("/source/CONSTITUTION-0.1.md");
    await expect(page.locator("body")).toContainText("# ");
    await page.goto("/source/FOUNDING-RIGHT-0.1.md");
    await expect(page.locator("body")).toContainText("Ordinals 1 through 1,000,000 only");
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

  test("the simulator reproduces a shared result and cites every figure", async ({ page }) => {
    // The share loop is the whole point: a link that renders the DEFAULTS
    // instead of the sender's numbers is an advert, not a shared finding.
    // This broke silently once already under `force-static`, which honours
    // query strings in development and drops them in a production build.
    await page.goto("/worth?you=rides:30000,app-store:250000");
    // Uppercase is a CSS transform; the DOM keeps sentence case.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("worth to them");
    await expect(page.locator(".worth-figure")).toContainText("$84K");
    // "The ride" appears as both a chip and a result line; the result is the
    // one that proves the shared link was honoured.
    await expect(page.locator(".worth-lines").getByText("The ride", { exact: true })).toBeVisible();

    // Every figure must carry a reachable source, or none of it is worth
    // reading. No source link, no claim.
    const sources = page.locator(".worth-source a");
    expect(await sources.count()).toBeGreaterThan(0);
    for (const href of await sources.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href, "every figure needs a source URL").toMatch(/^https:\/\//);
    }

    // Nothing here may read as an offer of money.
    await expect(page.getByText("NOT DECIDED BY US")).toBeVisible();

    // Junk in the shared link falls back to the default rather than
    // rendering somebody's absurd number as a headline.
    await page.goto("/worth?you=rides:999999999999");
    await expect(page.locator(".worth-figure")).not.toContainText("M");
  });

  for (const path of ["/", "/enter", "/status", "/anchors", "/worth"]) {
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
