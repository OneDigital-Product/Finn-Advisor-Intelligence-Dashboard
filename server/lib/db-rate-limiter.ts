import type { Store, Options, IncrementResponse } from "express-rate-limit";
import { pool } from "../db";
import { logger } from "./logger";

export class PgRateLimitStore implements Store {
  private windowMs: number;
  private tableName: string;
  private failClosed: boolean;
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor(options?: { tableName?: string; failClosed?: boolean }) {
    this.windowMs = 0;
    // Validate table name to prevent SQL injection — only allow alphanumeric + underscores
    const rawName = options?.tableName || "rate_limit_hits";
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(rawName)) {
      throw new Error(`[RateLimiter] Invalid table name: ${rawName}`);
    }
    this.tableName = rawName;
    this.failClosed = options?.failClosed ?? false;
  }

  async init(options: Options): Promise<void> {
    this.windowMs = options.windowMs;

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          key VARCHAR(255) NOT NULL,
          hits INTEGER NOT NULL DEFAULT 1,
          reset_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (key)
        )
      `);
    } catch (err) {
      logger.error({ err }, `[RateLimiter] Failed to create ${this.tableName} table`);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch((err) =>
        logger.error({ err }, "[RateLimiter] Cleanup failed")
      );
    }, Math.max(this.windowMs, 60_000));
  }

  async increment(key: string): Promise<IncrementResponse> {
    const resetAt = new Date(Date.now() + this.windowMs);

    try {
      const result = await pool.query(
        `INSERT INTO ${this.tableName} (key, hits, reset_at)
         VALUES ($1, 1, $2)
         ON CONFLICT (key) DO UPDATE SET
           hits = CASE
             WHEN ${this.tableName}.reset_at <= NOW() THEN 1
             ELSE ${this.tableName}.hits + 1
           END,
           reset_at = CASE
             WHEN ${this.tableName}.reset_at <= NOW() THEN $2
             ELSE ${this.tableName}.reset_at
           END
         RETURNING hits, reset_at`,
        [key, resetAt]
      );

      const row = result.rows[0];
      return {
        totalHits: row.hits,
        resetTime: new Date(row.reset_at),
      };
    } catch (err) {
      if (this.failClosed) {
        logger.error({ err }, "[RateLimiter] Increment failed, blocking request (fail-closed)");
        return { totalHits: Infinity, resetTime: resetAt };
      }
      logger.error({ err }, "[RateLimiter] Increment failed, allowing request (fail-open)");
      return { totalHits: 0, resetTime: resetAt };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE ${this.tableName} SET hits = GREATEST(0, hits - 1) WHERE key = $1`,
        [key]
      );
    } catch (err) {
      logger.error({ err }, "[RateLimiter] Decrement failed");
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await pool.query(`DELETE FROM ${this.tableName} WHERE key = $1`, [key]);
    } catch (err) {
      logger.error({ err }, "[RateLimiter] ResetKey failed");
    }
  }

  async resetAll(): Promise<void> {
    try {
      await pool.query(`DELETE FROM ${this.tableName}`);
    } catch (err) {
      logger.error({ err }, "[RateLimiter] ResetAll failed");
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await pool.query(`DELETE FROM ${this.tableName} WHERE reset_at <= NOW()`);
    } catch (err) {
      logger.error({ err }, "[RateLimiter] Cleanup query failed");
    }
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as unknown as number);
      this.cleanupInterval = null;
    }
  }
}
