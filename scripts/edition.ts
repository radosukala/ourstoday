/**
 * pnpm edition — today's edition, ready to carry.
 *
 * Prints the edition's four tapes and the starting share language for X and
 * LinkedIn, and saves today's card image next to it. Everything is fetched
 * from the deployed site, not composed here: the text a person posts must be
 * the same truth the public page shows, never a laptop's memory of it.
 *
 * The edition reports the latest COMPLETED day — the morning post carries
 * yesterday's record, not an empty today.
 *
 * Usage:
 *   pnpm edition                  read https://ourstoday.com
 *   pnpm edition --day 2          a specific archived day
 *   pnpm edition --local          read NEXT_PUBLIC_APP_URL or localhost:3000
 *   pnpm edition --base <url>     read another environment
 *   pnpm edition --no-card        skip downloading the card image
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./env";

const DEFAULT_BASE = "https://ourstoday.com";

interface EditionPayload {
  status: string;
  day: number;
  dateUtc: string;
  dateLabel: string;
  lines: { formed: string; built: string; notYet: string; open: string; openUrl: string };
  statusLine: string;
  lockLine: string;
  posts: { x: string; linkedin: string };
  cardAltText: string;
  card: string;
}

function parseArgs(argv: string[]): { base: string; card: boolean; day: number | undefined } {
  let base = DEFAULT_BASE;
  let card = true;
  let day: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--local") {
      loadEnv();
      base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    } else if (arg === "--base") {
      const value = argv[++i];
      if (!value) {
        console.error("--base requires a URL");
        process.exit(1);
      }
      base = value;
    } else if (arg === "--day") {
      day = Number.parseInt(argv[++i] ?? "", 10);
      if (!Number.isInteger(day) || day < 1) {
        console.error("--day requires a positive integer");
        process.exit(1);
      }
    } else if (arg === "--no-card") {
      card = false;
    } else {
      console.error("Unknown argument: " + arg);
      process.exit(1);
    }
  }
  return { base: base.replace(/\/$/, ""), card, day };
}

function rule(label: string): void {
  console.info("");
  console.info("── " + label + " " + "─".repeat(Math.max(0, 60 - label.length)));
  console.info("");
}

async function main(): Promise<void> {
  const { base, card, day } = parseArgs(process.argv.slice(2));
  const host = new URL(base).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  console.info("edition → " + host + (local ? "  [LOCAL]" : "  [REMOTE]"));

  const query = day !== undefined ? `?day=${day}` : "";
  let payload: EditionPayload;
  try {
    const res = await fetch(base + "/api/v1/edition" + query, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      console.error(
        "The edition endpoint answered " +
          res.status +
          ". If this environment predates the edition, deploy first.",
      );
      process.exit(1);
    }
    payload = (await res.json()) as EditionPayload;
  } catch (error) {
    console.error("Could not reach " + base + " — " + String(error));
    console.error("Nothing was composed. The edition never guesses.");
    process.exit(1);
  }

  rule("THE EDITION · DAY " + payload.day + " · " + payload.dateLabel);
  console.info("FORMED   " + payload.lines.formed);
  console.info("BUILT    " + payload.lines.built);
  console.info("NOT YET  " + payload.lines.notYet);
  console.info("OPEN     " + payload.lines.open);

  rule("FOR X (" + payload.posts.x.length + " chars)");
  console.info(payload.posts.x);
  if (payload.posts.x.length > 280) {
    console.info("");
    console.info("· Over 280 characters — trim a line, thread it, or post with a long-post plan.");
  }

  rule("FOR LINKEDIN");
  console.info(payload.posts.linkedin);

  rule("CARD ALT TEXT · attach with the image");
  console.info(payload.cardAltText);

  if (card) {
    rule("CARD");
    const cardUrl = base + payload.card;
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const file = path.join(process.cwd(), "ours-today-day-" + payload.day + ".png");
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      console.info("Saved " + file);
      console.info(
        "Post it WITH the alt text above. Language stays editable; the card stays true.",
      );
    } catch (error) {
      console.info("Card not saved (" + String(error) + "). It lives at " + cardUrl);
    }
  }

  console.info("");
  console.info(payload.lockLine);
}

void main();
