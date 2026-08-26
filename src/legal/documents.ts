
/**
 * Single source of truth for institutional copy and document versions.
 * Every surface MUST render the lock, thesis and current legal-status truth
 * exactly as defined here. The homepage test suite guards these strings.
 */

export const LOCK_LINE = "THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.";

export const THESIS =
  "OURS is a member-owned network that builds its own software in public.";

/** Required companion qualifier while legal membership does not exist. */
export const STATUS_LINE =
  "OWNERSHIP: COMMITTED \u00b7 LEGAL MEMBERSHIP: NOT YET ISSUED";

export const OWNERSHIP_STATUS = "COMMITTED";
export const LEGAL_MEMBERSHIP_STATUS = "NOT YET ISSUED";

export const FOUNDING_DECLARATION_V01 = [
  "I enter the Founding Ledger of OURS.",
  "",
  "THE NETWORK IS OURS. EVERYTHING ELSE CAN BE BUILT.",
  "",
  "OURS is a member-owned network that builds its own software in public.",
  "",
  "I understand:",
  "- My place is assigned only when my verified entry is sealed. Nothing is reserved.",
  "- A number cannot be bought, sold, transferred or reassigned.",
  "- Nobody needs an audience or a successor to keep their place.",
  "- A Founding Ledger entry is not a share, security, token, promise of profit",
  "  or extra vote, and it is not legal membership.",
  "- Corrections, withdrawals and reviews happen through new recorded events;",
  "  history is never silently edited.",
].join("\n");

/** Exact document versions an entrant accepts at seal time. */
export const DOCUMENT_VERSIONS = {
  declaration: "ours-founding-declaration/0.1",
  constitution: "ours-founding-constitution/0.1",
  protocol: "ours.founding-relay/0.1",
  privacyNotice: "ours-privacy-notice-draft/0.1",
  legalStatus: "ours-legal-status/0.1",
} as const;

export type DocumentVersions = Record<keyof typeof DOCUMENT_VERSIONS, string>;

export function currentDocumentVersions(): DocumentVersions {
  return { ...DOCUMENT_VERSIONS };
}

/** Phrases that must never appear as live claims on any surface. */
export const FORBIDDEN_LIVE_CLAIMS: readonly string[] = [
  "legal member",
  "legally a member",
  "you are an owner",
  "you own a share",
  "your number is reserved",
  "reserved for you",
];

export function assertNoForbiddenClaims(text: string): string[] {
  const found: string[] = [];
  for (const phrase of FORBIDDEN_LIVE_CLAIMS) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) found.push(phrase);
  }
  return found;
}

