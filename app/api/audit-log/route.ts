import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || undefined;
    const entityType = url.searchParams.get("entityType") || undefined;
    const entityId = url.searchParams.get("entityId") || undefined;
    const startDate = url.searchParams.get("startDate") || undefined;
    const endDate = url.searchParams.get("endDate") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await storage.getAuditLog({
      action,
      entityType,
      entityId,
      advisorId: advisor.id,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      logs: result.logs,
      total: result.total,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch audit log") }, { status: 400 });
  }
}
