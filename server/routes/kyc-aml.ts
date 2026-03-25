import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import {
  calculateRiskRating,
  calculateNextReviewDate,
  getReviewFrequencyMonths,
  screenAgainstWatchlists,
  getRequiredEddDocuments,
  performCompositeScreening,
  parseOfacSdnCsvLine,
} from "../engines/kyc-risk-engine";

const DEFAULT_SCREENING_CONFIG = {
  ofacEnabled: true,
  pepEnabled: true,
  internalWatchlistEnabled: true,
  nameMatchThreshold: 85,
  autoResolveThreshold: 65,
  highConfidenceThreshold: 90,
  rescreeningFrequencyDays: 90,
};

async function getOrCreateScreeningConfig(advisorId: string) {
  let config = await storage.getScreeningConfig(advisorId);
  if (!config) {
    config = await storage.createScreeningConfig({
      advisorId,
      ...DEFAULT_SCREENING_CONFIG,
    });
  }
  return config;
}

async function runAutomatedScreening(clientId: string, advisorId: string, advisorName: string) {
  const client = await storage.getClient(clientId);
  if (!client) return null;

  const config = await getOrCreateScreeningConfig(advisorId);
  const [ofacEntries, pepEntries] = await Promise.all([
    storage.getAllOfacSdnEntries(),
    storage.getAllPepEntries(),
  ]);

  const screeningResult = performCompositeScreening(
    client.firstName,
    client.lastName,
    ofacEntries,
    pepEntries,
    {
      ofacEnabled: config.ofacEnabled,
      pepEnabled: config.pepEnabled,
      internalWatchlistEnabled: config.internalWatchlistEnabled,
      nameMatchThreshold: config.nameMatchThreshold,
      autoResolveThreshold: config.autoResolveThreshold,
      highConfidenceThreshold: config.highConfidenceThreshold,
    }
  );

  const results = [];

  if (screeningResult.matches.length === 0 && screeningResult.autoResolved.length === 0) {
    const result = await storage.createAmlScreeningResult({
      clientId: client.id,
      advisorId,
      screeningType: "automated_composite",
      watchlistName: "OFAC/PEP/Internal",
      matchStatus: "clear",
      matchConfidence: 0,
      matchDetails: { screenedLists: ["OFAC SDN", "PEP Database", "Internal Watchlist"] },
      screenedBy: "System (Automated)",
    });
    results.push(result);
  }

  for (const match of screeningResult.autoResolved) {
    const result = await storage.createAmlScreeningResult({
      clientId: client.id,
      advisorId,
      screeningType: "automated_composite",
      watchlistName: match.watchlistName,
      matchStatus: "false_positive",
      matchConfidence: match.matchConfidence,
      matchDetails: match.matchDetails,
      screenedBy: "System (Automated)",
      resolution: "auto_resolved",
      resolvedBy: "System (Auto-resolve)",
      resolvedAt: new Date().toISOString().split("T")[0],
      notes: `Auto-resolved: confidence ${match.matchConfidence}% below threshold ${config.autoResolveThreshold}%`,
    });
    results.push(result);
  }

  for (const match of screeningResult.matches) {
    const matchStatus = match.matchConfidence >= config.highConfidenceThreshold
      ? "potential_match"
      : "potential_match";
    const result = await storage.createAmlScreeningResult({
      clientId: client.id,
      advisorId,
      screeningType: "automated_composite",
      watchlistName: match.watchlistName,
      matchStatus,
      matchConfidence: match.matchConfidence,
      matchDetails: match.matchDetails,
      screenedBy: "System (Automated)",
    });
    results.push(result);
  }

  const watchlists = ["Internal Watchlist"];
  if (config.ofacEnabled) watchlists.push("OFAC SDN List");
  if (config.pepEnabled) watchlists.push("PEP Database");

  await storage.createKycAuditLog({
    clientId: client.id,
    advisorId,
    action: "automated_screening_completed",
    entityType: "aml_screening",
    details: {
      matchesFound: screeningResult.matches.length,
      autoResolved: screeningResult.autoResolved.length,
      highestConfidence: screeningResult.highestConfidence,
      requiresManualReview: screeningResult.requiresManualReview,
      watchlists,
      screeningRiskScore: screeningResult.screeningRiskScore,
    },
    performedBy: "System (Automated)",
  });

  if (screeningResult.requiresManualReview) {
    const eddDocs = getRequiredEddDocuments("OFAC/SDN screening match");
    await storage.createEddRecord({
      clientId: client.id,
      advisorId,
      triggerReason: `Automated screening: High-confidence match detected (${screeningResult.highestConfidence}% confidence)`,
      status: "pending",
      requiredDocuments: eddDocs,
      collectedDocuments: [],
      assignedTo: advisorName,
    });

    await storage.createKycAuditLog({
      clientId: client.id,
      advisorId,
      action: "edd_triggered",
      entityType: "edd_record",
      details: { reason: "High-confidence screening match triggered EDD", confidence: screeningResult.highestConfidence },
      performedBy: "System (Automated)",
    });
  }

  return {
    results,
    screeningResult,
  };
}

export function registerKycAmlRoutes(app: Express) {
  app.get("/api/kyc/dashboard", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const [riskRatings, screeningResults, reviewSchedules, eddRecordsData, auditLog, allClients, ofacCount, pepCount, screeningConfig] = await Promise.all([
        storage.getKycRiskRatingsByAdvisor(advisor.id),
        storage.getAmlScreeningResultsByAdvisor(advisor.id),
        storage.getKycReviewSchedulesByAdvisor(advisor.id),
        storage.getEddRecordsByAdvisor(advisor.id),
        storage.getKycAuditLogByAdvisor(advisor.id),
        storage.getClients(advisor.id),
        storage.getOfacSdnEntryCount(),
        storage.getPepEntryCount(),
        storage.getScreeningConfig(advisor.id),
      ]);

      const clientMap = new Map(allClients.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

      const latestRatingsMap = new Map<string, typeof riskRatings[0]>();
      for (const r of riskRatings) {
        if (!latestRatingsMap.has(r.clientId)) {
          latestRatingsMap.set(r.clientId, r);
        }
      }
      const latestRatings = Array.from(latestRatingsMap.values());

      const highRisk = latestRatings.filter(r => r.riskTier === "high" || r.riskTier === "prohibited");
      const standardRisk = latestRatings.filter(r => r.riskTier === "standard");
      const lowRisk = latestRatings.filter(r => r.riskTier === "low");

      const now = new Date().toISOString().split("T")[0];
      const upcomingReviews = reviewSchedules.filter(s => s.status === "scheduled" && s.nextReviewDate <= new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0]);
      const overdueReviews = reviewSchedules.filter(s => s.status === "scheduled" && s.nextReviewDate < now);

      const pendingScreenings = screeningResults.filter(s => s.matchStatus === "potential_match" && !s.resolvedAt);
      const pendingEdd = eddRecordsData.filter(e => e.status === "pending" || e.status === "in_progress");

      const autoResolvedCount = screeningResults.filter(s => s.resolution === "auto_resolved").length;
      const confirmedMatchCount = screeningResults.filter(s => s.matchStatus === "confirmed_match").length;
      const falsePositiveCount = screeningResults.filter(s => s.matchStatus === "false_positive" && s.resolution !== "auto_resolved").length;
      const clearCount = screeningResults.filter(s => s.matchStatus === "clear").length;

      const expiringDocuments: any[] = [];
      for (const client of allClients) {
        const docs = await storage.getDocumentsByClient(client.id);
        for (const doc of docs) {
          if (doc.expirationDate) {
            const expDate = new Date(doc.expirationDate);
            const daysUntil = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntil <= 30 && daysUntil > -90) {
              expiringDocuments.push({
                ...doc,
                clientName: clientMap.get(client.id) || "Unknown",
                daysUntilExpiration: daysUntil,
                isExpired: daysUntil <= 0,
              });
            }
          }
        }
      }

      const totalClients = allClients.length;
      const ratedClients = latestRatings.length;
      const complianceRate = totalClients > 0 ? Math.round((ratedClients / totalClients) * 100) : 0;

      const screenedClients = new Set(screeningResults.map(s => s.clientId)).size;
      const screeningCoverage = totalClients > 0 ? Math.round((screenedClients / totalClients) * 100) : 0;

      res.json({
        summary: {
          totalClients,
          ratedClients,
          complianceRate,
          highRiskCount: highRisk.length,
          standardRiskCount: standardRisk.length,
          lowRiskCount: lowRisk.length,
          pendingScreenings: pendingScreenings.length,
          pendingEdd: pendingEdd.length,
          upcomingReviews: upcomingReviews.length,
          overdueReviews: overdueReviews.length,
          expiringDocuments: expiringDocuments.length,
          screeningCoverage,
          screenedClients,
          autoResolvedCount,
          confirmedMatchCount,
          falsePositiveCount,
          clearCount,
          totalScreenings: screeningResults.length,
          ofacEntryCount: ofacCount,
          pepEntryCount: pepCount,
          lastOfacUpdate: screeningConfig?.lastOfacUpdate || null,
          lastRescreeningRun: screeningConfig?.lastRescreeningRun || null,
        },
        screeningConfig: screeningConfig || DEFAULT_SCREENING_CONFIG,
        riskRatings: latestRatings.map(r => ({
          ...r,
          clientName: clientMap.get(r.clientId) || "Unknown",
        })),
        screeningResults: screeningResults.slice(0, 50).map(s => ({
          ...s,
          clientName: clientMap.get(s.clientId) || "Unknown",
        })),
        reviewSchedules: reviewSchedules.map(s => ({
          ...s,
          clientName: clientMap.get(s.clientId) || "Unknown",
        })),
        eddRecords: eddRecordsData.map(e => ({
          ...e,
          clientName: clientMap.get(e.clientId) || "Unknown",
        })),
        expiringDocuments: expiringDocuments.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration),
        auditLog: auditLog.slice(0, 30).map(a => ({
          ...a,
          clientName: clientMap.get(a.clientId) || "Unknown",
        })),
      });
    } catch (error: any) {
      logger.error({ err: error }, "KYC dashboard error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.post("/api/kyc/clients/:clientId/rate", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient(req.params.clientId as string);
      if (!client || client.advisorId !== advisor.id) return res.status(404).json({ message: "Client not found" });

      const { pepStatus, sourceOfWealth, overrideReason } = req.body;

      const latestScreening = await storage.getAmlScreeningResults(client.id);
      const unresolvedMatches = latestScreening.filter(s => s.matchStatus === "potential_match" && !s.resolvedAt);
      const screeningRiskScore = unresolvedMatches.length > 0
        ? Math.min(100, Math.max(...unresolvedMatches.map(m => m.matchConfidence || 0)))
        : 0;

      const result = calculateRiskRating(client, pepStatus || false, sourceOfWealth, screeningRiskScore);

      const rating = await storage.createKycRiskRating({
        clientId: client.id,
        advisorId: advisor.id,
        riskScore: result.riskScore,
        riskTier: result.riskTier,
        residencyRisk: result.factors.residencyRisk,
        occupationRisk: result.factors.occupationRisk,
        sourceOfWealthRisk: result.factors.sourceOfWealthRisk,
        pepStatus: pepStatus || false,
        pepRisk: result.factors.pepRisk,
        factors: result.factors,
        overrideReason: overrideReason || null,
        ratedBy: advisor.name,
      });

      const nextReviewDate = calculateNextReviewDate(result.riskTier);
      const existingSchedule = await storage.getKycReviewSchedule(client.id);
      if (existingSchedule) {
        await storage.updateKycReviewSchedule(existingSchedule.id, {
          riskTier: result.riskTier,
          nextReviewDate,
          reviewFrequencyMonths: getReviewFrequencyMonths(result.riskTier),
          lastReviewDate: new Date().toISOString().split("T")[0],
        });
      } else {
        await storage.createKycReviewSchedule({
          clientId: client.id,
          advisorId: advisor.id,
          riskTier: result.riskTier,
          lastReviewDate: new Date().toISOString().split("T")[0],
          nextReviewDate,
          reviewFrequencyMonths: getReviewFrequencyMonths(result.riskTier),
          status: "scheduled",
        });
      }

      await storage.createKycAuditLog({
        clientId: client.id,
        advisorId: advisor.id,
        action: "risk_rating_created",
        entityType: "kyc_risk_rating",
        entityId: rating.id,
        details: { riskScore: result.riskScore, riskTier: result.riskTier, pepStatus, screeningRiskScore },
        performedBy: advisor.name,
      });

      if (result.riskTier === "high" || result.riskTier === "prohibited") {
        const eddDocs = getRequiredEddDocuments(
          result.factors.pepRisk > 0 ? "PEP status" : "High-risk rating"
        );
        await storage.createEddRecord({
          clientId: client.id,
          advisorId: advisor.id,
          triggerReason: `Automated trigger: ${result.riskTier} risk rating (score: ${result.riskScore})`,
          status: "pending",
          requiredDocuments: eddDocs,
          collectedDocuments: [],
          assignedTo: advisor.name,
        });

        await storage.createKycAuditLog({
          clientId: client.id,
          advisorId: advisor.id,
          action: "edd_triggered",
          entityType: "edd_record",
          details: { reason: "High risk rating triggered EDD", riskTier: result.riskTier },
          performedBy: "System",
        });
      }

      res.json(rating);
    } catch (error: any) {
      logger.error({ err: error }, "Risk rating error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.post("/api/kyc/clients/:clientId/screen", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const client = await storage.getClient(req.params.clientId as string);
      if (!client || client.advisorId !== advisor.id) return res.status(404).json({ message: "Client not found" });

      const result = await runAutomatedScreening(client.id, advisor.id, advisor.name);
      if (!result) return res.status(404).json({ message: "Client not found" });

      res.json({
        results: result.results,
        matchesFound: result.screeningResult.matches.length,
        autoResolved: result.screeningResult.autoResolved.length,
        highestConfidence: result.screeningResult.highestConfidence,
        requiresManualReview: result.screeningResult.requiresManualReview,
        screeningRiskScore: result.screeningResult.screeningRiskScore,
      });
    } catch (error: any) {
      logger.error({ err: error }, "AML screening error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.post("/api/kyc/screen-all", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const clients = await storage.getClients(advisor.id);
      let screened = 0;
      let matchesFound = 0;
      let autoResolved = 0;
      let errors = 0;

      for (const client of clients) {
        try {
          const result = await runAutomatedScreening(client.id, advisor.id, advisor.name);
          if (result) {
            screened++;
            matchesFound += result.screeningResult.matches.length;
            autoResolved += result.screeningResult.autoResolved.length;
          }
        } catch (err) {
          logger.error({ err, clientId: client.id }, "Batch screening error for client");
          errors++;
        }
      }

      const config = await getOrCreateScreeningConfig(advisor.id);
      await storage.updateScreeningConfig(config.id, {
        lastRescreeningRun: new Date(),
      });

      if (clients.length > 0) {
        await storage.createKycAuditLog({
          clientId: clients[0].id,
          advisorId: advisor.id,
          action: "batch_screening_completed",
          entityType: "aml_screening",
          details: { screened, matchesFound, autoResolved, errors, totalClients: clients.length },
          performedBy: advisor.name,
        });
      }

      res.json({ screened, matchesFound, autoResolved, errors, totalClients: clients.length });
    } catch (error: any) {
      logger.error({ err: error }, "Batch screening error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.patch("/api/kyc/screening/:id/resolve", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { resolution, notes } = req.body;
      if (!resolution) return res.status(400).json({ message: "Resolution is required" });

      const record = (await storage.getAmlScreeningResultsByAdvisor(advisor.id)).find(r => r.id === req.params.id as string);
      if (!record) return res.status(404).json({ message: "Screening result not found" });

      const updated = await storage.updateAmlScreeningResult(req.params.id as string, {
        resolution,
        notes,
        resolvedBy: advisor.name,
        resolvedAt: new Date().toISOString().split("T")[0],
        matchStatus: resolution === "true_match" ? "confirmed_match" : "false_positive",
      });

      if (updated) {
        await storage.createKycAuditLog({
          clientId: updated.clientId,
          advisorId: advisor.id,
          action: "screening_resolved",
          entityType: "aml_screening",
          entityId: updated.id,
          details: { resolution, notes, matchConfidence: updated.matchConfidence },
          performedBy: advisor.name,
        });
      }

      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "Screening resolve error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.patch("/api/kyc/reviews/:id/complete", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { notes } = req.body;
      const schedule = await storage.getKycReviewSchedulesByAdvisor(advisor.id);
      const review = schedule.find(s => s.id === req.params.id as string);
      if (!review) return res.status(404).json({ message: "Review schedule not found" });

      const now = new Date().toISOString().split("T")[0];
      const nextDate = calculateNextReviewDate(review.riskTier, now);

      const updated = await storage.updateKycReviewSchedule(req.params.id as string, {
        status: "completed",
        completedAt: now,
        completedBy: advisor.name,
        notes,
        lastReviewDate: now,
      });

      await storage.createKycReviewSchedule({
        clientId: review.clientId,
        advisorId: advisor.id,
        riskTier: review.riskTier,
        lastReviewDate: now,
        nextReviewDate: nextDate,
        reviewFrequencyMonths: review.reviewFrequencyMonths,
        status: "scheduled",
      });

      await storage.createKycAuditLog({
        clientId: review.clientId,
        advisorId: advisor.id,
        action: "review_completed",
        entityType: "kyc_review",
        entityId: req.params.id as string,
        details: { completedAt: now, nextReviewDate: nextDate, notes },
        performedBy: advisor.name,
      });

      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "Review complete error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.patch("/api/kyc/edd/:id", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { status, findings, riskAssessment, recommendation, collectedDocuments } = req.body;
      const updates: any = {};

      if (status) updates.status = status;
      if (findings !== undefined) updates.findings = findings;
      if (riskAssessment !== undefined) updates.riskAssessment = riskAssessment;
      if (recommendation !== undefined) updates.recommendation = recommendation;
      if (collectedDocuments) updates.collectedDocuments = collectedDocuments;

      if (status === "completed") {
        updates.completedAt = new Date().toISOString().split("T")[0];
        updates.completedBy = advisor.name;
      }

      const updated = await storage.updateEddRecord(req.params.id as string, updates);

      if (updated) {
        await storage.createKycAuditLog({
          clientId: updated.clientId,
          advisorId: advisor.id,
          action: `edd_${status || "updated"}`,
          entityType: "edd_record",
          entityId: updated.id,
          details: { status, findings: findings?.substring(0, 100) },
          performedBy: advisor.name,
        });
      }

      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "EDD update error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.get("/api/kyc/clients/:clientId", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      const client = await storage.getClient(req.params.clientId as string);
      if (!client || client.advisorId !== advisor.id) return res.status(404).json({ message: "Client not found" });

      const cId = req.params.clientId as string;
      const [riskRating, screeningResults, reviewSchedule, eddRecordsData, auditLog] = await Promise.all([
        storage.getKycRiskRating(cId),
        storage.getAmlScreeningResults(cId),
        storage.getKycReviewSchedule(cId),
        storage.getEddRecords(cId),
        storage.getKycAuditLog(cId),
      ]);

      res.json({
        riskRating,
        screeningResults,
        reviewSchedule,
        eddRecords: eddRecordsData,
        auditLog,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Client KYC data error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.get("/api/kyc/audit-log", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const log = await storage.getKycAuditLogByAdvisor(advisor.id);
      const clients = await storage.getClients(advisor.id);
      const clientMap = new Map(clients.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

      res.json(log.map(entry => ({
        ...entry,
        clientName: clientMap.get(entry.clientId) || "Unknown",
      })));
    } catch (error: any) {
      logger.error({ err: error }, "Audit log error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.post("/api/kyc/ofac/ingest", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const { csvData, clearExisting } = req.body;
      if (!csvData || typeof csvData !== "string") {
        return res.status(400).json({ message: "csvData is required as a string" });
      }

      if (clearExisting) {
        await storage.clearOfacSdnEntries();
      }

      const lines = csvData.split("\n");
      const entries: any[] = [];

      for (const line of lines) {
        const parsed = parseOfacSdnCsvLine(line);
        if (parsed && parsed.sdnType === "Individual") {
          entries.push({
            sdnName: parsed.sdnName,
            sdnType: parsed.sdnType,
            program: parsed.program,
            title: parsed.title,
            remarks: parsed.remarks,
            sourceId: parsed.sourceId,
            aliases: [],
            addresses: [],
          });
        }
      }

      const inserted = await storage.bulkCreateOfacSdnEntries(entries);

      const config = await getOrCreateScreeningConfig(advisor.id);
      await storage.updateScreeningConfig(config.id, {
        lastOfacUpdate: new Date(),
      });

      const clients = await storage.getClients(advisor.id);
      if (clients.length > 0) {
        await storage.createKycAuditLog({
          clientId: clients[0].id,
          advisorId: advisor.id,
          action: "ofac_sdn_list_updated",
          entityType: "ofac_sdn",
          details: { entriesIngested: inserted, totalLines: lines.length, clearedExisting: !!clearExisting },
          performedBy: advisor.name,
        });
      }

      res.json({ inserted, totalLines: lines.length });
    } catch (error: any) {
      logger.error({ err: error }, "OFAC ingestion error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.post("/api/kyc/ofac/seed-sample", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const sampleSdnEntries = [
        { sdnName: "PETROV, Vladimir Ilyich", sdnType: "Individual", program: "UKRAINE-EO13661", title: "General Director", remarks: "DOB 15 Mar 1970", sourceId: "SDN-SAMPLE-001", aliases: ["PETROV, V.I.", "Vladimir Petrov"], addresses: [] },
        { sdnName: "HASSAN, Ahmed Mohamed", sdnType: "Individual", program: "SDGT", title: "", remarks: "DOB 1985", sourceId: "SDN-SAMPLE-002", aliases: ["Ahmed HASSAN", "A. Hassan"], addresses: [] },
        { sdnName: "WEI, Li", sdnType: "Individual", program: "NONPRO-EO13382", title: "Director", remarks: "National of China", sourceId: "SDN-SAMPLE-003", aliases: ["LI Wei", "L. Wei"], addresses: [] },
        { sdnName: "GARCIA, Carlos Alberto", sdnType: "Individual", program: "SDNTK", title: "Commander", remarks: "DOB 1975", sourceId: "SDN-SAMPLE-004", aliases: ["Carlos GARCIA", "C.A. Garcia"], addresses: [] },
        { sdnName: "IVANOV, Sergei Nikolaevich", sdnType: "Individual", program: "RUSSIA-EO14024", title: "Deputy Minister", remarks: "DOB 1968", sourceId: "SDN-SAMPLE-005", aliases: ["Sergei IVANOV", "S.N. Ivanov"], addresses: [] },
        { sdnName: "AL-RASHID, Omar Khalil", sdnType: "Individual", program: "SDGT", title: "", remarks: "DOB 1990", sourceId: "SDN-SAMPLE-006", aliases: ["Omar AL-RASHID"], addresses: [] },
        { sdnName: "PARK, Jong-un", sdnType: "Individual", program: "DPRK3", title: "", remarks: "National of North Korea", sourceId: "SDN-SAMPLE-007", aliases: ["PARK Jong Un"], addresses: [] },
        { sdnName: "RAMIREZ, Juan Felipe", sdnType: "Individual", program: "SDNTK", title: "Financial Officer", remarks: "DOB 1982", sourceId: "SDN-SAMPLE-008", aliases: ["Juan RAMIREZ", "J.F. Ramirez"], addresses: [] },
      ];

      const samplePepEntries = [
        { fullName: "Boris Volkov", country: "Russia", position: "Deputy Finance Minister", level: "national", aliases: ["B. Volkov", "Boris V."], source: "PEP Sample DB" },
        { fullName: "Chen Xiaoming", country: "China", position: "Provincial Governor", level: "regional", aliases: ["Chen X.", "Xiaoming Chen"], source: "PEP Sample DB" },
        { fullName: "Maria Santos-Rodriguez", country: "Mexico", position: "Senator", level: "national", aliases: ["M. Santos", "Maria Santos"], source: "PEP Sample DB" },
        { fullName: "Abdullah Al-Faisal", country: "Saudi Arabia", position: "Royal Family Member", level: "national", aliases: ["A. Al-Faisal"], source: "PEP Sample DB" },
        { fullName: "Jean-Pierre Dubois", country: "France", position: "Former Minister of Trade", level: "national", aliases: ["JP Dubois", "J.P. Dubois"], source: "PEP Sample DB" },
        { fullName: "Olga Petrova", country: "Ukraine", position: "Head of State Enterprise", level: "state", aliases: ["O. Petrova"], source: "PEP Sample DB" },
      ];

      await storage.clearOfacSdnEntries();
      await storage.clearPepEntries();

      const sdnInserted = await storage.bulkCreateOfacSdnEntries(sampleSdnEntries);
      const pepInserted = await storage.bulkCreatePepEntries(samplePepEntries);

      const config = await getOrCreateScreeningConfig(advisor.id);
      await storage.updateScreeningConfig(config.id, {
        lastOfacUpdate: new Date(),
      });

      const clients = await storage.getClients(advisor.id);
      if (clients.length > 0) {
        await storage.createKycAuditLog({
          clientId: clients[0].id,
          advisorId: advisor.id,
          action: "sample_watchlists_loaded",
          entityType: "ofac_sdn",
          details: { sdnEntries: sdnInserted, pepEntries: pepInserted },
          performedBy: advisor.name,
        });
      }

      res.json({ sdnInserted, pepInserted });
    } catch (error: any) {
      logger.error({ err: error }, "Seed sample data error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.get("/api/kyc/screening-config", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const config = await getOrCreateScreeningConfig(advisor.id);
      const [ofacCount, pepCount] = await Promise.all([
        storage.getOfacSdnEntryCount(),
        storage.getPepEntryCount(),
      ]);

      res.json({ ...config, ofacEntryCount: ofacCount, pepEntryCount: pepCount });
    } catch (error: any) {
      logger.error({ err: error }, "Get screening config error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.patch("/api/kyc/screening-config", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const config = await getOrCreateScreeningConfig(advisor.id);
      const { nameMatchThreshold, autoResolveThreshold, highConfidenceThreshold, rescreeningFrequencyDays, ofacEnabled, pepEnabled, internalWatchlistEnabled } = req.body;

      const updates: any = {};
      if (nameMatchThreshold !== undefined) updates.nameMatchThreshold = nameMatchThreshold;
      if (autoResolveThreshold !== undefined) updates.autoResolveThreshold = autoResolveThreshold;
      if (highConfidenceThreshold !== undefined) updates.highConfidenceThreshold = highConfidenceThreshold;
      if (rescreeningFrequencyDays !== undefined) updates.rescreeningFrequencyDays = rescreeningFrequencyDays;
      if (ofacEnabled !== undefined) updates.ofacEnabled = ofacEnabled;
      if (pepEnabled !== undefined) updates.pepEnabled = pepEnabled;
      if (internalWatchlistEnabled !== undefined) updates.internalWatchlistEnabled = internalWatchlistEnabled;

      const updated = await storage.updateScreeningConfig(config.id, updates);

      const clients = await storage.getClients(advisor.id);
      if (clients.length > 0) {
        await storage.createKycAuditLog({
          clientId: clients[0].id,
          advisorId: advisor.id,
          action: "screening_config_updated",
          entityType: "screening_config",
          details: updates,
          performedBy: advisor.name,
        });
      }

      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "Update screening config error");
      res.status(500).json({ message: "An error occurred" });
    }
  });

  app.get("/api/kyc/screening-pipeline", requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });

      const screeningResults = await storage.getAmlScreeningResultsByAdvisor(advisor.id);
      const clients = await storage.getClients(advisor.id);
      const clientMap = new Map(clients.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

      const pending = screeningResults.filter(s => s.matchStatus === "potential_match" && !s.resolvedAt);
      const autoResolved = screeningResults.filter(s => s.resolution === "auto_resolved");
      const manuallyResolved = screeningResults.filter(s => s.resolvedAt && s.resolution !== "auto_resolved");
      const confirmed = screeningResults.filter(s => s.matchStatus === "confirmed_match");
      const clear = screeningResults.filter(s => s.matchStatus === "clear");

      const screenedClientIds = new Set(screeningResults.map(s => s.clientId));
      const unscreened = clients.filter(c => !screenedClientIds.has(c.id));

      res.json({
        pending: pending.map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
        autoResolved: autoResolved.slice(0, 20).map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
        manuallyResolved: manuallyResolved.slice(0, 20).map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
        confirmed: confirmed.map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
        clear: clear.slice(0, 20).map(s => ({ ...s, clientName: clientMap.get(s.clientId) || "Unknown" })),
        unscreened: unscreened.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
        stats: {
          total: screeningResults.length,
          pending: pending.length,
          autoResolved: autoResolved.length,
          manuallyResolved: manuallyResolved.length,
          confirmed: confirmed.length,
          clear: clear.length,
          unscreened: unscreened.length,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, "Screening pipeline error");
      res.status(500).json({ message: "An error occurred" });
    }
  });
}

export { runAutomatedScreening };
