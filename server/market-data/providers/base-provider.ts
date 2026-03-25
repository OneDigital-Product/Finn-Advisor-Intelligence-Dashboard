import { logger } from "../../lib/logger";
import type { MarketDataProvider, ProviderMetadata, HealthStatus } from "../provider-interface";

export abstract class BaseProvider implements MarketDataProvider {
  protected metadata: ProviderMetadata;
  protected healthStatus: HealthStatus = "healthy";

  constructor(metadata: ProviderMetadata) {
    this.metadata = metadata;
  }

  getMetadata(): ProviderMetadata {
    return this.metadata;
  }

  getHealthStatus(): HealthStatus {
    return this.healthStatus;
  }

  setHealthStatus(status: HealthStatus): void {
    this.healthStatus = status;
  }

  protected logError(method: string, error: any): void {
    logger.error(
      { err: error, provider: this.metadata.name },
      `${this.metadata.name}.${method} failed`
    );
  }

  protected logRequest(method: string, params?: any): void {
    logger.debug(
      { provider: this.metadata.name, params },
      `${this.metadata.name}.${method} called`
    );
  }
}
