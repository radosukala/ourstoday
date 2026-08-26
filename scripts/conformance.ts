/**
 * Conformance CLI.
 *
 *   pnpm conformance run        run the invariants and APPEND the result
 *   pnpm conformance check      run them and print, appending nothing
 *   pnpm conformance history    recent runs
 *
 * `run` is what a nightly schedule calls. It appends `conformance.verified`
 * or `conformance.failed` to the canonical log and exits non-zero on failure,
 * so the schedule surfaces it - but the record is written either way. There is
 * no flag that suppresses a failing result, and adding one would be the single
 * most expensive line anyone could contribute to this repository.
 */
import { execFileSync } from "node:child_process";
import { announceTarget, loadEnv, notRun, requireDatabaseUrl, takeProfile } from "./env";

function commitRef(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function render(result: {
  passed: boolean;
  failedChecks: number;
  checks: { id: string; claim: string; passed: boolean; detail: string }[];
  eventSeqHigh: number;
}): void {
  for (const check of result.checks) {
    console.info((check.passed ? "  PASS  " : "  FAIL  ") + check.id.padEnd(30) + check.detail);
    if (!check.passed) console.info("        claim: " + check.claim);
  }
  console.info("");
  console.info(
    result.passed
      ? "CONFORMANCE PASS — " +
          result.checks.length +
          " checks, events through seq " +
          result.eventSeqHigh
      : "CONFORMANCE FAIL — " +
          result.failedChecks +
          " of " +
          result.checks.length +
          " checks failed",
  );
}

async function main(): Promise<void> {
  const { argv, profile } = takeProfile(process.argv.slice(2));
  loadEnv(profile);
  const command = argv[0] ?? "check";
  if (command === "run") announceTarget("conformance run");

  if (command === "history") {
    requireDatabaseUrl("conformance history");
    const { listConformanceRuns } = await import("../src/ledger/conformance");
    const runs = await listConformanceRuns();
    if (runs.length === 0) {
      console.info("No conformance runs recorded yet.");
      return;
    }
    for (const run of runs) {
      console.info(
        [
          run.ranAt.toISOString(),
          run.passed ? "PASS" : "FAIL(" + run.failedChecks + ")",
          run.environment.padEnd(10),
          "seq " + run.eventSeqHigh,
          run.commitRef?.slice(0, 8) ?? "-",
        ].join("  "),
      );
    }
    return;
  }

  if (command !== "run" && command !== "check") {
    console.info("Usage: pnpm conformance run|check|history");
    process.exitCode = 1;
    return;
  }

  requireDatabaseUrl("conformance " + command);
  try {
    const { getSql } = await import("../src/db/client");
    await getSql().unsafe("SELECT 1");
  } catch (error) {
    notRun(
      "conformance " + command,
      "cannot reach PostgreSQL: " + (error instanceof Error ? error.message : String(error)),
    );
  }

  if (command === "check") {
    const { runConformanceChecks } = await import("../src/ledger/conformance");
    const result = await runConformanceChecks();
    render(result);
    if (!result.passed) process.exitCode = 1;
    return;
  }

  const { runAndRecordConformance } = await import("../src/ledger/conformance");
  const result = await runAndRecordConformance({
    environment: process.env.APP_ENV ?? "local",
    commitRef: commitRef(),
  });
  render(result);
  console.info("Recorded. This result is now part of the canonical log, pass or fail.");
  if (!result.passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
