import type { Express, Request, Response } from "express";
import { cassidyJobs, candidateFacts, clients, households, investorProfiles, investorProfileVersions, investorProfileQuestionSchemas, type InsertCandidateFact } from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import crypto from "crypto";
import {
  storage, logger, requireAuth, rateLimiter, isUUID,
  AuditLogger, AuditEventType, timeoutManager, dispatchCassidyJob,
  validateBody, submitProfileDraftSchema, profileCommitSchema, completeFactReviewSchema,
} from "./shared";

interface FactReviewAction {
  fact_index: number;
  action: "approve" | "edit" | "reject";
  fact_value?: string;
  normalized_value?: string;
  editor_note?: string;
}

interface AnswerAction {
  question_id: string;
  action: "accept" | "override" | "skip";
  custom_answer?: string;
  reasoning?: string;
}

export function registerFactsRoutes(app: Express) {
  app.get("/api/cassidy/facts/approved/:client_id", requireAuth, async (req: Request, res: Response) => {
    try {
      const client_id = req.params.client_id as string;
      const advisorId = req.session.userId!;

      const client = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (client.length === 0) {
        res.status(404).json({ error: "Client not found or not authorized" });
        return;
      }

      const approvedFacts = await storage.db
        .select()
        .from(candidateFacts)
        .where(
          and(
            eq(candidateFacts.clientId, client_id),
            inArray(candidateFacts.status, ["approved", "edited"]),
          ),
        );

      const highCount = approvedFacts.filter((f) => f.confidence === "HIGH").length;
      const mediumCount = approvedFacts.filter((f) => f.confidence === "MEDIUM").length;
      const lowCount = approvedFacts.filter((f) => f.confidence === "LOW").length;

      res.json({
        count: approvedFacts.length,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        facts: approvedFacts,
      });
    } catch (err) {
      logger.error({ err }, "Error fetching approved facts");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/cassidy/submit-profile-draft", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;

      const limitCheck = rateLimiter.checkLimit(advisorId);
      if (!limitCheck.allowed) {
        res.status(429).json({ error: "Rate limit exceeded", retry_after_seconds: limitCheck.retryAfterSeconds, limit_type: limitCheck.limitType });
        return;
      }

      const body = validateBody(submitProfileDraftSchema, req, res);
      if (!body) return;
      const { client_id, household_id, profile_mode } = body;

      const client = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (client.length === 0) {
        res.status(403).json({ error: "Client not found or not authorized" });
        return;
      }

      if (household_id) {
        const hh = await storage.db
          .select()
          .from(households)
          .where(and(eq(households.id, household_id), eq(households.advisorId, advisorId)))
          .limit(1);
        if (hh.length === 0) {
          res.status(403).json({ error: "Household not found or not authorized" });
          return;
        }
      }

      const approvedFacts = await storage.db
        .select()
        .from(candidateFacts)
        .where(
          and(
            eq(candidateFacts.clientId, client_id),
            inArray(candidateFacts.status, ["approved", "edited"]),
          ),
        );

      if (approvedFacts.length === 0) {
        res.status(400).json({ error: "No approved facts found. Please complete the review process first." });
        return;
      }

      const job_id = crypto.randomUUID();
      const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `${req.protocol}://${req.get("host")}/api/cassidy/callback`;

      const payload = {
        job_id,
        task_type: "investor_profile_draft",
        callback_url: callbackBaseUrl,
        input: {
          job_id,
          client_id,
          household_id: household_id || null,
          advisor_id: advisorId,
          profile_mode,
          approved_facts: approvedFacts.map((f) => ({
            fact_type: f.factType,
            fact_label: f.factLabel,
            fact_value: f.factValue,
            normalized_value: f.normalizedValue,
            confidence: f.confidence,
            source_snippet: f.sourceSnippet,
          })),
        },
        agent: {
          name: "investor_profile_agent",
          version: "1.0",
        },
      };

      await storage.db.insert(cassidyJobs).values({
        jobId: job_id,
        advisorId,
        clientId: client_id,
        householdId: household_id || null,
        taskType: "investor_profile_draft",
        status: "pending",
        requestPayload: payload,
      });

      timeoutManager.startTimeout(job_id);

      await AuditLogger.logEvent(job_id, AuditEventType.REQUEST_SENT, {
        advisor_id: advisorId,
        client_id,
        household_id: household_id || null,
        task_type: "investor_profile_draft",
        profile_mode,
        approved_facts_count: approvedFacts.length,
        source: "dashboard",
        timestamp: new Date().toISOString(),
      });

      await dispatchCassidyJob(job_id, payload, "Cassidy profile draft");

      res.status(202).json({
        job_id,
        status: "accepted",
        approved_facts_count: approvedFacts.length,
        estimated_wait_ms: 8000,
      });
    } catch (err) {
      logger.error({ err }, "Error creating profile draft request");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/cassidy/profile-diff/:client_id/:profile_type", requireAuth, async (req: Request, res: Response) => {
    try {
      const client_id = req.params.client_id as string;
      const profile_type = req.params.profile_type as string;
      const advisorId = req.session.userId!;

      const client = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (client.length === 0) {
        res.status(404).json({ error: "Client not found or not authorized" });
        return;
      }

      const profile = await storage.db
        .select()
        .from(investorProfiles)
        .where(
          and(
            eq(investorProfiles.clientId, client_id),
            eq(investorProfiles.profileType, profile_type),
          ),
        )
        .limit(1);

      if (profile.length === 0) {
        res.json({ answered_questions: {} });
        return;
      }

      const latestVersion = await storage.db
        .select()
        .from(investorProfileVersions)
        .where(eq(investorProfileVersions.profileId, profile[0].id))
        .orderBy(desc(investorProfileVersions.versionNumber))
        .limit(1);

      if (latestVersion.length === 0) {
        res.json({ answered_questions: {} });
        return;
      }

      res.json({
        version_number: latestVersion[0].versionNumber,
        answered_questions: latestVersion[0].answers || {},
      });
    } catch (err) {
      logger.error({ err }, "Error fetching profile diff");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/cassidy/profile-commit", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;

      const body = validateBody(profileCommitSchema, req, res);
      if (!body) return;
      const { job_id, client_id, profile_mode, answer_actions } = body;

      const client = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (client.length === 0) {
        res.status(403).json({ error: "Client not found or not authorized" });
        return;
      }

      const job = await storage.db
        .select()
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
        .limit(1);

      if (job.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      if (job[0].taskType !== "investor_profile_draft") {
        res.status(400).json({ error: "Job is not an investor profile draft" });
        return;
      }

      if (job[0].clientId !== client_id) {
        res.status(400).json({ error: "Job client does not match the provided client_id" });
        return;
      }

      const rp = job[0].responsePayload as Record<string, unknown> | null;
      const rpOutput = rp?.output as Record<string, unknown> | undefined;
      const reqPayload = job[0].requestPayload as Record<string, unknown> | null;
      const reqInput = reqPayload?.input as Record<string, unknown> | undefined;
      const draftProfileMode = rpOutput?.profile_mode || reqInput?.profile_mode;
      if (draftProfileMode && draftProfileMode !== profile_mode) {
        res.status(400).json({ error: "Profile mode does not match the draft" });
        return;
      }

      const draftQuestions = (rpOutput?.question_responses || []) as Array<Record<string, unknown>>;

      if (draftQuestions.length === 0) {
        res.status(400).json({ error: "No draft questions found in job output" });
        return;
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
        res.status(400).json({ error: "No active question schema found for this profile type" });
        return;
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

      res.json({
        status: "committed",
        investor_profile_id: profileId,
        version_number: nextVersionNumber,
        accepted: acceptedCount,
        overridden: overriddenCount,
        skipped: skippedCount,
      });
    } catch (err) {
      logger.error({ err }, "Error committing profile");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/cassidy/facts/:job_id", requireAuth, async (req: Request, res: Response) => {
    try {
      const job_id = req.params.job_id as string;
      const advisorId = req.session.userId!;

      if (!isUUID(job_id)) {
        res.status(400).json({ error: "Invalid job_id format" });
        return;
      }

      const job = await storage.db
        .select()
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
        .limit(1);

      if (job.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const rp = job[0].responsePayload as Record<string, unknown> | null;
      const output = (rp?.output || {}) as Record<string, unknown>;
      const facts = (output.facts || []) as Array<Record<string, unknown>>;

      if (facts.length === 0) {
        res.status(404).json({ error: "No facts found in job output" });
        return;
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

      res.json({
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
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/cassidy/facts/complete-review", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;

      const body = validateBody(completeFactReviewSchema, req, res);
      if (!body) return;
      const { job_id, actions } = body;

      const job = await storage.db
        .select()
        .from(cassidyJobs)
        .where(and(eq(cassidyJobs.jobId, job_id), eq(cassidyJobs.advisorId, advisorId)))
        .limit(1);

      if (job.length === 0) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      if (job[0].status === "facts_reviewed") {
        res.status(409).json({ error: "Facts have already been reviewed for this job" });
        return;
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

      const rp = job[0].responsePayload as Record<string, unknown> | null;
      const output = (rp?.output || {}) as Record<string, unknown>;
      const facts = (output.facts || []) as CassidyFactOutput[];

      if (facts.length === 0) {
        res.status(400).json({ error: "No facts found in job output" });
        return;
      }

      const clientId = job[0].clientId;
      if (!clientId) {
        res.status(400).json({ error: "Client ID not found in job" });
        return;
      }

      const seenIndices = new Set<number>();
      for (const action of actions as FactReviewAction[]) {
        if (action.fact_index === undefined || action.fact_index < 0 || action.fact_index >= facts.length) {
          res.status(400).json({ error: `Invalid fact_index: ${action.fact_index}` });
          return;
        }
        if (seenIndices.has(action.fact_index)) {
          res.status(400).json({ error: `Duplicate fact_index: ${action.fact_index}` });
          return;
        }
        seenIndices.add(action.fact_index);
        if (!["approve", "edit", "reject"].includes(action.action)) {
          res.status(400).json({ error: `Invalid action: ${action.action}` });
          return;
        }
        if (action.action === "edit" && (!action.fact_value || !action.fact_value.trim())) {
          res.status(400).json({ error: "Edited fact value cannot be empty" });
          return;
        }
      }

      if (actions.length !== facts.length) {
        res.status(400).json({ error: "All facts must be reviewed before completing" });
        return;
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

      res.json({
        status: "completed",
        inserted,
        rejected,
        job_id,
      });
    } catch (err) {
      logger.error({ err }, "Error completing fact review");
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
