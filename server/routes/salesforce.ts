import type { Express } from "express";
import { logger } from "../lib/logger";
import { isSalesforceEnabled, validateConnection } from "../integrations/salesforce/client";
import { syncTask, syncMeeting, batchSync } from "../integrations/salesforce/sync";
import { syncContacts, syncAccounts } from "../integrations/salesforce/inbound";
import { generateFullReport } from "../integrations/salesforce/reconciliation";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import {
  getActiveCRM,
  getActivePortfolio,
  getActiveCRMProvider,
  getActivePortfolioProvider,
  setActiveCRM,
  setActivePortfolio,
  getAllCRMProviders,
  getAllPortfolioProviders,
  type CRMProvider,
  type PortfolioProvider,
} from "../integrations/adapters";

export function registerSalesforceRoutes(app: Express) {
  app.get("/api/integrations/salesforce/status", requireAuth, async (_req, res) => {
    try {
      const enabled = isSalesforceEnabled();
      let authenticated = false;

      if (enabled) {
        authenticated = await validateConnection();
      }

      const syncLogs = await storage.getRecentSalesforceSyncLogs(10);

      res.json({
        enabled,
        authenticated,
        syncEnabled: process.env.SALESFORCE_SYNC_ENABLED === "true",
        lastSync: syncLogs[0]?.syncedAt || null,
        recentSyncs: syncLogs,
      });
    } catch (err: any) {
      logger.error({ err }, "Salesforce status error");
      res.status(500).json({ error: "Failed to get Salesforce status" });
    }
  });

  app.post("/api/integrations/salesforce/sync", requireAuth, requireAdvisor, async (req, res) => {
    try {
      if (!isSalesforceEnabled()) {
        return res.status(400).json({ error: "Salesforce integration not enabled" });
      }

      const { direction = "outbound", recordTypes = ["Task", "Event"] } = req.query;
      const results: Record<string, any> = {};

      if (direction === "outbound") {
        if ((recordTypes as string[]).includes("Task")) {
          results.tasks = await batchSync("task");
        }
        if ((recordTypes as string[]).includes("Event")) {
          results.meetings = await batchSync("meeting");
        }
      } else if (direction === "inbound") {
        const advisor = await getSessionAdvisor(req);
        if (!advisor) {
          return res.status(401).json({ error: "No advisor session" });
        }

        if ((recordTypes as string[]).includes("Contact")) {
          results.contacts = await syncContacts(advisor.id);
        }
        if ((recordTypes as string[]).includes("Account")) {
          results.accounts = await syncAccounts();
        }
      }

      res.json({ success: true, direction, results });
    } catch (err: any) {
      logger.error({ err }, "API error");
      res.status(500).json({ error: "Sync failed" });
    }
  });

  app.post("/api/integrations/salesforce/reconcile", requireAuth, requireAdvisor, async (_req, res) => {
    try {
      if (!isSalesforceEnabled()) {
        return res.status(400).json({ error: "Salesforce integration not enabled" });
      }

      const report = await generateFullReport();
      res.json({ success: true, report });
    } catch (err: any) {
      logger.error({ err }, "API error");
      res.status(500).json({ error: "Reconciliation failed" });
    }
  });

  app.post("/api/integrations/salesforce/webhook", async (req, res) => {
    try {
      // Verify webhook signature if secret is configured
      const sfWebhookSecret = process.env.SALESFORCE_WEBHOOK_SECRET;
      if (!sfWebhookSecret) {
        logger.warn("[SF Webhook] SALESFORCE_WEBHOOK_SECRET not configured — rejecting webhook");
        return res.status(403).json({ error: "Webhook secret not configured" });
      }

      const signature = req.headers["x-sf-signature"] as string | undefined;
      if (!signature) {
        logger.warn("[SF Webhook] Missing x-sf-signature header");
        return res.status(401).json({ error: "Missing signature" });
      }

      const { createHmac, timingSafeEqual } = await import("crypto");
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const expected = createHmac("sha256", sfWebhookSecret).update(rawBody).digest("hex");
      const valid = signature.length === expected.length
        && timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));

      if (!valid) {
        logger.warn("[SF Webhook] Signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
      }

      logger.info({ event: req.body?.event || "unknown" }, "[SF Webhook] Received valid event");
      res.json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Salesforce webhook error");
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.get("/api/integrations/crm/status", requireAuth, async (_req, res) => {
    try {
      const crm = getActiveCRM();
      const enabled = crm.isEnabled();
      let authenticated = false;
      if (enabled) {
        authenticated = await crm.validateConnection();
      }
      res.json({
        provider: getActiveCRMProvider(),
        name: crm.name,
        enabled,
        authenticated,
      });
    } catch (err: any) {
      logger.error({ err }, "CRM status error");
      res.status(500).json({ error: "Failed to get CRM status" });
    }
  });

  app.get("/api/integrations/portfolio/status", requireAuth, async (_req, res) => {
    try {
      const portfolio = getActivePortfolio();
      const enabled = portfolio.isEnabled();
      let authenticated = false;
      if (enabled) {
        authenticated = await portfolio.validateConnection();
      }
      res.json({
        provider: getActivePortfolioProvider(),
        name: portfolio.name,
        enabled,
        authenticated,
      });
    } catch (err: any) {
      logger.error({ err }, "Portfolio status error");
      res.status(500).json({ error: "Failed to get portfolio status" });
    }
  });

  app.get("/api/admin/integration-settings", requireAuth, async (_req, res) => {
    try {
      res.json({
        activeCRM: getActiveCRMProvider(),
        activePortfolio: getActivePortfolioProvider(),
        crmProviders: getAllCRMProviders(),
        portfolioProviders: getAllPortfolioProviders(),
      });
    } catch (err: any) {
      logger.error({ err }, "Integration settings error");
      res.status(500).json({ error: "Failed to get integration settings" });
    }
  });

  app.put("/api/admin/integration-settings", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const { activeCRM: newCRM, activePortfolio: newPortfolio } = req.body;

      if (newCRM) {
        const validCRM = ["salesforce", "redtail"];
        if (!validCRM.includes(newCRM)) {
          return res.status(400).json({ error: `Invalid CRM provider: ${newCRM}. Valid options: ${validCRM.join(", ")}` });
        }
        setActiveCRM(newCRM as CRMProvider);
      }

      if (newPortfolio) {
        const validPortfolio = ["orion", "blackdiamond"];
        if (!validPortfolio.includes(newPortfolio)) {
          return res.status(400).json({ error: `Invalid portfolio provider: ${newPortfolio}. Valid options: ${validPortfolio.join(", ")}` });
        }
        setActivePortfolio(newPortfolio as PortfolioProvider);
      }

      res.json({
        activeCRM: getActiveCRMProvider(),
        activePortfolio: getActivePortfolioProvider(),
        crmProviders: getAllCRMProviders(),
        portfolioProviders: getAllPortfolioProviders(),
      });
    } catch (err: any) {
      logger.error({ err }, "Integration settings update error");
      res.status(500).json({ error: "Failed to update integration settings" });
    }
  });

  app.post("/api/integrations/crm/sync", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const crm = getActiveCRM();
      if (!crm.isEnabled()) {
        return res.status(400).json({ error: `${crm.name} CRM integration not enabled` });
      }

      const { direction = "outbound", recordTypes = ["Task", "Event"] } = req.query;
      const results: Record<string, any> = {};

      if (direction === "outbound") {
        if ((recordTypes as string[]).includes("Task")) {
          results.tasks = await crm.batchSync("task");
        }
        if ((recordTypes as string[]).includes("Event")) {
          results.meetings = await crm.batchSync("meeting");
        }
      } else if (direction === "inbound") {
        const advisor = await getSessionAdvisor(req);
        if (!advisor) {
          return res.status(401).json({ error: "No advisor session" });
        }

        if ((recordTypes as string[]).includes("Contact")) {
          results.contacts = await crm.syncContacts(advisor.id);
        }
        if ((recordTypes as string[]).includes("Account")) {
          results.accounts = await crm.syncAccounts();
        }
      }

      res.json({ success: true, provider: crm.name, direction, results });
    } catch (err: any) {
      logger.error({ err }, "CRM sync error");
      res.status(500).json({ error: "CRM sync failed" });
    }
  });

  app.post("/api/integrations/crm/reconcile", requireAuth, requireAdvisor, async (_req, res) => {
    try {
      const crm = getActiveCRM();
      if (!crm.isEnabled()) {
        return res.status(400).json({ error: `${crm.name} CRM integration not enabled` });
      }

      const report = await crm.reconcile();
      res.json({ success: true, provider: crm.name, report });
    } catch (err: any) {
      logger.error({ err }, "CRM reconciliation error");
      res.status(500).json({ error: "CRM reconciliation failed" });
    }
  });

  app.post("/api/integrations/portfolio/sync", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const portfolio = getActivePortfolio();
      if (!portfolio.isEnabled()) {
        return res.status(400).json({ error: `${portfolio.name} portfolio integration not enabled` });
      }

      const { full, accountIds } = req.query;
      const result = await portfolio.syncAllAccounts({
        fullSync: full === "true",
        specificAccountIds: accountIds ? (accountIds as string).split(",") : undefined,
      });

      res.json({ success: true, provider: portfolio.name, ...result });
    } catch (err: any) {
      logger.error({ err }, "Portfolio sync error");
      res.status(500).json({ error: "Portfolio sync failed" });
    }
  });

  app.post("/api/integrations/portfolio/reconcile", requireAuth, requireAdvisor, async (_req, res) => {
    try {
      const portfolio = getActivePortfolio();
      if (!portfolio.isEnabled()) {
        return res.status(400).json({ error: `${portfolio.name} portfolio integration not enabled` });
      }

      const report = await portfolio.reconcile();
      res.json({ success: true, provider: portfolio.name, report });
    } catch (err: any) {
      logger.error({ err }, "Portfolio reconciliation error");
      res.status(500).json({ error: "Portfolio reconciliation failed" });
    }
  });
}
