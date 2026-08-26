
export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailDeliveryResult {
  provider: "capture" | "resend";
  id?: string;
}

