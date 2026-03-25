import { db } from "../../db";
import { clients, type InsertAlert } from "@shared/schema";
import { sql } from "drizzle-orm";

const MILESTONE_AGES = new Set([50, 60, 65, 70, 75, 80, 85, 90, 95, 100]);

export class BirthdayGenerator {
  async generate(advisorId: string): Promise<InsertAlert[]> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const allClients = await db
      .select()
      .from(clients)
      .where(sql`${clients.dateOfBirth} IS NOT NULL AND ${clients.advisorId} = ${advisorId}`);

    const result: InsertAlert[] = [];

    for (const client of allClients) {
      if (!client.dateOfBirth) continue;

      const dob = new Date(client.dateOfBirth);
      if (isNaN(dob.getTime())) continue;

      let birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate());
      if (birthdayThisYear < currentDate) {
        birthdayThisYear = new Date(currentYear + 1, dob.getMonth(), dob.getDate());
      }

      const daysUntil = Math.ceil(
        (birthdayThisYear.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil > 30 || daysUntil < 0) continue;

      const turningAge = birthdayThisYear.getFullYear() - dob.getFullYear();
      const isMilestone = MILESTONE_AGES.has(turningAge);

      result.push({
        advisorId,
        clientId: client.id,
        type: "birthday",
        severity: isMilestone ? "warning" : "info",
        title: isMilestone
          ? `Milestone Birthday — ${client.firstName} ${client.lastName}`
          : `Client Birthday — ${client.firstName} ${client.lastName}`,
        message: `${client.firstName} ${client.lastName} celebrates their ${turningAge}${turningAge === 1 ? "st" : turningAge === 2 ? "nd" : turningAge === 3 ? "rd" : "th"} birthday on ${birthdayThisYear.toLocaleDateString()}. ${isMilestone ? "This is a milestone birthday — consider special outreach." : "Consider personal outreach."}`,
        alertType: "birthday",
        isRead: false,
      });
    }

    return result;
  }
}
