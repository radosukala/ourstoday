import type { Metadata } from "next";
import { foundingState } from "@/ledger/state";
import { readMissionBoard, type MissionRow } from "@/ledger/missions";
import { FoundingFooter, FoundingTopline } from "@/components/FoundingChrome";
import { FoundingTerminal } from "./FoundingTerminal";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Nobody leaves first · OURS",
  description:
    "Everybody leaves together. The first 1,000,000 people form OURS: one person, one finite non-transferable Founding Right, free.",
  openGraph: {
    title: "NOBODY LEAVES FIRST. EVERYBODY LEAVES TOGETHER.",
    description:
      "AI made software almost free. The last moat is aggregated demand. The first 1,000,000 people form OURS.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NOBODY LEAVES FIRST. EVERYBODY LEAVES TOGETHER.",
    description: "The first 1,000,000 people form OURS. One person. One Founding Right. Free.",
  },
};

/**
 * The target the page names.
 *
 * `public.mission_board` is ordered by notice count and then by registry
 * position, so the leading row is the one the most people have committed to —
 * and, before anyone has, the one the registry opens with. A board that
 * cannot be read costs the page a line; it never costs it the entry form.
 */
async function leadingTarget(): Promise<MissionRow | null> {
  try {
    const board = await readMissionBoard();
    return board[0] ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [state, target] = await Promise.all([foundingState(), leadingTarget()]);
  const capacity = state.capacity;

  return (
    <main className="fm-home" id="main">
      <a className="skip-link" href="#join">
        Skip to entry
      </a>

      <FoundingTopline />

      <section className="fm-stage" aria-labelledby="founding-message">
        <div className="fm-message">
          <p className="fm-kicker">AI MADE SOFTWARE ALMOST FREE.</p>
          <h1 id="founding-message">
            <span>NOBODY LEAVES FIRST.</span>
            <span className="signal">EVERYBODY LEAVES TOGETHER.</span>
          </h1>
          <p className="fm-opportunity">
            THE LAST MOAT IS AGGREGATED DEMAND.
            <br />
            THE FIRST 1,000,000 FORM ENOUGH TO BUILD ANYTHING.
          </p>
          {target ? (
            <p className="fm-first" id="first">
              <span>LEAVING FIRST</span>
              <b>{target.title.toUpperCase()}</b>
              {target.incumbents ? <em>{target.incumbents}</em> : null}
            </p>
          ) : null}
        </div>

        <div id="join">
          <FoundingTerminal
            limit={capacity.limit}
            issued={capacity.issued}
            nextOrdinal={capacity.nextOrdinal}
            remaining={capacity.remaining}
            available={state.capacityAvailable}
            open={state.canAcceptEntries}
            ledgerState={state.ledgerState}
            target={target}
          />
        </div>
      </section>

      <FoundingFooter />
    </main>
  );
}
