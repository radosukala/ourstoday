"use client";

import { useState } from "react";
import type { MissionRow } from "@/ledger/missions";

function makeKey(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function MissionPicker({ missions }: { missions: MissionRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (missions.length === 0) return null;

  function toggle(slug: string) {
    setError(null);
    setSelected((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (selected.length === 0) {
      setError("CHOOSE AT LEAST ONE TARGET.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/v1/missions/notices", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ours-request": "1" },
        body: JSON.stringify({ noticeSlugs: selected, idempotencyKey: makeKey() }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "YOUR NOTICE COULD NOT BE RECORDED.");
        return;
      }
      setComplete(true);
    } catch {
      setError("THE RESULT IS UNKNOWN. CHECK YOUR ACCOUNT BEFORE TRYING AGAIN.");
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <section className="post-entry-missions complete" aria-live="polite">
        <p className="post-entry-step">PLACE SEALED · NOTICE RECORDED</p>
        <h3>Nobody will ask you to leave alone.</h3>
        <p>Your notice now counts toward the shared threshold. Nothing is triggered below it.</p>
        <a className="small-button" href="/today">
          SEE THE PUBLIC RECORD
        </a>
      </section>
    );
  }

  return (
    <section className="post-entry-missions" aria-labelledby="post-entry-title">
      <p className="post-entry-step">YOUR PLACE IS SAFE · NEXT, IF YOU WANT</p>
      <h3 id="post-entry-title">What would you leave if nobody left alone?</h3>
      <p className="post-entry-intro">
        This cannot change your number or your Founding Right. It tells OURS what demand to
        aggregate first.
      </p>
      <form onSubmit={submit} noValidate>
        <ul>
          {missions.map((mission) => {
            const active = selected.includes(mission.slug);
            return (
              <li key={mission.slug}>
                <button type="button" aria-pressed={active} onClick={() => toggle(mission.slug)}>
                  <span aria-hidden="true">{active ? "✓" : "+"}</span>
                  <b>{mission.title}</b>
                  <em>{mission.incumbents}</em>
                  <small>
                    {mission.noticeCount.toLocaleString("en-US")} /{" "}
                    {mission.threshold.toLocaleString("en-US")}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
        <button className="action-button inverse" type="submit" disabled={busy}>
          {busy ? "RECORDING…" : "GIVE NOTICE"} <span aria-hidden="true">→</span>
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
    </section>
  );
}
