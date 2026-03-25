import { db } from "../../db";
import { clients, accounts, type InsertAlert } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class ContactCadenceGenerator {
  async generate(advisorId: string): Promise<InsertAlert[]> {
    const allClients = await db
      .select()
      .from(clients)
      .where(eq(clients.advisorId, advisorId));

    const result: InsertAlert[] = [];

    for (const client of allClients) {
      if (!client.lastContactDate) continue;

      const lastContact = new Date(client.lastContactDate);
      if (isNaN(lastContact.getTime())) continue;

      const daysSinceContact = Math.floor(
        (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
      );

      const clientAccounts = await db
        .select({ balance: accounts.balance })
        .from(accounts)
        .where(eq(accounts.clientId, client.id));

      const totalAum = clientAccounts.reduce(
        (sum, a) => sum + parseFloat(a.balance),
        0
      );

      let expectedDays: number;
      let severity: "info" | "warning" | "critical";

      if (totalAum >= 5_000_000) {
        expectedDays = 30;
        severity = daysSinceContact > 45 ? "critical" : "warning";
      } else if (totalAum >= 1_000_000) {
        expectedDays = 90;
        severity = daysSinceContact > 120 ? "warning" : "info";
      } else {
        expectedDays = 180;
        severity = "info";
      }

      if (daysSinceContact > expectedDays) {
        result.push({
          advisorId,
          clientId: client.id,
          type: "contact_cadence",
          severity,
          title: `Engagement Alert — ${client.firstName} ${client.lastName}`,
          message: `Last contact was ${daysSinceContact} days ago (AUM: $${totalAum.toLocaleString()}). Expected contact every ${expectedDays} days. Schedule check-in to maintain relationship.`,
          alertType: "contact_cadence",
          isRead: false,
        });
      }
    }

    return result;
  }
}
