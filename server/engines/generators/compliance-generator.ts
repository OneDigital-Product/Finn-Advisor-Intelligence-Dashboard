import { db } from "../../db";
import { complianceItems, clients, type InsertAlert } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export class ComplianceGenerator {
  async generate(advisorId: string): Promise<InsertAlert[]> {
    const items = await db
      .select({
        item: complianceItems,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(complianceItems)
      .innerJoin(clients, eq(complianceItems.clientId, clients.id))
      .where(
        and(
          eq(complianceItems.advisorId, advisorId),
          sql`${complianceItems.status} != 'completed'`,
          sql`${complianceItems.dueDate} IS NOT NULL`
        )
      );

    const result: InsertAlert[] = [];
    const now = new Date();

    for (const row of items) {
      if (!row.item.dueDate) continue;

      const dueDate = new Date(row.item.dueDate);
      if (isNaN(dueDate.getTime())) continue;

      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue < 0) {
        result.push({
          advisorId,
          clientId: row.item.clientId,
          type: "compliance",
          severity: "critical",
          title: `Compliance Overdue — ${row.item.description}`,
          message: `Compliance item "${row.item.description}" for ${row.clientFirstName} ${row.clientLastName} was due ${Math.abs(daysUntilDue)} days ago. Status: ${row.item.status}. Immediate action required.`,
          alertType: "compliance",
          isRead: false,
        });
      } else if (daysUntilDue <= 14) {
        result.push({
          advisorId,
          clientId: row.item.clientId,
          type: "compliance",
          severity: "critical",
          title: `Compliance Deadline — ${row.item.description}`,
          message: `Compliance item "${row.item.description}" for ${row.clientFirstName} ${row.clientLastName} is due in ${daysUntilDue} days (${dueDate.toLocaleDateString()}). Status: ${row.item.status}. Ensure completion before cutoff.`,
          alertType: "compliance",
          isRead: false,
        });
      } else if (daysUntilDue <= 30) {
        result.push({
          advisorId,
          clientId: row.item.clientId,
          type: "compliance",
          severity: "warning",
          title: `Compliance Upcoming — ${row.item.description}`,
          message: `Compliance item "${row.item.description}" for ${row.clientFirstName} ${row.clientLastName} is due in ${daysUntilDue} days (${dueDate.toLocaleDateString()}). Status: ${row.item.status}.`,
          alertType: "compliance",
          isRead: false,
        });
      }
    }

    return result;
  }
}
