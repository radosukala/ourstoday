
import { Masthead } from "@/components/Masthead";
import { EnterForm } from "./EnterForm";
import { FOUNDING_DECLARATION_V01, STATUS_LINE } from "@/legal/documents";

export const dynamic = "force-dynamic";

export default function EnterPage() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to entry</a>
      <Masthead formationStatus="ENTRY · VERIFY YOUR EMAIL" />
      <main id="main">
        <section className="entry-instrument ink-section" aria-labelledby="enter-title">
          <div className="entry-copy">
            <p className="eyebrow signal-text">ENTRY · STEP 01 OF 03</p>
            <h2 id="enter-title">Verify control of your email.</h2>
            <p className="large-copy">
              A magic link proves you control this address. It does NOT create a Founding Ledger
              entry, and it never proves legal membership.
            </p>
            <details className="receipt-block" style={{ marginTop: 30 }}>
              <summary style={{ cursor: "pointer", font: "700 11px/1.4 var(--mono)", letterSpacing: "0.06em" }}>
                READ THE FOUNDING DECLARATION BEFORE YOU CONTINUE
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", margin: "18px 0 0", font: "12px/1.8 var(--mono)" }}>
                {FOUNDING_DECLARATION_V01}
              </pre>
            </details>
          </div>
          <div className="entry-panel">
            <EnterForm />
            <p className="neutral-note" aria-live="polite">
              {STATUS_LINE}. NO NUMBER IS RESERVED BY THIS STEP.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

