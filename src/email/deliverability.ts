import { Resend } from "resend";
import { config } from "@/config";

/**
 * Can this environment actually deliver a magic link?
 *
 * The magic-link request endpoint returns the SAME neutral response whether or
 * not delivery succeeded, because telling a caller "no such address" turns the
 * form into an address oracle. That is the right trade and it has a cost: when
 * sending breaks, every visitor sees "check your email", nothing arrives, and
 * the only trace is a log line the redaction rules keep thin.
 *
 * Opening the ledger with sending broken would mean nobody can enter and
 * nobody finds out. So the deep health check answers the question directly,
 * before a person has to discover it.
 */
export interface EmailDeliverability {
  mode: "capture" | "resend";
  /** The domain of the configured From address. */
  fromDomain: string;
  /** False means a real person requesting a link would not receive one. */
  deliverable: boolean;
  detail: string;
}

/** The domain part of `Name <user@domain>` or a bare address. */
export function fromAddressDomain(from: string): string {
  const match = /<([^>]+)>/.exec(from);
  const address = (match?.[1] ?? from).trim();
  const at = address.lastIndexOf("@");
  return at === -1 ? "" : address.slice(at + 1).toLowerCase();
}

export async function checkEmailDeliverability(): Promise<EmailDeliverability> {
  const cfg = config();
  const fromDomain = fromAddressDomain(cfg.resendFrom);

  if (cfg.emailDeliveryMode === "capture") {
    // Capture writes to a local directory. In production that is not a
    // degraded mode, it is silent total failure, so report it as such.
    const deliverable = cfg.appEnv !== "production";
    return {
      mode: "capture",
      fromDomain,
      deliverable,
      detail: deliverable
        ? "Capture mode: messages are written to a local directory, not sent."
        : "CAPTURE MODE IN PRODUCTION: no message will ever be delivered.",
    };
  }

  if (!cfg.resendApiKey) {
    return {
      mode: "resend",
      fromDomain,
      deliverable: false,
      detail: "RESEND_API_KEY is not set.",
    };
  }

  try {
    const resend = new Resend(cfg.resendApiKey);
    const { data, error } = await resend.domains.list();
    if (error) {
      return {
        mode: "resend",
        fromDomain,
        deliverable: false,
        // The provider's message can name the account; report the class only.
        detail: "Resend rejected the domain listing request.",
      };
    }
    const domains = (data?.data ?? []) as { name?: string; status?: string }[];
    const match = domains.find((d) => (d.name ?? "").toLowerCase() === fromDomain);
    if (!match) {
      const known = domains
        .map((d) => (d.name ?? "").toLowerCase())
        .filter(Boolean)
        .join(", ");
      return {
        mode: "resend",
        fromDomain,
        deliverable: false,
        detail:
          "The sending domain is not registered with Resend." +
          (known ? " Verified there: " + known + "." : ""),
      };
    }
    const status = (match.status ?? "unknown").toLowerCase();
    const deliverable = status === "verified";
    return {
      mode: "resend",
      fromDomain,
      deliverable,
      detail: deliverable
        ? "Sending domain is verified."
        : "Sending domain status is '" + status + "', not 'verified'.",
    };
  } catch {
    return {
      mode: "resend",
      fromDomain,
      deliverable: false,
      detail: "Could not reach Resend to check the sending domain.",
    };
  }
}
