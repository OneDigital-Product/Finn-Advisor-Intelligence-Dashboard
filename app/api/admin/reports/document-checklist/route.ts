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
    const allClients = await storage.getClients(advisor.id);

    const rows = await Promise.all(
      allClients.map(async (c) => {
        const checklist = await storage.getDocumentChecklist(c.id);
        const totalItems = checklist.length;
        const receivedCount = checklist.filter(ci => ci.received).length;
        const requiredItems = checklist.filter(ci => ci.required);
        const requiredReceived = requiredItems.filter(ci => ci.received).length;

        return {
          clientId: c.id,
          clientName: `${c.firstName} ${c.lastName}`,
          segment: c.segment,
          totalItems,
          receivedCount,
          completionPct: totalItems > 0 ? Math.round((receivedCount / totalItems) * 100) : 0,
          requiredTotal: requiredItems.length,
          requiredReceived,
          requiredCompletionPct: requiredItems.length > 0 ? Math.round((requiredReceived / requiredItems.length) * 100) : 0,
          hasChecklist: totalItems > 0,
        };
      })
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totalClients: rows.length,
      clientsWithChecklist: rows.filter(r => r.hasChecklist).length,
      avgCompletion: rows.filter(r => r.hasChecklist).reduce((s, r) => s + r.completionPct, 0) / (rows.filter(r => r.hasChecklist).length || 1),
      clients: rows,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
