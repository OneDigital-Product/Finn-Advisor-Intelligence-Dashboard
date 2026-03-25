import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger, isUUID } from "@server/routes/cassidy/shared";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { jobId } = await params;
    const advisorId = auth.session.userId;

    if (!isUUID(jobId)) {
      return NextResponse.json({ error: "Invalid job_id format" }, { status: 400 });
    }

    const rows = await storage.db
      .select()
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, jobId), eq(cassidyJobs.advisorId, advisorId)))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = rows[0];
    const rp = job.responsePayload as Record<string, unknown> | null;
    const finResp = rp?.fin_response || rp?.finResponse || null;
    const errorMsg =
      job.status === "failed" || job.status === "timed_out"
        ? typeof rp?.error === "string"
          ? rp.error
          : job.status === "timed_out"
            ? "Request timed out. Please try again."
            : "Request failed. Please try again."
        : null;

    return NextResponse.json({
      job_id: jobId,
      status: job.status,
      task_type: job.taskType,
      client_id: job.clientId,
      output: rp?.output || finResp || null,
      fin_response: finResp,
      finResponse: finResp,
      error: errorMsg,
      called_agent: rp?.called_agent || null,
      calledMode: rp?.calledMode || rp?.called_mode || null,
      suggested_prompts: rp?.suggested_prompts || [],
      suggested_prompt_objects: rp?.suggested_prompt_objects || [],
      request_payload: job.requestPayload,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching single job");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
