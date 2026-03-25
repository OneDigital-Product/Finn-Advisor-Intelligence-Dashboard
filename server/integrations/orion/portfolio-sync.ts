import crypto from "crypto";
import { logger } from "../../lib/logger";
import * as orionClient from "./client";
import { storage } from "../../storage";
import type {
  OrionAccount,
  OrionHolding,
  OrionPerformance,
  OrionTransaction,
} from "./client";

export type SyncResult = {
  success: boolean;
  recordsProcessed?: number;
  error?: string;
};

export type BatchSyncResult = {
  synced: number;
  failed: number;
  recordsProcessed: number;
  errors: Array<{ accountId: string; error: string }>;
};

export function mapOrionAccountToLocal(orionAccount: OrionAccount) {
  return {
    accountNumber: orionAccount.accountNumber,
    accountType: orionAccount.accountType,
    custodian: orionAccount.custodian,
    balance: orionAccount.totalValue.toString(),
    status: "active" as const,
    orionAccountId: orionAccount.id,
    orionSyncStatus: "synced",
  };
}

export function mapOrionHoldingToLocal(orionHolding: OrionHolding, accountId: string) {
  return {
    accountId,
    ticker: orionHolding.ticker,
    name: orionHolding.description,
    shares: orionHolding.quantity.toString(),
    marketValue: orionHolding.marketValue.toString(),
    costBasis: orionHolding.costBasis?.toString(),
    unrealizedGainLoss: orionHolding.unrealizedGainLoss?.toString(),
    weight: orionHolding.percentOfAccount?.toString(),
    sector: orionHolding.sector || "Other",
    orionHoldingId: orionHolding.id,
    lastOrionSync: new Date(),
  };
}

export function mapOrionPerformanceToLocal(
  perf: OrionPerformance,
  accountId: string
) {
  return {
    accountId,
    period: perf.period,
    returnPct: perf.returnPct.toString(),
    benchmarkPct: perf.benchmarkPct?.toString(),
  };
}

export function mapOrionTransactionToLocal(
  tx: OrionTransaction,
  accountId: string
) {
  const typeMap: Record<string, string> = {
    BUY: "purchase",
    SELL: "sale",
    DIVIDEND: "dividend",
    TRANSFER: "transfer",
  };

  return {
    accountId,
    type: typeMap[tx.type] || "other",
    ticker: tx.ticker,
    description: `${tx.type} ${tx.quantity} @ ${tx.price}`,
    shares: (tx.shares ?? tx.quantity)?.toString() ?? null,
    price: tx.price?.toString() ?? null,
    amount: tx.amount.toString(),
    date: tx.date,
    orionTransactionId: tx.id,
  };
}

export function hashHolding(holding: OrionHolding): string {
  const key = `${holding.ticker}|${holding.quantity}|${holding.marketValue}`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function syncAllAccounts(options?: {
  fullSync?: boolean;
  specificAccountIds?: string[];
}): Promise<BatchSyncResult> {
  const result: BatchSyncResult = {
    synced: 0,
    failed: 0,
    recordsProcessed: 0,
    errors: [],
  };

  if (!orionClient.isOrionEnabled()) return result;

  try {
    const accounts = await orionClient.getAccounts();

    let accountsToSync = accounts;
    if (options?.specificAccountIds) {
      accountsToSync = accounts.filter((a) =>
        options.specificAccountIds!.includes(a.id)
      );
    }

    logger.info("Operation completed");

    const PARALLEL_LIMIT = 3;
    for (let i = 0; i < accountsToSync.length; i += PARALLEL_LIMIT) {
      const batch = accountsToSync.slice(i, i + PARALLEL_LIMIT);

      await Promise.all(
        batch.map(async (account) => {
          try {
            const accountResult = await syncAccountData(account.id, options);
            result.synced++;
            result.recordsProcessed += accountResult.recordsProcessed || 0;
          } catch (err: any) {
            result.failed++;
            result.errors.push({ accountId: account.id, error: err.message });
          }
        })
      );
    }

    await storage.createOrionSyncLog({
      action: "full_sync",
      status: "completed",
      recordsAffected: result.recordsProcessed,
      details: {
        synced: result.synced,
        failed: result.failed,
        errors: result.errors,
      },
    });

    logger.info({ synced: result.synced, failed: result.failed }, "Orion sync complete");
  } catch (err: any) {
    logger.error({ err }, "API error");
    throw err;
  }

  return result;
}

export async function syncAccountData(
  orionAccountId: string,
  options?: { fullSync?: boolean }
): Promise<SyncResult> {
  try {
    const orionAccount = await orionClient.getAccount(orionAccountId);
    if (!orionAccount) {
      return { success: false, error: "Account not found in Orion" };
    }

    const localAccount = await storage.getAccountByOrionId(orionAccountId);
    if (!localAccount) {
      logger.warn({ orionAccountId }, "No local account found for Orion account");
      return { success: false, error: "No local account to sync to" };
    }

    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      const orionHoldings = await orionClient.getHoldings(orionAccountId);
      let holdingsSucceeded = 0;
      let holdingsFailed = 0;
      for (const holding of orionHoldings) {
        try {
          const mapped = mapOrionHoldingToLocal(holding, localAccount.id);
          await storage.upsertHoldingByOrionId(mapped);
          holdingsSucceeded++;
          recordsProcessed++;
        } catch (recordErr) {
          holdingsFailed++;
          recordsFailed++;
          logger.error({ err: recordErr, orionAccountId, holdingId: holding.id }, "Failed to upsert holding");
        }
      }
      logger.info({ total: orionHoldings.length, succeeded: holdingsSucceeded, failed: holdingsFailed, orionAccountId }, "Synced holdings");
    } catch (err) {
      logger.error({ err, orionAccountId }, "Failed to sync holdings");
    }

    try {
      const perf = await orionClient.getPerformance(orionAccountId);
      if (perf) {
        try {
          const mapped = mapOrionPerformanceToLocal(perf, localAccount.id);
          await storage.upsertPerformanceByAccountPeriod(mapped);
          recordsProcessed++;
          logger.info({ succeeded: 1, failed: 0, orionAccountId, period: perf.period }, "Synced performance");
        } catch (recordErr) {
          recordsFailed++;
          logger.error({ err: recordErr, orionAccountId, period: perf.period, succeeded: 0, failed: 1 }, "Failed to upsert performance");
        }
      }
    } catch (err) {
      logger.error({ err, orionAccountId }, "Failed to sync performance");
    }

    try {
      const sinceDate = options?.fullSync
        ? undefined
        : localAccount.lastOrionSync?.toISOString();
      const txList = await orionClient.getTransactions(
        orionAccountId,
        sinceDate
      );
      let txSucceeded = 0;
      let txFailed = 0;
      for (const tx of txList) {
        try {
          const mapped = mapOrionTransactionToLocal(tx, localAccount.id);
          await storage.upsertTransactionByOrionId(mapped);
          txSucceeded++;
          recordsProcessed++;
        } catch (recordErr) {
          txFailed++;
          recordsFailed++;
          logger.error({ err: recordErr, orionAccountId, transactionId: tx.id }, "Failed to upsert transaction");
        }
      }
      logger.info({ total: txList.length, succeeded: txSucceeded, failed: txFailed, orionAccountId }, "Synced transactions");
    } catch (err) {
      logger.error({ err, orionAccountId }, "Failed to sync transactions");
    }

    if (recordsProcessed > 0) {
      try {
        await storage.updateAccount(localAccount.id, { lastOrionSync: new Date(), orionSyncStatus: "synced" });
      } catch (err) {
        logger.error({ err, orionAccountId }, "Failed to update lastOrionSync");
      }
    }

    const success = recordsProcessed > 0 || recordsFailed === 0;
    return { success, recordsProcessed };
  } catch (err: any) {
    logger.error({ err }, "API error");
    return { success: false, error: err.message };
  }
}
