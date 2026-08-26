
import { config } from "@/config";
import { captureEmail } from "./capture";
import { sendViaResend } from "./resend";
import type { OutboundEmail } from "./types";

/**
 * Builds the scanner-safe confirmation URL.
 *
 * The Better Auth token lives ONLY in the URL fragment (#...), so neither
 * link-preview scanners nor referrers ever transmit it. The initial GET of
 * /enter/confirm performs no authentication; a human must press Continue.
 */
export function buildConfirmationUrl(token: string, ctxId?: string): string {
  const cfg = config();
  const params = new URLSearchParams();
  params.set("token", token);
  if (ctxId) params.set("ctx", ctxId);
  return `${cfg.appUrl}/enter/confirm#${params.toString()}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Expiry must match BETTER_AUTH magicLink.expiresIn (10 minutes). */
export const MAGIC_LINK_EXPIRY_MINUTES = 10;

export function renderMagicLinkEmail(confirmationUrl: string): Omit<OutboundEmail, "to"> {
  const urlEscaped = escapeHtml(confirmationUrl);
  const text = [
    "OURS TODAY - sign-in link",
    "",
    `Open this link within ${MAGIC_LINK_EXPIRY_MINUTES} minutes to continue:`,
    confirmationUrl,
    "",
    "On the OURS page, press CONTINUE to finish signing in.",
    "",
    "This authenticates your email. It does not create a Founding Ledger entry or legal membership.",
    "",
    "If you did not request this, ignore this message. Nothing happens without opening it.",
  ].join("\n");

  const html = [
    '<!doctype html><html lang="en"><body style="margin:0;background:#f2efe6;font-family:Arial,Helvetica,sans-serif;color:#11110f">',
    '<div style="max-width:560px;margin:0 auto;padding:32px 24px;border-bottom:2px solid #11110f">',
    '  <p style="margin:0 0 18px;font-size:11px;letter-spacing:.1em;text-transform:uppercase">OURS TODAY \u00b7 SIGN-IN LINK</p>',
    `  <h1 style="font-size:26px;letter-spacing:-0.04em;line-height:1.1;margin:0 0 18px">Finish signing in.</h1>`,
    `  <p style="font-size:15px;line-height:1.5;margin:0 0 22px">Press the button within ${MAGIC_LINK_EXPIRY_MINUTES} minutes. On the OURS page you must press <b>CONTINUE</b> - no one is signed in by merely opening this email.</p>`,
    `  <p style="margin:0 0 26px"><a href="${urlEscaped}" style="display:inline-block;background:#11110f;color:#f2efe6;padding:14px 22px;text-decoration:none;font-weight:bold">CONTINUE ON OURS TODAY</a></p>`,
    '  <p style="font-size:13px;line-height:1.5;margin:0 0 8px">Or copy this link into your browser:</p>',
    `  <p style="font-size:12px;word-break:break-all"><a href="${urlEscaped}">${urlEscaped}</a></p>`,
    '  <hr style="border:none;border-top:2px solid #11110f;margin:26px 0">',
    '  <p style="font-size:12px;line-height:1.5;margin:0"><b>This authenticates your email. It does not create a Founding Ledger entry or legal membership.</b></p>',
    '  <p style="font-size:12px;line-height:1.5;color:#555;margin:8px 0 0">Did not request this? Ignore this message. Nothing happens without opening it.</p>',
    "</div></body></html>",
  ].join("\n");

  return { subject: "OURS TODAY - your sign-in link", html, text };
}

export async function deliverMagicLinkEmail(to: string, confirmationUrl: string): Promise<void> {
  const cfg = config();
  const rendered = renderMagicLinkEmail(confirmationUrl);
  const email: OutboundEmail = { to, ...rendered };
  if (cfg.emailDeliveryMode === "capture") {
    await captureEmail(email, cfg.captureDir);
    return;
  }
  await sendViaResend(email, cfg.resendApiKey as string, cfg.resendFrom);
}

