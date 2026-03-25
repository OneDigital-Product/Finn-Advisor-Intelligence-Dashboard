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
    const startDate = url.searchParams.get("startDate") || undefined;
    const endDate = url.searchParams.get("endDate") || undefined;
    const clientId = url.searchParams.get("clientId") || undefined;

    const summary = await storage.getActivitySummary(advisor.id, { startDate, endDate, clientId });
    const total = Object.values(summary).reduce((sum: number, count: any) => sum + count, 0);

    return NextResponse.json({ success: true, summary, total, period: { startDate, endDate } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch activity summary") }, { status: 400 });
  }
}
