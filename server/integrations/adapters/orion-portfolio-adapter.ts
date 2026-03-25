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
import * as orionClient from "../orion/client";
import { syncAllAccounts, syncAccountData } from "../orion/portfolio-sync";
import { reconcileAccounts } from "../orion/reconciliation";
import {
  createSetAside as orionCreateSetAside,
  applyNwrTag as orionApplyNwrTag,
  removeNwrTag as orionRemoveNwrTag,
} from "../orion/set-aside";

export class OrionPortfolioAdapter implements PortfolioAdapter {
  readonly name = "orion";

  isEnabled(): boolean {
    return orionClient.isOrionEnabled();
  }

  async validateConnection(): Promise<boolean> {
    return orionClient.validateConnection();
  }

  async getAccounts(): Promise<PortfolioAccount[]> {
    return orionClient.getAccounts();
  }

  async getAccount(accountId: string): Promise<PortfolioAccount | null> {
    return orionClient.getAccount(accountId);
  }

  async getHoldings(accountId: string): Promise<PortfolioHolding[]> {
    return orionClient.getHoldings(accountId);
  }

  async getPerformance(accountId: string, period?: string): Promise<PortfolioPerformance | null> {
    return orionClient.getPerformance(accountId, period);
  }

  async getTransactions(accountId: string, sinceDate?: string): Promise<PortfolioTransaction[]> {
    return orionClient.getTransactions(accountId, sinceDate);
  }

  async syncAllAccounts(options?: { fullSync?: boolean; specificAccountIds?: string[] }): Promise<PortfolioBatchSyncResult> {
    return syncAllAccounts(options);
  }

  async syncAccountData(accountId: string, options?: { fullSync?: boolean }): Promise<PortfolioSyncResult> {
    return syncAccountData(accountId, options);
  }

  async reconcile(): Promise<PortfolioReconciliationReport> {
    const report = await reconcileAccounts();
    return {
      ...report,
      discrepancies: report.discrepancies.map(d => ({
        ...d,
        remote: d.orion,
      })),
    };
  }

  async createSetAside(request: SetAsideRequest): Promise<SetAsideResponse> {
    return orionCreateSetAside(request);
  }

  async applyNwrTag(accountId: string): Promise<NwrTagResponse> {
    return orionApplyNwrTag(accountId);
  }

  async removeNwrTag(accountId: string, tagId: string): Promise<boolean> {
    return orionRemoveNwrTag(accountId, tagId);
  }
}
