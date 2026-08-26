/** Mirrors src/ledger/seal.ts receipt builder shape for copy tests. */
export function buildReceiptShape(ordinal: number) {
  const padded = String(ordinal).padStart(6, "0");
  return {
    headline: "You are in the Founding Ledger.",
    lines: [] as [string, string][],
    legalStatus: "OWNERSHIP: COMMITTED \u00b7 LEGAL MEMBERSHIP: NOT YET ISSUED",
    shareCopySuggestion:
      "I entered the Founding Ledger of OURS as #" +
      padded +
      ".\n\nThe network is ours. Everything else can be built.",
  };
}
