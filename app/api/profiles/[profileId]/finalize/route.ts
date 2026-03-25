import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { AuditLogger } from "@server/integrations/cassidy/audit-logger";
import { z } from "zod";
import type { InvestorProfileQuestionSchema } from "@shared/schema";

const finalizeAnswersBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

function validateAnswers(answers: Record<string, any>, schema: InvestorProfileQuestionSchema, entityType?: string | null): string | null {
  const allQuestions = Array.isArray(schema.questions) ? schema.questions : [];
  const questions = allQuestions.filter((question: any) => {
    if (!question.entityTypes) return true;
    return entityType && question.entityTypes.includes(entityType);
  });

  for (const question of questions) {
    const q = question as any;
    const value = answers[q.id];
    if (q.required && (value === undefined || value === null || value === "")) {
      return `Question "${q.label}" is required`;
    }
    if (value !== undefined && value !== null && q.validationRules) {
      const rules = q.validationRules as any;
      if (rules.minLength && typeof value === "string" && value.length < rules.minLength) {
        return `"${q.label}" must be at least ${rules.minLength} characters`;
      }
      if (rules.min !== undefined && typeof value === "number" && value < rules.min) {
        return `"${q.label}" must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && typeof value === "number" && value > rules.max) {
        return `"${q.label}" must be at most ${rules.max}`;
      }
    }
  }
  return null;
}

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  if (session.userType === "associate") {
    const assignedClients = await storage.getClientsByAssociate(session.userId);
    return assignedClients.some((c: any) => c.id === clientId);
  }
  const client = await storage.getClient(clientId);
  return !!client && client.advisorId === session.userId;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { profileId } = await params;
    const body = await request.json();
    const parsed = finalizeAnswersBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

    const profile = await storage.getInvestorProfile(profileId);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!(await verifyClientAccess(auth.session, profile.clientId)))
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const schemas = await storage.getActiveQuestionSchemas(profile.profileType);
    if (schemas.length === 0)
      return NextResponse.json({ error: "No active schema for profile type" }, { status: 400 });

    const latestSchema = schemas[0];
    const validationError = validateAnswers(parsed.data.answers as Record<string, any>, latestSchema, profile.entityType);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const existingVersions = await storage.getProfileVersions(profileId);
    const versionNumber = existingVersions.length + 1;

    const version = await storage.createProfileVersion({
      profileId,
      versionNumber,
      questionSchemaId: latestSchema.id,
      answers: parsed.data.answers,
      submittedBy: auth.session.userEmail || "unknown",
      submittedAt: new Date(),
    });

    await storage.updateInvestorProfile(profileId, {
      status: "finalized",
      currentVersionId: version.id,
      draftAnswers: {},
    });

    await AuditLogger.logEvent(profileId, "profile_finalized", {
      profile_id: profileId,
      client_id: profile.clientId,
      version_id: version.id,
      version_number: versionNumber,
      schema_id: latestSchema.id,
      finalized_by: auth.session.userEmail || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      profileId,
      versionId: version.id,
      versionNumber,
      status: "finalized",
      submittedAt: version.submittedAt,
      submittedBy: version.submittedBy,
    }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "POST /api/profiles/:profileId/finalize error");
    return NextResponse.json({ error: "Failed to finalize profile" }, { status: 500 });
  }
}
