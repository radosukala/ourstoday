/** Typed seal failures mapped to honest machine states at the route layer. */

export class LedgerClosedError extends Error {
  readonly mode: string;
  constructor(mode: string) {
    super(mode === "PAUSED" ? "Canonical writes are paused." : "The Founding Ledger is not open.");
    this.mode = mode;
  }
}

/** The row-locked allocator has reached the terminal value 1,000,001. */
export class FoundingEraFullError extends Error {
  constructor() {
    super("All 1,000,000 Founding Million places have been issued.");
    this.name = "FoundingEraFullError";
  }
}

export class AlreadySealedError extends Error {
  readonly existingOrdinal: number | null;
  constructor(existingOrdinal: number | null) {
    super("This account already has an active Founding Ledger entry.");
    this.existingOrdinal = existingOrdinal;
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("This idempotency key was already used with different input.");
  }
}

export class StaleConsentError extends Error {
  constructor() {
    super("The accepted document versions are out of date. Review the current documents.");
  }
}

export class SelfReferralBlockedError extends Error {
  constructor() {
    super("A person cannot continue their own line.");
  }
}

export class InvalidRelayError extends Error {
  constructor(reason: string) {
    super(`Relay is not usable: ${reason}`);
  }
}

export class UnverifiedPersonError extends Error {
  constructor() {
    super("Email verification has not completed for this session.");
  }
}

/**
 * A named witness could not attest this entry.
 *
 * The reason is a stable code rather than prose: a witness failure must never
 * reveal whether a given ordinal exists, is sealed, or belongs to the person
 * asking. The UI turns the code into one neutral sentence.
 */
export class InvalidWitnessError extends Error {
  constructor(public readonly reason: string) {
    super("INVALID_WITNESS");
    this.name = "InvalidWitnessError";
  }
}
