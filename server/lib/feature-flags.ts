import { db } from "../db";
import { featureFlags } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

interface CacheEntry {
  enabled: boolean;
  rolloutPercentage: number;
  expiry: number;
}

const flagCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60_000;

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function applyRollout(
  enabled: boolean,
  key: string,
  userId?: string,
  rolloutPercentage: number = 100
): boolean {
  if (!enabled || rolloutPercentage >= 100) return enabled;
  if (rolloutPercentage <= 0) return false;

  if (!userId) {
    return Math.random() * 100 < rolloutPercentage;
  }

  const hash = hashCode(`${userId}-${key}`);
  return (hash % 100) < rolloutPercentage;
}

export async function isFeatureEnabled(
  key: string,
  userId?: string
): Promise<boolean> {
  const envKey = `FEATURE_FLAG_${key.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal === "true") return true;
  if (envVal === "false") return false;

  const cached = flagCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return applyRollout(cached.enabled, key, userId, cached.rolloutPercentage);
  }

  try {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));

    const enabled = flag?.enabled ?? false;
    const rolloutPercentage = flag?.rolloutPercentage ?? 100;

    flagCache.set(key, {
      enabled,
      rolloutPercentage,
      expiry: Date.now() + CACHE_TTL,
    });

    return applyRollout(enabled, key, userId, rolloutPercentage);
  } catch (err) {
    logger.error({ err, key }, "Error checking feature flag");
    return false;
  }
}

export async function getAllFlags() {
  try {
    return await db.select().from(featureFlags).orderBy(featureFlags.key);
  } catch (err) {
    logger.error({ err }, "Error fetching feature flags");
    return [];
  }
}

export async function updateFlag(
  key: string,
  enabled: boolean,
  rolloutPercentage?: number
) {
  const updateData: Record<string, any> = {
    enabled,
    updatedAt: new Date(),
  };
  if (rolloutPercentage !== undefined) {
    updateData.rolloutPercentage = rolloutPercentage;
  }

  const [result] = await db
    .update(featureFlags)
    .set(updateData)
    .where(eq(featureFlags.key, key))
    .returning();

  flagCache.delete(key);
  logger.info({ key, enabled, rolloutPercentage }, "Feature flag updated");

  return result;
}

export const isEnabled = isFeatureEnabled;

export function invalidateCache(key?: string) {
  if (key) {
    flagCache.delete(key);
  } else {
    flagCache.clear();
  }
}

export async function prewarmCache(): Promise<number> {
  try {
    const allFlags = await db.select().from(featureFlags);
    const now = Date.now();

    for (const flag of allFlags) {
      flagCache.set(flag.key, {
        enabled: flag.enabled,
        rolloutPercentage: flag.rolloutPercentage ?? 100,
        expiry: now + CACHE_TTL,
      });
    }

    logger.info({ count: allFlags.length }, "Feature flag cache pre-warmed from database");
    return allFlags.length;
  } catch (err) {
    logger.error({ err }, "Failed to pre-warm feature flag cache");
    return 0;
  }
}
