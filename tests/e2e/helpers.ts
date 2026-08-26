import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * The entry section is labelled "Verify control of your email.", so a loose
 * getByLabel(/email/i) matches the region as well as the input. Address the
 * control by role so the assertion stays strict and unambiguous.
 */
export function emailField(page: Page) {
  return page.getByRole("textbox", { name: /your email address/i });
}

/** The public-name control on /enter/continue. */
export function publicNameField(page: Page) {
  return page.getByRole("textbox", { name: /public name or pseudonym/i });
}

/** The six-digit ordinal printed on a sealed receipt, e.g. "000002". */
export async function ordinalFromReceipt(page: Page): Promise<string> {
  const text = await page.locator("article.receipt-block").first().innerText();
  const match = text.match(/#(\d{6})\s+—\s+assigned at commit/);
  if (!match?.[1]) throw new Error("no ordinal in receipt:\n" + text);
  return match[1];
}

/**
 * The receipt prints the relay as copyable text rather than a link - OURS
 * never posts for you, and the entrant is not invited to click their own
 * relay - so read the URL out of the receipt instead of an href.
 */
export async function relayUrlFromReceipt(page: Page): Promise<string> {
  // The consent panel on /enter/continue shares the .receipt-block class;
  // the sealed receipt is the <article>.
  const text = await page.locator("article.receipt-block").first().innerText();
  const match = text.match(/https?:\/\/\S+\/r\/\S+/);
  if (!match) throw new Error("no relay URL in receipt:\n" + text);
  return match[0].trim();
}

/** Read the newest captured magic-link email and extract its confirm URL. */
export async function newestCapturedConfirmUrl(): Promise<{
  url: string;
  token: string;
  ctxId: string | null;
}> {
  const dir = path.join(process.cwd(), ".email-capture");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  const newest = files[files.length - 1];
  if (!newest) throw new Error("no captured email found");
  const raw = JSON.parse(await readFile(path.join(dir, newest), "utf8")) as {
    html?: string;
    text?: string;
  };
  const haystack = (raw.html ?? "") + "\n" + (raw.text ?? "");
  const match = haystack.match(/https?:\/\/[^\s"'<>]+\/enter\/confirm#[^\s"'<>]+/);
  if (!match) throw new Error("confirm URL not found in capture: " + newest);
  const url = match[0];
  const hash = url.split("#")[1] ?? "";
  const params = new URLSearchParams(hash);
  return { url, token: params.get("token") ?? "", ctxId: params.get("ctx") };
}

export function uniqueEmail(tag: string): string {
  return (
    tag + "." + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + "@e2e.example"
  );
}
