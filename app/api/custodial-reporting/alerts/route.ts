import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { clients } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    if (!advisorId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const alerts: any[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const allClients = await db
      .select()
      .from(clients)
      .where(and(eq(clients.advisorId, advisorId), sql`${clients.dateOfBirth} IS NOT NULL`));

    for (const client of allClients) {
      if (!client.dateOfBirth) continue;
      const dob = new Date(client.dateOfBirth);
      if (isNaN(dob.getTime())) continue;
      const age = currentYear - dob.getFullYear();
      if (age < 73) continue;

      if (currentMonth >= 9) {
        alerts.push({
          type: "rmd_deadline",
          severity: currentMonth >= 11 ? "critical" : "warning",
          title: `RMD Deadline Approaching — ${client.firstName} ${client.lastName}`,
          message: `Year-end RMD deadline is December 31, ${currentYear}. Verify distribution has been scheduled.`,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          dueDate: `${currentYear}-12-31`,
        });
      }
    }

    const openNigos = await storage.getNigoRecords(advisorId, "open");
    for (const nigo of openNigos) {
      if ((nigo.aging || 0) > 14) {
        const client = await storage.getClient(nigo.clientId);
        alerts.push({
          type: "aging_nigo",
          severity: (nigo.aging || 0) > 30 ? "critical" : "warning",
          title: `Aging NIGO — ${nigo.custodian}`,
          message: `NIGO for ${client ? `${client.firstName} ${client.lastName}` : "unknown client"} has been open for ${nigo.aging} days. Reason: ${nigo.reasonCode}.`,
          clientId: nigo.clientId,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
          nigoId: nigo.id,
          aging: nigo.aging,
        });
      }
    }

    alerts.sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });

    return NextResponse.json(alerts);
  } catch (err) {
    logger.error({ err }, "Error fetching custodial alerts");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
