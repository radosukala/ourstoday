import type { TransactionSql } from "postgres";
import { getSql } from "@/db/client";

/**
 * Raw SQL access surface for ledger services.
 * The highest-risk operations use explicit parameterized SQL against
 * postgres.js transactions - reviewable and free of ORM abstraction drift.
 */
export { getSql };

/**
 * A timestamp column as it actually arrives from the driver.
 *
 * postgres.js normally revives timestamptz into a Date, but that conversion
 * does not survive the Next.js server runtime: the same query that yields a
 * Date under Node/vitest yields the raw ISO string there. Declaring these
 * columns as `Date` is therefore a lie that typechecks and then throws
 * "toISOString is not a function" in production only. Every timestamp read
 * back from PostgreSQL is typed DbTimestamp and normalized with toDate().
 */
export type DbTimestamp = Date | string;

export function toDate(value: DbTimestamp): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Row shape constraint shared by all raw queries. Interfaces need an index signature to qualify. */
export type Row = Record<string, unknown>;
export type QueryRow<T> = T & Row;

/**
 * Transaction handle handed to postgres.js begin() callbacks.
 * Queries run through tx.unsafe(query, params) so every statement stays
 * parameterized and reviewable as plain SQL.
 */
export type OurSql = TransactionSql<Row>;

/**
 * Timestamp parameter for a raw statement.
 *
 * postgres.js infers a parameter's PostgreSQL type with `instanceof`, and that
 * check does not survive the Next.js server runtime's realm boundary: a Date
 * built in application code is not `instanceof Date` inside the bundled driver,
 * so the driver falls back to byte serialization and throws
 * "The \"string\" argument must be of type string ... Received an instance of
 * Date" at runtime. Node-only callers (tests, scripts) never see it, so always
 * pass this and cast the placeholder, e.g. `$4::timestamptz`.
 */
export function tsParam(value: Date): string {
  return value.toISOString();
}

/**
 * jsonb parameter for a raw statement.
 *
 * Same realm hazard as tsParam: postgres.js cannot infer a plain object's type
 * inside the Next.js server runtime and falls back to byte serialization, which
 * throws "... Received an instance of Object".
 *
 * The placeholder MUST be cast `$n::text::jsonb`, not `$n::jsonb`. When
 * PostgreSQL describes the parameter as jsonb, postgres.js applies its own
 * JSON.stringify on top of this one and stores a doubly-encoded jsonb *string
 * scalar* instead of an object. Describing it as text first makes the driver
 * pass the bytes through and lets PostgreSQL parse them exactly once, which
 * behaves identically under Node and under the Next.js server runtime.
 */
export function jsonParam(value: unknown): string {
  return JSON.stringify(value);
}

/** Run one parameterized statement on the pooled connection. Params are an array matching $1..$n. */
export async function rawQuery<T extends Row = Row>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows: unknown = await getSql().unsafe(query, params as never);
  return rows as T[];
}
