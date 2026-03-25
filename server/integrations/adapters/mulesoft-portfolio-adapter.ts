import type {
  PortfolioAdapter,
  PortfolioAccount,
  PortfolioHolding,
  PortfolioPerformance,
  PortfolioTransaction,
  PortfolioSyncResult,
  PortfolioBatchSyncResult,
  PortfolioReconciliationReport,
  SetAsideRequest,
  SetAsideResponse,
  NwrTagResponse,
} from "./portfolio-adapter";
import { logger } from "../../lib/logger";
import { isMulesoftEnabled } from "../mulesoft/client";
import {
  getClientsValue, getClientAccounts, getClientAssets,
  postReportingScope, validateMulesoftConnection,
  getAccountGroupInfo, getContributionsYTD, getPerformanceWithRiskMetrics,
  type ReportingScopeRequest,
} from "../mulesoft/api";

export class MulesoftPortfolioAdapter implements PortfolioAdapter {
  readonly name = "mulesoft";

  isEnabled(): boolean {
    return isMulesoftEnabled();
  }

  async validateConnection(): Promise<boolean> {
    if (!isMulesoftEnabled()) return false;

    try {
      return await validateMulesoftConnection();
    } catch (err) {
      logger.error({ err }, "[MuleSoft Adapter] Validation failed");
      return false;
    }
  }

  async getAccounts(): Promise<PortfolioAccount[]> {
    if (!isMulesoftEnabled()) return [];
    return getClientsValue();
  }

  async getAccount(accountId: string): Promise<PortfolioAccount | null> {
    if (!isMulesoftEnabled()) return null;

    const subAccounts = await getClientAccounts(accountId);
    if (subAccounts.length > 0) {
      return subAccounts[0];
    }

    const accounts = await getClientsValue();
    return accounts.find((a) => a.id === accountId) || null;
  }

  async getHoldings(accountId: string): Promise<PortfolioHolding[]> {
    if (!isMulesoftEnabled()) return [];
    logger.warn(
      { accountId },
      "[MuleSoft Adapter] getHoldings not yet available — MuleSoft Assets endpoint pending"
    );
    const rawAssets = await getClientAssets(accountId);
    return rawAssets as PortfolioHolding[];
  }

  async getPerformance(accountId: string, period?: string): Promise<PortfolioPerformance | null> {
    if (!isMulesoftEnabled()) return null;

    // Use enhanced performance call that includes risk metrics (Sharpe, drawdown)
    const scopeResults = await getPerformanceWithRiskMetrics(
      [Number(accountId) || 0],
      "Account"
    );
    if (scopeResults.length > 0) {
      const result = scopeResults[0];
      return {
        period: result.period || period || "YTD",
        returnPct: result.returnPct || result.returnPercent || 0,
        benchmarkPct: result.benchmarkPct || result.benchmarkReturnPercent || 0,
        outperformance: (result.returnPct || result.returnPercent || 0) - (result.benchmarkPct || result.benchmarkReturnPercent || 0),
        since: result.since || result.startDate || "",
        // Risk metrics — now available via enhanced Reporting/Scope call
        sharpeRatio: result.sharpeRatio ?? result.sharpe ?? null,
        maxDrawdown: result.maxDrawdown ?? result.maximumDrawdown ?? null,
        alpha: result.alpha ?? null,
      };
    }

    return null;
  }

  async getTransactions(accountId: string, sinceDate?: string): Promise<PortfolioTransaction[]> {
    if (!isMulesoftEnabled()) return [];
    logger.warn(
      { accountId, sinceDate },
      "[MuleSoft Adapter] getTransactions not yet available — no MuleSoft transactions endpoint defined"
    );
    return [];
  }

  async syncAllAccounts(options?: { fullSync?: boolean; specificAccountIds?: string[] }): Promise<PortfolioBatchSyncResult> {
    logger.warn(
      "[MuleSoft Adapter] syncAllAccounts not yet implemented — MuleSoft sync endpoints pending"
    );
    return { synced: 0, failed: 0, recordsProcessed: 0, errors: [] };
  }

  async syncAccountData(accountId: string, options?: { fullSync?: boolean }): Promise<PortfolioSyncResult> {
    logger.warn(
      { accountId },
      "[MuleSoft Adapter] syncAccountData not yet implemented — MuleSoft sync endpoints pending"
    );
    return { success: false, error: "MuleSoft sync not yet available" };
  }

  async reconcile(): Promise<PortfolioReconciliationReport> {
    logger.warn(
      "[MuleSoft Adapter] reconcile not yet implemented — MuleSoft reconciliation endpoints pending"
    );
    return {
      accountsChecked: 0,
      discrepancies: [],
      totalValueDiff: 0,
      lastChecked: new Date(),
    };
  }

  async createSetAside(request: SetAsideRequest): Promise<SetAsideResponse> {
    logger.warn(
      { request },
      "[MuleSoft Adapter] createSetAside not yet available via MuleSoft"
    );
    return { setAsideId: `mulesoft-stub-${Date.now()}`, status: "not_available" };
  }

  async applyNwrTag(accountId: string): Promise<NwrTagResponse> {
    logger.warn(
      { accountId },
      "[MuleSoft Adapter] applyNwrTag not yet available via MuleSoft"
    );
    return { tagId: `mulesoft-stub-${Date.now()}`, status: "not_available" };
  }

  async removeNwrTag(accountId: string, tagId: string): Promise<boolean> {
    logger.warn(
      { accountId, tagId },
      "[MuleSoft Adapter] removeNwrTag not yet available via MuleSoft"
    );
    return false;
  }
}
