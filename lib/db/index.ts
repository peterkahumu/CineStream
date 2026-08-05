import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Supabase, reached through Cloudflare Hyperdrive.
 *
 * Workers can't do a raw TLS handshake to an arbitrary Postgres host — the
 * `nodejs_compat` polyfill for `tls` doesn't implement `rejectUnauthorized`,
 * so postgres.js's normal connection path throws `ERR_OPTION_NOT_IMPLEMENTED`
 * there. Hyperdrive is Cloudflare's supported fix: it proxies + pools the
 * real connection to Supabase, and hands the Worker a plain connection
 * string (`env.HYPERDRIVE.connectionString`) that's safe to open from
 * within the Workers runtime.
 *
 * The client is created fresh per call and closed in `finally` rather than
 * cached at module scope — a Worker isolate can run many requests, but a
 * socket opened during one request's execution context can't be reused by
 * another (attempting to do so doesn't error, it just hangs until the
 * runtime kills the request). Hyperdrive does the real connection pooling
 * on its side, so this is cheap: `max: 1` per call, matching Cloudflare's
 * own Hyperdrive + postgres.js examples.
 */
async function withDb<T>(fn: (db: DrizzleDb) => Promise<T>): Promise<T> {
  const url = getCloudflareContext().env.HYPERDRIVE.connectionString;
  const client = postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: 10,
  });
  try {
    return await fn(drizzle(client, { schema }));
  } finally {
    await client.end();
  }
}

/**
 * Runs `fn` against a fresh db connection, retrying up to `maxRetries` times
 * with exponential back-off (300ms → 600ms → …) on transient connection
 * errors. Every query in the app goes through this — wrap multiple queries
 * in one `dbQuery` call (e.g. a loop over items to sync) to share a single
 * connection instead of opening one per query.
 *
 * Usage:
 *   const rows = await dbQuery((db) =>
 *     db.select().from(users).where(eq(users.id, id)).limit(1)
 *   );
 */
export async function dbQuery<T>(
  fn: (db: DrizzleDb) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withDb(fn);
    } catch (error) {
      lastError = error;
      // Only retry on transient connection errors, not on SQL logic errors
      const msg = String(error);
      const isTransient =
        msg.includes('CONNECTION_ENDED') ||
        msg.includes('CONNECT_TIMEOUT') ||
        msg.includes('CONNECTION_CLOSED') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('UND_ERR_SOCKET');
      if (!isTransient || attempt === maxRetries) break;
      // Exponential back-off: 300ms, 600ms, …
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}
