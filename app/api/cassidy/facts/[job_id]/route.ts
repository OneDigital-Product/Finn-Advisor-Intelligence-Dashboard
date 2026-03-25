import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, candidateFacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage, logger, isUUID } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
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
    const output = (rp?.output || {}) as Record<string, unknown>;
    const facts = (output.facts || []) as Array<Record<string, unknown>>;

    if (facts.length === 0) {
      return NextResponse.json({ error: "No facts found in job output" }, { status: 404 });
    }

    const existingFacts = await storage.db
      .select()
      .from(candidateFacts)
      .where(eq(candidateFacts.jobId, job_id));

    const existingByIndex = new Map<number, typeof existingFacts[0]>();
    existingFacts.forEach((ef, idx) => existingByIndex.set(idx, ef));

    const factsWithStatus = facts.map((fact, idx: number) => {
      const existing = existingByIndex.get(idx);
      return {
        ...fact,
        fact_index: idx,
        status: existing?.status || "pending",
      };
    });

    const pending = factsWithStatus.filter((f) => f.status === "pending").length;
    const approved = factsWithStatus.filter((f) => f.status === "approved" || f.status === "edited").length;
    const rejected = factsWithStatus.filter((f) => f.status === "rejected").length;

    return NextResponse.json({
      facts: factsWithStatus,
      total: facts.length,
      pending,
      approved,
      rejected,
      client_id: job[0].clientId,
      job_status: job[0].status,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching facts for review");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
