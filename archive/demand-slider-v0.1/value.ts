/**
 * What aggregated demand is worth.
 *
 * This is not a valuation of OURS and not a payment to anybody. It is the
 * ordinary market price of the thing the network would be holding: a cohort
 * of people who have already decided to move. Companies buy exactly this
 * every day, at these prices, through advertising — that is what customer
 * acquisition cost IS, and it is the most checkable number in the argument.
 *
 * The band is deliberately wide and deliberately conservative, because a
 * single confident figure would be a fabrication. Anyone can substitute their
 * own numbers; the point survives either way.
 */

/** Ordinary customer-acquisition cost per person, in EUR, across these categories. */
export const ACQUISITION_COST_EUR = { low: 50, high: 200 } as const;

/**
 * Clean stops, so the readout never shows a number nobody would say aloud.
 *
 * The top of the range is 100 million on purpose. The categories on the
 * registry are operated by companies with hundreds of millions to billions of
 * users, so a scale that stopped in the hundreds of thousands would quietly
 * concede that this is a niche project. It is not meant to be one, and the
 * arithmetic at the top of the slider is the same arithmetic their valuations
 * are built on.
 */
export const DEMAND_STOPS = [
  100, 1_000, 10_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000,
] as const;

/** Opens at 100,000: past the threshold rule, short of the ambition. */
export const DEFAULT_STOP_INDEX = 3;

export interface DemandUnlock {
  /** People at or above which this becomes true. */
  atLeast: number;
  line: string;
}

/**
 * What each scale actually changes. Every line is a consequence of the
 * arithmetic above or of the published threshold rule — none of them is a
 * promise about what OURS will do.
 */
export const UNLOCKS: DemandUnlock[] = [
  {
    atLeast: 0,
    line: "Below the first threshold. Nothing is triggered, and nobody is committed to anything.",
  },
  {
    atLeast: 1_000,
    line: "The threshold rule fires: this target must be answered in public — a plan, a cost and a named steward, or a published reason why not.",
  },
  {
    atLeast: 10_000,
    line: "The build pays for itself. At ordinary acquisition costs this cohort is worth more than it costs to build the thing they asked for.",
  },
  {
    atLeast: 100_000,
    line: "Terms become negotiable. An incumbent facing a committed cohort this large has three choices, and two of them are yours.",
  },
  {
    atLeast: 1_000_000,
    line: "The category is contestable. At this size a challenger stops being a challenger, and a departure has a date rather than a hashtag.",
  },
  {
    atLeast: 10_000_000,
    line: "The growth model inverts. They must keep buying customers at market rates; this cohort already arrived, and costs nothing to reach.",
  },
  {
    atLeast: 100_000_000,
    line: "This is the scale the incumbents themselves operate at. The figure above is not a fantasy — it is roughly the arithmetic their valuations are built on.",
  },
];

export function unlockFor(people: number): DemandUnlock {
  let current = UNLOCKS[0] as DemandUnlock;
  for (const unlock of UNLOCKS) {
    if (people >= unlock.atLeast) current = unlock;
  }
  return current;
}

export function acquisitionValueEur(people: number): { low: number; high: number } {
  return {
    low: people * ACQUISITION_COST_EUR.low,
    high: people * ACQUISITION_COST_EUR.high,
  };
}

/** 2_500_000 → "2.5M", 500_000 → "500K". Money reads badly at full length. */
export function compactEur(value: number): string {
  if (value >= 1_000_000_000)
    return "€" + (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (value >= 1_000_000) return "€" + (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 1_000) return "€" + Math.round(value / 1_000) + "K";
  return "€" + String(value);
}
