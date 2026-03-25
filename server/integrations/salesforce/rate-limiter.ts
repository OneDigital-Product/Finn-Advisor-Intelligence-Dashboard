import { logger } from "../../lib/logger";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  limitType?: "daily" | "concurrent";
  retryAfterSeconds?: number;
}

export class SalesforceRateLimiter {
  private dailyBucket: TokenBucket;
  private dailyCapacity: number;
  private dailyRefillRate: number;

  private concurrentBucket: TokenBucket;
  private concurrentCapacity: number;
  private concurrentRefillRate: number;

  constructor() {
    const dailyLimit = parseInt(process.env.SALESFORCE_DAILY_API_LIMIT || "10000", 10);
    this.dailyCapacity = dailyLimit > 0 ? dailyLimit : 10000;
    const dailyWindowSeconds = 86400;
    this.dailyRefillRate = this.dailyCapacity / dailyWindowSeconds;
    this.dailyBucket = { tokens: this.dailyCapacity, lastRefill: Date.now() };

    const concurrentLimit = parseInt(process.env.SALESFORCE_CONCURRENT_API_LIMIT || "25", 10);
    this.concurrentCapacity = concurrentLimit > 0 ? concurrentLimit : 25;
    const concurrentWindowSeconds = parseInt(process.env.SALESFORCE_CONCURRENT_WINDOW || "1", 10);
    this.concurrentRefillRate = this.concurrentCapacity / (concurrentWindowSeconds > 0 ? concurrentWindowSeconds : 1);
    this.concurrentBucket = { tokens: this.concurrentCapacity, lastRefill: Date.now() };
  }

  private refillBucket(bucket: TokenBucket, capacity: number, refillRate: number, now: number): void {
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillRate);
    bucket.lastRefill = now;
  }

  checkLimit(): RateLimitResult {
    const now = Date.now();

    this.refillBucket(this.dailyBucket, this.dailyCapacity, this.dailyRefillRate, now);
    if (this.dailyBucket.tokens < 1) {
      const tokensNeeded = 1 - this.dailyBucket.tokens;
      const retryAfterSeconds = Math.ceil(tokensNeeded / this.dailyRefillRate);
      logger.warn({ retryAfterSeconds }, "Salesforce daily API rate limit reached");
      return { allowed: false, limitType: "daily", retryAfterSeconds };
    }

    this.refillBucket(this.concurrentBucket, this.concurrentCapacity, this.concurrentRefillRate, now);
    if (this.concurrentBucket.tokens < 1) {
      const tokensNeeded = 1 - this.concurrentBucket.tokens;
      const retryAfterSeconds = Math.ceil(tokensNeeded / this.concurrentRefillRate);
      logger.warn({ retryAfterSeconds }, "Salesforce concurrent API rate limit reached");
      return { allowed: false, limitType: "concurrent", retryAfterSeconds };
    }

    this.dailyBucket.tokens -= 1;
    this.concurrentBucket.tokens -= 1;
    return { allowed: true };
  }

  async waitForAvailability(timeoutMs = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = this.checkLimit();
      if (result.allowed) return;
      const waitMs = Math.min((result.retryAfterSeconds || 1) * 1000, 5000);
      await new Promise((r) => setTimeout(r, waitMs));
    }
    throw new Error("Salesforce API rate limit exceeded — request aborted after timeout");
  }
}

export const salesforceRateLimiter = new SalesforceRateLimiter();
