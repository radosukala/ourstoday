import { NextResponse } from "next/server";
import { getSql, toDate, type DbTimestamp } from "@/db/sqltype";
import { verifyRelayToken } from "@/security/relay";
import { relayCookieSetHeaders, RELAY_COOKIE_CONSTANTS } from "@/lib/person";
import { config } from "@/config";

export const dynamic = "force-dynamic";

/**
 * /r/[token] - relay landing.
 *
 * GET and HEAD perform NO database mutation. Reads only. The single effect is
 * a short-lived signed, HTTP-only cookie that preserves attribution for a
 * later authenticated seal on this device - explicitly sanctioned by the
 * protocol ("preserve valid context ... using a short-lived signed HTTP-only
 * SameSite cookie").
 *
 * Invalid/revoked tokens render one generic state; nothing about the
 * predecessor or token internals is revealed.
 */
function page(inner: string): NextResponse {
  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>OURS TODAY · The Founding Relay</title>",
    '<link rel="stylesheet" href="/globals.css">',
    "</head>",
    "<body>",
    inner,
    "</body>",
    "</html>",
  ].join("\n");
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store, max-age=0",
    },
  });
}

async function handle(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;

  let cfgSecrets: Map<number, string> | null = null;
  try {
    cfgSecrets = config().relaySecrets;
  } catch {
    return page(shellUnavailable());
  }

  const verified = verifyRelayToken(token, cfgSecrets);
  if (!verified.ok) {
    return page(shellInvalid());
  }

  const jtiDigest = (await import("node:crypto"))
    .createHash("sha256")
    .update(verified.payload.jti)
    .digest("hex");
  let rows: { id: string; state: string; predecessor_entry_id: string }[];
  try {
    rows = await getSql().unsafe(
      "SELECT id, state, predecessor_entry_id FROM private.relay_token_record WHERE jti_digest = $1",
      [jtiDigest],
    );
  } catch {
    return page(shellUnavailable());
  }
  const record = rows[0];
  if (!record || record.state !== "ACTIVE") {
    return page(shellInvalid());
  }

  // Read-only public context of the predecessor.
  const predRows = await getSql().unsafe<
    {
      ordinal: number;
      display_name: string | null;
      entered_at: DbTimestamp;
      public_status: string;
    }[]
  >(
    "SELECT ordinal, display_name, entered_at, public_status FROM public.founding_ledger WHERE ordinal = (SELECT ordinal FROM ledger.entry WHERE id = $1)",
    [record.predecessor_entry_id],
  );
  const pred = predRows[0];
  if (!pred) return page(shellInvalid());

  const res = page(
    shellValid({
      predecessorLabel: "#" + String(pred.ordinal).padStart(6, "0"),
      name: pred.display_name ?? "[WITHDRAWN]",
      entered: toDate(pred.entered_at).toISOString().slice(0, 10),
    }),
  );
  if (req.method === "GET") {
    const cookieSpec = relayCookieSetHeaders(record.id);
    res.headers.append(
      "set-cookie",
      cookieSpec.name +
        "=" +
        cookieSpec.value +
        "; Path=/; Max-Age=" +
        RELAY_COOKIE_CONSTANTS.maxAgeSeconds +
        "; HttpOnly; SameSite=Lax" +
        (process.env.APP_ENV === "production" ? "; Secure" : ""),
    );
  }
  return res;
}

function shellValid(p: { predecessorLabel: string; name: string; entered: string }): string {
  return [
    '<main id="main">',
    '  <section class="entry-instrument ink-section" aria-labelledby="relay-title">',
    '    <div class="entry-copy">',
    '      <p class="eyebrow signal-text">THE FOUNDING RELAY · CONTINUATION INVITATION</p>',
    '      <h2 id="relay-title">A line continued to you.</h2>',
    '      <p class="large-copy">You were invited through ' +
      p.predecessorLabel +
      " (" +
      escapeHtml(p.name) +
      ", entered " +
      escapeHtml(p.entered) +
      "). Entering assigns YOUR OWN number when your verified entry seals - it never activates anyone else.</p>",
    '      <ol class="relay-sequence" aria-label="What happens next">',
    "        <li><b>01</b><span>YOU VERIFY YOUR EMAIL</span></li>",
    "        <li><b>02</b><span>YOU CHOOSE A PUBLIC NAME</span></li>",
    "        <li><b>03</b><span>YOU SEAL YOUR OWN PLACE</span></li>",
    "        <li><b>04</b><span>THE LINE IS RECORDED THROUGH YOU</span></li>",
    "      </ol>",
    "    </div>",
    '    <div class="entry-panel">',
    '      <p class="large-copy" style="color:var(--paper-quiet)">THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.</p>',
    '      <p class="neutral-note" style="color:var(--paper-quiet)">OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED. AN ENTRY IS NOT LEGAL MEMBERSHIP, A SHARE OR A TOKEN. NOTHING WAS RECORDED BY OPENING THIS PAGE.</p>',
    '      <a class="action-button inverse" href="/enter" style="margin-top:30px;display:flex">CONTINUE TO ENTRY <span aria-hidden="true">→</span></a>',
    "    </div>",
    "  </section>",
    "</main>",
  ].join("\n");
}

function shellInvalid(): string {
  return shellGeneric(
    "This relay link does not work.",
    "The link may be mistyped or revoked. Nothing was recorded by opening this page.",
  );
}

function shellUnavailable(): string {
  return shellGeneric(
    "The relay is temporarily unavailable.",
    "Try again shortly. Nothing was recorded by opening this page.",
  );
}

function shellGeneric(title: string, note: string): string {
  return [
    '<main id="main">',
    '  <section class="page-shell ink" aria-labelledby="relay-generic-title">',
    '    <p class="eyebrow signal-text">THE FOUNDING RELAY</p>',
    '    <h2 id="relay-generic-title">' + escapeHtml(title) + "</h2>",
    '    <p class="large-copy" style="color:var(--paper-quiet);margin-top:22px">' +
      escapeHtml(note) +
      "</p>",
    '    <p class="neutral-note" style="color:var(--paper-quiet)">THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT. OWNERSHIP: COMMITTED · LEGAL MEMBERSHIP: NOT YET ISSUED.</p>',
    '    <a class="small-button" href="/" style="margin-top:26px;display:inline-flex;color:var(--paper)">OURS TODAY</a>',
    "  </section>",
    "</main>",
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const GET = handle;
export async function HEAD(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const res = await handle(req, ctx);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
