/**
 * Environment loading for CLI scripts.
 *
 * Next.js reads .env.local for the application; tsx scripts do not, so every
 * db/steward command otherwise needs a manual export block. This loads the
 * same files with the same precedence (existing process env always wins) and
 * gives scripts one place to report NOT RUN when infrastructure is absent,
 * which the handoff's release-command matrix requires instead of a stack
 * trace.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let loaded = false;

function parse(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of contents.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/** Load .env.local then .env, without overriding anything already exported. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file);
    if (!existsSync(full)) continue;
    for (const [key, value] of Object.entries(parse(readFileSync(full, "utf8")))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/**
 * Report a release command as NOT RUN rather than failing loudly when the
 * infrastructure it needs is simply absent. A missing database is not a
 * broken build; pretending otherwise trains people to ignore red.
 */
export function notRun(command: string, why: string): never {
  console.info("NOT RUN: " + command);
  console.info("  reason: " + why);
  process.exit(0);
}

/** The direct connection URL, or NOT RUN when nothing is configured. */
export function requireDatabaseUrl(command: string): string {
  loadEnv();
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    notRun(command, "DIRECT_DATABASE_URL / DATABASE_URL is not set (see .env.example)");
  }
  return url;
}
