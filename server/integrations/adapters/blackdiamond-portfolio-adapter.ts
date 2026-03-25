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
import { storage } from "../../storage";

const BD_CONFIG = {
  baseUrl: process.env.BLACK_DIAMOND_BASE_URL || "https://api.blackdiamond.advent.com/v2",
  clientId: process.env.BLACK_DIAMOND_CLIENT_ID,
  clientSecret: process.env.BLACK_DIAMOND_CLIENT_SECRET,
  timeout: 30000,
};

const BD_TOKEN_CACHE = {
  accessToken: "",
  expiresAt: 0,
};

function isBlackDiamondEnabled(): boolean {
  return process.env.BLACK_DIAMOND_ENABLED === "true" && !!BD_CONFIG.clientId && !!BD_CONFIG.clientSecret;
}

async function getAccessToken(): Promise<string | null> {
  if (BD_TOKEN_CACHE.accessToken && BD_TOKEN_CACHE.expiresAt > Date.now()) {
    return BD_TOKEN_CACHE.accessToken;
  }

  try {
    const response = await fetch(`${BD_CONFIG.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: BD_CONFIG.clientId || "",
        client_secret: BD_CONFIG.clientSecret || "",
      }),
      signal: AbortSignal.timeout(BD_CONFIG.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ err: errorText }, "[BlackDiamond] Token refresh failed");
      return null;
    }

    const data = await response.json() as { access_token: string; expires_in?: number };
    BD_TOKEN_CACHE.accessToken = data.access_token;
    BD_TOKEN_CACHE.expiresAt = Date.now() + ((data.expires_in || 3600) - 60) * 1000;

    return data.access_token;
  } catch (err) {
    logger.error({ err }, "[BlackDiamond] Token error");
    return null;
  }
}

async function bdFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error("Black Diamond authentication failed");

  const url = `${BD_CONFIG.baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
    signal: AbortSignal.timeout(BD_CONFIG.timeout),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Black Diamond API error ${response.status}: ${errorText}`);
  }

  return response;
}

function mapBDAccount(bd: any): PortfolioAccount {
  return {
    id: bd.id?.toString() || bd.accountId?.toString() || "",
    accountNumber: bd.accountNumber || bd.account_number || "",
    name: bd.name || bd.accountName || "",
    custodian: bd.custodian || bd.custodianName || "",
    accountType: bd.accountType || bd.type || "",
    status: bd.status || "active",
    totalValue: bd.marketValue || bd.totalValue || 0,
    baseCurrency: bd.currency || "USD",
    lastUpdated: bd.lastUpdated || bd.updatedAt || new Date().toISOString(),
  };
}

function mapBDHolding(bd: any): PortfolioHolding {
  return {
    id: bd.id?.toString() || bd.holdingId?.toString() || "",
    ticker: bd.ticker || bd.symbol || "",
    description: bd.description || bd.securityName || "",
    quantity: bd.quantity || bd.shares || 0,
    marketValue: bd.marketValue || 0,
    percentOfAccount: bd.percentOfAccount || bd.weight || 0,
    costBasis: bd.costBasis || 0,
    unrealizedGainLoss: bd.unrealizedGainLoss || bd.unrealizedGL || 0,
    sector: bd.sector || "Other",
    assetClass: bd.assetClass || bd.asset_class || "Other",
  };
}

function mapBDPerformance(bd: any): PortfolioPerformance {
  return {
    period: bd.period || "YTD",
    returnPct: bd.returnPct || bd.return_pct || 0,
    benchmarkPct: bd.benchmarkPct || bd.benchmark_pct || 0,
    outperformance: (bd.returnPct || 0) - (bd.benchmarkPct || 0),
    since: bd.since || bd.startDate || "",
  };
}

function mapBDTransaction(bd: any): PortfolioTransaction {
  const typeMap: Record<string, "BUY" | "SELL" | "DIVIDEND" | "TRANSFER"> = {
    buy: "BUY", purchase: "BUY",
    sell: "SELL", sale: "SELL",
    dividend: "DIVIDEND", income: "DIVIDEND",
    transfer: "TRANSFER", journal: "TRANSFER",
  };

  return {
    id: bd.id?.toString() || bd.transactionId?.toString() || "",
    date: bd.date || bd.tradeDate || "",
    type: typeMap[(bd.type || bd.transactionType || "").toLowerCase()] || "BUY",
    ticker: bd.ticker || bd.symbol || "",
    quantity: bd.quantity || bd.shares || 0,
    price: bd.price || 0,
    amount: bd.amount || bd.netAmount || 0,
    commission: bd.commission || 0,
  };
}

export class BlackDiamondPortfolioAdapter implements PortfolioAdapter {
  readonly name = "blackdiamond";

  isEnabled(): boolean {
    return isBlackDiamondEnabled();
  }

  async validateConnection(): Promise<boolean> {
    if (!isBlackDiamondEnabled()) return false;
    try {
      await bdFetch("/accounts?limit=1");
      return true;
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Validation failed");
      return false;
    }
  }

  async getAccounts(): Promise<PortfolioAccount[]> {
    if (!isBlackDiamondEnabled()) return [];
    try {
      const response = await bdFetch("/accounts");
      const data = await response.json() as any;
      return (data.accounts || data.data || data || []).map(mapBDAccount);
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to get accounts");
      return [];
    }
  }

  async getAccount(accountId: string): Promise<PortfolioAccount | null> {
    if (!isBlackDiamondEnabled()) return null;
    try {
      const response = await bdFetch(`/accounts/${accountId}`);
      const data = await response.json() as any;
      return mapBDAccount(data.account || data);
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to get account");
      return null;
    }
  }

  async getHoldings(accountId: string): Promise<PortfolioHolding[]> {
    if (!isBlackDiamondEnabled()) return [];
    try {
      const response = await bdFetch(`/accounts/${accountId}/holdings`);
      const data = await response.json() as any;
      return (data.holdings || data.data || data || []).map(mapBDHolding);
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to get holdings");
      return [];
    }
  }

  async getPerformance(accountId: string, period = "YTD"): Promise<PortfolioPerformance | null> {
    if (!isBlackDiamondEnabled()) return null;
    try {
      const response = await bdFetch(`/accounts/${accountId}/performance?period=${period}`);
      const data = await response.json() as any;
      return mapBDPerformance(data.performance || data);
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to get performance");
      return null;
    }
  }

  async getTransactions(accountId: string, sinceDate?: string): Promise<PortfolioTransaction[]> {
    if (!isBlackDiamondEnabled()) return [];
    try {
      const params = sinceDate ? `?since=${sinceDate}` : "";
      const response = await bdFetch(`/accounts/${accountId}/transactions${params}`);
      const data = await response.json() as any;
      return (data.transactions || data.data || data || []).map(mapBDTransaction);
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to get transactions");
      return [];
    }
  }

  async syncAllAccounts(options?: { fullSync?: boolean; specificAccountIds?: string[] }): Promise<PortfolioBatchSyncResult> {
    const result: PortfolioBatchSyncResult = { synced: 0, failed: 0, recordsProcessed: 0, errors: [] };
    if (!isBlackDiamondEnabled()) return result;

    try {
      const accounts = await this.getAccounts();
      let accountsToSync = accounts;
      if (options?.specificAccountIds) {
        accountsToSync = accounts.filter(a => options.specificAccountIds!.includes(a.id));
      }

      for (const account of accountsToSync) {
        try {
          const syncResult = await this.syncAccountData(account.id, options);
          result.synced++;
          result.recordsProcessed += syncResult.recordsProcessed || 0;
        } catch (err: any) {
          result.failed++;
          result.errors.push({ accountId: account.id, error: err.message });
        }
      }

      await storage.createOrionSyncLog({
        action: "full_sync",
        status: "completed",
        recordsAffected: result.recordsProcessed,
        details: { synced: result.synced, failed: result.failed, errors: result.errors, provider: "blackdiamond" },
      });
    } catch (err: any) {
      logger.error({ err }, "[BlackDiamond] Sync error");
      throw err;
    }

    return result;
  }

  async syncAccountData(accountId: string, options?: { fullSync?: boolean }): Promise<PortfolioSyncResult> {
    try {
      const bdAccount = await this.getAccount(accountId);
      if (!bdAccount) return { success: false, error: "Account not found in Black Diamond" };

      const localAccount = await storage.getAccountByOrionId(accountId);
      if (!localAccount) return { success: false, error: "No local account to sync to" };

      let recordsProcessed = 0;

      try {
        const holdings = await this.getHoldings(accountId);
        for (const holding of holdings) {
          try {
            await storage.upsertHoldingByOrionId({
              accountId: localAccount.id,
              ticker: holding.ticker,
              name: holding.description,
              shares: holding.quantity.toString(),
              marketValue: holding.marketValue.toString(),
              costBasis: holding.costBasis?.toString(),
              unrealizedGainLoss: holding.unrealizedGainLoss?.toString(),
              weight: holding.percentOfAccount?.toString(),
              sector: holding.sector || "Other",
              orionHoldingId: holding.id,
              lastOrionSync: new Date(),
            });
            recordsProcessed++;
          } catch (err) {
            logger.error({ err, accountId, holdingId: holding.id }, "[BlackDiamond] Failed to upsert holding");
          }
        }
      } catch (err) {
        logger.error({ err, accountId }, "[BlackDiamond] Failed to sync holdings");
      }

      try {
        const perf = await this.getPerformance(accountId);
        if (perf) {
          try {
            await storage.upsertPerformanceByAccountPeriod({
              accountId: localAccount.id,
              period: perf.period,
              returnPct: perf.returnPct.toString(),
              benchmarkPct: perf.benchmarkPct?.toString(),
            });
            recordsProcessed++;
          } catch (err) {
            logger.error({ err, accountId }, "[BlackDiamond] Failed to upsert performance");
          }
        }
      } catch (err) {
        logger.error({ err, accountId }, "[BlackDiamond] Failed to sync performance");
      }

      try {
        const sinceDate = options?.fullSync ? undefined : localAccount.lastOrionSync?.toISOString();
        const txList = await this.getTransactions(accountId, sinceDate);
        for (const tx of txList) {
          try {
            await storage.upsertTransactionByOrionId({
              accountId: localAccount.id,
              type: tx.type.toLowerCase(),
              ticker: tx.ticker,
              description: `${tx.type} ${tx.quantity} @ ${tx.price}`,
              amount: tx.amount.toString(),
              date: tx.date,
              orionTransactionId: tx.id,
            });
            recordsProcessed++;
          } catch (err) {
            logger.error({ err, accountId, transactionId: tx.id }, "[BlackDiamond] Failed to upsert transaction");
          }
        }
      } catch (err) {
        logger.error({ err, accountId }, "[BlackDiamond] Failed to sync transactions");
      }

      if (recordsProcessed > 0) {
        try {
          await storage.updateAccount(localAccount.id, { lastOrionSync: new Date(), orionSyncStatus: "synced" });
        } catch (err) {
          logger.error({ err, accountId }, "[BlackDiamond] Failed to update sync timestamp");
        }
      }

      return { success: true, recordsProcessed };
    } catch (err: any) {
      logger.error({ err }, "[BlackDiamond] Sync account error");
      return { success: false, error: err.message };
    }
  }

  async reconcile(): Promise<PortfolioReconciliationReport> {
    const report: PortfolioReconciliationReport = {
      accountsChecked: 0,
      discrepancies: [],
      totalValueDiff: 0,
      lastChecked: new Date(),
    };

    if (!isBlackDiamondEnabled()) return report;

    try {
      const bdAccounts = await this.getAccounts();

      for (const bdAccount of bdAccounts) {
        report.accountsChecked++;
        const localAccount = await storage.getAccountByOrionId(bdAccount.id);

        if (!localAccount) {
          report.discrepancies.push({
            type: "missing_local",
            accountId: bdAccount.id,
            message: `Black Diamond account ${bdAccount.accountNumber} not found locally`,
          });
          continue;
        }

        const balanceDiff = Math.abs(parseFloat(localAccount.balance) - bdAccount.totalValue);
        if (balanceDiff > 100) {
          report.discrepancies.push({
            type: "balance_mismatch",
            accountId: localAccount.id,
            local: localAccount.balance,
            remote: bdAccount.totalValue,
            diff: balanceDiff,
            message: `Balance mismatch: local=$${localAccount.balance}, blackdiamond=$${bdAccount.totalValue}`,
          });
          report.totalValueDiff += balanceDiff;
        }

        try {
          const bdHoldings = await this.getHoldings(bdAccount.id);
          const localHoldings = await storage.getHoldingsByAccount(localAccount.id);

          if (bdHoldings.length !== localHoldings.length) {
            report.discrepancies.push({
              type: "holdings_count_mismatch",
              accountId: localAccount.id,
              local: localHoldings.length,
              remote: bdHoldings.length,
              message: `Holding count mismatch: local=${localHoldings.length}, blackdiamond=${bdHoldings.length}`,
            });
          }
        } catch (err) {
          logger.error({ err }, "[BlackDiamond] Reconciliation holdings error");
        }
      }

      if (report.discrepancies.length > 0) {
        await storage.createOrionReconciliationReport({
          accountsChecked: report.accountsChecked,
          discrepancies: report.discrepancies,
          totalValueDiff: report.totalValueDiff.toString(),
          actionItems: report.discrepancies
            .filter(d => d.type === "balance_mismatch" || d.type === "missing_local")
            .map(d => d.message),
        });
      }
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Reconciliation error");
      throw err;
    }

    return report;
  }

  async createSetAside(request: SetAsideRequest): Promise<SetAsideResponse> {
    if (!isBlackDiamondEnabled()) {
      return { setAsideId: `mock-bd-sa-${Date.now()}`, status: "created" };
    }

    try {
      const response = await bdFetch(`/accounts/${request.accountId}/set-asides`, {
        method: "POST",
        body: JSON.stringify({
          amount: request.amount,
          reason: request.reason,
          frequency: request.frequency,
        }),
      });
      const data = await response.json() as any;
      return {
        setAsideId: data.id || data.setAsideId || `bd-sa-${Date.now()}`,
        status: data.status || "created",
      };
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to create set-aside");
      throw new Error("Failed to create Black Diamond set-aside request");
    }
  }

  async applyNwrTag(accountId: string): Promise<NwrTagResponse> {
    if (!isBlackDiamondEnabled()) {
      return { tagId: `mock-bd-nwr-${Date.now()}`, status: "applied" };
    }

    try {
      const response = await bdFetch(`/accounts/${accountId}/restrictions`, {
        method: "POST",
        body: JSON.stringify({
          type: "NWR",
          description: "No Withdrawal/Rebalance - Pending withdrawal execution",
        }),
      });
      const data = await response.json() as any;
      return {
        tagId: data.id || data.restrictionId || `bd-nwr-${Date.now()}`,
        status: data.status || "applied",
      };
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to apply NWR restriction");
      throw new Error("Failed to apply NWR restriction");
    }
  }

  async removeNwrTag(accountId: string, tagId: string): Promise<boolean> {
    if (!isBlackDiamondEnabled()) return true;

    try {
      await bdFetch(`/accounts/${accountId}/restrictions/${tagId}`, { method: "DELETE" });
      return true;
    } catch (err) {
      logger.error({ err }, "[BlackDiamond] Failed to remove NWR restriction");
      throw new Error("Failed to remove NWR restriction");
    }
  }
}
