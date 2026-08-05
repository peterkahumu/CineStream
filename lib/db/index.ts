import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

/**
 * Retry wrapper for Neon HTTP driver queries.
 *
 * Neon's serverless HTTP driver uses `fetch()` under the hood, which is
 * susceptible to transient failures — cold starts, DNS hiccups, network
 * blips, etc. These surface as `NeonDbError: Error connecting to database:
 * TypeError: fetch failed`.
 *
 * This helper retries the supplied async function up to `maxRetries` times
 * with exponential back-off (300ms → 600ms → …) so that every call site
 * doesn't need its own retry loop.
 *
 * Usage:
 *   const rows = await dbQuery(() =>
 *     db.select().from(users).where(eq(users.id, id)).limit(1)
 *   );
 */
export async function dbQuery<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Only retry on transient fetch/connection errors, not on SQL logic errors
      const msg = String(error);
      const isTransient =
        msg.includes('fetch failed') ||
        msg.includes('Error connecting to database') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('UND_ERR_SOCKET');
      if (!isTransient || attempt === maxRetries) break;
      // Exponential back-off: 300ms, 600ms, …
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}
