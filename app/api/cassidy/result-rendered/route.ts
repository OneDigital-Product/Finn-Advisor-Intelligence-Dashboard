import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger, AuditLogger, AuditEventType, resultRenderedSchema } from "@server/routes/cassidy/shared";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = resultRenderedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { job_id, viewed_tabs } = parsed.data;
    const advisorId = auth.session.userId;

    const job = await storage.db
      .select()
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
      .limit(1);

    if (job.length > 0) {
      await AuditLogger.logEvent(job_id, AuditEventType.RESULT_RENDERED, {
        advisor_id: advisorId,
        client_id: job[0].clientId,
        viewed_tabs: Array.isArray(viewed_tabs) ? viewed_tabs : [viewed_tabs],
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ status: "logged" });
  } catch (err) {
    logger.error({ err }, "Failed to log result rendered");
    return NextResponse.json({ error: "Logging failed" }, { status: 500 });
  }
}
