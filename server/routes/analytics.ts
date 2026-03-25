import type { Express } from "express";
import { logger } from "../lib/logger";
import { getSessionAdvisor, requireAuth } from "./middleware";
import { renderDiagnosticTemplate } from "./utils";
import { storage } from "../storage";
import { generateDiagnosticAnalysis } from "../openai";
import { calculateFeeRate, type FeeScheduleTier } from "@shared/schema";

export function registerAnalyticsRoutes(app: Express) {
  app.get("/api/analytics", async (req, res) => {
    const advisor = await getSessionAdvisor(req);
    if (!advisor) return res.status(404).json({ message: "No advisor found" });

    const [allClients, allHouseholds, allTasks, allActivities, allCompliance] = await Promise.all([
      storage.getClients(advisor.id),
      storage.getHouseholds(advisor.id),
      storage.getTasks(advisor.id),
      storage.getActivities(advisor.id),
      storage.getComplianceItems(advisor.id),
    ]);

    const clientAnalytics = await Promise.all(
      allClients.map(async (c) => {
        const accts = await storage.getAccountsByClient(c.id);
        const totalAum = accts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
        const clientActivities = allActivities.filter(a => a.clientId === c.id);
        const daysSinceContact = c.lastContactDate
          ? Math.floor((Date.now() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          segment: c.segment,
          totalAum,
          lastContact: c.lastContactDate,
          nextReview: c.nextReviewDate,
          daysSinceContact,
          activityCount: clientActivities.length,
          isAtRisk: daysSinceContact > 90 || (c.segment === 'A' && daysSinceContact > 60),
          referralSource: c.referralSource,
          status: c.status,
        };
      })
    );

    const segmentAnalytics = {
      A: { count: 0, totalAum: 0, revenue: 0 },
      B: { count: 0, totalAum: 0, revenue: 0 },
      C: { count: 0, totalAum: 0, revenue: 0 },
      D: { count: 0, totalAum: 0, revenue: 0 },
    };

    const feeSchedule = advisor.feeSchedule as FeeScheduleTier[] | null;

    clientAnalytics.forEach(c => {
      const seg = c.segment as keyof typeof segmentAnalytics;
      if (segmentAnalytics[seg]) {
        segmentAnalytics[seg].count++;
        segmentAnalytics[seg].totalAum += c.totalAum;
        const client = allClients.find(cl => cl.id === c.id);
        const feeRate = calculateFeeRate(c.totalAum, feeSchedule, client?.feeRateOverride);
        segmentAnalytics[seg].revenue += c.totalAum * feeRate;
      }
    });

    const totalAum = allHouseholds.reduce((sum, h) => sum + parseFloat(h.totalAum as string || "0"), 0);

    res.json({
      totalAum,
      totalClients: allClients.length,
      clientAnalytics,
      segmentAnalytics,
      atRiskClients: clientAnalytics.filter(c => c.isAtRisk),
      overdueReviews: clientAnalytics.filter(c => c.daysSinceContact > 90),
      referralSources: [...new Set(allClients.map(c => c.referralSource).filter(Boolean))],
      complianceOverview: {
        current: allCompliance.filter(c => c.status === "current").length,
        expiringSoon: allCompliance.filter(c => c.status === "expiring_soon").length,
        overdue: allCompliance.filter(c => c.status === "overdue").length,
        pending: allCompliance.filter(c => c.status === "pending").length,
      },
      capacityMetrics: {
        currentClients: allClients.length,
        maxCapacity: advisor.maxCapacity || 120,
        utilizationPct: (allClients.length / (advisor.maxCapacity || 120)) * 100,
      },
    });
  });

  app.get("/api/diagnostics/configs", requireAuth, async (_req, res) => {
    try {
      const configs = await storage.getDiagnosticConfigs();
      res.json(configs.filter((c: any) => c.isActive));
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/diagnostics/run", requireAuth, async (req, res) => {
    try {
      const { clientId, configId } = req.body;
      if (!clientId) return res.status(400).json({ message: "clientId required" });

      let config;
      if (configId) {
        config = await storage.getDiagnosticConfig(configId);
        if (!config) return res.status(400).json({ message: "Selected configuration not found." });
      } else {
        config = await storage.getActiveDiagnosticConfig();
      }
      if (!config) return res.status(400).json({ message: "No active diagnostic configuration found. Please configure one in Administration settings." });

      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const [accts, hlds, acts, tsks, docs, compliance] = await Promise.all([
        storage.getAccountsByClient(client.id),
        storage.getHoldingsByClient(client.id),
        storage.getActivitiesByClient(client.id),
        storage.getTasksByClient(client.id),
        storage.getDocumentsByClient(client.id),
        storage.getComplianceItemsByClient(client.id),
      ]);

      let perf: any[] = [];
      let household: any = null;
      let householdMembers: any[] = [];
      if (accts.length > 0 && accts[0].householdId) {
        [perf, household] = await Promise.all([
          storage.getPerformanceByHousehold(accts[0].householdId),
          storage.getHousehold(accts[0].householdId),
        ]);
        if (household) {
          const members = await storage.getHouseholdMembers(household.id);
          householdMembers = members.map(m => ({ name: `${m.client.firstName} ${m.client.lastName}`, relationship: m.relationship }));
        }
      }

      const analysisJson = await generateDiagnosticAnalysis(config.analysisPrompt, {
        client, accounts: accts, holdings: hlds, performance: perf,
        activities: acts, tasks: tsks, documents: docs, complianceItems: compliance,
        household, householdMembers,
      });

      const renderedHtml = renderDiagnosticTemplate(config.htmlTemplate, analysisJson);

      const result = await storage.createDiagnosticResult({
        clientId: client.id,
        configId: config.id,
        analysisJson: JSON.stringify(analysisJson),
        renderedHtml,
      });

      res.json({ result, analysisJson, renderedHtml });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/diagnostics/results/:clientId", requireAuth, async (req, res) => {
    try {
      const results = await storage.getDiagnosticResults((req.params.clientId as string));
      res.json(results);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/diagnostics/result/:id", requireAuth, async (req, res) => {
    try {
      const result = await storage.getDiagnosticResult((req.params.id as string));
      if (!result) return res.status(404).json({ message: "Result not found" });
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/diagnostics/results/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDiagnosticResult((req.params.id as string));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
