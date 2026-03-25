import { providerRegistry } from "./provider-registry";
import { logger } from "../lib/logger";
import type { ProviderCapability } from "./provider-interface";

export class FailoverManager {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(private interval = 5 * 60 * 1000) {}

  async startHealthChecks(): Promise<void> {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      await this.checkAllProviders();
    }, this.interval);

    await this.checkAllProviders();
  }

  stopHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAllProviders(): Promise<void> {
    logger.debug("Starting provider health checks");

    for (const providerInfo of providerRegistry.listProviders()) {
      try {
        const p = providerRegistry.getProvider(providerInfo.name);
        if (!p || !p.getQuote) continue;

        const quote = await p.getQuote("AAPL");
        if (quote) {
          providerRegistry.recordSuccess(providerInfo.name);
          logger.debug(`${providerInfo.name} health check: OK`);
        } else {
          providerRegistry.recordFailure(providerInfo.name);
        }
      } catch (error) {
        logger.warn({ err: error }, `Health check failed for ${providerInfo.name}`);
        providerRegistry.recordFailure(providerInfo.name);
      }
    }
  }

  getProviderChain(capability: ProviderCapability) {
    return providerRegistry.getProviderChain(capability);
  }

  getHealthStatus() {
    return providerRegistry.listProviders().map(p => ({
      name: p.name,
      status: p.status,
      consecutiveFailures: p.consecutiveFailures,
      lastCheckAt: new Date().toISOString(),
    }));
  }
}

export const failoverManager = new FailoverManager();
