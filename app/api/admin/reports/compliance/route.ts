import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const [allClients, allCompliance] = await Promise.all([
      storage.getClients(advisor.id),
      storage.getComplianceItems(advisor.id),
    ]);

    const rows = allClients.map(c => {
      const items = allCompliance.filter(ci => ci.clientId === c.id);
      return {
        clientId: c.id,
        clientName: `${c.firstName} ${c.lastName}`,
        segment: c.segment,
        totalItems: items.length,
        current: items.filter(i => i.status === "current").length,
        expiringSoon: items.filter(i => i.status === "expiring_soon").length,
        overdue: items.filter(i => i.status === "overdue").length,
        pending: items.filter(i => i.status === "pending").length,
        items: items.map(i => ({
          type: i.type,
          status: i.status,
          dueDate: i.dueDate,
          description: i.description,
        })),
      };
    });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalItems: allCompliance.length,
        current: allCompliance.filter(c => c.status === "current").length,
        expiringSoon: allCompliance.filter(c => c.status === "expiring_soon").length,
        overdue: allCompliance.filter(c => c.status === "overdue").length,
        pending: allCompliance.filter(c => c.status === "pending").length,
      },
      clients: rows,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
