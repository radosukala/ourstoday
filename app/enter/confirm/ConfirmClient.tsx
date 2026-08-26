"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "READY" | "BUSY" | "USED" | "EXPIRED" | "ERROR";

const GENERIC = "This link is expired or was already used.";

export function ConfirmClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("READY");
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Read the fragment only; it is never sent to any server by this check.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setHasToken((hash.get("token") ?? "").length > 0);
  }, []);

  async function continueClicked() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("token") ?? "";
    const ctxId = hash.get("ctx") ?? undefined;
    if (!token) {
      setPhase("ERROR");
      return;
    }
    setPhase("BUSY");
    try {
      const res = await fetch("/api/v1/auth/magic-link-confirm", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ours-request": "1" },
        body: JSON.stringify({ token, ...(ctxId ? { ctxId } : {}) }),
      });
      const payload = (await res.json()) as { status?: string; state?: string };
      if (res.ok && payload.status === "OK") {
        // Replace history so the token cannot linger in the address bar.
        window.history.replaceState(null, "", "/enter/continue");
        router.push("/enter/continue");
        return;
      }
      setPhase(payload.state === "LINK_NOT_USABLE" ? "USED" : "ERROR");
    } catch {
      setPhase("ERROR");
    }
  }

  return (
    <main id="main">
      <section className="page-shell ink confirm-hero" aria-labelledby="confirm-title">
        <p className="eyebrow signal-text">ENTRY · STEP 03 OF 03 · EXPLICIT CONFIRMATION</p>
        <h1 id="confirm-title">
          {phase === "READY"
            ? "Press continue to finish signing in."
            : phase === "BUSY"
              ? "Checking your link…"
              : "This link cannot be used."}
        </h1>
        <p className="large-copy" style={{ color: "var(--paper-quiet)" }}>
          Nothing has been signed in yet - not by the email and not by opening this page. Signing in
          happens only when you press CONTINUE.
        </p>
        <button
          className="action-button inverse"
          type="button"
          onClick={continueClicked}
          disabled={phase !== "READY"}
        >
          CONTINUE <span aria-hidden="true">→</span>
        </button>
        <div aria-live="polite">
          {(phase === "USED" || phase === "EXPIRED" || phase === "ERROR") && (
            <p className="form-status" data-state="error">
              {GENERIC} Request a fresh link from the entry page.
            </p>
          )}
          {!hasToken && phase === "READY" && (
            <p className="token-warning" role="note">
              NO LINK DATA FOUND IN THIS PAGE. OPEN THE FULL LINK FROM YOUR EMAIL (INCLUDING
              EVERYTHING AFTER THE #).
            </p>
          )}
        </div>
        <p className="neutral-note">
          THIS AUTHENTICATES YOUR EMAIL. IT DOES NOT CREATE A FOUNDING LEDGER ENTRY OR LEGAL
          MEMBERSHIP. DID NOT REQUEST THIS? CLOSE THIS PAGE AND IGNORE THE EMAIL.
        </p>
      </section>
    </main>
  );
}
