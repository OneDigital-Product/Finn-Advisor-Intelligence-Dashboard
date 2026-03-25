import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs, clients, investorProfiles, investorProfileVersions, investorProfileQuestionSchemas } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  storage, logger, AuditLogger, AuditEventType, profileCommitSchema,
} from "@server/routes/cassidy/shared";

interface AnswerAction {
  question_id: string;
  action: "accept" | "override" | "skip";
  custom_answer?: string;
  reasoning?: string;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = profileCommitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { job_id, client_id, profile_mode, answer_actions } = parsed.data;

    const client = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found or not authorized" }, { status: 403 });
    }

    const job = await storage.db
      .select()
      .from(cassidyJobs)
      .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job[0].taskType !== "investor_profile_draft") {
      return NextResponse.json({ error: "Job is not an investor profile draft" }, { status: 400 });
    }

    if (job[0].clientId !== client_id) {
      return NextResponse.json({ error: "Job client does not match the provided client_id" }, { status: 400 });
    }

    const rp = job[0].responsePayload as Record<string, unknown> | null;
    const rpOutput = rp?.output as Record<string, unknown> | undefined;
    const reqPayload = job[0].requestPayload as Record<string, unknown> | null;
    const reqInput = reqPayload?.input as Record<string, unknown> | undefined;
    const draftProfileMode = rpOutput?.profile_mode || reqInput?.profile_mode;
    if (draftProfileMode && draftProfileMode !== profile_mode) {
      return NextResponse.json({ error: "Profile mode does not match the draft" }, { status: 400 });
    }

    const draftQuestions = (rpOutput?.question_responses || []) as Array<Record<string, unknown>>;

    if (draftQuestions.length === 0) {
      return NextResponse.json({ error: "No draft questions found in job output" }, { status: 400 });
    }

    const answeredQuestions: Record<string, Record<string, unknown>> = {};
    let acceptedCount = 0;
    let overriddenCount = 0;
    let skippedCount = 0;

    for (const action of answer_actions as AnswerAction[]) {
      if (!action.question_id || !action.action) continue;

      if (action.action === "skip") {
        skippedCount++;
        continue;
      }

      const question = draftQuestions.find((q) => q.question_id === action.question_id);
      if (!question) continue;

      if (action.action === "accept") {
        answeredQuestions[action.question_id] = {
          question_text: question.question_text,
          answer: question.proposed_answer,
          source: "cassidy_draft",
          confidence: question.confidence,
        };
        acceptedCount++;
      } else if (action.action === "override") {
        if (!action.custom_answer) continue;
        answeredQuestions[action.question_id] = {
          question_text: question.question_text,
          answer: action.custom_answer,
          source: "advisor_override",
          reasoning: action.reasoning || null,
        };
        overriddenCount++;
      }
    }

    const questionSchema = await storage.db
      .select()
      .from(investorProfileQuestionSchemas)
      .where(
        and(
          eq(investorProfileQuestionSchemas.profileType, profile_mode),
          eq(investorProfileQuestionSchemas.isActive, true),
        ),
      )
      .limit(1);

    if (questionSchema.length === 0) {
      return NextResponse.json({ error: "No active question schema found for this profile type" }, { status: 400 });
    }

    let profile = await storage.db
      .select()
      .from(investorProfiles)
      .where(
        and(
          eq(investorProfiles.clientId, client_id),
          eq(investorProfiles.profileType, profile_mode),
        ),
      )
      .limit(1);

    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    let profileId: string;

    if (profile.length === 0) {
      const created = await storage.db
        .insert(investorProfiles)
        .values({
          clientId: client_id,
          profileType: profile_mode,
          status: "active",
          expirationDate,
          draftAnswers: {},
          createdBy: advisorId,
        })
        .returning();
      profileId = created[0].id;
    } else {
      profileId = profile[0].id;
      await storage.db
        .update(investorProfiles)
        .set({
          status: "active",
          expirationDate,
          updatedAt: new Date(),
        })
        .where(eq(investorProfiles.id, profileId));
    }

    const lastVersion = await storage.db
      .select()
      .from(investorProfileVersions)
      .where(eq(investorProfileVersions.profileId, profileId))
      .orderBy(desc(investorProfileVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = (lastVersion.length > 0 ? lastVersion[0].versionNumber : 0) + 1;

    const version = await storage.db
      .insert(investorProfileVersions)
      .values({
        profileId,
        versionNumber: nextVersionNumber,
        questionSchemaId: questionSchema[0].id,
        answers: answeredQuestions,
        submittedBy: advisorId,
        submittedAt: new Date(),
      })
      .returning();

    await storage.db
      .update(investorProfiles)
      .set({ currentVersionId: version[0].id, updatedAt: new Date() })
      .where(eq(investorProfiles.id, profileId));

    await AuditLogger.logEvent(job_id, AuditEventType.SYNTHESIS_COMPLETE, {
      advisor_id: advisorId,
      client_id,
      profile_mode,
      profile_id: profileId,
      version_number: nextVersionNumber,
      accepted: acceptedCount,
      overridden: overriddenCount,
      skipped: skippedCount,
      total_questions: answer_actions.length,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      { profileId, version: nextVersionNumber, accepted: acceptedCount, overridden: overriddenCount, skipped: skippedCount },
      "Profile committed successfully",
    );

    return NextResponse.json({
      status: "committed",
      investor_profile_id: profileId,
      version_number: nextVersionNumber,
      accepted: acceptedCount,
      overridden: overriddenCount,
      skipped: skippedCount,
    });
  } catch (err) {
    logger.error({ err }, "Error committing profile");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
