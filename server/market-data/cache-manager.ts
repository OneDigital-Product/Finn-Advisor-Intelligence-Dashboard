import { db } from "../db";
import { marketDataCache } from "../../shared/schema";
import { eq, and, lt, gt, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export class CacheManager {
  private hitCount = 0;
  private missCount = 0;

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await db
        .select()
        .from(marketDataCache)
        .where(
          and(
            eq(marketDataCache.cacheKey, key),
            gt(marketDataCache.expiresAt, new Date())
          )
        )
        .limit(1);

      if (result.length === 0) {
        this.missCount++;
        return null;
      }

      this.hitCount++;
      return result[0].data as T;
    } catch (error) {
      logger.error({ err: error }, "Cache get failed");
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlMs: number, provider = "internal", dataType = "general", ticker = "NONE"): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      await db
        .insert(marketDataCache)
        .values({
          cacheKey: key,
          data: data as any,
          expiresAt,
          provider,
          dataType,
          ticker,
        })
        .onConflictDoUpdate({
          target: marketDataCache.cacheKey,
          set: {
            data: data as any,
            expiresAt,
            fetchedAt: new Date(),
          },
        });
    } catch (error) {
      logger.error({ err: error }, "Cache set failed");
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await db
        .delete(marketDataCache)
        .where(eq(marketDataCache.cacheKey, key));
    } catch (error) {
      logger.error({ err: error }, "Cache delete failed");
    }
  }

  async cleanup(): Promise<void> {
    try {
      const result = await db
        .delete(marketDataCache)
        .where(lt(marketDataCache.expiresAt, new Date()));
      logger.info("Cache cleanup completed");
    } catch (error) {
      logger.error({ err: error }, "Cache cleanup failed");
    }
  }

  async getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      totalCalls: total,
      cachedCalls: this.hitCount,
      savedCalls: this.hitCount,
      sizeBytes: 0,
    };
  }

  incrementHitCounter(): void {
    this.hitCount++;
  }

  incrementMissCounter(): void {
    this.missCount++;
  }
}

export const cacheManager = new CacheManager();
