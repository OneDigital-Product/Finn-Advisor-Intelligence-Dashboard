import { logger } from "../lib/logger";
import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { directIndexingEngine } from "../engines/direct-indexing-engine";
import { validateBody } from "../lib/validation";
import { requireAuth, requireAdvisor } from "./middleware";

const createPortfolioSchema = z.object({
  targetIndex: z.string().min(1),
  totalValue: z.number().positive(),
  accountId: z.string().optional(),
});

const createWashSaleSchema = z.object({
  ticker: z.string().min(1),
  sellDate: z.string().min(1),
  sellAccountId: z.string().min(1),
  buyDate: z.string().optional(),
  buyAccountId: z.string().optional(),
  disallowedLoss: z.number().positive(),
  windowStart: z.string().min(1),
  windowEnd: z.string().min(1),
});

function parseQueryNum(value: string | undefined, defaultVal: number): number {
  if (value === undefined || value === null || value === "") return defaultVal;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultVal : parsed;
}

export function registerDirectIndexingRoutes(app: Express) {
  app.get("/api/clients/:clientId/tax-lots", requireAuth, async (req, res) => {
    try {
      let lots = await storage.getTaxLotsByClient(req.params.clientId);
      if (lots.length === 0) {
        lots = await directIndexingEngine.generateTaxLotsFromHoldings(req.params.clientId);
      }
      res.json(lots);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/accounts/:accountId/tax-lots", requireAuth, async (req, res) => {
    try {
      const lots = await storage.getTaxLotsByAccount(req.params.accountId);
      res.json(lots);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/direct-index-portfolios", requireAuth, async (req, res) => {
    try {
      const portfolios = await storage.getDirectIndexPortfoliosByClient(req.params.clientId);
      res.json(portfolios);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/direct-index-portfolios", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createPortfolioSchema, req, res);
      if (!body) return;

      const portfolio = await directIndexingEngine.generateDirectIndexPortfolio(
        req.params.clientId,
        body.targetIndex,
        body.totalValue,
        body.accountId,
      );
      res.json(portfolio);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/harvestable-lots", requireAuth, async (req, res) => {
    try {
      let lots = await storage.getTaxLotsByClient(req.params.clientId);
      if (lots.length === 0) {
        await directIndexingEngine.generateTaxLotsFromHoldings(req.params.clientId);
      }
      const taxRate = parseQueryNum(req.query.taxRate as string, 0.37);
      const minLoss = parseQueryNum(req.query.minLoss as string, 500);
      const harvestable = await directIndexingEngine.identifyHarvestableLots(
        req.params.clientId,
        taxRate,
        minLoss,
      );
      res.json(harvestable);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/wash-sale-tracker", requireAuth, async (req, res) => {
    try {
      const tracker = await directIndexingEngine.getWashSaleTracker(req.params.clientId);
      res.json(tracker);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/wash-sale-events", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createWashSaleSchema, req, res);
      if (!body) return;

      const event = await storage.createWashSaleEvent({
        clientId: req.params.clientId,
        ticker: body.ticker,
        sellDate: body.sellDate,
        sellAccountId: body.sellAccountId,
        buyDate: body.buyDate || null,
        buyAccountId: body.buyAccountId || null,
        disallowedLoss: String(body.disallowedLoss),
        windowStart: body.windowStart,
        windowEnd: body.windowEnd,
        status: "active",
      });
      res.json(event);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/direct-index-portfolios/:portfolioId/tracking", requireAuth, async (req, res) => {
    try {
      const report = await directIndexingEngine.getTrackingReport(req.params.portfolioId);
      if (!report) return res.status(404).json({ message: "Portfolio not found" });
      res.json(report);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/tax-alpha", requireAuth, async (req, res) => {
    try {
      const taxRate = parseQueryNum(req.query.taxRate as string, 0.37);
      const report = await directIndexingEngine.getTaxAlphaAttribution(req.params.clientId, taxRate);
      res.json(report);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/wash-sale-compliance/:ticker", requireAuth, async (req, res) => {
    try {
      const results = await directIndexingEngine.checkWashSaleCompliance(
        req.params.clientId,
        req.params.ticker,
      );
      res.json(results);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/tax-alpha-comparison", requireAuth, async (req, res) => {
    try {
      const taxRate = parseQueryNum(req.query.taxRate as string, 0.37);
      const portfolioValue = parseQueryNum(req.query.portfolioValue as string, 1000000);
      const report = await directIndexingEngine.calculateTaxAlphaComparison(
        req.params.clientId,
        portfolioValue,
        taxRate,
      );
      res.json(report);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/fee-comparison", requireAuth, async (req, res) => {
    try {
      const portfolioValue = parseQueryNum(req.query.portfolioValue as string, 1000000);
      const harvestBenefit = parseQueryNum(req.query.harvestBenefit as string, 0);
      const report = directIndexingEngine.calculateFeeComparison(portfolioValue, undefined, undefined, undefined, undefined, harvestBenefit);
      res.json(report);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/harvesting-strategy", requireAuth, async (req, res) => {
    try {
      const taxRate = parseQueryNum(req.query.taxRate as string, 0.37);
      const strategy = await directIndexingEngine.generateHarvestingStrategy(
        req.params.clientId,
        taxRate,
      );
      res.json(strategy);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/direct-index-portfolios/:portfolioId/construction-analysis", requireAuth, async (req, res) => {
    try {
      const portfolio = await storage.getDirectIndexPortfolio(req.params.portfolioId);
      if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
      if (portfolio.clientId !== req.params.clientId) {
        return res.status(403).json({ message: "Portfolio does not belong to this client" });
      }
      const esgExclusions = req.query.esgExclusions ? (req.query.esgExclusions as string).split(",") : [];
      const analysis = await directIndexingEngine.analyzePortfolioConstruction(
        req.params.portfolioId,
        esgExclusions,
      );
      res.json(analysis);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/tax-context", requireAuth, async (req, res) => {
    try {
      const annualIncome = parseQueryNum(req.query.annualIncome as string, 500000);
      const filingStatus = (req.query.filingStatus as string) || "married_filing_jointly";
      const context = await directIndexingEngine.assessClientTaxContext(
        req.params.clientId,
        annualIncome,
        filingStatus,
      );
      res.json(context);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/direct-indexing/indices", requireAuth, async (_req, res) => {
    try {
      const indices = directIndexingEngine.getAvailableIndices();
      res.json(indices);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/direct-index-portfolios/:portfolioId/rebalance-proposal", requireAuth, async (req, res) => {
    try {
      const portfolio = await storage.getDirectIndexPortfolio(req.params.portfolioId);
      if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
      if (portfolio.clientId !== req.params.clientId) {
        return res.status(403).json({ message: "Portfolio does not belong to this client" });
      }

      const driftTolerance = parseFloat(req.query.driftTolerance as string) || 1.0;
      const taxRate = parseFloat(req.query.taxRate as string) || 0.37;
      const proposal = await directIndexingEngine.generateRebalanceProposal(
        req.params.portfolioId,
        req.params.clientId,
        driftTolerance,
        taxRate,
      );
      if (!proposal) return res.status(404).json({ message: "Portfolio not found or has no value" });
      res.json(proposal);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
