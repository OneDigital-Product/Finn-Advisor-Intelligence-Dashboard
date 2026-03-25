import type { Express } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { getSessionAdvisor, requireAuth } from "./middleware";
import { storage } from "../storage";
import { db } from "../db";
import { factFinderDefinitions, factFinderResponses } from "@shared/schema";
import { calculateCompletionPercentage } from "../engines/fact-finder-renderer";
import { generateDiscoveryTalkingPoints, generateDiscoverySummary } from "../openai";

const createQuestionnaireSchema = z.object({
  name: z.string().min(1, "Name is required"),
  clientType: z.string().min(1, "Client type is required"),
  sections: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    questions: z.array(z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(["text", "textarea", "select", "multiselect", "number", "date", "boolean"]),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional(),
      conditionalOn: z.object({
        questionId: z.string(),
        value: z.string(),
      }).optional(),
      placeholder: z.string().optional(),
    })),
  })),
  isActive: z.boolean().optional(),
});

const updateQuestionnaireSchema = createQuestionnaireSchema.partial();

const createSessionSchema = z.object({
  clientId: z.string().nullable().optional(),
  questionnaireId: z.string().nullable().optional(),
  clientType: z.string().min(1, "Client type is required"),
  prospectName: z.string().nullable().optional(),
  prospectEmail: z.string().nullable().optional(),
});

const updateSessionSchema = z.object({
  questionnaireId: z.string().nullable().optional(),
  questionnaireResponses: z.record(z.unknown()).optional(),
  wizardResponses: z.record(z.unknown()).optional(),
  currentSection: z.number().optional(),
  status: z.string().optional(),
  prospectName: z.string().nullable().optional(),
  prospectEmail: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
});

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerDiscoveryRoutes(app: Express) {
  app.get("/api/discovery/questionnaires", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const clientType = req.query.clientType as string | undefined;
      let questionnaires;
      if (clientType) {
        questionnaires = await storage.getDiscoveryQuestionnairesByType(advisor.id, clientType);
      } else {
        questionnaires = await storage.getDiscoveryQuestionnaires(advisor.id);
      }
      res.json(questionnaires);
    } catch (err) {
      logger.error({ err }, "GET /api/discovery/questionnaires error");
      res.status(500).json({ message: "Failed to fetch questionnaires" });
    }
  });

  app.get("/api/discovery/questionnaires/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const questionnaire = await storage.getDiscoveryQuestionnaire(p(req.params.id));
      if (!questionnaire) return res.status(404).json({ message: "Questionnaire not found" });
      if (questionnaire.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      res.json(questionnaire);
    } catch (err) {
      logger.error({ err }, "GET /api/discovery/questionnaires/:id error");
      res.status(500).json({ message: "Failed to fetch questionnaire" });
    }
  });

  app.post("/api/discovery/questionnaires", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const body = validateBody(createQuestionnaireSchema, req, res);
      if (!body) return;
      const questionnaire = await storage.createDiscoveryQuestionnaire({
        advisorId: advisor.id,
        name: body.name,
        clientType: body.clientType,
        sections: body.sections,
        isActive: body.isActive ?? true,
      });
      res.status(201).json(questionnaire);
    } catch (err) {
      logger.error({ err }, "POST /api/discovery/questionnaires error");
      res.status(500).json({ message: "Failed to create questionnaire" });
    }
  });

  app.patch("/api/discovery/questionnaires/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const existing = await storage.getDiscoveryQuestionnaire(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Questionnaire not found" });
      if (existing.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      const body = validateBody(updateQuestionnaireSchema, req, res);
      if (!body) return;
      const questionnaire = await storage.updateDiscoveryQuestionnaire(p(req.params.id), body);
      if (!questionnaire) return res.status(404).json({ message: "Questionnaire not found" });
      res.json(questionnaire);
    } catch (err) {
      logger.error({ err }, "PATCH /api/discovery/questionnaires/:id error");
      res.status(500).json({ message: "Failed to update questionnaire" });
    }
  });

  app.delete("/api/discovery/questionnaires/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const existing = await storage.getDiscoveryQuestionnaire(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Questionnaire not found" });
      if (existing.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDiscoveryQuestionnaire(p(req.params.id));
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "DELETE /api/discovery/questionnaires/:id error");
      res.status(500).json({ message: "Failed to delete questionnaire" });
    }
  });

  app.get("/api/discovery/sessions", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const sessions = await storage.getDiscoverySessions(advisor.id);
      res.json(sessions);
    } catch (err) {
      logger.error({ err }, "GET /api/discovery/sessions error");
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/discovery/sessions/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const session = await storage.getDiscoverySession(p(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      res.json(session);
    } catch (err) {
      logger.error({ err }, "GET /api/discovery/sessions/:id error");
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.post("/api/discovery/sessions", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const body = validateBody(createSessionSchema, req, res);
      if (!body) return;
      if (body.clientId) {
        const client = await storage.getClient(body.clientId);
        if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized to use this client" });
      }
      if (body.questionnaireId) {
        const q = await storage.getDiscoveryQuestionnaire(body.questionnaireId);
        if (!q || q.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized to use this questionnaire" });
      }
      const session = await storage.createDiscoverySession({
        advisorId: advisor.id,
        clientId: body.clientId || null,
        questionnaireId: body.questionnaireId || null,
        clientType: body.clientType,
        prospectName: body.prospectName || null,
        prospectEmail: body.prospectEmail || null,
        status: "draft",
      });
      res.status(201).json(session);
    } catch (err) {
      logger.error({ err }, "POST /api/discovery/sessions error");
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.patch("/api/discovery/sessions/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const existing = await storage.getDiscoverySession(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Session not found" });
      if (existing.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      const body = validateBody(updateSessionSchema, req, res);
      if (!body) return;
      if (body.clientId) {
        const client = await storage.getClient(body.clientId);
        if (!client || client.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized to use this client" });
      }
      if (body.questionnaireId) {
        const q = await storage.getDiscoveryQuestionnaire(body.questionnaireId);
        if (!q || q.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized to use this questionnaire" });
      }
      const session = await storage.updateDiscoverySession(p(req.params.id), body);
      if (!session) return res.status(404).json({ message: "Session not found" });
      res.json(session);
    } catch (err) {
      logger.error({ err }, "PATCH /api/discovery/sessions/:id error");
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/discovery/sessions/:id", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const existing = await storage.getDiscoverySession(p(req.params.id));
      if (!existing) return res.status(404).json({ message: "Session not found" });
      if (existing.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteDiscoverySession(p(req.params.id));
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "DELETE /api/discovery/sessions/:id error");
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  app.post("/api/discovery/sessions/:id/talking-points", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const session = await storage.getDiscoverySession(p(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });

      const talkingPoints = await generateDiscoveryTalkingPoints({
        prospectName: session.prospectName || "Client",
        clientType: session.clientType,
        questionnaireResponses: (session.questionnaireResponses as Record<string, unknown>) || {},
        wizardResponses: (session.wizardResponses as Record<string, unknown>) || {},
      });

      await storage.updateDiscoverySession(session.id, { talkingPoints });
      res.json({ talkingPoints });
    } catch (err) {
      logger.error({ err }, "POST /api/discovery/sessions/:id/talking-points error");
      res.status(500).json({ message: "Failed to generate talking points" });
    }
  });

  app.post("/api/discovery/sessions/:id/summary", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const session = await storage.getDiscoverySession(p(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });

      const result = await generateDiscoverySummary({
        prospectName: session.prospectName || "Client",
        clientType: session.clientType,
        questionnaireResponses: (session.questionnaireResponses as Record<string, unknown>) || {},
        wizardResponses: (session.wizardResponses as Record<string, unknown>) || {},
      });

      await storage.updateDiscoverySession(session.id, {
        summary: result.summary,
        engagementPathway: result.engagementPathway,
        recommendedNextSteps: result.nextSteps,
        status: "completed",
      });

      res.json(result);
    } catch (err) {
      logger.error({ err }, "POST /api/discovery/sessions/:id/summary error");
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  app.post("/api/discovery/sessions/:id/create-client", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const session = await storage.getDiscoverySession(p(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });

      if (session.clientId) {
        return res.status(400).json({ message: "Client already created for this session" });
      }

      const qr = (session.questionnaireResponses || {}) as Record<string, string>;
      const wr = (session.wizardResponses || {}) as Record<string, string>;
      const nameParts = (session.prospectName || "New Client").split(" ");
      const firstName = nameParts[0] || "New";
      const lastName = nameParts.slice(1).join(" ") || "Client";

      const client = await storage.createClient({
        advisorId: advisor.id,
        firstName,
        lastName,
        email: session.prospectEmail || qr.email || null,
        phone: qr.phone || null,
        status: "prospect",
        segment: qr.estimatedAssets && parseInt(qr.estimatedAssets) > 1000000 ? "High Net Worth" : "Mass Affluent",
        riskTolerance: qr.riskTolerance || null,
        interests: qr.topPriorities || null,
        notes: session.summary || [
          `Discovery session completed on ${new Date().toLocaleDateString()}`,
          wr.background ? `Background: ${wr.background}` : '',
          wr.values ? `Values: ${wr.values}` : '',
          wr.goals ? `Goals: ${wr.goals}` : '',
          wr.risk ? `Risk: ${wr.risk}` : '',
        ].filter(Boolean).join('\n\n'),
      });

      await storage.updateDiscoverySession(session.id, { clientId: client.id });

      await storage.createActivity({
        advisorId: advisor.id,
        clientId: client.id,
        type: "meeting",
        subject: `Discovery meeting completed`,
        description: session.summary ? session.summary.substring(0, 500) : "Discovery session completed",
        date: new Date().toISOString().split("T")[0],
      });

      let factFinderResponseId: string | null = null;
      try {
        const [activeDefinition] = await db
          .select()
          .from(factFinderDefinitions)
          .where(eq(factFinderDefinitions.isActive, true))
          .limit(1);

        if (activeDefinition) {
          const discoveryAnswers: Record<string, string> = {};
          if (qr.firstName || firstName) discoveryAnswers["first_name"] = qr.firstName || firstName;
          if (qr.lastName || lastName) discoveryAnswers["last_name"] = qr.lastName || lastName;
          if (session.prospectEmail || qr.email) discoveryAnswers["email"] = session.prospectEmail || qr.email;
          if (qr.phone) discoveryAnswers["phone"] = qr.phone;
          if (qr.dateOfBirth) discoveryAnswers["date_of_birth"] = qr.dateOfBirth;
          if (qr.occupation) discoveryAnswers["occupation"] = qr.occupation;
          if (qr.employer) discoveryAnswers["employer"] = qr.employer;
          if (qr.maritalStatus) discoveryAnswers["marital_status"] = qr.maritalStatus;
          if (qr.annualIncome) discoveryAnswers["annual_income"] = qr.annualIncome;
          if (qr.estimatedAssets) discoveryAnswers["total_assets"] = qr.estimatedAssets;
          if (qr.riskTolerance) discoveryAnswers["risk_tolerance"] = qr.riskTolerance;
          if (qr.topPriorities) discoveryAnswers["financial_goals"] = qr.topPriorities;
          if (wr.background) discoveryAnswers["background_notes"] = wr.background;
          if (wr.financial) discoveryAnswers["financial_notes"] = wr.financial;
          if (wr.values) discoveryAnswers["values_notes"] = wr.values;
          if (wr.risk) discoveryAnswers["risk_notes"] = wr.risk;
          if (wr.goals) discoveryAnswers["goals_notes"] = wr.goals;
          if (wr.moneyStory) discoveryAnswers["money_story_notes"] = wr.moneyStory;

          const schema = activeDefinition.questionSchema as Array<{ questions: Array<{ id: string }> }>;
          const validQuestionIds = new Set<string>();
          if (Array.isArray(schema)) {
            for (const section of schema) {
              if (Array.isArray(section.questions)) {
                for (const q of section.questions) {
                  if (q.id) validQuestionIds.add(q.id);
                }
              }
            }
          }

          const matchedAnswers: Record<string, string> = {};
          for (const [key, value] of Object.entries(discoveryAnswers)) {
            if (validQuestionIds.has(key)) {
              matchedAnswers[key] = value;
            }
          }

          const completion = Object.keys(matchedAnswers).length > 0
            ? calculateCompletionPercentage(activeDefinition.questionSchema as any, matchedAnswers)
            : 0;

          const [ffResponse] = await db
            .insert(factFinderResponses)
            .values({
              definitionId: activeDefinition.id,
              clientId: client.id,
              advisorId: advisor.id,
              status: completion >= 100 ? "completed" : "draft",
              answers: matchedAnswers,
              completionPercentage: completion,
            })
            .returning();

          factFinderResponseId = ffResponse?.id || null;
        }
      } catch (ffErr) {
        logger.warn({ err: ffErr }, "Failed to auto-populate fact finder from discovery, continuing");
      }

      res.json({ client, factFinderResponseId });
    } catch (err) {
      logger.error({ err }, "POST /api/discovery/sessions/:id/create-client error");
      res.status(500).json({ message: "Failed to create client from discovery" });
    }
  });

  const sendQuestionnaireSchema = z.object({
    email: z.string().email("Valid email required"),
    message: z.string().optional(),
  });

  app.post("/api/discovery/sessions/:id/send-questionnaire", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const session = await storage.getDiscoverySession(p(req.params.id));
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.advisorId !== advisor.id) return res.status(403).json({ message: "Not authorized" });

      const body = validateBody(sendQuestionnaireSchema, req, res);
      if (!body) return;

      await storage.updateDiscoverySession(session.id, {
        prospectEmail: body.email,
        status: "questionnaire_sent",
      });

      await storage.createActivity({
        advisorId: advisor.id,
        clientId: session.clientId || null,
        type: "email",
        subject: `Discovery questionnaire sent to ${body.email}`,
        description: body.message || `Pre-meeting questionnaire sent for ${session.prospectName || 'prospect'}`,
        date: new Date().toISOString().split("T")[0],
      });

      logger.info({
        sessionId: session.id,
        recipientEmail: body.email,
        prospectName: session.prospectName,
        advisorId: advisor.id,
      }, "Discovery questionnaire sent (email delivery requires EMAIL_ENABLED=true)");

      res.json({
        success: true,
        message: `Questionnaire sent to ${body.email}`,
        sessionStatus: "questionnaire_sent",
      });
    } catch (err) {
      logger.error({ err }, "POST /api/discovery/sessions/:id/send-questionnaire error");
      res.status(500).json({ message: "Failed to send questionnaire" });
    }
  });

  app.get("/api/discovery/templates", requireAuth, async (_req, res) => {
    res.json(getDefaultQuestionnaireTemplates());
  });
}

function getDefaultQuestionnaireTemplates() {
  return [
    {
      name: "Individual Client Discovery",
      clientType: "individual",
      sections: [
        {
          title: "Personal Background",
          description: "Basic information about the prospect",
          questions: [
            { id: "occupation", label: "Current occupation", type: "text", required: true, placeholder: "e.g., Software Engineer" },
            { id: "employer", label: "Employer", type: "text", placeholder: "Company name" },
            { id: "maritalStatus", label: "Marital status", type: "select", options: ["Single", "Married", "Divorced", "Widowed", "Domestic Partnership"], required: true },
            { id: "dependents", label: "Number of dependents", type: "number", placeholder: "0" },
            { id: "referralSource", label: "How did you hear about us?", type: "text", placeholder: "Referral, online search, etc." },
          ],
        },
        {
          title: "Financial Snapshot",
          description: "High-level financial picture",
          questions: [
            { id: "estimatedAssets", label: "Estimated investable assets ($)", type: "number", required: true, placeholder: "500000" },
            { id: "annualIncome", label: "Estimated annual household income ($)", type: "number", placeholder: "150000" },
            { id: "hasRetirementAccounts", label: "Do you have retirement accounts (401k, IRA)?", type: "boolean" },
            { id: "hasExistingAdvisor", label: "Do you currently work with a financial advisor?", type: "boolean" },
            { id: "reasonForChange", label: "What prompted you to seek financial advice now?", type: "textarea", placeholder: "Life event, dissatisfaction, new goals..." },
          ],
        },
        {
          title: "Values & Priorities",
          description: "Understanding what matters most",
          questions: [
            { id: "topPriorities", label: "What are your top 3 financial priorities?", type: "textarea", required: true, placeholder: "e.g., Retirement planning, children's education, debt reduction" },
            { id: "financialConcerns", label: "What financial concerns keep you up at night?", type: "textarea", placeholder: "Market volatility, outliving savings, healthcare costs..." },
            { id: "philanthropic", label: "Is charitable giving important to you?", type: "boolean" },
          ],
        },
        {
          title: "Risk & Investment Experience",
          description: "Understanding investment comfort level",
          questions: [
            { id: "investmentExperience", label: "How would you describe your investment experience?", type: "select", options: ["Novice", "Some experience", "Experienced", "Very experienced"], required: true },
            { id: "riskTolerance", label: "Risk tolerance level", type: "select", options: ["Conservative", "Moderately Conservative", "Moderate", "Moderately Aggressive", "Aggressive"], required: true },
            { id: "marketReaction", label: "If your portfolio dropped 20%, what would you do?", type: "select", options: ["Sell everything", "Sell some positions", "Hold steady", "Buy more"] },
          ],
        },
      ],
    },
    {
      name: "Couple Discovery",
      clientType: "couple",
      sections: [
        {
          title: "Couple Background",
          description: "Information about both partners",
          questions: [
            { id: "partner1Name", label: "Partner 1 full name", type: "text", required: true },
            { id: "partner1Occupation", label: "Partner 1 occupation", type: "text" },
            { id: "partner2Name", label: "Partner 2 full name", type: "text", required: true },
            { id: "partner2Occupation", label: "Partner 2 occupation", type: "text" },
            { id: "yearsMarried", label: "Years married/together", type: "number" },
            { id: "dependents", label: "Number of children/dependents", type: "number" },
          ],
        },
        {
          title: "Combined Financial Picture",
          description: "Joint financial overview",
          questions: [
            { id: "combinedAssets", label: "Combined investable assets ($)", type: "number", required: true },
            { id: "combinedIncome", label: "Combined annual income ($)", type: "number" },
            { id: "financialDecisionMaking", label: "How do you make financial decisions?", type: "select", options: ["Jointly", "One partner leads", "We divide responsibilities", "We disagree often"] },
            { id: "estatePlanningStatus", label: "Do you have an estate plan (wills, trusts)?", type: "select", options: ["Yes, current", "Yes, but outdated", "No", "In progress"] },
          ],
        },
        {
          title: "Shared Values & Goals",
          description: "Aligned and individual goals",
          questions: [
            { id: "sharedGoals", label: "What are your shared financial goals?", type: "textarea", required: true },
            { id: "retirementVision", label: "What does retirement look like for you both?", type: "textarea" },
            { id: "conflictAreas", label: "Are there financial topics you disagree on?", type: "textarea" },
          ],
        },
      ],
    },
    {
      name: "Business Owner Discovery",
      clientType: "business_owner",
      sections: [
        {
          title: "Business Information",
          description: "Understanding the business",
          questions: [
            { id: "businessName", label: "Business name", type: "text", required: true },
            { id: "businessType", label: "Type of business", type: "select", options: ["Sole Proprietorship", "Partnership", "LLC", "S-Corp", "C-Corp", "Other"], required: true },
            { id: "yearsInBusiness", label: "Years in business", type: "number" },
            { id: "numberOfEmployees", label: "Number of employees", type: "number" },
            { id: "annualRevenue", label: "Approximate annual revenue ($)", type: "number" },
            { id: "successionPlan", label: "Do you have a succession plan?", type: "boolean" },
          ],
        },
        {
          title: "Personal & Business Finances",
          description: "Separating personal and business",
          questions: [
            { id: "personalAssets", label: "Personal investable assets (excluding business) ($)", type: "number", required: true },
            { id: "businessValuation", label: "Estimated business value ($)", type: "number" },
            { id: "retirementPlan", label: "Business retirement plan type", type: "select", options: ["None", "SEP-IRA", "SIMPLE IRA", "Solo 401k", "Traditional 401k", "Defined Benefit", "Other"] },
            { id: "exitTimeline", label: "When do you plan to exit or transition the business?", type: "select", options: ["1-3 years", "3-5 years", "5-10 years", "10+ years", "No plans to exit"] },
          ],
        },
        {
          title: "Goals & Concerns",
          description: "Business owner specific needs",
          questions: [
            { id: "topConcerns", label: "Top concerns as a business owner", type: "textarea", required: true },
            { id: "taxPlanning", label: "How important is tax planning to you?", type: "select", options: ["Critical", "Very important", "Somewhat important", "Not a priority"] },
            { id: "keyPersonInsurance", label: "Do you have key person insurance?", type: "boolean" },
            { id: "buyerSellAgreement", label: "Do you have a buy-sell agreement?", type: "boolean" },
          ],
        },
      ],
    },
    {
      name: "Inheritor Discovery",
      clientType: "inheritor",
      sections: [
        {
          title: "Inheritance Details",
          description: "Understanding the inheritance situation",
          questions: [
            { id: "inheritanceSource", label: "Relationship to the person who left the inheritance", type: "select", options: ["Parent", "Grandparent", "Spouse", "Other family", "Non-family"], required: true },
            { id: "inheritanceTimeline", label: "When did/will you receive the inheritance?", type: "select", options: ["Already received", "Within 6 months", "6-12 months", "1+ years", "Unknown"] },
            { id: "estimatedAmount", label: "Estimated inheritance amount ($)", type: "number", required: true },
            { id: "inheritanceTypes", label: "What forms does the inheritance take?", type: "textarea", placeholder: "Cash, real estate, investment accounts, business interests, etc." },
            { id: "hasEstateProfessionals", label: "Are you working with an estate attorney?", type: "boolean" },
          ],
        },
        {
          title: "Current Financial Situation",
          description: "Your existing financial picture",
          questions: [
            { id: "existingAssets", label: "Current investable assets (pre-inheritance) ($)", type: "number" },
            { id: "currentIncome", label: "Current annual income ($)", type: "number" },
            { id: "existingDebts", label: "Outstanding debts ($)", type: "number" },
            { id: "hasAdvisor", label: "Do you currently work with a financial advisor?", type: "boolean" },
          ],
        },
        {
          title: "Goals & Emotional Readiness",
          description: "Planning for inherited wealth",
          questions: [
            { id: "immediateNeeds", label: "Any immediate financial needs?", type: "textarea" },
            { id: "longTermGoals", label: "Long-term goals for this inheritance?", type: "textarea", required: true },
            { id: "comfortLevel", label: "How comfortable are you managing this amount?", type: "select", options: ["Very comfortable", "Somewhat comfortable", "Overwhelmed", "Need significant guidance"] },
            { id: "familyDynamics", label: "Are there family dynamics affecting decisions?", type: "textarea" },
          ],
        },
      ],
    },
  ];
}
