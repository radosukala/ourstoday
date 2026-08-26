
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function key() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

function post(path: string, body: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-ours-request": "1" },
    body: JSON.stringify(body),
  });
}

export function MeActions() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  async function correct() {
    setMsg(null); setErr(false);
    if (name.trim().length < 2) { setErr(true); setMsg("PROPOSE A PUBLIC NAME OF AT LEAST 2 CHARACTERS."); return; }
    const res = await post("/api/v1/me/correction-requests", {
      proposedDisplayName: name.trim(),
      idempotencyKey: key(),
      ...(reason ? { reasonDetail: reason } : {}),
    }).catch(() => null);
    if (!res || !res.ok) {
      const payload = res ? ((await res.json().catch(() => ({}))) as { message?: string }) : {};
      setErr(true); setMsg((payload.message ?? "REQUEST FAILED.").toUpperCase());
      return;
    }
    setErr(false); setMsg("CORRECTION REQUEST RECORDED. IT WAS NOT APPLIED YET.");
    setName("");
    router.refresh();
  }

  async function withdraw() {
    setMsg(null); setErr(false);
    if (!window.confirm("Request withdrawal of your public identity? A steward reviews every request.")) return;
    const res = await post("/api/v1/me/withdrawal-requests", {
      reasonCode: "PERSONAL_CHOICE",
      ...(reason ? { reasonDetail: reason } : {}),
      idempotencyKey: key(),
    }).catch(() => null);
    if (!res || !res.ok) {
      const payload = res ? ((await res.json().catch(() => ({}))) as { message?: string }) : {};
      setErr(true); setMsg((payload.message ?? "REQUEST FAILED.").toUpperCase());
      return;
    }
    setErr(false); setMsg("WITHDRAWAL REQUEST RECORDED. YOUR PLACE WOULD BECOME A TOMBSTONE; NUMBERS ARE NEVER REASSIGNED.");
    router.refresh();
  }

  return (
    <div style={{ marginTop: 14 }}>
      <label className="field-label" htmlFor="correction-name">PROPOSED PUBLIC NAME (CORRECTION)</label>
      <input
        id="correction-name"
        type="text"
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="field-label" htmlFor="request-reason">
        WHY <span>OPTIONAL, PRIVATE TO REVIEW</span>
      </label>
      <textarea
        id="request-reason"
        rows={3}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      ></textarea>
      <div className="receipt-actions">
        <button className="small-button" type="button" onClick={correct}>REQUEST NAME CORRECTION</button>
        <button className="small-button danger-button" type="button" onClick={withdraw}>REQUEST WITHDRAWAL</button>
      </div>
      <p className="form-status" role="status" aria-live="polite" data-state={err ? "error" : msg ? "ok" : undefined}>
        {msg}
      </p>
    </div>
  );
}

MeActions.RevokeAll = function RevokeAll() {
  const router = useRouter();
  const [state, setState] = useState<"IDLE" | "BUSY" | "DONE">("IDLE");

  async function revoke() {
    setState("BUSY");
    // Revoking all sessions signs THIS device out too - by design.
    await fetch("/api/auth/sign-out", { method: "POST", headers: { "x-ours-request": "1" } }).catch(() => null);
    setState("DONE");
    router.push("/");
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button className="small-button danger-button" type="button" onClick={revoke} disabled={state === "BUSY"}>
        {state === "BUSY" ? "REVOKING…" : state === "DONE" ? "SIGNED OUT" : "SIGN OUT EVERYWHERE"}
      </button>
      <p className="neutral-note">ENDS ALL SESSIONS FOR THIS ACCOUNT, INCLUDING THIS DEVICE.</p>
    </div>
  );
};

