import { Resend } from "resend";
import type { OutboundEmail, EmailDeliveryResult } from "./types";

export async function sendViaResend(
  email: OutboundEmail,
  apiKey: string,
  from: string,
): Promise<EmailDeliveryResult> {
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(`Resend delivery failed: ${error.message}`);
  return { provider: "resend", id: data?.id };
}
