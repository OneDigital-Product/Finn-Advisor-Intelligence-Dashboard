import * as orionClient from "./client";
import { logger } from "../../lib/logger";
import { storage } from "../../storage";

export type ReconciliationReport = {
  accountsChecked: number;
  discrepancies: Array<{
    type: string;
    accountId?: string;
    ticker?: string;
    local?: any;
    orion?: any;
    diff?: number;
    message: string;
  }>;
  totalValueDiff: number;
  lastChecked: Date;
};

export async function reconcileAccounts(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    accountsChecked: 0,
    discrepancies: [],
    totalValueDiff: 0,
    lastChecked: new Date(),
  };

  if (!orionClient.isOrionEnabled()) return report;

  try {
    const orionAccounts = await orionClient.getAccounts();

    for (const orionAccount of orionAccounts) {
      report.accountsChecked++;

      const localAccount = await storage.getAccountByOrionId(orionAccount.id);

      if (!localAccount) {
        report.discrepancies.push({
          type: "missing_local",
          accountId: orionAccount.id,
          message: `Orion account ${orionAccount.accountNumber} not found locally`,
        });
        continue;
      }

      const balanceDiff = Math.abs(
        parseFloat(localAccount.balance) - orionAccount.totalValue
      );

      if (balanceDiff > 100) {
        report.discrepancies.push({
          type: "balance_mismatch",
          accountId: localAccount.id,
          local: localAccount.balance,
          orion: orionAccount.totalValue,
          diff: balanceDiff,
          message: `Balance mismatch: local=$${localAccount.balance}, orion=$${orionAccount.totalValue}`,
        });
        report.totalValueDiff += balanceDiff;
      }

      try {
        const orionHoldings = await orionClient.getHoldings(orionAccount.id);
        const localHoldings = await storage.getHoldingsByAccount(localAccount.id);

        if (orionHoldings.length !== localHoldings.length) {
          report.discrepancies.push({
            type: "holdings_count_mismatch",
            accountId: localAccount.id,
            local: localHoldings.length,
            orion: orionHoldings.length,
            message: `Holding count mismatch: local=${localHoldings.length}, orion=${orionHoldings.length}`,
          });
        }

        for (const orionHolding of orionHoldings) {
          const localHolding = localHoldings.find(
            (h) => h.ticker === orionHolding.ticker
          );
          if (!localHolding) {
            report.discrepancies.push({
              type: "missing_holding",
              accountId: localAccount.id,
              ticker: orionHolding.ticker,
              message: `Holding ${orionHolding.ticker} in Orion but not locally`,
            });
          }
        }
      } catch (err) {
        logger.error({ err }, "API error");
      }
    }

    if (report.discrepancies.length > 0) {
      await storage.createOrionReconciliationReport({
        accountsChecked: report.accountsChecked,
        discrepancies: report.discrepancies,
        totalValueDiff: report.totalValueDiff.toString(),
        actionItems: report.discrepancies
          .filter((d) => d.type === "balance_mismatch" || d.type === "missing_local")
          .map((d) => d.message),
      });
    }
  } catch (err) {
    logger.error({ err }, "API error");
    throw err;
  }

  return report;
}
