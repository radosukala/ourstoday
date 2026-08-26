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
]);

export async function GET(_req: Request, ctx: { params: Promise<{ document: string }> }) {
  const { document } = await ctx.params;
  // Reject traversal attempts explicitly before the allowlist check.
  if (document.includes("/") || document.includes("..") || document.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!ALLOWLIST.has(document)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const body = await readFile(path.join(process.cwd(), "docs", document), "utf8");
    return new NextResponse(body, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
