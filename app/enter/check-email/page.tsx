import Link from "next/link";
import { FoundingFooter, FoundingTopline } from "@/components/FoundingChrome";

export const dynamic = "force-static";

export default function CheckEmailPage() {
  return (
    <div className="fm-flow">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <FoundingTopline status="ENTRY · STEP 02 OF 03" />
      <main id="main">
        <section className="page-shell ink confirm-hero" aria-labelledby="check-title">
          <p className="eyebrow signal-text">ENTRY · STEP 02 OF 03</p>
          <h1 id="check-title">Check your email.</h1>
          <p className="large-copy" style={{ color: "var(--paper-quiet)" }}>
            If your address can receive sign-in links, one is on its way. Open it within 10 minutes.
            On the OURS page you must press CONTINUE — opening the email alone signs nothing in.
          </p>
          <p className="token-warning" role="note">
            THE LINK AUTHENTICATES YOUR EMAIL ONLY. IT DOES NOT CREATE A FOUNDING LEDGER ENTRY OR
            LEGAL MEMBERSHIP.
          </p>
          <p className="neutral-note">
            NOTHING ARRIVED? CHECK SPAM, OR <Link href="/enter">REQUEST A NEW LINK</Link>. REQUESTS
            ARE RATE LIMITED.
          </p>
        </section>
      </main>
      <FoundingFooter />
    </div>
  );
}
