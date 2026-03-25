import { db } from "../../db";
import { clients, accounts, holdings, portfolioTargets, type InsertAlert } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class RebalanceGenerator {
  private warningDrift: number;
  private criticalDrift: number;

  constructor(config?: { warningDriftPercent?: number; criticalDriftPercent?: number }) {
    this.warningDrift = config?.warningDriftPercent ?? 5;
    this.criticalDrift = config?.criticalDriftPercent ?? 10;
  }

  async generate(advisorId: string): Promise<InsertAlert[]> {
    const advisorClients = await db
      .select()
      .from(clients)
      .where(eq(clients.advisorId, advisorId));

    const result: InsertAlert[] = [];

    for (const client of advisorClients) {
      const targets = await db
        .select()
        .from(portfolioTargets)
        .where(eq(portfolioTargets.clientId, client.id));

      if (targets.length === 0) continue;

      const clientAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.clientId, client.id));

      if (clientAccounts.length === 0) continue;

      const allHoldings = [];
      for (const acct of clientAccounts) {
        const h = await db
          .select()
          .from(holdings)
          .where(eq(holdings.accountId, acct.id));
        allHoldings.push(...h);
      }

      if (allHoldings.length === 0) continue;

      const totalValue = allHoldings.reduce(
        (sum, h) => sum + parseFloat(h.marketValue),
        0
      );

      if (totalValue <= 0) continue;

      const sectorValues = new Map<string, number>();
      for (const h of allHoldings) {
        const sector = h.sector || "Other";
        sectorValues.set(
          sector,
          (sectorValues.get(sector) || 0) + parseFloat(h.marketValue)
        );
      }

      for (const target of targets) {
        const actualValue = sectorValues.get(target.assetClass) || 0;
        const actualPct = (actualValue / totalValue) * 100;
        const targetPct = parseFloat(target.targetAllocation);
        const drift = Math.abs(actualPct - targetPct);

        if (drift >= this.criticalDrift) {
          result.push({
            advisorId,
            clientId: client.id,
            type: "rebalance",
            severity: "critical",
            title: `Rebalance Required — ${client.firstName} ${client.lastName}`,
            message: `${target.assetClass}: Current ${actualPct.toFixed(1)}% vs Target ${targetPct.toFixed(1)}%. Drift: ${drift.toFixed(1)}%. Immediate rebalancing recommended.`,
            alertType: "rebalance",
            isRead: false,
          });
        } else if (drift >= this.warningDrift) {
          result.push({
            advisorId,
            clientId: client.id,
            type: "rebalance",
            severity: "warning",
            title: `Rebalance Recommended — ${client.firstName} ${client.lastName}`,
            message: `${target.assetClass}: Current ${actualPct.toFixed(1)}% vs Target ${targetPct.toFixed(1)}%. Drift: ${drift.toFixed(1)}%. Consider rebalancing to maintain risk profile.`,
            alertType: "rebalance",
            isRead: false,
          });
        }
      }
    }

    return result;
  }
}
