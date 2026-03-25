import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

vi.mock("../storage", () => ({
  storage: {
    getAdvisorByEmail: vi.fn(),
    getAssociateByEmail: vi.fn(),
    getAdvisor: vi.fn(),
    updateAdvisor: vi.fn(),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    getMeetings: vi.fn().mockResolvedValue([]),
    getFilteredAlerts: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getClients: vi.fn().mockResolvedValue([]),
    getHouseholds: vi.fn().mockResolvedValue([]),
    getFirstAdvisor: vi.fn(),
    getClientsByAssociate: vi.fn().mockResolvedValue([]),
    getClient: vi.fn(),
    getAccountsByClient: vi.fn().mockResolvedValue([]),
    getTasksByMeeting: vi.fn().mockResolvedValue([]),
    getTaxLotsByClient: vi.fn().mockResolvedValue([]),
    getTaxLotsByAccount: vi.fn().mockResolvedValue([]),
    getDirectIndexPortfoliosByClient: vi.fn().mockResolvedValue([]),
    getDirectIndexPortfolio: vi.fn(),
    createWashSaleEvent: vi.fn().mockResolvedValue({ id: "ws-1", status: "active" }),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../engines/direct-indexing-engine", () => ({
  directIndexingEngine: {
    generateTaxLotsFromHoldings: vi.fn().mockResolvedValue([
      { id: "tl-1", ticker: "AAPL", shares: 100, costBasis: "150.00", currentPrice: "175.00" },
    ]),
    generateDirectIndexPortfolio: vi.fn().mockResolvedValue({
      id: "dip-1", clientId: "client-1", targetIndex: "SP500", totalValue: 500000,
    }),
    identifyHarvestableLots: vi.fn().mockResolvedValue({
      harvestable: [],
      totalPotentialSavings: 0,
      taxRate: 0.37,
    }),
    getWashSaleTracker: vi.fn().mockResolvedValue({ events: [], violations: [] }),
    getTrackingReport: vi.fn().mockResolvedValue({ portfolioId: "dip-1", trackingError: 0.02 }),
    getTaxAlphaAttribution: vi.fn().mockResolvedValue({ totalAlpha: 5000, breakdown: [] }),
    getAvailableIndices: vi.fn().mockReturnValue([
      { id: "SP500", name: "S&P 500" },
      { id: "TOTAL_MARKET", name: "Total US Market" },
    ]),
    generateRebalanceProposal: vi.fn().mockResolvedValue({
      trades: [], estimatedTaxImpact: 0, driftReduction: 0,
    }),
  },
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerDirectIndexingRoutes } from "../routes/direct-indexing";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerDirectIndexingRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
  });
  ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor" });
  ms.getFirstAdvisor.mockResolvedValue({ id: "advisor-1" });
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Direct Indexing API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/clients/:clientId/tax-lots", () => {
    it("should return tax lots for a client", async () => {
      ms.getTaxLotsByClient.mockResolvedValue([
        { id: "tl-1", ticker: "AAPL", shares: 100 },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/tax-lots");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should generate tax lots if none exist", async () => {
      ms.getTaxLotsByClient.mockResolvedValue([]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/tax-lots");
      expect(res.status).toBe(200);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/clients/client-1/tax-lots");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/accounts/:accountId/tax-lots", () => {
    it("should return tax lots for an account", async () => {
      ms.getTaxLotsByAccount.mockResolvedValue([]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/accounts/account-1/tax-lots");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/clients/:clientId/direct-index-portfolios", () => {
    it("should return portfolios for a client", async () => {
      ms.getDirectIndexPortfoliosByClient.mockResolvedValue([]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/direct-index-portfolios");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/clients/:clientId/direct-index-portfolios", () => {
    it("should create a direct index portfolio", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/direct-index-portfolios").send({
        targetIndex: "SP500",
        totalValue: 500000,
      });
      expect(res.status).toBe(200);
    });

    it("should reject invalid body", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/direct-index-portfolios").send({
        totalValue: -100,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/clients/:clientId/harvestable-lots", () => {
    it("should return harvestable lots", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/harvestable-lots?taxRate=0.37&minLoss=500");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/clients/:clientId/wash-sale-tracker", () => {
    it("should return wash sale tracker", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/wash-sale-tracker");
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/clients/:clientId/wash-sale-events", () => {
    it("should create a wash sale event", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/wash-sale-events").send({
        ticker: "AAPL",
        sellDate: "2024-01-15",
        sellAccountId: "account-1",
        disallowedLoss: 2500,
        windowStart: "2023-12-16",
        windowEnd: "2024-02-14",
      });
      expect(res.status).toBe(200);
      expect(ms.createWashSaleEvent).toHaveBeenCalled();
    });

    it("should reject missing required fields", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/wash-sale-events").send({
        ticker: "AAPL",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/direct-index-portfolios/:portfolioId/tracking", () => {
    it("should return tracking report", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/direct-index-portfolios/dip-1/tracking");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("trackingError");
    });
  });

  describe("GET /api/clients/:clientId/tax-alpha", () => {
    it("should return tax alpha attribution", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/tax-alpha?taxRate=0.37");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalAlpha");
    });
  });

  describe("GET /api/direct-indexing/indices", () => {
    it("should return available indices", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/direct-indexing/indices");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/clients/:clientId/direct-index-portfolios/:portfolioId/rebalance-proposal", () => {
    it("should return rebalance proposal", async () => {
      ms.getDirectIndexPortfolio.mockResolvedValue({
        id: "dip-1", clientId: "client-1", targetIndex: "SP500", totalValue: 500000,
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/direct-index-portfolios/dip-1/rebalance-proposal");
      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent portfolio", async () => {
      ms.getDirectIndexPortfolio.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/direct-index-portfolios/nonexistent/rebalance-proposal");
      expect(res.status).toBe(404);
    });

    it("should return 403 for client mismatch", async () => {
      ms.getDirectIndexPortfolio.mockResolvedValue({
        id: "dip-1", clientId: "other-client", targetIndex: "SP500",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/direct-index-portfolios/dip-1/rebalance-proposal");
      expect(res.status).toBe(403);
    });
  });
});
