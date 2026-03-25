import { pool } from "../db";
import { logger } from "../lib/logger";

interface RateLimitStatus {
  calls: number;
  limit: number;
  resetAt: Date;
  percentage: number;
}

export class RateLimiter {
  private initialized = false;
  private readonly tableName = "market_data_rate_limits";

  constructor(private rateLimitConfig: Map<string, { requestsPerMinute?: number; requestsPerDay?: number }>) {}

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          key VARCHAR(255) NOT NULL PRIMARY KEY,
          hits INTEGER NOT NULL DEFAULT 0,
          reset_at TIMESTAMPTZ NOT NULL
        )
      `);
      this.initialized = true;
    } catch (err) {
      logger.error({ err }, `[MarketDataRateLimiter] Failed to create ${this.tableName} table`);
    }
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) await this.init();
  }

  async track(providerName: string): Promise<boolean> {
    const config = this.rateLimitConfig.get(providerName);
    if (!config) return true;

    const limit = config.requestsPerDay || (config.requestsPerMinute ? config.requestsPerMinute * 60 * 24 : 1000000);
    const key = `${providerName}:${new Date().toDateString()}`;

    await this.ensureInit();

    try {
      const tomorrow = new Date();
      tomorrow.setHours(23, 59, 59, 999);

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
         RETURNING hits`,
        [key, tomorrow]
      );

      const current = result.rows[0].hits;
      if (current > limit) {
        logger.warn(`${providerName} rate limited: ${current}/${limit}`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error({ err }, `[MarketDataRateLimiter] Failed to track ${providerName}, allowing request (fail-open)`);
      return true;
    }
  }

  async getUsage(providerName: string): Promise<RateLimitStatus> {
    const config = this.rateLimitConfig.get(providerName);
    const limit = config?.requestsPerDay || (config?.requestsPerMinute ? config.requestsPerMinute * 60 * 24 : 1000000);
    const key = `${providerName}:${new Date().toDateString()}`;

    await this.ensureInit();

    let calls = 0;
    try {
      const result = await pool.query(
        `SELECT hits FROM ${this.tableName} WHERE key = $1 AND reset_at > NOW()`,
        [key]
      );
      if (result.rows.length > 0) {
        calls = result.rows[0].hits;
      }
    } catch (err) {
      logger.error({ err }, `[MarketDataRateLimiter] Failed to get usage for ${providerName}`);
    }

    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    return {
      calls,
      limit,
      resetAt: tomorrow,
      percentage: (calls / limit) * 100,
    };
  }

  async reset(): Promise<void> {
    await this.ensureInit();
    try {
      await pool.query(`DELETE FROM ${this.tableName}`);
    } catch (err) {
      logger.error({ err }, `[MarketDataRateLimiter] Failed to reset`);
    }
  }
}

export const rateLimiter = new RateLimiter(new Map([
  ["Finnhub", { requestsPerMinute: 60 }],
  ["Alpha Vantage", { requestsPerDay: 25 }],
  ["Yahoo Finance", { requestsPerDay: 10000 }],
]));
