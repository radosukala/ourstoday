"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MissionRow } from "@/ledger/missions";

function count(value: number): string {
  return value.toLocaleString("en-US");
}

function ordinal(value: number | null): string {
  return value === null ? "—" : "#" + String(value).padStart(6, "0");
}

export function FoundingTerminal({
  limit,
  issued,
  nextOrdinal,
  remaining,
  open,
  available,
  ledgerState,
  target,
}: {
  limit: number;
  issued: number;
  nextOrdinal: number | null;
  remaining: number;
  open: boolean;
  available: boolean;
  ledgerState: "CLOSED" | "OPEN" | "PAUSED";
  /** The leading target, or null when the board cannot be read here. */
  target: MissionRow | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("ENTER A VALID EMAIL ADDRESS.");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/v1/auth/request-magic-link", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ours-request": "1" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // The next page is deliberately neutral whether delivery succeeded or
      // failed, so this surface cannot enumerate email addresses.
    } finally {
      setBusy(false);
      router.push("/enter/check-email");
    }
  }

  const closedLabel =
    remaining === 0
      ? "FOUNDING COMPLETE"
      : ledgerState === "PAUSED"
        ? "FORMATION PAUSED"
        : "FORMATION NOT OPEN";

  return (
    <aside className="fm-terminal" aria-label="Live Founding Million state">
      <div className="fm-terminal-bar">
        <span>OURS://FOUNDING_MILLION</span>
        <span className={open ? "is-live" : ""}>
          <i aria-hidden="true" /> {open ? "ACCEPTING PEOPLE" : closedLabel}
        </span>
      </div>

      <div className="fm-terminal-body">
        <p className="fm-command">
          <span aria-hidden="true">$</span> ours form --limit {count(limit)}
        </p>

        <div className="fm-scan" aria-label="Why now">
          <p>
            <span>CODE CREATION</span>
            <b>≈ FREE</b>
          </p>
          <p>
            <span>INFRASTRUCTURE</span>
            <b>≈ FREE</b>
          </p>
          <p className="blocked">
            <span>AGGREGATED DEMAND</span>
            <b>{available ? count(issued) : "UNAVAILABLE"}</b>
          </p>
          {/* Demand for what. Without this row the scan is an abstraction. */}
          {target ? (
            <p className="aimed">
              <span>AIMED AT</span>
              <b>{target.incumbents || target.title}</b>
            </p>
          ) : null}
        </div>

        <dl className="fm-counter">
          <div>
            <dt>FORMED</dt>
            <dd>{available ? count(issued) : "—"}</dd>
          </div>
          <div className="next">
            <dt>NEXT</dt>
            <dd>{available ? ordinal(nextOrdinal) : "—"}</dd>
          </div>
          <div>
            <dt>LEFT</dt>
            <dd>{available ? count(remaining) : "—"}</dd>
          </div>
        </dl>

        <div className="fm-right">
          <p>ONE PERSON. ONE FOUNDING RIGHT.</p>
          <span>PERMANENT NUMBER · EQUAL FOUNDING BALLOT · NON-TRANSFERABLE</span>
        </div>

        <form className="fm-form" onSubmit={enter} noValidate>
          <label htmlFor="founding-email">YOUR EMAIL</label>
          <div className="fm-entry-row">
            <span aria-hidden="true">&gt;</span>
            <input
              id="founding-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={320}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={busy || !open}>
              {busy ? "SENDING…" : open ? "ENTER OURS — FREE" : closedLabel}
              <span aria-hidden="true">↵</span>
            </button>
          </div>
          <p className="fm-form-note">
            Magic link first. Your number exists only after you consent and seal.
          </p>
          <p className="fm-error" role="status" aria-live="polite">
            {error}
          </p>
        </form>

        <p className="fm-urgency">
          WHEN #{count(limit)} SEALS, FOUNDING CLOSES. YOUR NUMBER ONLY MOVES ONE WAY: LATER.
        </p>
      </div>
    </aside>
  );
}
