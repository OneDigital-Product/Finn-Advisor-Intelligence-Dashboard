import { pool } from "@server/db";
import { logger } from "@server/lib/logger";

const TABLE = "rate_limit_hits";

/**
 * Check if a request should be rate-limited using a PostgreSQL-backed counter.
 * Returns { allowed: true } or { allowed: false, resetTime }.
 */
export async function checkRateLimit(
  key: string,
  windowMs: number,
  max: number
): Promise<{ allowed: boolean; resetTime?: Date }> {
  const resetAt = new Date(Date.now() + windowMs);

  try {
    const result = await pool.query(
      `INSERT INTO ${TABLE} (key, hits, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         hits = CASE
           WHEN ${TABLE}.reset_at <= NOW() THEN 1
           ELSE ${TABLE}.hits + 1
         END,
         reset_at = CASE
           WHEN ${TABLE}.reset_at <= NOW() THEN $2
           ELSE ${TABLE}.reset_at
         END
       RETURNING hits, reset_at`,
      [key, resetAt]
    );

    const row = result.rows[0];
    if (row.hits > max) {
      return { allowed: false, resetTime: new Date(row.reset_at) };
    }
    return { allowed: true };
  } catch (err) {
    logger.error({ err }, "[RateLimit] Check failed, allowing request (fail-open)");
    return { allowed: true };
  }
}
