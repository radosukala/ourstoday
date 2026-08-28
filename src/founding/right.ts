/**
 * The Founding Million is a finite project instrument, not a marketing tier.
 *
 * These constants are imported by the allocator, the public state projection,
 * receipts and the interface so the number on the page cannot drift away from
 * the number the database actually enforces.
 */
export const FOUNDING_LIMIT = 1_000_000;
export const FOUNDING_RIGHT_VERSION = "ours-founding-right/0.1";

export interface FoundingCapacity {
  limit: number;
  issued: number;
  nextOrdinal: number | null;
  remaining: number;
  full: boolean;
}

/** Derive public capacity from the canonical row-locked allocator. */
export function capacityFromNextOrdinal(nextOrdinal: number | null): FoundingCapacity {
  if (nextOrdinal === null || !Number.isInteger(nextOrdinal) || nextOrdinal < 1) {
    return {
      limit: FOUNDING_LIMIT,
      issued: 0,
      nextOrdinal: null,
      remaining: FOUNDING_LIMIT,
      full: false,
    };
  }

  const issued = Math.min(FOUNDING_LIMIT, nextOrdinal - 1);
  const remaining = Math.max(0, FOUNDING_LIMIT - issued);
  return {
    limit: FOUNDING_LIMIT,
    issued,
    nextOrdinal: remaining > 0 ? nextOrdinal : null,
    remaining,
    full: remaining === 0,
  };
}
