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

/**
 * Load .env.local then .env, without overriding anything already exported.
 *
 * Pass "production" to load `.env.production.local` FIRST and let it win. That
 * file is gitignored and holds the production connection; selecting it is an
 * explicit act (`--production` on a command), never something inherited from
 * a shell that happens to have variables exported.
 */
export function loadEnv(profile?: "production"): void {
  if (loaded) return;
  loaded = true;
  if (profile === "production") {
    const full = path.join(process.cwd(), ".env.production.local");
    if (!existsSync(full)) {
      console.error(
        "--production requires .env.production.local, which is missing.\n" +
          "Create it (it is gitignored) with the production DATABASE_URL,\n" +
          "DIRECT_DATABASE_URL and RELAY_SIGNING_SECRET.",
      );
      process.exit(1);
    }
    // An explicitly chosen profile overrides an ambient environment, because
    // otherwise a stale exported variable silently wins over the flag.
    for (const [key, value] of Object.entries(parse(readFileSync(full, "utf8")))) {
      process.env[key] = value;
    }
  }
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file);
    if (!existsSync(full)) continue;
    for (const [key, value] of Object.entries(parse(readFileSync(full, "utf8")))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/**
 * Pull `--production` out of an argument list.
 *
 * Selecting the target must be part of the command, not part of the shell
 * around it. Three separate operations have already landed in the wrong
 * database because the target lived in an exported variable nobody could see
 * at the moment of running.
 */
export function takeProfile(argv: string[]): {
  argv: string[];
  profile: "production" | undefined;
} {
  const rest = argv.filter((a) => a !== "--production" && a !== "--prod");
  return {
    argv: rest,
    profile: rest.length === argv.length ? undefined : "production",
  };
}

/**
 * Say out loud which database is about to be written to.
 *
 * A command that writes and does not name its target is indistinguishable
 * from the same command pointed somewhere else, and the difference only shows
 * up later when someone checks the wrong system for the result.
 */
export function announceTarget(command: string): void {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  let host = "(unset)";
  try {
    host = new URL(url).hostname || "(socket)";
  } catch {
    host = url ? "(non-URL form)" : "(unset)";
  }
  const local =
    host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "(socket)";
  console.info(command + " → " + host + (local ? "  [LOCAL]" : "  [REMOTE]"));
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
