import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger, isUUID } from "@server/routes/cassidy/shared";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ job_id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { job_id } = await params;
    const advisorId = auth.session.userId;

    if (!isUUID(job_id)) {
      return NextResponse.json({ error: "Invalid job_id format" }, { status: 400 });
    }

    const job = await storage.db
      .select()
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const rp = job[0].responsePayload as Record<string, unknown> | null;
    return NextResponse.json({
      job_id,
      status: job[0].status,
      task_type: job[0].taskType,
      client_id: job[0].clientId,
      output: rp?.output || null,
      request_payload: job[0].requestPayload,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching job output");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
