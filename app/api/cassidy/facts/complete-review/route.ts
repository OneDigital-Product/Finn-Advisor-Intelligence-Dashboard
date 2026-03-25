import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, candidateFacts, type InsertCandidateFact } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import {
  storage, logger, AuditLogger, AuditEventType, completeFactReviewSchema,
} from "@server/routes/cassidy/shared";

interface FactReviewAction {
  fact_index: number;
  action: "approve" | "edit" | "reject";
  fact_value?: string;
  normalized_value?: string;
  editor_note?: string;
}

interface CassidyFactOutput {
  fact_type: string;
  fact_label: string;
  fact_value: string;
  normalized_value?: string | null;
  confidence: string;
  source_snippet?: string | null;
  source_reference?: string | null;
  ambiguity_flag?: boolean;
  review_required?: boolean;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = completeFactReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { job_id, actions } = parsed.data;

    const job = await storage.db
      .select()
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job[0].status === "facts_reviewed") {
      return NextResponse.json({ error: "Facts have already been reviewed for this job" }, { status: 409 });
    }

    const rp = job[0].responsePayload as Record<string, unknown> | null;
    const output = (rp?.output || {}) as Record<string, unknown>;
    const facts = (output.facts || []) as CassidyFactOutput[];

    if (facts.length === 0) {
      return NextResponse.json({ error: "No facts found in job output" }, { status: 400 });
    }

    const clientId = job[0].clientId;
    if (!clientId) {
      return NextResponse.json({ error: "Client ID not found in job" }, { status: 400 });
    }

    const seenIndices = new Set<number>();
    for (const action of actions as FactReviewAction[]) {
      if (action.fact_index === undefined || action.fact_index < 0 || action.fact_index >= facts.length) {
        return NextResponse.json({ error: `Invalid fact_index: ${action.fact_index}` }, { status: 400 });
      }
      if (seenIndices.has(action.fact_index)) {
        return NextResponse.json({ error: `Duplicate fact_index: ${action.fact_index}` }, { status: 400 });
      }
      seenIndices.add(action.fact_index);
      if (!["approve", "edit", "reject"].includes(action.action)) {
        return NextResponse.json({ error: `Invalid action: ${action.action}` }, { status: 400 });
      }
      if (action.action === "edit" && (!action.fact_value || !action.fact_value.trim())) {
        return NextResponse.json({ error: "Edited fact value cannot be empty" }, { status: 400 });
      }
    }

    if (actions.length !== facts.length) {
      return NextResponse.json({ error: "All facts must be reviewed before completing" }, { status: 400 });
    }

    const insertValues: InsertCandidateFact[] = [];
    let inserted = 0;
    let rejected = 0;

    for (const action of actions as FactReviewAction[]) {
      const fact = facts[action.fact_index];

      if (action.action === "reject") {
        rejected++;
        continue;
      }

      const isEdited = action.action === "edit";
      insertValues.push({
        jobId: job_id,
        clientId,
        factType: fact.fact_type,
        factLabel: fact.fact_label,
        factValue: isEdited ? action.fact_value! : fact.fact_value,
        normalizedValue: isEdited ? (action.normalized_value || fact.normalized_value) : fact.normalized_value,
        confidence: fact.confidence,
        sourceSnippet: fact.source_snippet || null,
        sourceReference: fact.source_reference || null,
        ambiguityFlag: fact.ambiguity_flag || false,
        originalReviewRequired: isEdited ? true : (fact.review_required || false),
        editorNote: isEdited ? action.editor_note || null : null,
        status: isEdited ? "edited" : "approved",
        reviewerId: advisorId,
        reviewedAt: new Date(),
      });
      inserted++;
    }

    if (insertValues.length > 0) {
      await storage.db.insert(candidateFacts).values(insertValues);
    }

    await storage.db
      .update(cassidyJobs)
      .set({
        status: "facts_reviewed",
        updatedAt: new Date(),
      })
      .where(eq(cassidyJobs.jobId, job_id));

    await AuditLogger.logEvent(job_id, AuditEventType.RESULT_RENDERED, {
      advisor_id: advisorId,
      action: "facts_reviewed",
      facts_approved: inserted,
      facts_rejected: rejected,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      status: "completed",
      inserted,
      rejected,
      job_id,
    });
  } catch (err) {
    logger.error({ err }, "Error completing fact review");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
