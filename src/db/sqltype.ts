
import type { TransactionSql } from "postgres";
import { getSql } from "@/db/client";

/**
 * Raw SQL access surface for ledger services.
 * The highest-risk operations use explicit parameterized SQL against
 * postgres.js transactions - reviewable and free of ORM abstraction drift.
 */
export { getSql };

/** Row shape constraint shared by all raw queries. Interfaces need an index signature to qualify. */
export type Row = Record<string, unknown>;
export type QueryRow<T> = T & Row;

/**
 * Transaction handle handed to postgres.js begin() callbacks.
 * Queries run through tx.unsafe(query, params) so every statement stays
 * parameterized and reviewable as plain SQL.
 */
export type OurSql = TransactionSql<Row>;

/** Run one parameterized statement on the pooled connection. Params are an array matching $1..$n. */
export async function rawQuery<T extends Row = Row>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows: unknown = await getSql().unsafe(query, params as never);
  return rows as T[];
}
