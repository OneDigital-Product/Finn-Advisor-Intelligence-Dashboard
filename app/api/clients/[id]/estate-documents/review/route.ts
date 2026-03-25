import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { candidateFacts } from "@shared/schema";
import type { InsertCandidateFact } from "@shared/schema";
import { analysisCache } from "../analyze/route";

const reviewEstateFactSchema = z.object({
  analysisId: z.string().uuid("analysisId must be a valid UUID"),
  actions: z.array(z.object({
    factIndex: z.number().int().min(0),
    action: z.enum(["approve", "edit", "reject"]),
    factValue: z.string().optional(),
    editorNote: z.string().optional(),
  })),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    const advisorId = auth.session.userId!;

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const raw = await request.json();
    const parsed = reviewEstateFactSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    }

    const { analysisId, actions } = parsed.data;

    const cached = analysisCache.get(analysisId);
    if (!cached) {
      return NextResponse.json({ error: "Analysis not found or expired. Please re-analyze the document." }, { status: 404 });
    }

    if (cached.clientId !== clientId || cached.advisorId !== advisorId) {
      return NextResponse.json({ error: "Analysis does not belong to this client/advisor" }, { status: 403 });
    }

    const serverFacts = cached.facts;

    const insertValues: InsertCandidateFact[] = [];
    let approvedCount = 0;
    let editedCount = 0;
    let rejectedCount = 0;

    for (const action of actions) {
      const fact = serverFacts[action.factIndex];
      if (!fact) continue;

      if (action.action === "reject") {
        rejectedCount++;
        continue;
      }

      const status = action.action === "edit" ? "edited" : "approved";
      if (action.action === "approve") approvedCount++;
      if (action.action === "edit") editedCount++;

      insertValues.push({
        jobId: analysisId,
        clientId,
        factType: fact.factType,
        factLabel: fact.factLabel,
        factValue: action.action === "edit" && action.factValue ? action.factValue : fact.factValue,
        normalizedValue: fact.normalizedValue || null,
        confidence: fact.confidence,
        sourceSnippet: fact.sourceSnippet || null,
        sourceReference: fact.sourceReference || null,
        ambiguityFlag: fact.ambiguityFlag || false,
        originalReviewRequired: false,
        editorNote: action.editorNote || null,
        status,
        reviewerId: advisorId,
        reviewedAt: new Date(),
      });
    }

    if (insertValues.length > 0) {
      await storage.db.insert(candidateFacts).values(insertValues);
    }

    analysisCache.delete(analysisId);

    logger.info({
      analysisId,
      clientId,
      approved: approvedCount,
      edited: editedCount,
      rejected: rejectedCount,
    }, "Estate document facts reviewed");

    return NextResponse.json({
      status: "reviewed",
      analysisId,
      approved: approvedCount,
      edited: editedCount,
      rejected: rejectedCount,
      totalCommitted: insertValues.length,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Error reviewing estate document facts");
    return NextResponse.json({ error: "Failed to review estate document facts" }, { status: 500 });
  }
}
