"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MissionRow } from "@/ledger/missions";
import { NOTICE_COOKIE_MAX_AGE_SECONDS, NOTICE_COOKIE_NAME } from "@/lib/notice-intent";
import {
  ACQUISITION_COST_EUR,
  acquisitionValueEur,
  compactEur,
  DEFAULT_STOP_INDEX,
  DEMAND_STOPS,
  unlockFor,
} from "@/edition/value";

/**
 * The terminal.
 *
 * A boot sequence that runs the real diagnosis and then stops: every input
 * needed to replace these products exists and is cheap, except one. The
 * machine is not pretending to build anything — it is blocked, truthfully,
 * on aggregated demand, and the person reading is the missing input.
 *
 * Everything animated here is presentation over content already in the DOM,
 * so a screen reader, a crawler and a reduced-motion visitor get the whole
 * thing at once and nothing is gated behind an animation.
 */

interface BootLine {
  label: string;
  value?: string;
  tone?: "ok" | "warn";
}

const BOOT: BootLine[] = [
  { label: "compute", value: "AVAILABLE", tone: "ok" },
  { label: "code generation", value: "FREE", tone: "ok" },
  { label: "infrastructure", value: "COMMODITY", tone: "ok" },
  { label: "the products themselves", value: "TRACTABLE", tone: "ok" },
  { label: "switching cost", value: "TOTAL", tone: "warn" },
  { label: "aggregated demand", value: "NOT FOUND", tone: "warn" },
];

export function Terminal({
  missions,
  recordCount,
  nextOrdinal,
  day,
  open,
}: {
  missions: MissionRow[];
  recordCount: number;
  nextOrdinal: number;
  /** Computed by the server from the calendar, never written down here. */
  day: number;
  open: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopIndex, setStopIndex] = useState<number>(DEFAULT_STOP_INDEX);

  const steps = BOOT.length + 2;
  const done = step >= steps;

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStep(steps);
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= steps) {
          window.clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, 190);
    return () => window.clearInterval(id);
  }, [steps]);

  const selectedNumbers = useMemo(
    () =>
      chosen
        .map((slug) => missions.findIndex((m) => m.slug === slug) + 1)
        .filter((n) => n > 0)
        .sort((a, b) => a - b)
        .map((n) => String(n).padStart(2, "0")),
    [chosen, missions],
  );

  const people = DEMAND_STOPS[stopIndex] ?? DEMAND_STOPS[DEFAULT_STOP_INDEX]!;
  const value = acquisitionValueEur(people);
  const unlock = unlockFor(people);

  function toggle(slug: string) {
    setError(null);
    setChosen((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (chosen.length === 0) {
      setError("NO TARGETS SELECTED. CHOOSE WHAT YOU WOULD LEAVE.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("THAT ADDRESS IS NOT VALID.");
      return;
    }
    setBusy(true);
    document.cookie =
      NOTICE_COOKIE_NAME +
      "=" +
      encodeURIComponent(chosen.join(",")) +
      "; path=/; max-age=" +
      String(NOTICE_COOKIE_MAX_AGE_SECONDS) +
      "; samesite=lax";
    try {
      await fetch("/api/v1/auth/request-magic-link", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ours-request": "1" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Neutral either way; the next page never confirms whether an address exists.
    } finally {
      setBusy(false);
      router.push("/enter/check-email");
    }
  }

  return (
    <div
      className="terminal"
      data-booted={done ? "true" : "false"}
      onClick={() => {
        if (!done) setStep(steps);
      }}
    >
      <div className="term-bar">
        <span>OURS://protocol</span>
        <span aria-hidden="true">0.1 · DAY {day} · NOTHING ISSUED YET</span>
      </div>

      <div className="term-body">
        <p className="term-head">
          <span className="term-prompt">$</span> ours diagnose --era
        </p>

        <dl className="term-checks">
          {BOOT.map((line, i) => (
            <div key={line.label} data-shown={step > i ? "true" : "false"} data-tone={line.tone}>
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>

        <div className="term-verdict" data-shown={step > BOOT.length ? "true" : "false"}>
          <p>
            <b>BUILD UNBLOCKED ON EVERY INPUT BUT ONE.</b>
          </p>
          <p>
            Any one of these is now a tractable build — not a weekend, but a project a serious team
            can finish. That was not true five years ago, and it is the whole opportunity. The
            missing piece was never the code. It is that no one can leave alone, and nothing has
            ever existed that let people leave together.
          </p>
          <p className="term-ask">
            <span className="term-prompt">$</span> ours aggregate-demand --targets
          </p>
        </div>

        <div className="term-registry" data-shown={done ? "true" : "false"}>
          <p className="term-legend">
            <span>TARGET REGISTRY · {missions.length} OPEN</span>
            <span>NOTICE / THRESHOLD</span>
          </p>
          <ol className="targets">
            {missions.map((mission, index) => {
              const selected = chosen.includes(mission.slug);
              const pct = Math.min(100, (mission.noticeCount / mission.threshold) * 100);
              const untouched = mission.noticeCount === 0;
              return (
                <li key={mission.slug}>
                  <button
                    type="button"
                    className="target"
                    aria-pressed={selected}
                    onClick={() => toggle(mission.slug)}
                  >
                    <span className="t-num">[{String(index + 1).padStart(2, "0")}]</span>
                    <span className="t-main">
                      <span className="t-title">
                        <strong>{mission.title}</strong>
                        {mission.incumbents ? <em>{mission.incumbents}</em> : null}
                      </span>
                      <span className="t-practice">{mission.practice}</span>
                    </span>
                    <span className="t-count">
                      {untouched ? (
                        <b className="t-first">NOBODY YET</b>
                      ) : (
                        <b>
                          {mission.noticeCount.toLocaleString("en-US")}
                          <i>/{mission.threshold.toLocaleString("en-US")}</i>
                        </b>
                      )}
                      <span className="t-bar" aria-hidden="true">
                        <span style={{ width: pct + "%" }} />
                      </span>
                    </span>
                    <span className="t-mark" aria-hidden="true">
                      {selected ? "✓" : "+"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* What the thing being aggregated is actually worth. */}
          <div className="term-value">
            <p className="term-head">
              <span className="term-prompt">$</span> ours value --demand
            </p>
            <label className="value-slider">
              <span className="sr-only">People committed to move</span>
              <input
                type="range"
                min={0}
                max={DEMAND_STOPS.length - 1}
                step={1}
                value={stopIndex}
                onChange={(e) => setStopIndex(Number(e.target.value))}
                aria-valuetext={people.toLocaleString("en-US") + " people committed"}
              />
            </label>
            <dl className="value-out">
              <div>
                <dt>people committed to move</dt>
                <dd className="v-people">{people.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt>what that cohort costs to acquire on the open market</dt>
                <dd className="v-money">
                  {compactEur(value.low)} — {compactEur(value.high)}
                </dd>
              </div>
            </dl>
            <p className="value-unlock">
              <span className="term-prompt">▸</span> {unlock.line}
            </p>
            <p className="term-note">
              At ordinary acquisition costs of €{ACQUISITION_COST_EUR.low}–€
              {ACQUISITION_COST_EUR.high} per customer across these categories. That is what the
              cohort is worth to the companies that currently pay for it — it is an illustration of
              leverage, not a valuation of OURS and not a payment to anyone. What members are
              entitled to is decided in the open before any of it exists.
            </p>
          </div>

          <form className="term-form" onSubmit={submit} noValidate>
            <p className="term-place">
              <span className="term-prompt">&gt;</span> your place would be{" "}
              <b>#{String(nextOrdinal).padStart(6, "0")}</b>
              <span className="dim">
                {" "}
                — {recordCount.toLocaleString("en-US")}{" "}
                {recordCount === 1 ? "person is" : "people are"} in the record. Numbers are issued
                in order and never reassigned.
              </span>
            </p>
            <p className="term-selected">
              <span className="term-prompt">&gt;</span>{" "}
              {selectedNumbers.length === 0 ? (
                <span className="dim">select the ones that are yours</span>
              ) : (
                <span className="hot">targets {selectedNumbers.join(" ")}</span>
              )}
            </p>
            <label className="term-field">
              <span className="term-prompt">&gt;</span>
              <span className="sr-only">Your email address</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="identify yourself: you@example.com"
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button className="term-go" type="submit" disabled={busy || !open}>
              {busy ? "TRANSMITTING…" : open ? "GIVE NOTICE — FREE" : "REGISTRY PAUSED"}
              <span aria-hidden="true">↵</span>
            </button>
            <p className="term-note">
              Free, and it stays free. Nothing is triggered below a threshold: your notice commits
              you to nothing until enough others have given theirs, and you can withdraw it at any
              time. Your email authenticates you and is never shown.
            </p>
            <p
              className="term-error"
              role="status"
              aria-live="polite"
              data-state={error ? "error" : undefined}
            >
              {error}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
