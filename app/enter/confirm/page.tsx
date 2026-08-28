import { FoundingFooter, FoundingTopline } from "@/components/FoundingChrome";
import { ConfirmClient } from "./ConfirmClient";

export const dynamic = "force-static";

/**
 * Scanner-safe two-step confirmation.
 *
 * The magic-link token lives in the URL FRAGMENT, so neither link-preview
 * scanners nor referrers ever transmit it to any server. This page's GET
 * performs no authentication and contains no third-party scripts. Only an
 * explicit human press of CONTINUE submits the fragment token for
 * verification via first-party fetch.
 */
export default function ConfirmPage() {
  return (
    <div className="fm-flow">
      <a className="skip-link" href="#main">
        Skip to confirmation
      </a>
      <FoundingTopline status="ENTRY · CONFIRM" />
      <ConfirmClient />
      <FoundingFooter />
    </div>
  );
}
