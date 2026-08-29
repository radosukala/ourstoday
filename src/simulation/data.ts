/**
 * What the products cost you, sourced.
 *
 * This file is the credibility of the whole simulation. Every number here is
 * published by the company that charges it, or reported in its own financial
 * results. Nothing is modelled, extrapolated or rounded to feel better.
 *
 * Rules for editing:
 *   1. A figure without a `source` URL does not ship.
 *   2. `asOf` is when the figure was published, not when we read it.
 *   3. If a rate is a range or has tiers, model the tiers. Picking the scary
 *      end of a range to make a point is the thing we accuse them of.
 *   4. When a figure goes stale, replace it or remove the product. A number
 *      nobody can check is worth less than no number at all.
 *
 * Amounts are US dollars, because every source reports in US dollars. We do
 * not convert: an invented exchange rate would be the only unsourced number
 * on the page.
 */

export interface Source {
  /** Who published it. */
  publisher: string;
  url: string;
  /** When the figure was published, ISO date or period label. */
  asOf: string;
}

/** A rate charged on money the person themselves moves. */
export interface TakeRate {
  kind: "take";
  /** Fraction of the transaction kept by the platform, e.g. 0.155. */
  rate: number;
  /** A lower published tier, where one exists (small-business, EU, basic). */
  lowRate?: number;
  /** What the rate is charged on, in the person's words. */
  basis: string;
  rateNote: string;
}

/** Revenue the platform earns from a person's attention, per year. */
export interface Arpu {
  kind: "arpu";
  /** Annual revenue per person, USD, as reported. */
  perYearUsd: number;
  /** The same figure for the highest-earning region the company reports. */
  highRegionUsdPerYear?: number;
  highRegionLabel?: string;
  rateNote: string;
}

export interface Product {
  /** Matches `ledger.mission.slug` where a target exists for it. */
  slug: string;
  title: string;
  incumbents: string;
  economics: TakeRate | Arpu;
  source: Source;
  /** A sensible non-zero starting point, so the page is never empty. */
  defaultAmount: number;
  /** The label on the amount input. Empty for attention products. */
  amountLabel: string;
}

export const PRODUCTS: Product[] = [
  {
    slug: "social-feed",
    title: "The social feed",
    incumbents: "Facebook · Instagram",
    economics: {
      kind: "arpu",
      perYearUsd: 57.03,
      highRegionUsdPerYear: 233,
      highRegionLabel: "US & Canada",
      rateNote:
        "Meta earned this much per person across its apps in 2025. You were not paid any of it, and it is not what you cost — it is what you were worth.",
    },
    source: {
      publisher: "Meta, full-year 2025 results",
      url: "https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Fourth-Quarter-and-Full-Year-2025-Results/default.aspx",
      asOf: "FY2025",
    },
    defaultAmount: 1,
    amountLabel: "",
  },
  {
    slug: "app-store",
    title: "The app store toll",
    incumbents: "App Store · Google Play",
    economics: {
      kind: "take",
      rate: 0.3,
      lowRate: 0.15,
      basis: "everything your app earns",
      rateNote:
        "30% is the standard commission. 15% applies under the Small Business Program, for developers under $1M a year. In the EU, Apple's standard rate is 26%.",
    },
    source: {
      publisher: "Apple Developer, App Store Small Business Program",
      url: "https://developer.apple.com/app-store/small-business-program/",
      asOf: "2026",
    },
    defaultAmount: 50_000,
    amountLabel: "what your app earns in a year",
  },
  {
    slug: "rides",
    title: "The ride",
    incumbents: "Uber · Bolt · Lyft",
    economics: {
      kind: "take",
      rate: 0.299,
      basis: "every fare you drive",
      rateNote:
        "Uber's own reported Mobility take rate for Q4 2025: what the company keeps of each dollar booked, after paying drivers and direct costs.",
    },
    source: {
      publisher: "Uber, Q4 and full-year 2025 results",
      url: "https://investor.uber.com/news-events/news/press-release-details/2026/Uber-Announces-Results-for-Fourth-Quarter-and-Full-Year-2025/default.aspx",
      asOf: "Q4 2025",
    },
    defaultAmount: 30_000,
    amountLabel: "what you earn driving in a year",
  },
  {
    slug: "travel-booking",
    title: "The booking",
    incumbents: "Airbnb · Booking.com",
    economics: {
      kind: "take",
      rate: 0.155,
      basis: "every night you let",
      rateNote:
        "Airbnb's host-only service fee, now charged to the host rather than split with the guest. Booking.com's commission is comparable, around 15%.",
    },
    source: {
      publisher: "Airbnb Help Center, service fees",
      url: "https://www.airbnb.com/help/article/1857",
      asOf: "2026",
    },
    defaultAmount: 20_000,
    amountLabel: "what your listing takes in a year",
  },
  {
    slug: "freelance-marketplace",
    title: "The freelance marketplace",
    incumbents: "Fiverr · Upwork",
    economics: {
      kind: "take",
      rate: 0.2,
      lowRate: 0.1,
      basis: "every invoice you send",
      rateNote:
        "Fiverr keeps a flat 20% of seller earnings, with no tiers. Upwork charges 0–15% depending on billing history with that client; around 10% is typical.",
    },
    source: {
      publisher: "Fiverr seller fees; Upwork service fees",
      url: "https://www.fiverr.com/support/articles/360010560118-Getting-paid",
      asOf: "2026",
    },
    defaultAmount: 40_000,
    amountLabel: "what you invoice in a year",
  },
  {
    slug: "handmade-marketplace",
    title: "The marketplace",
    incumbents: "Etsy · eBay · Amazon",
    economics: {
      kind: "take",
      rate: 0.214,
      lowRate: 0.095,
      basis: "every item you sell",
      rateNote:
        "Etsy's mandatory fees are about 9.5% (6.5% transaction plus payment processing and listing fees). Etsy's own reported take rate — everything it earns per dollar of goods sold, including ads — is 21.4%.",
    },
    source: {
      publisher: "Etsy fee schedule and reported take rate",
      url: "https://www.etsy.com/legal/fees/",
      asOf: "2026",
    },
    defaultAmount: 25_000,
    amountLabel: "what you sell in a year",
  },
  {
    slug: "food-delivery",
    title: "The delivery",
    incumbents: "Deliveroo · Uber Eats · DoorDash",
    economics: {
      kind: "take",
      rate: 0.3,
      lowRate: 0.15,
      basis: "every order that comes through the app",
      rateNote:
        "DoorDash publishes 15%, 25% and 30% commission tiers for restaurants. Deliveroo's rates generally fall between 25% and 35%.",
    },
    source: {
      publisher: "DoorDash merchant pricing",
      url: "https://merchants.doordash.com/en-us/pricing",
      asOf: "2026",
    },
    defaultAmount: 120_000,
    amountLabel: "what your kitchen takes through the app in a year",
  },
  {
    slug: "music",
    title: "The stream",
    incumbents: "Spotify · Apple Music",
    economics: {
      kind: "take",
      rate: 0.3,
      basis: "every play of your music",
      rateNote:
        "Of streaming revenue, roughly 30% stays with Spotify; about 56% goes to the recording side and 14% to publishing. Spotify paid out a record $11B to the industry in 2025.",
    },
    source: {
      publisher: "Spotify Newsroom, 2025 music industry payouts",
      url: "https://newsroom.spotify.com/2026-01-28/2025-music-industry-payouts-whats-next-for-artists/",
      asOf: "2025",
    },
    defaultAmount: 15_000,
    amountLabel: "what your music earns in a year",
  },
];

/**
 * The other half of the bill.
 *
 * The money is only what is visible. This is what a person handed over
 * without an invoice, and it is the same on every platform above — which is
 * the point. These are deliberately conservative: where EU law has actually
 * granted a right, it says so, because a false blanket claim would be the
 * easiest thing in the world to disprove and would take the numbers down
 * with it.
 */
export interface Right {
  id: string;
  question: string;
  /** How it stands today on essentially all of the products above. */
  status: "NO" | "PARTIAL";
  detail: string;
  ours: string;
}

export const RIGHTS: Right[] = [
  {
    id: "rules",
    question: "Can you see the rules that rank you?",
    status: "PARTIAL",
    detail:
      "Since the Digital Services Act, the largest platforms must describe the main parameters of their recommender systems in their terms. A description is not the system: you cannot inspect it, reproduce a decision, or tell whether it changed last night.",
    ours: "The ranking rules are source, published, and changed by a vote with a receipt.",
  },
  {
    id: "audience",
    question: "Can you take your audience with you?",
    status: "NO",
    detail:
      "Data portability under the GDPR gives you a copy of your data. It does not give you the people. Your followers, your reviews and your standing stay behind, and rebuilding them is the reason leaving costs more than it looks.",
    ours: "Nobody leaves first. A threshold moves the audience together or nothing moves at all.",
  },
  {
    id: "appeal",
    question: "Can you appeal a decision to someone who is not them?",
    status: "PARTIAL",
    detail:
      "The DSA created out-of-court dispute settlement in the EU for content decisions. It does not cover being deranked, demonetised, or quietly shown to fewer people — the decisions that actually change what you earn.",
    ours: "A published process, a named human, and dissent recorded in the log whether it wins or not.",
  },
  {
    id: "vote",
    question: "Can you vote on a fee or a rule change?",
    status: "NO",
    detail:
      "Not on any platform in this list, in any country, ever. The commission can move, the terms can change, the algorithm can be replaced, and the people it happens to are told afterwards, if at all.",
    ours: "One member, one vote, on the fee and on the rule. This is the whole difference.",
  },
  {
    id: "share",
    question: "Do you share in the value you create?",
    status: "NO",
    detail:
      "The revenue your attention generates is not shared, and where a creator split exists the percentage is set unilaterally by the platform and can be revised without your agreement.",
    ours: "Undecided, on purpose. The first 100,000 members decide it, and may decide there is no share at all.",
  },
];
