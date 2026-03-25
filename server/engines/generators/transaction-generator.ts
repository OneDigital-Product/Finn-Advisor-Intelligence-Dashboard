import { db } from "../../db";
import { transactions, accounts, clients, type InsertAlert } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class TransactionGenerator {
  private warningThreshold: number;
  private criticalThreshold: number;
  private lookbackDays: number;

  constructor(config?: { warningThreshold?: number; criticalThreshold?: number; lookbackDays?: number }) {
    this.warningThreshold = config?.warningThreshold ?? 100_000;
    this.criticalThreshold = config?.criticalThreshold ?? 500_000;
    this.lookbackDays = config?.lookbackDays ?? 7;
  }

  async generate(advisorId: string): Promise<InsertAlert[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.lookbackDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];

    const recentTx = await db
      .select({
        transaction: transactions,
        clientId: accounts.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(clients, eq(accounts.clientId, clients.id))
      .where(sql`${clients.advisorId} = ${advisorId} AND ${transactions.date} >= ${cutoffStr}`);

    const result: InsertAlert[] = [];

    for (const row of recentTx) {
      const amount = parseFloat(row.transaction.amount);
      if (isNaN(amount) || amount < this.warningThreshold) continue;

      const severity = amount >= this.criticalThreshold ? "critical" : "warning";

      result.push({
        advisorId,
        clientId: row.clientId,
        type: "transaction",
        severity,
        title: `Large Transaction — ${row.clientFirstName} ${row.clientLastName}`,
        message: `A ${row.transaction.type} of $${amount.toLocaleString()} was detected on ${row.transaction.date} for ${row.clientFirstName} ${row.clientLastName}. Verify client intent and assess impact on financial plan.`,
        alertType: "transaction",
        isRead: false,
      });
    }

    return result;
  }
}
