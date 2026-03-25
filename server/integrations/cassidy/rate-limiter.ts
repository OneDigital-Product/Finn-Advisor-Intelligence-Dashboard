import { pool } from "../../db";
import { logger } from "../../lib/logger";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  limitType?: "global" | "advisor";
  retryAfterSeconds?: number;
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private capacity: number;
  private refillRate: number;
  private globalBucket: TokenBucket;
  private globalCapacity: number;
  private globalRefillRate: number;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private dirty = new Set<string>();
  private initialized = false;

  constructor(capacity = 100, windowSeconds = 60) {
    this.capacity = capacity;
    this.refillRate = capacity / windowSeconds;

    const globalLimit = parseInt(process.env.CASSIDY_GLOBAL_RATE_LIMIT || "500", 10);
    const globalWindow = parseInt(process.env.CASSIDY_GLOBAL_RATE_WINDOW || "60", 10);
    this.globalCapacity = globalLimit > 0 ? globalLimit : 500;
    this.globalRefillRate = this.globalCapacity / (globalWindow > 0 ? globalWindow : 60);
    this.globalBucket = { tokens: this.globalCapacity, lastRefill: Date.now() };
  }

  async init(): Promise<boolean> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cassidy_rate_limit_buckets (
          key VARCHAR(255) PRIMARY KEY,
          tokens DOUBLE PRECISION NOT NULL,
          last_refill BIGINT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const result = await pool.query(
        `SELECT key, tokens, last_refill FROM cassidy_rate_limit_buckets`
      );

      for (const row of result.rows) {
        if (row.key === "__global__") {
          this.globalBucket = { tokens: row.tokens, lastRefill: Number(row.last_refill) };
        } else {
          this.buckets.set(row.key, { tokens: row.tokens, lastRefill: Number(row.last_refill) });
        }
      }

      this.flushInterval = setInterval(() => {
        this.flushToDb().catch((err) =>
          logger.error({ err }, "[CassidyRateLimiter] Periodic flush failed")
        );
      }, 5_000);

      this.initialized = true;
      logger.info(
        { restoredBuckets: result.rows.length },
        "[CassidyRateLimiter] Initialized with DB-backed state"
      );
      return true;
    } catch (err) {
      logger.error({ err }, "[CassidyRateLimiter] Failed to initialize DB table, falling back to in-memory only");
      return false;
    }
  }

  private refillBucket(bucket: TokenBucket, capacity: number, refillRate: number, now: number): void {
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillRate);
    bucket.lastRefill = now;
  }

  checkLimit(advisorId: string): RateLimitResult {
    const now = Date.now();

    this.refillBucket(this.globalBucket, this.globalCapacity, this.globalRefillRate, now);
    if (this.globalBucket.tokens < 1) {
      const tokensNeeded = 1 - this.globalBucket.tokens;
      return {
        allowed: false,
        limitType: "global",
        retryAfterSeconds: Math.ceil(tokensNeeded / this.globalRefillRate),
      };
    }

    let bucket = this.buckets.get(advisorId);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(advisorId, bucket);
    }
    this.refillBucket(bucket, this.capacity, this.refillRate, now);

    if (bucket.tokens < 1) {
      const tokensNeeded = 1 - bucket.tokens;
      return {
        allowed: false,
        limitType: "advisor",
        retryAfterSeconds: Math.ceil(tokensNeeded / this.refillRate),
      };
    }

    this.globalBucket.tokens -= 1;
    bucket.tokens -= 1;
    this.markDirty("__global__");
    this.markDirty(advisorId);
    return { allowed: true };
  }

  isAllowed(advisorId: string): boolean {
    return this.checkLimit(advisorId).allowed;
  }

  getRetryAfterSeconds(advisorId: string): number {
    const now = Date.now();

    this.refillBucket(this.globalBucket, this.globalCapacity, this.globalRefillRate, now);
    if (this.globalBucket.tokens < 1) {
      this.markDirty("__global__");
      const tokensNeeded = 1 - this.globalBucket.tokens;
      return Math.ceil(tokensNeeded / this.globalRefillRate);
    }

    const bucket = this.buckets.get(advisorId);
    if (!bucket) return 0;
    this.refillBucket(bucket, this.capacity, this.refillRate, now);
    if (bucket.tokens < 1) {
      this.markDirty(advisorId);
      const tokensNeeded = 1 - bucket.tokens;
      return Math.ceil(tokensNeeded / this.refillRate);
    }
    return 0;
  }

  private markDirty(key: string): void {
    if (this.initialized) {
      this.dirty.add(key);
    }
  }

  private async flushToDb(): Promise<void> {
    if (this.dirty.size === 0) return;

    const keysToFlush = Array.from(this.dirty);
    this.dirty.clear();

    try {
      const values: string[] = [];
      const params: (string | number)[] = [];
      let paramIdx = 1;

      for (const key of keysToFlush) {
        const bucket = key === "__global__" ? this.globalBucket : this.buckets.get(key);
        if (!bucket) continue;

        values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, NOW())`);
        params.push(key, bucket.tokens, bucket.lastRefill);
        paramIdx += 3;
      }

      if (values.length === 0) return;

      await pool.query(
        `INSERT INTO cassidy_rate_limit_buckets (key, tokens, last_refill, updated_at)
         VALUES ${values.join(", ")}
         ON CONFLICT (key) DO UPDATE SET
           tokens = EXCLUDED.tokens,
           last_refill = EXCLUDED.last_refill,
           updated_at = NOW()`,
        params
      );
    } catch (err) {
      for (const key of keysToFlush) {
        this.dirty.add(key);
      }
      logger.error({ err }, "[CassidyRateLimiter] Failed to flush bucket state to DB");
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flushToDb();
  }
}
