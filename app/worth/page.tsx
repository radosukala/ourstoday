import type { Metadata } from "next";
import { FoundingFooter, FoundingTopline } from "@/components/FoundingChrome";
import { decodeSelections, defaultSelections } from "@/simulation/model";
import { WorthSimulator } from "./WorthSimulator";

/**
 * Rendered per request, and it must be.
 *
 * This page holds no ledger state and touches no database, so it never wakes
 * the Neon compute and the usual cost argument for caching does not apply
 * here. What does apply: the whole point of the page is that a person can
 * send their result to someone else, and that result lives in `?you=`.
 * A statically generated page does not vary by query string, so `force-static`
 * would have served everyone the defaults and quietly broken every shared
 * link — while working perfectly in development.
 *
 * Everything a person changes after load happens in their own browser and is
 * never sent anywhere, which is also the only honest posture for a page about
 * what companies take from people.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What are you worth to them? · OURS",
  description:
    "What the products you use every day take from you in a year, at their own published rates, with the source for every figure. Plus the half that never appears on a statement.",
  openGraph: {
    title: "WHAT ARE YOU WORTH TO THEM?",
    description:
      "Their own published rates, applied to your own numbers. Plus what you traded for free: the right to see the rules, take your audience, or vote on a fee.",
  },
  twitter: {
    card: "summary_large_image",
    title: "WHAT ARE YOU WORTH TO THEM?",
    description: "Their own published rates, applied to your own numbers. Every figure sourced.",
  },
};

export default async function WorthPage({
  searchParams,
}: {
  searchParams: Promise<{ you?: string }>;
}) {
  // A shared link must reproduce the sender's result rather than the default,
  // or it is an advert rather than a shared finding. Unknown or absurd values
  // are dropped by the parser, never rendered as somebody's headline.
  const { you } = await searchParams;
  const shared = decodeSelections(you);
  const initial = shared.length > 0 ? shared : defaultSelections();

  return (
    <div className="fm-flow">
      <a className="skip-link" href="#main">
        Skip to the simulator
      </a>
      <FoundingTopline status="THE SIMULATOR" />
      <main id="main">
        <section className="worth-hero">
          <p className="worth-eyebrow signal">EVERY FIGURE IS THEIRS, NOT OURS</p>
          <h1>What are you worth to them?</h1>
          <p className="worth-lede">
            Nothing here is modelled or estimated. Every rate below is published by the company that
            charges it, linked to the filing or the fee schedule it comes from. Put in your own
            numbers and see what a year costs you.
          </p>
        </section>
        <WorthSimulator initial={initial} />
      </main>
      <FoundingFooter />
    </div>
  );
}
