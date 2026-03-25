import { pool } from "../db";
import { logger } from "../lib/logger";
import type { MarketDataProvider, ProviderCapability, HealthStatus } from "./provider-interface";

export class ProviderRegistry {
  private providers: Map<string, MarketDataProvider> = new Map();
  private healthMetrics: Map<string, { failures: number; lastFailure: number }> = new Map();
  private initialized = false;
  private readonly tableName = "provider_health_metrics";

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          provider_name VARCHAR(255) NOT NULL PRIMARY KEY,
          failures INTEGER NOT NULL DEFAULT 0,
          last_failure BIGINT NOT NULL DEFAULT 0,
          health_status VARCHAR(50) NOT NULL DEFAULT 'healthy',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      this.initialized = true;
    } catch (err) {
      logger.error({ err }, `[ProviderRegistry] Failed to create ${this.tableName} table`);
    }
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) await this.init();
  }

  async restoreHealthMetrics(): Promise<number> {
    await this.ensureInit();
    let restored = 0;
    try {
      const result = await pool.query(
        `SELECT provider_name, failures, last_failure, health_status FROM ${this.tableName}`
      );

      for (const row of result.rows) {
        const provider = this.providers.get(row.provider_name);
        if (provider) {
          this.healthMetrics.set(row.provider_name, {
            failures: row.failures,
            lastFailure: Number(row.last_failure),
          });
          if (row.health_status === "degraded" || row.health_status === "unavailable") {
            provider.setHealthStatus(row.health_status as HealthStatus);
          }
          restored++;
          logger.info(
            { provider: row.provider_name, failures: row.failures, status: row.health_status },
            "Restored provider health metrics"
          );
        }
      }
    } catch (err) {
      logger.error({ err }, "[ProviderRegistry] Failed to restore health metrics");
    }
    return restored;
  }

  private async persistMetrics(providerName: string): Promise<void> {
    await this.ensureInit();
    const metrics = this.healthMetrics.get(providerName);
    const provider = this.providers.get(providerName);
    if (!metrics || !provider) return;

    try {
      await pool.query(
        `INSERT INTO ${this.tableName} (provider_name, failures, last_failure, health_status, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (provider_name) DO UPDATE SET
           failures = $2,
           last_failure = $3,
           health_status = $4,
           updated_at = NOW()`,
        [providerName, metrics.failures, metrics.lastFailure, provider.getHealthStatus()]
      );
    } catch (err) {
      logger.error({ err, provider: providerName }, "[ProviderRegistry] Failed to persist health metrics");
    }
  }

  register(provider: MarketDataProvider): void {
    const meta = provider.getMetadata();
    this.providers.set(meta.name, provider);
    this.healthMetrics.set(meta.name, { failures: 0, lastFailure: 0 });
    logger.info(`Provider registered: ${meta.name} [priority=${meta.priority}]`);
  }

  getProvider(name: string): MarketDataProvider | null {
    return this.providers.get(name) ?? null;
  }

  getProviderChain(capability: ProviderCapability): MarketDataProvider[] {
    const filtered = Array.from(this.providers.values()).filter(p => {
      const meta = p.getMetadata();
      return meta.capabilities.includes(capability);
    });

    return filtered.sort((a, b) => {
      const aPriority = a.getMetadata().priority;
      const bPriority = b.getMetadata().priority;
      return aPriority - bPriority;
    });
  }

  getPrimaryProvider(capability: ProviderCapability): MarketDataProvider | null {
    const chain = this.getProviderChain(capability);
    const healthy = chain.find(p => p.getHealthStatus() === "healthy");
    return healthy ?? chain[0] ?? null;
  }

  recordSuccess(providerName: string): void {
    const metrics = this.healthMetrics.get(providerName);
    if (metrics) {
      metrics.failures = 0;
      const provider = this.providers.get(providerName);
      if (provider && provider.getHealthStatus() === "degraded") {
        provider.setHealthStatus("healthy");
        logger.info(`Provider recovered: ${providerName}`);
      }
      this.persistMetrics(providerName).catch(() => {});
    }
  }

  recordFailure(providerName: string): void {
    const metrics = this.healthMetrics.get(providerName);
    const provider = this.providers.get(providerName);
    if (!metrics || !provider) return;

    metrics.failures++;
    metrics.lastFailure = Date.now();

    if (metrics.failures >= 3 && provider.getHealthStatus() === "healthy") {
      provider.setHealthStatus("degraded");
      logger.warn(`Provider degraded (3 failures): ${providerName}`);
    }
    this.persistMetrics(providerName).catch(() => {});
  }

  getHealthStatus(providerName: string): HealthStatus {
    const provider = this.providers.get(providerName);
    return provider?.getHealthStatus() ?? "unavailable";
  }

  listProviders() {
    return Array.from(this.providers.values()).map(p => {
      const meta = p.getMetadata();
      const metrics = this.healthMetrics.get(meta.name);
      return {
        name: meta.name,
        capabilities: meta.capabilities,
        priority: meta.priority,
        status: p.getHealthStatus(),
        consecutiveFailures: metrics?.failures ?? 0,
      };
    });
  }
}

export const providerRegistry = new ProviderRegistry();
