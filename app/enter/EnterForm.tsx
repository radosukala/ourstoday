"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EnterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("ADD A VALID EMAIL ADDRESS.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/auth/request-magic-link", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ours-request": "1" },
        body: JSON.stringify({ email }),
      });
      const payload = (await res.json()) as { status?: string; state?: string };
      if (!res.ok && payload.state !== "RATE_LIMITED") {
        // Neutral UI for every non-rate-limit failure.
        router.push("/enter/check-email");
        return;
      }
      router.push("/enter/check-email");
    } catch {
      router.push("/enter/check-email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label className="field-label" htmlFor="entry-email">
        YOUR EMAIL ADDRESS
      </label>
      <input
        id="entry-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={320}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-describedby="entry-email-note"
      />
      <p className="field-note" id="entry-email-note">
        Used only to authenticate you. It is never shown publicly. This authenticates your email -
        it does not create a Founding Ledger entry or legal membership.
      </p>
      <button className="action-button inverse" type="submit" disabled={busy}>
        {busy ? "SENDING…" : "SEND MY MAGIC LINK"} <span aria-hidden="true">→</span>
      </button>
      <p
        className="form-status"
        role="status"
        aria-live="polite"
        data-state={error ? "error" : undefined}
      >
        {error}
      </p>
    </form>
  );
}
