import type { Express, Request, Response } from "express";
import { cassidyJobs, clients, detectedSignals, signalActions, meetings, accounts, holdings, lifeEvents, documentChecklist } from "@shared/schema";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import * as investorProfileHandler from "../../integrations/cassidy/handlers/investor-profile-handler";
import * as factFinderHandler from "../../integrations/cassidy/handlers/fact-finder-handler";
import * as taskHandler from "../../integrations/cassidy/handlers/task-handler";
import * as alertHandler from "../../integrations/cassidy/handlers/alert-handler";
import * as beneficiaryHandler from "../../integrations/cassidy/handlers/beneficiary-audit-handler";
import * as triageHandler from "../../integrations/cassidy/handlers/planning-triage-handler";
import crypto from "crypto";
import {
  storage, logger, requireAuth,
  AuditLogger, AuditEventType, timeoutManager, dispatchCassidyJob,
  validateBody, scanSignalsSchema, updateSignalStatusSchema, signalActionSchema,
} from "./shared";
import { sseEventBus } from "../../lib/sse-event-bus";

interface SignalRecord {
  recommendedActions?: unknown;
  actionHistory?: unknown;
  [key: string]: unknown;
}

interface RecommendedAction {
  action_type?: string;
  [key: string]: unknown;
}

interface SignalActionHandler {
  validate: (signal: SignalRecord, advisorId: string) => Promise<{ valid: boolean; error?: string }>;
  execute: (signal: SignalRecord, advisorId: string) => Promise<{ success: boolean; error?: string; [key: string]: unknown }>;
}

export function registerSignalsRoutes(app: Express) {
  app.post("/api/cassidy/scan-signals", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const body = validateBody(scanSignalsSchema, req, res);
      if (!body) return;
      const { meetingId, clientId } = body;

      const [meeting] = await storage.db
        .select()
        .from(meetings)
        .where(and(eq(meetings.id, meetingId), eq(meetings.advisorId, advisorId)))
        .limit(1);

      if (!meeting) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }

      if (meeting.clientId !== clientId) {
        res.status(400).json({ error: "Meeting does not belong to the specified client" });
        return;
      }

      if (!meeting.transcriptRaw && !meeting.transcriptSummary && !meeting.notes) {
        res.status(400).json({ error: "Meeting must have a transcript, summary, or notes to scan for signals" });
        return;
      }

      const [client] = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const priorSignals = await storage.db
        .select()
        .from(detectedSignals)
        .where(and(
          eq(detectedSignals.clientId, clientId),
          eq(detectedSignals.advisorId, advisorId),
          gte(detectedSignals.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        ));

      const job_id = crypto.randomUUID();
      const callbackBaseUrl = process.env.CALLBACK_BASE_URL || `${req.protocol}://${req.get("host")}/api/cassidy/callback`;

      const payload = {
        advisor_request: "Scan meeting for life events, material changes, and workflow triggers",
        conversation_id: crypto.randomUUID(),
        advisor_name: "Advisor",
        session_id: crypto.randomUUID(),
        source: "dashboard",
        client_id: clientId,
        task_type: "signal_detection",
        timestamp: new Date().toISOString(),
        callback_url: callbackBaseUrl,
        job_id,
        client_context: {},
        metadata: { meetingId, clientId, advisorId },
        input: {
          meeting_id: meetingId,
          client_id: clientId,
          advisor_id: advisorId,
          transcript_text: meeting.transcriptRaw || null,
          meeting_summary: meeting.transcriptSummary || null,
          meeting_notes: meeting.notes || null,
          prior_signals: priorSignals.map((s) => ({
            signal_type: s.signalType,
            detected_date: s.createdAt?.toISOString(),
            status: s.status,
          })),
        },
      };

      await storage.db.insert(cassidyJobs).values({
        jobId: job_id,
        advisorId,
        clientId,
        taskType: "signal_detection",
        status: "pending",
        requestPayload: payload,
      });

      timeoutManager.startTimeout(job_id);

      await AuditLogger.logEvent(job_id, AuditEventType.REQUEST_SENT, {
        advisor_id: advisorId,
        client_id: clientId,
        task_type: "signal_detection",
        meeting_id: meetingId,
        timestamp: new Date().toISOString(),
      });

      await dispatchCassidyJob(job_id, payload, "Signal detection");

      logger.info({ jobId: job_id, meetingId, clientId }, "Signal detection scan initiated");
      res.status(202).json({ job_id, status: "scanning" });
    } catch (err) {
      logger.error({ err }, "Error initiating signal scan");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/cassidy/signals/:meetingId", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const meetingId = req.params.meetingId as string;
      const filter = (req.query.filter as string) || "all";

      const conditions = [
        eq(detectedSignals.meetingId, meetingId),
        eq(detectedSignals.advisorId, advisorId),
      ];

      if (filter !== "all") {
        conditions.push(eq(detectedSignals.status, filter));
      }

      const signals = await storage.db
        .select()
        .from(detectedSignals)
        .where(and(...conditions))
        .orderBy(
          sql`CASE WHEN ${detectedSignals.materiality} = 'CRITICAL' THEN 0 ELSE 1 END`,
          sql`CASE ${detectedSignals.confidence} WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END`,
          desc(detectedSignals.createdAt)
        );

      res.json({ signals });
    } catch (err) {
      logger.error({ err }, "Error retrieving signals");
      res.status(500).json({ error: "Failed to retrieve signals" });
    }
  });

  app.get("/api/cassidy/signals/client/:clientId", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const clientId = req.params.clientId as string;
      const days = parseInt((req.query.days as string) || "30");
      const filter = (req.query.filter as string) || "all";

      const conditions = [
        eq(detectedSignals.clientId, clientId),
        eq(detectedSignals.advisorId, advisorId),
        gte(detectedSignals.createdAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
      ];

      if (filter !== "all") {
        conditions.push(eq(detectedSignals.status, filter));
      }

      const signals = await storage.db
        .select()
        .from(detectedSignals)
        .where(and(...conditions))
        .orderBy(
          sql`CASE WHEN ${detectedSignals.materiality} = 'CRITICAL' THEN 0 ELSE 1 END`,
          desc(detectedSignals.createdAt)
        );

      res.json({ signals });
    } catch (err) {
      logger.error({ err }, "Error retrieving client signals");
      res.status(500).json({ error: "Failed to retrieve signals" });
    }
  });

  app.post("/api/cassidy/signals/client/:clientId/scan", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const clientId = req.params.clientId as string;

      const [client] = await storage.db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.advisorId, advisorId)))
        .limit(1);

      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }

      const existingSignals = await storage.db
        .select()
        .from(detectedSignals)
        .where(and(
          eq(detectedSignals.clientId, clientId),
          eq(detectedSignals.advisorId, advisorId),
        ));

      const existingTypes = new Set(
        existingSignals
          .filter((s) => s.status !== "dismissed")
          .map((s) => s.signalType)
      );

      const actionedTypes = new Set(
        existingSignals
          .filter((s) => s.status === "actioned")
          .map((s) => s.signalType)
      );

      for (const t of actionedTypes) {
        existingTypes.add(t);
      }

      const clientAccounts = await storage.db
        .select()
        .from(accounts)
        .where(eq(accounts.clientId, clientId));

      const accountIds = clientAccounts.map((a) => a.id);
      let clientHoldings: any[] = [];
      if (accountIds.length > 0) {
        clientHoldings = await storage.db
          .select()
          .from(holdings)
          .where(inArray(holdings.accountId, accountIds));
      }

      const clientLifeEvents = await storage.db
        .select()
        .from(lifeEvents)
        .where(eq(lifeEvents.clientId, clientId));

      const clientDocChecklist = await storage.db
        .select()
        .from(documentChecklist)
        .where(eq(documentChecklist.clientId, clientId));

      const VALID_SIGNAL_TYPES = new Set([
        "retirement", "divorce", "death", "business_sale", "business_acquisition",
        "liquidity_event", "concentrated_stock", "marriage", "birth", "relocation",
        "beneficiary_change", "trust_estate_change", "employment_change",
        "insurance_need", "legal_entity_change",
      ]);

      const LIFE_EVENT_TO_SIGNAL: Record<string, string> = {
        retirement: "retirement",
        divorce: "divorce",
        death: "death",
        marriage: "marriage",
        birth: "birth",
        baby: "birth",
        relocation: "relocation",
        move: "relocation",
        moving: "relocation",
        employment: "employment_change",
        job_change: "employment_change",
        job: "employment_change",
        promotion: "employment_change",
        career: "employment_change",
        business_sale: "business_sale",
        business_acquisition: "business_acquisition",
        inheritance: "liquidity_event",
        windfall: "liquidity_event",
        ipo: "liquidity_event",
        trust: "trust_estate_change",
        estate: "trust_estate_change",
        will: "trust_estate_change",
        beneficiary: "beneficiary_change",
        insurance: "insurance_need",
        legal: "legal_entity_change",
        llc: "legal_entity_change",
        corporation: "legal_entity_change",
      };

      const newSignals: Array<{
        clientId: string;
        advisorId: string;
        signalType: string;
        description: string;
        confidence: string;
        materiality: string;
        sourceSnippet: string | null;
        dateReference: string | null;
        recommendedActions: any[];
        status: string;
        reviewRequired: boolean;
        reasoning: string;
      }> = [];

      const totalPortfolioValue = clientHoldings.reduce(
        (sum, h) => sum + parseFloat(h.marketValue || "0"), 0
      );

      if (totalPortfolioValue > 0) {
        const holdingsByTicker: Record<string, number> = {};
        for (const h of clientHoldings) {
          const key = h.ticker;
          holdingsByTicker[key] = (holdingsByTicker[key] || 0) + parseFloat(h.marketValue || "0");
        }
        for (const [ticker, value] of Object.entries(holdingsByTicker)) {
          const concentration = value / totalPortfolioValue;
          if (concentration >= 0.25 && !existingTypes.has("concentrated_stock")) {
            newSignals.push({
              clientId,
              advisorId,
              signalType: "concentrated_stock",
              description: `${ticker} represents ${(concentration * 100).toFixed(1)}% of portfolio — concentration risk detected`,
              confidence: concentration >= 0.4 ? "HIGH" : "MEDIUM",
              materiality: concentration >= 0.4 ? "CRITICAL" : "IMPORTANT",
              sourceSnippet: `${ticker}: $${value.toLocaleString()} of $${totalPortfolioValue.toLocaleString()} total`,
              dateReference: null,
              recommendedActions: [
                { action_type: "notify_advisor", description: "Alert advisor about concentration" },
                { action_type: "trigger_planning_triage", description: "Review diversification options" },
              ],
              status: "pending",
              reviewRequired: true,
              reasoning: `Holding ${ticker} exceeds 25% portfolio concentration threshold at ${(concentration * 100).toFixed(1)}%.`,
            });
            existingTypes.add("concentrated_stock");
          }
        }
      }

      if (client.dateOfBirth) {
        const dob = new Date(client.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear() -
          (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

        if (age >= 72 && !existingTypes.has("retirement")) {
          const hasTraditionalIRA = clientAccounts.some((a) =>
            a.accountType?.toLowerCase().includes("ira") || a.accountType?.toLowerCase().includes("traditional")
          );
          if (hasTraditionalIRA) {
            newSignals.push({
              clientId,
              advisorId,
              signalType: "retirement",
              description: `Client is ${age} years old — Required Minimum Distribution (RMD) review needed`,
              confidence: "HIGH",
              materiality: "CRITICAL",
              sourceSnippet: `DOB: ${client.dateOfBirth}, Age: ${age}`,
              dateReference: `Age ${age}, RMD applies at 73+`,
              recommendedActions: [
                { action_type: "trigger_planning_triage", description: "Run RMD calculator" },
                { action_type: "create_follow_up_task", description: "Create RMD review task" },
              ],
              status: "pending",
              reviewRequired: false,
              reasoning: `Client age ${age} exceeds RMD threshold (73). Traditional/IRA accounts detected.`,
            });
            existingTypes.add("retirement");
          }
        }
      }

      const beneficiaryAccounts = clientAccounts.filter((a) => {
        const type = (a.accountType || "").toLowerCase();
        return type.includes("ira") || type.includes("401k") || type.includes("retirement")
          || type.includes("trust") || type.includes("life") || type.includes("annuity");
      });

      if (beneficiaryAccounts.length > 0 && !existingTypes.has("beneficiary_change")) {
        const hasBeneficiaryDocs = clientDocChecklist.some((d) => {
          const name = (d.documentName || "").toLowerCase();
          const cat = (d.category || "").toLowerCase();
          return (name.includes("beneficiary") || cat.includes("beneficiary")) && d.received;
        });

        if (!hasBeneficiaryDocs) {
          newSignals.push({
            clientId,
            advisorId,
            signalType: "beneficiary_change",
            description: `${beneficiaryAccounts.length} account(s) may have missing or outdated beneficiary designations`,
            confidence: "MEDIUM",
            materiality: "CRITICAL",
            sourceSnippet: `Accounts: ${beneficiaryAccounts.map((a) => a.accountType).join(", ")}`,
            dateReference: null,
            recommendedActions: [
              { action_type: "run_beneficiary_audit", description: "Run beneficiary audit" },
              { action_type: "create_follow_up_task", description: "Create beneficiary review task" },
            ],
            status: "pending",
            reviewRequired: true,
            reasoning: `${beneficiaryAccounts.length} beneficiary-eligible account(s) found without confirmed beneficiary designation documents on file.`,
          });
          existingTypes.add("beneficiary_change");
        }
      }

      const ESTATE_DOC_CHECKS = [
        { name: "Will / Last Testament", keyword: "will", reviewYears: 3 },
        { name: "Trust Documents", keyword: "trust", reviewYears: 5 },
        { name: "Power of Attorney", keyword: "power of attorney", reviewYears: 3 },
        { name: "Healthcare Directive", keyword: "healthcare", reviewYears: 3 },
        { name: "Beneficiary Designations", keyword: "beneficiary", reviewYears: 2 },
      ];

      const estateDocItems = clientDocChecklist.filter((d) =>
        (d.category || "").toLowerCase() === "estate planning"
      );

      if (!existingTypes.has("trust_estate_change")) {
        const missingDocs: string[] = [];
        const staleDocs: string[] = [];

        for (const check of ESTATE_DOC_CHECKS) {
          const match = estateDocItems.find((d) =>
            (d.documentName || "").toLowerCase().includes(check.keyword)
          );
          if (!match || !match.received) {
            missingDocs.push(check.name);
          } else if (match.receivedDate) {
            const reviewDate = new Date(match.receivedDate);
            const expiryDate = new Date(reviewDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + check.reviewYears);
            if (new Date() > expiryDate) {
              staleDocs.push(`${check.name} (last: ${match.receivedDate})`);
            }
          }
        }

        if (missingDocs.length > 0 || staleDocs.length > 0) {
          const parts: string[] = [];
          if (missingDocs.length > 0) parts.push(`Missing: ${missingDocs.join(", ")}`);
          if (staleDocs.length > 0) parts.push(`Overdue review: ${staleDocs.join(", ")}`);

          newSignals.push({
            clientId,
            advisorId,
            signalType: "trust_estate_change",
            description: `Estate document gaps detected — ${missingDocs.length} missing, ${staleDocs.length} overdue for review`,
            confidence: missingDocs.length >= 2 ? "HIGH" : "MEDIUM",
            materiality: missingDocs.length >= 2 ? "CRITICAL" : "IMPORTANT",
            sourceSnippet: parts.join("; "),
            dateReference: null,
            recommendedActions: [
              { action_type: "create_follow_up_task", description: "Create estate document review task" },
              { action_type: "notify_advisor", description: "Alert advisor about missing estate documents" },
            ],
            status: "pending",
            reviewRequired: true,
            reasoning: `Estate planning document checklist review found ${missingDocs.length} missing document(s) and ${staleDocs.length} document(s) overdue for review. ${parts.join(". ")}.`,
          });
          existingTypes.add("trust_estate_change");
        }
      }

      const isProfileOutdated = (() => {
        const missingFields: string[] = [];
        if (!client.dateOfBirth) missingFields.push("date of birth");
        if (!client.riskTolerance) missingFields.push("risk tolerance");
        if (!client.address && !client.city && !client.state) missingFields.push("address");
        if (!client.phone) missingFields.push("phone");
        if (!client.occupation) missingFields.push("occupation");

        const lastContactStr = client.lastContactDate;
        const staleContact = lastContactStr
          ? new Date(lastContactStr) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          : false;

        return { missingFields, staleContact };
      })();

      if (
        (isProfileOutdated.missingFields.length >= 2 || isProfileOutdated.staleContact) &&
        !existingTypes.has("insurance_need")
      ) {
        const reasons: string[] = [];
        if (isProfileOutdated.missingFields.length > 0) {
          reasons.push(`Missing: ${isProfileOutdated.missingFields.join(", ")}`);
        }
        if (isProfileOutdated.staleContact) {
          reasons.push(`Last contact over 1 year ago (${client.lastContactDate})`);
        }

        newSignals.push({
          clientId,
          advisorId,
          signalType: "insurance_need",
          description: `Profile gaps may affect insurance and planning accuracy — ${isProfileOutdated.missingFields.length} field(s) missing${isProfileOutdated.staleContact ? ", last contact >1 year ago" : ""}`,
          confidence: isProfileOutdated.missingFields.length >= 3 ? "HIGH" : "MEDIUM",
          materiality: "IMPORTANT",
          sourceSnippet: reasons.join("; "),
          dateReference: client.lastContactDate || null,
          recommendedActions: [
            { action_type: "refresh_investor_profile", description: "Update investor profile" },
            { action_type: "create_follow_up_task", description: "Schedule profile review" },
          ],
          status: "pending",
          reviewRequired: false,
          reasoning: `Incomplete or stale client profile data impacts insurance analysis and planning recommendations. ${reasons.join(". ")}.`,
        });
        existingTypes.add("insurance_need");
      }

      const recentLifeEvents = clientLifeEvents.filter((e) => {
        const eventDate = new Date(e.eventDate);
        return eventDate >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      });

      for (const event of recentLifeEvents) {
        const rawType = event.eventType.toLowerCase().replace(/\s+/g, "_");
        let mappedType = LIFE_EVENT_TO_SIGNAL[rawType];

        if (!mappedType) {
          for (const [keyword, signalType] of Object.entries(LIFE_EVENT_TO_SIGNAL)) {
            if (rawType.includes(keyword)) {
              mappedType = signalType;
              break;
            }
          }
        }

        if (!mappedType || !VALID_SIGNAL_TYPES.has(mappedType)) continue;
        if (existingTypes.has(mappedType)) continue;

        const isCritical = ["divorce", "death", "business_sale"].includes(mappedType);
        newSignals.push({
          clientId,
          advisorId,
          signalType: mappedType,
          description: `Life event detected: ${event.description}`,
          confidence: "HIGH",
          materiality: isCritical ? "CRITICAL" : "IMPORTANT",
          sourceSnippet: null,
          dateReference: event.eventDate,
          recommendedActions: [
            { action_type: "create_follow_up_task", description: "Create follow-up task" },
            { action_type: "notify_advisor", description: "Send alert" },
          ],
          status: "pending",
          reviewRequired: true,
          reasoning: `Recent life event (${event.eventType}) on ${event.eventDate} may require planning adjustments.`,
        });
        existingTypes.add(mappedType);
      }

      let insertedCount = 0;
      if (newSignals.length > 0) {
        await storage.db.insert(detectedSignals).values(newSignals);
        insertedCount = newSignals.length;
        logger.info({ clientId, signalCount: insertedCount }, "Proactive scan: new signals detected and stored");
      }

      sseEventBus.publishToUser(advisorId, "signals:proactive_scan_complete", {
        clientId,
        newSignalCount: insertedCount,
        totalActiveCount: existingSignals.filter((s) => s.status === "pending").length + insertedCount,
      });

      res.json({
        scanned: true,
        newSignals: insertedCount,
        totalExisting: existingSignals.length,
      });
    } catch (err) {
      logger.error({ err }, "Error running proactive signal scan");
      res.status(500).json({ error: "Failed to run proactive scan" });
    }
  });

  app.patch("/api/cassidy/signals/:signalId", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const signalId = req.params.signalId as string;
      const body = validateBody(updateSignalStatusSchema, req, res);
      if (!body) return;
      const { status } = body;

      const [existing] = await storage.db
        .select()
        .from(detectedSignals)
        .where(and(eq(detectedSignals.id, signalId), eq(detectedSignals.advisorId, advisorId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Signal not found" });
        return;
      }

      const [updated] = await storage.db
        .update(detectedSignals)
        .set({ status, updatedAt: new Date() })
        .where(eq(detectedSignals.id, signalId))
        .returning();

      res.json({ signal: updated });
    } catch (err) {
      logger.error({ err }, "Error updating signal");
      res.status(500).json({ error: "Failed to update signal" });
    }
  });

  const signalActionHandlers: Record<string, SignalActionHandler> = {
    refresh_investor_profile: investorProfileHandler,
    launch_retirement_fact_finder: factFinderHandler.retirementFinder,
    launch_business_owner_fact_finder: factFinderHandler.businessOwnerFinder,
    run_beneficiary_audit: beneficiaryHandler,
    notify_advisor: alertHandler,
    create_follow_up_task: taskHandler,
    trigger_planning_triage: triageHandler,
  };

  app.post("/api/cassidy/signals/:signalId/action", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const signalId = req.params.signalId as string;
      const body = validateBody(signalActionSchema, req, res);
      if (!body) return;
      const { action_type } = body;

      const [signal] = await storage.db
        .select()
        .from(detectedSignals)
        .where(and(eq(detectedSignals.id, signalId), eq(detectedSignals.advisorId, advisorId)))
        .limit(1);

      if (!signal) {
        res.status(404).json({ error: "Signal not found" });
        return;
      }

      const recommendedActions = Array.isArray(signal.recommendedActions) ? (signal.recommendedActions as RecommendedAction[]) : [];
      const isValidAction = recommendedActions.some(
        (action) => action && action.action_type === action_type
      );

      if (!isValidAction) {
        res.status(400).json({
          error: "This action is not recommended for this signal",
          valid_actions: recommendedActions.filter((a) => a?.action_type).map((a) => a.action_type),
        });
        return;
      }

      const handler = signalActionHandlers[action_type];
      if (!handler) {
        res.status(400).json({ error: `Unknown action type: ${action_type}` });
        return;
      }

      const validation = await handler.validate(signal, advisorId);
      if (!validation.valid) {
        res.status(400).json({
          error: validation.error || "Precondition not met for this action",
        });
        return;
      }

      const actionId = crypto.randomUUID();
      await storage.db.insert(signalActions).values({
        id: actionId,
        signalId: signalId,
        advisorId: advisorId,
        actionType: action_type,
        actionTimestamp: new Date(),
        actionStatus: "pending",
        actionResult: null,
      });

      let result: { success: boolean; error?: string; [key: string]: unknown };
      try {
        result = await handler.execute(signal, advisorId);
      } catch (err) {
        logger.error({ err, action_type, signalId }, "Signal action handler error");
        result = {
          success: false,
          error: "Failed to initiate workflow. Try again.",
        };
      }

      await storage.db
        .update(signalActions)
        .set({
          actionStatus: result.success ? "success" : "failed",
          actionResult: result,
          updatedAt: new Date(),
        })
        .where(eq(signalActions.id, actionId));

      if (result.success) {
        const currentHistory = (signal.actionHistory as Array<Record<string, unknown>>) || [];
        currentHistory.push({
          action_type,
          timestamp: new Date().toISOString(),
          status: "success",
          result,
        });

        await storage.db
          .update(detectedSignals)
          .set({
            status: "actioned",
            actionTakenAt: new Date(),
            actionMetadata: result,
            actionHistory: currentHistory,
            updatedAt: new Date(),
          })
          .where(eq(detectedSignals.id, signalId));
      }

      const statusCode = result.success ? 200 : 500;
      res.status(statusCode).json(result);
    } catch (err) {
      logger.error({ err }, "Signal action error");
      res.status(500).json({ error: "System error processing action" });
    }
  });

  app.get("/api/cassidy/signals/:signalId/actions", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisorId = req.session.userId!;
      const signalId = req.params.signalId as string;

      const [signal] = await storage.db
        .select()
        .from(detectedSignals)
        .where(and(eq(detectedSignals.id, signalId), eq(detectedSignals.advisorId, advisorId)))
        .limit(1);

      if (!signal) {
        res.status(404).json({ error: "Signal not found" });
        return;
      }

      const actions = await storage.db
        .select()
        .from(signalActions)
        .where(eq(signalActions.signalId, signalId))
        .orderBy(desc(signalActions.createdAt));

      res.json({ actions });
    } catch (err) {
      logger.error({ err }, "Get signal actions error");
      res.status(500).json({ error: "Failed to retrieve actions" });
    }
  });
}
