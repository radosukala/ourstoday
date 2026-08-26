
"use client";

import { useState } from "react";
import type { DocumentVersions } from "@/legal/documents";

interface ReceiptPayload {
  status?: string;
  state?: string;
  message?: string;
  ordinalLabel?: string;
  displayName?: string;
  firstContinuationOfOrdinal?: string | null;
  relayUrl?: string | null;
  receipt?: {
    headline: string;
    lines: [string, string][];
    legalStatus: string;
    shareCopySuggestion: string;
  };
}

function makeKey(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function SealForm({ versions, alreadySealed }: { versions: DocumentVersions; alreadySealed: boolean }) {
  const [name, setName] = useState("");
  const [accept1, setAccept1] = useState(false);
  const [accept2, setAccept2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorState, setErrorState] = useState<{ state: string; message: string } | null>(null);
  const [result, setResult] = useState<ReceiptPayload | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorState(null);
    if (!name.trim() || !accept1 || !accept2) {
      setErrorState({ state: "INCOMPLETE", message: "ADD A PUBLIC NAME AND ACCEPT BOTH ACKNOWLEDGMENTS." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/entries/seal", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ours-request": "1" },
        body: JSON.stringify({
          displayName: name.trim(),
          acceptedVersions: versions,
          idempotencyKey: makeKey(),
        }),
      });
      const payload = (await res.json()) as ReceiptPayload;
      if (!res.ok || payload.status !== "OK") {
        setErrorState({ state: payload.state ?? "ERROR", message: payload.message ?? "The seal did not commit." });
        setResult(null);
      } else {
        setResult(payload);
      }
    } catch {
      setErrorState({ state: "NETWORK", message: "THE RESULT IS UNKNOWN. WAIT A MOMENT BEFORE RETRYING; RETRYING WITH THE SAME INPUT RETURNS THE SAME ENTRY." });
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  }

  if (alreadySealed && !result) {
    return (
      <div className="receipt-block">
        <div className="receipt-status">ALREADY SEALED</div>
        <h3>This account already holds an entry.</h3>
        <p className="neutral-note">Open <a href="/me" style={{ color: "var(--paper)" }}>/me</a> to see it, export your records or request changes.</p>
      </div>
    );
  }

  if (result?.status === "OK") {
    const padded = result.ordinalLabel ?? "";
    return (
      <article className="receipt-block" aria-live="polite">
        <div className="receipt-status">SEALED · COMMITTED</div>
        <h3>{result.receipt?.headline ?? "You are in the Founding Ledger."}</h3>
        <dl>
          <div><dt>PUBLIC NUMBER</dt><dd>{"#" + padded + " — assigned at commit, not before."}</dd></div>
          {result.firstContinuationOfOrdinal ? (
            <div><dt>LINE CONTINUED</dt><dd>{"Entered through #" + result.firstContinuationOfOrdinal}</dd></div>
          ) : null}
          <div><dt>PUBLIC NAME</dt><dd>{result.displayName}</dd></div>
          <div><dt>LEGAL MEMBERSHIP</dt><dd>NOT YET ISSUED — THIS IS NOT LEGAL MEMBERSHIP.</dd></div>
        </dl>
        {result.relayUrl ? (
          <>
            <h3 style={{ marginTop: 24, fontSize: 22 }}>Your relay is open.</h3>
            <p className="neutral-note" style={{ color: "var(--paper-quiet)" }}>
              CARRY IT IF AND WHERE YOU CHOOSE. OURS NEVER POSTS FOR YOU.
            </p>
            <dl>
              <div><dt>RELAY URL</dt><dd>{result.relayUrl}</dd></div>
            </dl>
            <div className="receipt-actions">
              <button className="small-button" type="button" onClick={() => copy(result.relayUrl ?? "", "relay")}>
                {copied === "relay" ? "COPIED" : "COPY RELAY URL"}
              </button>
              <button
                className="small-button"
                type="button"
                onClick={() =>
                  copy(
                    (result.receipt?.shareCopySuggestion ?? "") + "\n\nContinue the line from me: " + result.relayUrl,
                    "share",
                  )
                }
              >
                {copied === "share" ? "COPIED" : "COPY SHARE TEXT"}
              </button>
            </div>
          </>
        ) : null}
        <div className="receipt-actions" style={{ marginTop: 18 }}>
          <a className="small-button" href={"/e/" + String(parseInt(padded || "0", 10))}>VIEW PUBLIC RECEIPT</a>
          <a className="small-button" href="/me">GO TO YOUR ACCOUNT</a>
        </div>
      </article>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {!result ? (
        <>
          <label className="field-label" htmlFor="public-name">PUBLIC NAME OR PSEUDONYM</label>
          <input
            id="public-name"
            name="displayName"
            type="text"
            maxLength={40}
            autoComplete="nickname"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby="public-name-note"
          />
          <p className="field-note" id="public-name-note">
            This becomes public on the ledger when you seal. Your email never does.
          </p>

          <label className="check-row">
            <input type="checkbox" checked={accept1} onChange={(e) => setAccept1(e.target.checked)} />
            <span>I affirm the founding declaration: the network is ours; everything else can be built. I accept the listed document versions.</span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={accept2} onChange={(e) => setAccept2(e.target.checked)} />
            <span>I understand this creates one Founding Ledger place—not legal membership, not ownership, not a share or token—and that my public number is assigned only when this seals.</span>
          </label>

          <button className="action-button inverse" type="submit" disabled={busy}>
            {busy ? "SEALING…" : "SEAL MY ENTRY"} <span aria-hidden="true">→</span>
          </button>
          <p className="form-status" role="status" aria-live="polite" data-state={errorState ? "error" : undefined}>
            {errorState?.message}
          </p>
        </>
      ) : null}
    </form>
  );
}

