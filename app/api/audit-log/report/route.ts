import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const { startDate, endDate, entityTypes, actions } = await request.json();

    const result = await storage.getAuditLog({
      startDate,
      endDate,
      advisorId: advisor.id,
      limit: 10000,
    });

    let logs = result.logs;

    if (entityTypes && entityTypes.length > 0) {
      logs = logs.filter((l: any) => entityTypes.includes(l.entityType));
    }
    if (actions && actions.length > 0) {
      logs = logs.filter((l: any) => actions.includes(l.action));
    }

    const actionsByType: Record<string, number> = {};
    const actionsByEntity: Record<string, number> = {};
    for (const log of logs) {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      actionsByEntity[log.entityType] = (actionsByEntity[log.entityType] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      report: {
        generatedAt: new Date(),
        period: { startDate, endDate },
        totalActions: logs.length,
        actionsByType,
        actionsByEntity,
        logs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to generate audit report") }, { status: 400 });
  }
}
