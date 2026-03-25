import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { buildTraceTimeline } from "@server/integrations/cassidy/trace-builder";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { jobId } = await params;
    const advisorId = auth.session.userId;

    const jobCheck = await storage.db
      .select({ id: cassidyJobs.id })
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, jobId), eq(cassidyJobs.advisorId, advisorId)))
      .then((r) => r[0]);

    if (!jobCheck) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const timeline = await buildTraceTimeline(jobId);
    return NextResponse.json({ job_id: jobId, ...timeline });
  } catch (err: unknown) {
    logger.error({ err }, "Build trace error");
    if ((err as Error).message?.includes("not found")) {
      return NextResponse.json({ error: sanitizeErrorMessage(err, "Job not found") }, { status: 404 });
    }
    return NextResponse.json({ error: sanitizeErrorMessage(err, "Failed to build trace") }, { status: 500 });
  }
}
