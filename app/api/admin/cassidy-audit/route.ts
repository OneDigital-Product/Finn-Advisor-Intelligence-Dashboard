import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger, AuditLogger } from "@server/routes/cassidy/shared";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const userType = auth.session.userType;
    if (userType !== "advisor") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const advisorId = auth.session.userId;
    const url = new URL(request.url);
    const job_id = url.searchParams.get("job_id") || undefined;
    const event_type = url.searchParams.get("event_type") || undefined;
    const start_date = url.searchParams.get("start_date");
    const end_date = url.searchParams.get("end_date");
    const limit = url.searchParams.get("limit") || "100";

    const results = await AuditLogger.searchAuditLogs({
      advisorId,
      jobId: job_id,
      eventType: event_type && event_type !== "all" ? event_type : undefined,
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
      limit: parseInt(limit, 10) || 100,
    });

    return NextResponse.json(results);
  } catch (err) {
    logger.error({ err }, "Error searching audit logs");
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
