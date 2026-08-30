"use client";

import { useCallback, useMemo, useState } from "react";
import { PRODUCTS, RIGHTS } from "@/simulation/data";
import {
  encodeSelections,
  money,
  productBySlug,
  simulate,
  type Selection,
} from "@/simulation/model";

/**
 * The simulator.
 *
 * A claim asks to be believed. This hands over the arithmetic and the source
 * for every figure, and lets the person change the assumptions they doubt.
 * Every number on screen traces to a filing or a published fee schedule in
 * one click, which is the only reason any of it is worth reading.
 */

/** Stops a person recognises, rather than a linear slider nobody can aim. */
const STOPS = [
  0, 1_000, 2_500, 5_000, 10_000, 20_000, 30_000, 50_000, 75_000, 100_000, 150_000, 250_000,
  500_000, 1_000_000,
];

function nearestStop(amount: number): number {
  let best = 0;
  for (let i = 0; i < STOPS.length; i++) {
    if (Math.abs(STOPS[i]! - amount) < Math.abs(STOPS[best]! - amount)) best = i;
  }
  return best;
}

export function WorthSimulator({ initial }: { initial: Selection[] }) {
  const [selections, setSelections] = useState<Selection[]>(initial);
  const [copied, setCopied] = useState(false);

  const chosen = useMemo(() => new Set(selections.map((s) => s.slug)), [selections]);
  const result = useMemo(() => simulate(selections), [selections]);

  /** Keep the address bar in step, so the link a person copies is their result. */
  const sync = useCallback((next: Selection[]) => {
    setSelections(next);
    setCopied(false);
    if (typeof window === "undefined") return;
    const encoded = encodeSelections(next);
    const url = new URL(window.location.href);
    if (encoded) url.searchParams.set("you", encoded);
    else url.searchParams.delete("you");
    window.history.replaceState(null, "", url.toString());
  }, []);

  function toggle(slug: string) {
    if (chosen.has(slug)) {
      sync(selections.filter((s) => s.slug !== slug));
      return;
    }
    const product = productBySlug(slug);
    if (!product) return;
    sync([...selections, { slug, amount: product.defaultAmount }]);
  }

  function setAmount(slug: string, amount: number) {
    sync(selections.map((s) => (s.slug === slug ? { ...s, amount } : s)));
  }

  async function share() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="worth">
      <section className="worth-pick" aria-labelledby="pick-title">
        <h2 id="pick-title">Which of these do you actually use?</h2>
        <ul className="worth-chips">
          {PRODUCTS.map((p) => (
            <li key={p.slug}>
              <button
                type="button"
                aria-pressed={chosen.has(p.slug)}
                onClick={() => toggle(p.slug)}
              >
                <span aria-hidden="true">{chosen.has(p.slug) ? "✓" : "+"}</span>
                <b>{p.title}</b>
                <em>{p.incumbents}</em>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {result.lines.length === 0 ? (
        <p className="worth-empty">Pick one to begin. Nothing is sent anywhere.</p>
      ) : (
        <>
          <section className="worth-total" aria-live="polite" aria-labelledby="total-title">
            <p className="worth-eyebrow" id="total-title">
              EVERY YEAR, FROM YOU
            </p>
            <p className="worth-figure">{money(result.total)}</p>
            <dl className="worth-split">
              <div>
                <dt>you hand over in fees</dt>
                <dd>{money(result.paidInFees)}</dd>
              </div>
              <div>
                <dt>they earn from your attention</dt>
                <dd>{money(result.earnedFromAttention)}</dd>
              </div>
              {result.moved > 0 ? (
                <div>
                  <dt>kept, of every $100 you moved</dt>
                  <dd>${result.keptPerHundred.toFixed(2)}</dd>
                </div>
              ) : null}
            </dl>
            {result.moved > 0 ? (
              <p className="worth-note">
                You moved {money(result.moved)} through them over a year and they kept{" "}
                {money(result.paidInFees)} of it. Figures are US dollars, because every source
                reports in US dollars; converting would add the only unsourced number on the page.
              </p>
            ) : null}
          </section>

          <section className="worth-lines" aria-labelledby="lines-title">
            <h2 id="lines-title">Where it goes, and who says so.</h2>
            <ul>
              {result.lines.map((line) => {
                const p = line.product;
                const sel = selections.find((s) => s.slug === p.slug);
                return (
                  <li key={p.slug}>
                    <div className="worth-line-head">
                      <div>
                        <b>{p.title}</b>
                        <em>{p.incumbents}</em>
                      </div>
                      <span className="worth-line-figure">
                        {money(line.taken)}
                        {line.takenLow !== null ? (
                          <i>lowest published tier {money(line.takenLow)}</i>
                        ) : null}
                      </span>
                    </div>

                    {line.isAttention ? null : (
                      <label className="worth-amount">
                        <span>{p.amountLabel}</span>
                        <input
                          type="range"
                          min={0}
                          max={STOPS.length - 1}
                          step={1}
                          value={nearestStop(sel?.amount ?? p.defaultAmount)}
                          onChange={(e) => setAmount(p.slug, STOPS[Number(e.target.value)] ?? 0)}
                          aria-valuetext={money(sel?.amount ?? p.defaultAmount)}
                        />
                        <b>{money(sel?.amount ?? p.defaultAmount)}</b>
                      </label>
                    )}

                    <p className="worth-rate">{p.economics.rateNote}</p>
                    <p className="worth-source">
                      <a href={p.source.url} target="_blank" rel="noreferrer noopener">
                        {p.source.publisher} ↗
                      </a>
                      <span>{p.source.asOf}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section className="worth-rights" aria-labelledby="rights-title">
        <p className="worth-eyebrow signal">THE PART WITH NO INVOICE</p>
        <h2 id="rights-title">And this is what you traded for it.</h2>
        <p className="worth-rights-intro">
          The money is only the visible half. You also gave up the right to see how the thing works,
          how it is run, what rules it uses, and what it does with your data and your content. That
          half never appears on a statement.
        </p>
        <ul>
          {RIGHTS.map((r) => (
            <li key={r.id}>
              <div className="worth-right-head">
                <b>{r.question}</b>
                <span data-status={r.status}>{r.status === "NO" ? "NO" : "BARELY"}</span>
              </div>
              <p>{r.detail}</p>
              <p className="worth-right-ours">
                <span aria-hidden="true">▸</span> {r.ours}
              </p>
              {/* A row that names dates and vote counts has to be as
                  checkable as the money above it. */}
              {r.source ? (
                <p className="worth-source">
                  <a href={r.source.url} target="_blank" rel="noreferrer noopener">
                    {r.source.publisher} ↗
                  </a>
                  <span>{r.source.asOf}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="worth-close">
        <h2>None of this is a bill you agreed to.</h2>
        <p>
          Every rate here is published by the company that charges it. None of them were voted on by
          the people who pay them, and none of them can be. That is the only thing OURS is trying to
          change — not by asking anyone to leave alone, but by moving together or not at all.
        </p>
        <p className="worth-undecided">
          <span>NOT DECIDED BY US</span>
          What a member-owned version would charge is undecided. The first 100,000 members decide
          it, and may decide there is nothing to charge. Nothing here promises anyone a payment.
        </p>
        <div className="worth-actions">
          <a className="worth-go" href="/#join">
            TAKE YOUR PLACE — FREE <span aria-hidden="true">→</span>
          </a>
          <button type="button" className="worth-share" onClick={share}>
            {copied ? "LINK COPIED" : "COPY YOUR RESULT"}
          </button>
        </div>
        <p className="worth-note">
          The link carries your numbers, so whoever opens it sees what you saw. Nothing you type
          here is sent to OURS or to anyone else.
        </p>
      </section>
    </div>
  );
}
