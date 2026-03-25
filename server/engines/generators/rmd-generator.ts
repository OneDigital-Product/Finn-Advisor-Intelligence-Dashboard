import { db } from "../../db";
import { clients, type InsertAlert } from "@shared/schema";
import { sql } from "drizzle-orm";

export class RmdGenerator {
  async generate(advisorId: string): Promise<InsertAlert[]> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const rmdAge = 73;

    const allClients = await db
      .select()
      .from(clients)
      .where(sql`${clients.dateOfBirth} IS NOT NULL AND ${clients.advisorId} = ${advisorId}`);

    const result: InsertAlert[] = [];

    for (const client of allClients) {
      if (!client.dateOfBirth) continue;

      const dob = new Date(client.dateOfBirth);
      if (isNaN(dob.getTime())) continue;

      const rmdBirthday = new Date(dob.getFullYear() + rmdAge, dob.getMonth(), dob.getDate());
      const daysUntilRmd = Math.ceil(
        (rmdBirthday.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilRmd <= 0 && daysUntilRmd > -365) {
        result.push({
          advisorId,
          clientId: client.id,
          type: "rmd",
          severity: "critical",
          title: `RMD Required — ${client.firstName} ${client.lastName}`,
          message: `Client is age ${rmdAge} this year. Verify RMD distribution is scheduled for this tax year. Birthday: ${rmdBirthday.toLocaleDateString()}.`,
          alertType: "rmd",
          isRead: false,
        });
      } else if (daysUntilRmd > 0 && daysUntilRmd <= 180) {
        result.push({
          advisorId,
          clientId: client.id,
          type: "rmd",
          severity: "warning",
          title: `RMD Planning Alert — ${client.firstName} ${client.lastName}`,
          message: `Client will reach RMD age (${rmdAge}) on ${rmdBirthday.toLocaleDateString()}. Schedule planning meeting to discuss Required Minimum Distributions.`,
          alertType: "rmd",
          isRead: false,
        });
      }
    }

    return result;
  }
}
