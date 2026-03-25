import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getChainStats } from "@server/integrations/cassidy/chain-executor";
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

    const stats = await getChainStats(jobId);
    return NextResponse.json({ job_id: jobId, ...stats });
  } catch (err) {
    logger.error({ err }, "Get chain stats error");
    return NextResponse.json({ error: "Failed to get chain stats" }, { status: 500 });
  }
}
