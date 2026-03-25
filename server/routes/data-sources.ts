import type { Express } from "express";
import { isMulesoftEnabled } from "../integrations/mulesoft/client";
import { validateMulesoftConnection, testReportingScopeAvailability } from "../integrations/mulesoft/api";
import { requireAuth } from "./middleware";
import { logger } from "../lib/logger";

// Cache the connection test result for 2 minutes to avoid hammering endpoints
let connectionCache: { mulesoft: boolean; testedAt: number } = {
  mulesoft: false,
  testedAt: 0,
};
const CACHE_TTL = 120_000;

export function registerDataSourceRoutes(app: Express) {
  app.get("/api/data-sources", requireAuth, async (_req, res) => {
    try {
      const mulesoftEnabled = isMulesoftEnabled();
      const orionEnabled = process.env.ORION_ENABLED === "true" && !!process.env.ORION_API_KEY;
      const salesforceEnabled = process.env.SALESFORCE_ENABLED === "true";
      const activeProvider = process.env.ACTIVE_PORTFOLIO_PROVIDER || "none";
      const cassidyKeySet = !!process.env.CASSIDY_API_KEY;
      const openaiKeySet = !!process.env.OPENAI_API_KEY;

      // Test MuleSoft connection (cached)
      let mulesoftConnected = connectionCache.mulesoft;
      if (mulesoftEnabled && Date.now() - connectionCache.testedAt > CACHE_TTL) {
        try {
          mulesoftConnected = await validateMulesoftConnection();
          connectionCache = { mulesoft: mulesoftConnected, testedAt: Date.now() };
        } catch {
          mulesoftConnected = false;
          connectionCache = { mulesoft: false, testedAt: Date.now() };
        }
      }

      // Build per-widget data source map
      // This tells the UI exactly where each widget's data comes from
      const widgetSources: Record<string, { source: string; live: boolean }> = {
        portfolio: {
          source: activeProvider === "mulesoft" ? "MuleSoft → Orion"
                : activeProvider === "orion" ? "Orion Direct"
                : "Local DB (seed)",
          live: activeProvider === "mulesoft" ? mulesoftConnected
              : activeProvider === "orion" ? orionEnabled
              : false,
        },
        household: {
          source: mulesoftConnected ? "MuleSoft → Salesforce" : "Local DB (seed)",
          live: mulesoftConnected,
        },
        meetings:   { source: "Local DB (seed)", live: false },
        alerts:     { source: "Local DB (seed)", live: false },
        insights:   { source: "AI · Local DB", live: false },
        actions:    { source: "AI · Local DB", live: false },
        goals:      { source: "Local DB (seed)", live: false },
        tasks:      { source: "Local DB (seed)", live: false },
        calcs:      { source: "Local DB (seed)", live: false },
        fin:        { source: cassidyKeySet ? "Cassidy AI" : openaiKeySet ? "OpenAI" : "No AI Key", live: cassidyKeySet || openaiKeySet },
        scheduling: { source: "Not Connected", live: false },
      };

      res.json({
        mulesoft:  { enabled: mulesoftEnabled, connected: mulesoftConnected },
        orion:     { enabled: orionEnabled, connected: false },
        salesforce:{ enabled: salesforceEnabled, connected: false },
        activeProvider,
        overallMode: Object.values(widgetSources).some(w => w.live) ? "live" : "mock",
        widgetSources,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to check data sources");
      res.status(500).json({ error: "Failed to check data sources" });
    }
  });

  // Test endpoint: check if Reporting/Scope is reachable through MuleSoft
  app.get("/api/data-sources/test-reporting-scope", requireAuth, async (_req, res) => {
    try {
      const result = await testReportingScopeAvailability();
      res.json({
        endpoint: "POST /api/v1/reporting/scope",
        ...result,
        testedAt: new Date().toISOString(),
        note: result.available
          ? "Reporting/Scope is live — beneficiary, contributions YTD, and performance risk metrics should work"
          : "Reporting/Scope returned 404 — endpoint not yet available through MuleSoft EAPI",
      });
    } catch (error) {
      res.status(500).json({ error: "Test failed", details: String(error) });
    }
  });
}
