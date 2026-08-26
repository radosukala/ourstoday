/**
 * Repository secret scan (handoff section 12: "dependency and secret scanning
 * in CI"). Fails the build when a credential-shaped string is committed, or
 * when .env.example carries a value instead of a name and an explanation.
 *
 * This is a tripwire, not a guarantee. It reads only tracked files.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

interface Rule {
  id: string;
  why: string;
  pattern: RegExp;
}

const RULES: Rule[] = [
  {
    id: "private-key",
    why: "PEM private key block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  { id: "aws-access-key", why: "AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "resend-key", why: "Resend API key", pattern: /\bre_[A-Za-z0-9_-]{16,}\b/ },
  { id: "github-token", why: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { id: "slack-token", why: "Slack token", pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/ },
  { id: "openai-key", why: "Provider API key", pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  {
    id: "postgres-url-with-password",
    why: "PostgreSQL URL carrying a password",
    pattern: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/,
  },
];

/**
 * Documentation templates are not credentials. A connection string whose
 * userinfo is an obvious placeholder describes the shape a value must take,
 * which is exactly what .env.example is for.
 */
const TEMPLATE_USERINFO = /postgres(?:ql)?:\/\/(?:<[^>]*>|[A-Z_]+):(?:<[^>]*>|PASSWORD|[A-Z_]+)@/;

function looksLikeTemplate(line: string): boolean {
  return TEMPLATE_USERINFO.test(line);
}

/**
 * Rough entropy signal for a bare value: long, mixed alphabet and mostly
 * distinct characters. Catches a pasted key without flagging a URL, a port,
 * an enum or an ordinary English placeholder.
 */
function looksHighEntropy(value: string): boolean {
  const bare = value.replace(/^["']|["']$/g, "");
  if (bare.length < 20) return false;
  if (/^https?:\/\//.test(bare)) return false;
  if (/\s/.test(bare)) return false;
  const classes =
    Number(/[a-z]/.test(bare)) + Number(/[A-Z]/.test(bare)) + Number(/[0-9]/.test(bare));
  if (classes < 2) return false;
  return new Set(bare).size / bare.length > 0.45;
}

/** Files whose whole point is to describe secrets without containing them. */
const ALLOWLIST_PATHS = new Set(["scripts/security/secret-scan.ts"]);

/** Directories that never hold source we control. */
const SKIP_PREFIXES = ["node_modules/", ".next/", "test-results/", "archive/", "pnpm-lock.yaml"];

function trackedFiles(): string[] {
  try {
    return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
  } catch {
    console.error("secret-scan: not a git repository; nothing tracked to scan.");
    return [];
  }
}

function isBinary(buf: Buffer): boolean {
  return buf.subarray(0, 4096).includes(0);
}

interface Finding {
  file: string;
  line: number;
  rule: string;
  why: string;
}

function scanEnvExample(findings: Finding[]): void {
  const file = ".env.example";
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq === -1) return;
    const value = line.slice(eq + 1).trim();
    if (looksLikeTemplate(value)) return;
    // Names, explanations and shape templates are the point of this file.
    // A real secret is what must never reach it.
    if (looksHighEntropy(value)) {
      findings.push({
        file,
        line: index + 1,
        rule: "env-example-has-value",
        why: ".env.example must document names and shapes, never real values",
      });
    }
  });
}

function main(): void {
  const findings: Finding[] = [];
  for (const file of trackedFiles()) {
    if (ALLOWLIST_PATHS.has(file)) continue;
    if (SKIP_PREFIXES.some((prefix) => file.startsWith(prefix))) continue;
    let buf: Buffer;
    try {
      buf = readFileSync(path.resolve(file));
    } catch {
      continue;
    }
    if (isBinary(buf)) continue;
    const lines = buf.toString("utf8").split("\n");
    lines.forEach((line, index) => {
      if (looksLikeTemplate(line)) return;
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          findings.push({ file, line: index + 1, rule: rule.id, why: rule.why });
        }
      }
    });
  }
  scanEnvExample(findings);

  if (findings.length === 0) {
    console.info("secret-scan: clean.");
    return;
  }
  // Report the location, never the matched text - printing it would copy the
  // secret into CI logs, which is the thing this script exists to prevent.
  console.error("secret-scan: " + String(findings.length) + " finding(s).");
  for (const f of findings) {
    console.error("  " + f.file + ":" + String(f.line) + "  [" + f.rule + "] " + f.why);
  }
  process.exitCode = 1;
}

main();
