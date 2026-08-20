import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env, hasDatabase } from "./env";

/**
 * A single pool per Node process, cached on globalThis so Next's dev-mode module
 * reloading does not leak connections.
 *
 * Sizing note for 1M members: Postgres itself tops out around a few hundred
 * backends, so `max` here is deliberately small (per-instance) and the real
 * fan-in is absorbed by an external pooler (PgBouncer / Supabase Supavisor) in
 * transaction mode. 40 app instances x max 8 = 320 client-side connections
 * multiplexed onto ~40 server backends.
 */
const globalForPg = globalThis as unknown as { ydcPool?: Pool };

export const pool: Pool | null = hasDatabase
  ? (globalForPg.ydcPool ??= new Pool({
      connectionString: env.databaseUrl,
      max: Number(process.env.PG_POOL_MAX ?? 8),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      // Every statement is a user-facing read or a single-row write. Nothing on
      // the request path is allowed to run long enough to pile up.
      statement_timeout: 3_000,
      query_timeout: 3_000,
    }))
  : null;

export async function sql<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function withTransaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
