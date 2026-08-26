import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Allowlisted governing-document access. Traversal and unknown names are
 * rejected; only docs/*.md files listed here are served as text/markdown.
 */
const ALLOWLIST = new Set([
  "OURS.md",
  "CONSTITUTION-0.1.md",
  "FOUNDING-RELAY-PROTOCOL.md",
  "PROPOSAL-AND-DELIBERATION-PROTOCOL.md",
  "AGENT-BUILD-CONTRACT.md",
  "DAY-1.md",
  "OURS-v0.1.md",
  "FOUNDING-LEDGER-BUILD-HANDOFF.md",
  "FOUNDING-LEDGER-NEXT-SESSION-PROMPT.md",
  "OURS-VISION-ESCALATION-0.1.md",
  "EVENT-SCHEMA-1.0.md",
  "INTERNAL-BOUNDARY.md",
  "INSTRUMENT-DISCLOSURE-0.1.md",
  // The operations package. Publishing the data map and the privacy draft
  // WITH their unanswered questions is the point: this is the record of what
  // is not yet true about the institution.
  "operations/DATA-MAP.md",
  "operations/PRIVACY-NOTICE-DRAFT.md",
  "operations/DEPLOY.md",
  "operations/MIGRATIONS.md",
  "operations/BACKUP-RESTORE.md",
  "operations/PAUSE-LEDGER.md",
  "operations/INCIDENT.md",
  "operations/EMAIL-DELIVERABILITY.md",
  "operations/SECRET-ROTATION.md",
  "operations/SUPPORT-AND-REVIEW.md",
  "operations/FORK-DRILL.md",
  "operations/CONFORMANCE.md",
  // Receipts are the record of what was decided and by whom.
  "receipts/2026-08-26-build-receipt-0.1.md",
  "receipts/2026-08-26-vision-escalation-adoption.md",
  "receipts/2026-08-26-instrument-disclosure-adoption.md",
  // Session records: what an AI instrument did, under whose authority.
  "sessions/2026-08-26-founding-build.md",
]);

const DOCS_ROOT = () => path.join(process.cwd(), "docs");

export async function GET(_req: Request, ctx: { params: Promise<{ document: string[] }> }) {
  const { document: segments } = await ctx.params;
  // Catch-all so allowlisted operations/*.md resolve as real paths rather than
  // percent-encoded single segments.
  const document = (segments ?? []).join("/");
  // Reject traversal shapes before consulting the allowlist. A forward slash
  // is permitted only so that allowlisted operations/*.md paths can resolve;
  // everything else about a segmented path is still refused.
  if (document.includes("..") || document.includes("\\") || document.startsWith("/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!ALLOWLIST.has(document)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const root = DOCS_ROOT();
  const full = path.resolve(root, document);
  // Belt and braces: whatever the allowlist says, never read outside docs/.
  if (!full.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const body = await readFile(full, "utf8");
    return new NextResponse(body, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
