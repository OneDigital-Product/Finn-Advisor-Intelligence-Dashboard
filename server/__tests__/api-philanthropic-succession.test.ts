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
    getDafAccountsByClient: vi.fn().mockResolvedValue([]),
    getCrtsByClient: vi.fn().mockResolvedValue([]),
    getQcdRecordsByClient: vi.fn().mockResolvedValue([]),
    getDafTransactions: vi.fn().mockResolvedValue([]),
    createDafAccount: vi.fn().mockResolvedValue({ id: "daf-1", clientId: "client-1", sponsorOrganization: "Fidelity Charitable" }),
    getDafAccount: vi.fn(),
    updateDafAccount: vi.fn().mockResolvedValue({}),
    deleteDafAccount: vi.fn().mockResolvedValue(undefined),
    createDafTransaction: vi.fn().mockResolvedValue({ id: "dt-1" }),
    createCrt: vi.fn().mockResolvedValue({ id: "crt-1" }),
    getCrt: vi.fn(),
    updateCrt: vi.fn().mockResolvedValue({ id: "crt-1" }),
    deleteCrt: vi.fn().mockResolvedValue(undefined),
    createQcdRecord: vi.fn().mockResolvedValue({ id: "qcd-1" }),
    getQcdRecord: vi.fn(),
    deleteQcdRecord: vi.fn().mockResolvedValue(undefined),
    getBusinessEntitiesByClient: vi.fn().mockResolvedValue([]),
    createBusinessEntity: vi.fn().mockResolvedValue({ id: "be-1", clientId: "client-1", name: "Acme Inc" }),
    updateBusinessEntity: vi.fn(),
    deleteBusinessEntity: vi.fn().mockResolvedValue(undefined),
    getBusinessValuations: vi.fn().mockResolvedValue([]),
    getBusinessValuationsByClient: vi.fn().mockResolvedValue([]),
    createBusinessValuation: vi.fn().mockResolvedValue({ id: "bv-1" }),
    getBusinessValuation: vi.fn(),
    updateBusinessValuation: vi.fn().mockResolvedValue({ id: "bv-1" }),
    deleteBusinessValuation: vi.fn().mockResolvedValue(undefined),
    getBusinessEntity: vi.fn(),
    getFlpStructuresByClient: vi.fn().mockResolvedValue([]),
    getBuySellAgreements: vi.fn().mockResolvedValue([]),
    getBuySellAgreementsByClient: vi.fn().mockResolvedValue([]),
    createBuySellAgreement: vi.fn().mockResolvedValue({ id: "bsa-1" }),
    updateBuySellAgreement: vi.fn(),
    deleteBuySellAgreement: vi.fn().mockResolvedValue(undefined),
    getExitPlanMilestones: vi.fn().mockResolvedValue([]),
    getExitMilestonesByClient: vi.fn().mockResolvedValue([]),
    createExitPlanMilestone: vi.fn().mockResolvedValue({ id: "em-1" }),
    updateExitPlanMilestone: vi.fn(),
    deleteExitPlanMilestone: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../calculators/charitable-tax-calculator", () => ({
  calculateCharitableTaxImpact: vi.fn().mockReturnValue({
    totalDeduction: 50000, taxSavings: 12000, effectiveRate: 0.24,
    agiLimitApplied: false, carryforward: [],
  }),
}));
vi.mock("../lib/valuation-engine", () => ({
  computeFullValuation: vi.fn().mockReturnValue({
    dcf: { enterpriseValue: 5000000 },
    comparable: { blendedValue: 4500000 },
    assetBased: null,
    recommended: { value: 4750000, methodology: "blended", confidence: "medium", reasoning: "Average of DCF and comparable" },
  }),
  computeFlpDiscountTiered: vi.fn().mockReturnValue({
    selectedCombinedDiscount: 0.40,
    selectedDiscountedValue: 600000,
    controlDiscount: { low: 0.15, mid: 0.25, high: 0.35 },
    marketabilityDiscount: { low: 0.10, mid: 0.20, high: 0.30 },
    combinedDiscount: { low: 0.235, mid: 0.40, high: 0.545 },
    discountedValue: { low: 765000, mid: 600000, high: 455000 },
    irsDefensible: true,
    notes: [],
  }),
  computeTaxImpact: vi.fn().mockReturnValue({ giftTaxOwed: 0, remainingExemption: 12000000 }),
  computeDcf: vi.fn(),
  computeComparable: vi.fn(),
  computeAssetBased: vi.fn(),
  getIndustryMultiples: vi.fn().mockReturnValue({ evToEbitda: 8, evToRevenue: 2 }),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerPhilanthropicRoutes } from "../routes/philanthropic";
import { registerBusinessSuccessionRoutes } from "../routes/business-succession";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", status: "active",
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerPhilanthropicRoutes(app);
  registerBusinessSuccessionRoutes(app);
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

describe("Philanthropic API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/clients/:clientId/philanthropic", () => {
    it("should return philanthropic data for authorized client", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/philanthropic");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("dafAccounts");
      expect(res.body).toHaveProperty("charitableRemainderTrusts");
      expect(res.body).toHaveProperty("qcdRecords");
      expect(res.body).toHaveProperty("summary");
      expect(res.body.summary).toHaveProperty("qcdAnnualLimit", 105000);
    });

    it("should deny access to unauthorized client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/philanthropic");
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/philanthropic/daf-accounts", () => {
    it("should create a DAF account", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/philanthropic/daf-accounts").send({
        clientId: "client-1", advisorId: "advisor-1",
        sponsorOrganization: "Fidelity Charitable", accountName: "Doe Family DAF",
      });
      expect(res.status).toBe(200);
      expect(ms.createDafAccount).toHaveBeenCalled();
    });
  });

  describe("POST /api/philanthropic/daf-transactions", () => {
    it("should create a contribution transaction", async () => {
      ms.getDafAccount.mockResolvedValue({ id: "daf-1", clientId: "client-1", currentBalance: "50000", totalContributions: "50000", totalGrants: "0", taxDeductionsTaken: "50000" });
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/philanthropic/daf-transactions").send({
        dafAccountId: "daf-1", transactionType: "contribution",
        amount: "10000", transactionDate: "2024-06-15",
      });
      expect(res.status).toBe(200);
      expect(ms.updateDafAccount).toHaveBeenCalled();
    });
  });

  describe("POST /api/philanthropic/crts", () => {
    it("should create a CRT", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/philanthropic/crts").send({
        clientId: "client-1", advisorId: "advisor-1",
        trustName: "Doe Family CRT", crtType: "CRAT",
        fundedValue: "500000", payoutRate: "0.05", termYears: 20,
      });
      expect(res.status).toBe(200);
      expect(ms.createCrt).toHaveBeenCalled();
    });
  });

  describe("POST /api/philanthropic/qcds", () => {
    it("should create a QCD record", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/philanthropic/qcds").send({
        clientId: "client-1", advisorId: "advisor-1",
        charityName: "Local Food Bank", amount: "10000",
        distributionDate: "2024-12-01", taxYear: 2024,
      });
      expect(res.status).toBe(200);
      expect(ms.createQcdRecord).toHaveBeenCalled();
    });
  });

  describe("POST /api/philanthropic/tax-impact", () => {
    it("should calculate charitable tax impact", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/philanthropic/tax-impact").send({
        agi: 500000,
        filingStatus: "married_filing_jointly",
        contributions: [
          { amount: 50000, type: "cash_public" },
        ],
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalDeduction");
      expect(res.body).toHaveProperty("taxSavings");
    });

    it("should reject invalid filing status", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/philanthropic/tax-impact").send({
        agi: 500000,
        filingStatus: "invalid",
        contributions: [{ amount: 50000, type: "cash_public" }],
      });
      expect(res.status).toBe(400);
    });
  });
});

describe("Business Succession API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/clients/:clientId/business-entities", () => {
    it("should return business entities for a client", async () => {
      ms.getBusinessEntitiesByClient.mockResolvedValue([
        { id: "be-1", clientId: "client-1", name: "Acme Inc", entityType: "LLC" },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/business-entities");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("POST /api/business-entities", () => {
    it("should create a business entity", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/business-entities").send({
        clientId: "client-1", name: "Acme Inc", entityType: "LLC",
        industry: "Technology", estimatedValue: "5000000",
      });
      expect(res.status).toBe(200);
      expect(ms.createBusinessEntity).toHaveBeenCalled();
    });

    it("should reject missing required fields", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/business-entities").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/business-entities/:id", () => {
    it("should update a business entity", async () => {
      ms.updateBusinessEntity.mockResolvedValue({ id: "be-1", name: "Acme Corp" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/business-entities/be-1").send({ name: "Acme Corp" });
      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent entity", async () => {
      ms.updateBusinessEntity.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/business-entities/nonexistent").send({ name: "Test" });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/buy-sell-agreements", () => {
    it("should create a buy-sell agreement", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/buy-sell-agreements").send({
        businessEntityId: "be-1", agreementType: "cross_purchase",
        fundingMechanism: "life_insurance",
      });
      expect(res.status).toBe(200);
      expect(ms.createBuySellAgreement).toHaveBeenCalled();
    });
  });

  describe("POST /api/exit-milestones", () => {
    it("should create an exit milestone", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/exit-milestones").send({
        businessEntityId: "be-1", title: "Complete valuation",
        category: "financial", targetDate: "2025-06-30",
      });
      expect(res.status).toBe(200);
      expect(ms.createExitPlanMilestone).toHaveBeenCalled();
    });
  });

  describe("GET /api/clients/:clientId/business-succession", () => {
    it("should return business succession data for authorized client", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/business-succession");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("valuations");
      expect(res.body).toHaveProperty("flpStructures");
      expect(res.body).toHaveProperty("buySellAgreements");
      expect(res.body).toHaveProperty("exitMilestones");
      expect(res.body).toHaveProperty("summary");
    });

    it("should deny access to unauthorized client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/business-succession");
      expect(res.status).toBe(403);
    });
  });
});
