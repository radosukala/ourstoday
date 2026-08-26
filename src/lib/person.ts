import { createHash, randomBytes } from "node:crypto";
import { rawQuery, type DbTimestamp } from "@/db/sqltype";
import { config } from "@/config";
import { signContextCookie, verifyContextCookie } from "@/security/relay";

/**
 * Private-person provisioning and relay provenance resolution.
 * Attribution NEVER comes from the raw relay token at seal time; it comes
 * from a validated relay record resolved through (a) the short-lived signed
 * device cookie or (b) a consumed, email-bound entry context.
 */

const RELAY_COOKIE_NAME = "ours_relay_ctx";
const RELAY_COOKIE_MAX_AGE_MS = 30 * 60 * 1000;

function relayCookieSecret(): string {
  const versions = [...config().relaySecrets.keys()].sort((a, b) => b - a);
  const first = versions[0];
  return (
    "relay-ctx-cookie:" +
    (first !== undefined ? (config().relaySecrets.get(first) ?? "") : "fallback")
  );
}

export interface PersonRow {
  id: string;
  auth_user_id: string;
  email_digest: string;
  lifecycle: string;
  email_verified_at: DbTimestamp | null;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function ensurePerson(args: {
  authUserId: string;
  email: string;
  emailVerified: boolean;
}): Promise<PersonRow> {
  const digest = sha256(args.email.trim().toLowerCase());
  // Server time is authoritative for these stamps, so PostgreSQL sets them.
  await rawQuery(
    "INSERT INTO private.person (auth_user_id, email_digest, email_verified_at) VALUES ($1, $2, CASE WHEN $3::boolean THEN now() ELSE NULL END) ON CONFLICT (auth_user_id) DO NOTHING",
    [args.authUserId, digest, args.emailVerified],
  );
  if (args.emailVerified) {
    await rawQuery(
      "UPDATE private.person SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE auth_user_id = $1",
      [args.authUserId],
    );
  }
  const rows = (await rawQuery(
    "SELECT id, auth_user_id, email_digest, lifecycle, email_verified_at FROM private.person WHERE auth_user_id = $1",
    [args.authUserId],
  )) as unknown as PersonRow[];
  const person = rows[0];
  if (!person) throw new Error("PERSON_PROVISIONING_FAILED");
  return person;
}

export async function getPersonByAuthUserId(authUserId: string): Promise<PersonRow | null> {
  const rows = (await rawQuery(
    "SELECT id, auth_user_id, email_digest, lifecycle, email_verified_at FROM private.person WHERE auth_user_id = $1",
    [authUserId],
  )) as unknown as PersonRow[];
  return rows[0] ?? null;
}

/** Create the short-lived, email-bound attribution context at magic-link request time. */
export async function createEntryContext(args: {
  emailDigest: string;
  relayTokenRecordId: string | null;
}): Promise<string> {
  const id = randomBytes(32).toString("base64url");
  await rawQuery(
    "INSERT INTO private.entry_context (id, email_digest, relay_token_record_id, expires_at) VALUES ($1, $2, $3, now() + interval '15 minutes')",
    [id, args.emailDigest, args.relayTokenRecordId],
  );
  return id;
}

export interface ResolvedPredecessor {
  entryId: string;
  relayRecordId: string;
}

/**
 * Resolve the predecessor provenance for a sealing person:
 *   1. live signed relay cookie on this device (validated against DB later);
 *   2. a recently consumed entry_context bound to THIS person's email.
 */
export async function resolvePredecessorForSeal(args: {
  personId: string;
  cookieHeader: string | null;
}): Promise<ResolvedPredecessor | undefined> {
  // (a) device cookie
  const rawCookie = readCookie(args.cookieHeader, RELAY_COOKIE_NAME);
  const verified = verifyContextCookie(
    rawCookie ?? undefined,
    relayCookieSecret(),
    RELAY_COOKIE_MAX_AGE_MS,
  );
  if (verified?.value) {
    const rows = await rawQuery<{ id: string; predecessor_entry_id: string; state: string }>(
      "SELECT id, predecessor_entry_id, state FROM private.relay_token_record WHERE id = $1 AND state = 'ACTIVE'",
      [verified.value],
    );
    const record = rows[0];
    if (record) {
      return { entryId: record.predecessor_entry_id, relayRecordId: record.id };
    }
  }

  // (b) consumed, email-bound entry context (cross-device case)
  const ctxRows = await rawQuery<{
    relay_token_record_id: string | null;
    predecessor_entry_id: string | null;
  }>(
    "SELECT ec.relay_token_record_id, r.predecessor_entry_id FROM private.entry_context ec LEFT JOIN private.relay_token_record r ON r.id = ec.relay_token_record_id WHERE ec.consumed_by_person_id = $1 AND ec.state = 'CONSUMED' AND ec.consumed_at > now() - interval '24 hours' ORDER BY ec.consumed_at DESC LIMIT 1",
    [args.personId],
  );
  const ctx = ctxRows[0];
  if (ctx?.relay_token_record_id && ctx.predecessor_entry_id) {
    return { entryId: ctx.predecessor_entry_id, relayRecordId: ctx.relay_token_record_id };
  }
  return undefined;
}

/** Validate the relay cookie for a magic-link request and return the relay record ID. */
export async function relayRecordFromDevice(cookieHeader: string | null): Promise<string | null> {
  const raw = readCookie(cookieHeader, RELAY_COOKIE_NAME);
  const verified = verifyContextCookie(
    raw ?? undefined,
    relayCookieSecret(),
    RELAY_COOKIE_MAX_AGE_MS,
  );
  if (!verified?.value) return null;
  const rows = await rawQuery<{ id: string }>(
    "SELECT id FROM private.relay_token_record WHERE id = $1 AND state = 'ACTIVE'",
    [verified.value],
  );
  return rows[0]?.id ?? null;
}

export function relayCookieSetHeaders(recordId: string): { name: string; value: string } {
  const signed = signContextCookie(recordId, relayCookieSecret());
  return { name: RELAY_COOKIE_NAME, value: signed };
}

export const RELAY_COOKIE_CONSTANTS = {
  name: RELAY_COOKIE_NAME,
  maxAgeSeconds: Math.floor(RELAY_COOKIE_MAX_AGE_MS / 1000),
};

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return part.slice(idx + 1).trim();
  }
  return null;
}
