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
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "run-1", createdAt: new Date().toISOString() }]) }) }),
  },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));

import { registerAuthRoutes } from "../routes/auth";
import { registerCalculatorRoutes } from "../routes/calculators";
import { storage } from "../storage";
import type { IStorage } from "../storage";

const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockAdvisor = {
  id: "advisor-1",
  name: "Test Advisor",
  email: "advisor@test.com",
  passwordHash,
  onboardingCompleted: true,
  avatarUrl: null,
  title: "Advisor",
  phone: null,
  bio: null,
  firmName: null,
  feeSchedule: null,
  maxCapacity: 120,
  salesforceUserId: null,
  microsoftUserId: null,
  orionUserId: null,
  calendlyUrl: null,
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerCalculatorRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue(mockAdvisor);
  ms.getAdvisor.mockResolvedValue(mockAdvisor);
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Calculator API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/calculators/tax-bracket", () => {
    it("should calculate correct federal tax for single filer at $250k", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/tax-bracket").send({
        grossIncome: 250000,
        filingStatus: "single",
        deductions: 14600,
        additionalIncome: 0,
        stateRate: 0.05,
      });
      expect(res.status).toBe(201);
      expect(res.body.calculatorType).toBe("tax_bracket");

      const { currentYear } = res.body.results;
      expect(currentYear.grossIncome).toBe(250000);
      expect(currentYear.taxableIncome).toBe(235400);
      expect(currentYear.marginalRate).toBe(0.32);
      expect(currentYear.federalTax).toBeCloseTo(53014.5, 0);
      expect(currentYear.stateTax).toBe(12500);
      expect(currentYear.totalTax).toBeCloseTo(65514.5, 0);
      expect(currentYear.effectiveRate).toBeCloseTo(65514.5 / 250000, 3);
      expect(currentYear.bracketBreakdown).toHaveLength(7);

      const activeBracket = currentYear.bracketBreakdown.find(
        (b: { isCurrentBracket: boolean }) => b.isCurrentBracket
      );
      expect(activeBracket).toBeDefined();
      expect(activeBracket.rate).toBe(0.32);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).post("/api/calculators/tax-bracket").send({
        grossIncome: 100000, filingStatus: "single", deductions: 0, additionalIncome: 0, stateRate: 0,
      });
      expect(res.status).toBe(401);
    });

    it("should reject invalid filing status", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/tax-bracket").send({
        grossIncome: 100000, filingStatus: "invalid", deductions: 0, additionalIncome: 0, stateRate: 0,
      });
      expect(res.status).toBe(400);
    });

    it("should calculate married filing jointly correctly", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/tax-bracket").send({
        grossIncome: 400000,
        filingStatus: "married_filing_jointly",
        deductions: 29200,
        additionalIncome: 0,
        stateRate: 0,
      });
      expect(res.status).toBe(201);
      const { currentYear } = res.body.results;
      expect(currentYear.taxableIncome).toBe(370800);
      expect(currentYear.marginalRate).toBe(0.24);
    });
  });

  describe("POST /api/calculators/budget", () => {
    it("should calculate budget with scenario projections and expense summary", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/budget").send({
        mode: "pre_retirement",
        currentAge: 45,
        retirementAge: 65,
        currentIncome: 150000,
        expenses: { housing: 3000, food: 800, transportation: 500 },
        scenarios: {
          base: { growthRate: 0.07, inflationRate: 0.03 },
          optimistic: { growthRate: 0.10, inflationRate: 0.02 },
          conservative: { growthRate: 0.04, inflationRate: 0.04 },
        },
      });
      expect(res.status).toBe(201);
      expect(res.body.calculatorType).toBe("budget");

      const results = res.body.results;
      expect(results.mode).toBe("pre_retirement");
      expect(results.expenseSummary.totalAnnualExpenses).toBe(4300);
      expect(results.expenseSummary.categories).toHaveLength(3);
      expect(results.summaryByScenario).toHaveProperty("base");
      expect(results.summaryByScenario).toHaveProperty("optimistic");
      expect(results.summaryByScenario).toHaveProperty("conservative");
      expect(results.projections).toHaveProperty("base");
    });

    it("should reject invalid mode", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/budget").send({
        mode: "invalid_mode",
        currentAge: 45,
        expenses: {},
        scenarios: {
          base: { growthRate: 0.07, inflationRate: 0.03 },
          optimistic: { growthRate: 0.10, inflationRate: 0.02 },
          conservative: { growthRate: 0.04, inflationRate: 0.04 },
        },
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/calculators/rmd", () => {
    it("should calculate correct RMD for 74-year-old with $500k balance", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/rmd").send({
        accountHolderDOB: "1950-06-15",
        accountBalance: 500000,
        taxYear: 2024,
      });
      expect(res.status).toBe(201);
      expect(res.body.calculatorType).toBe("rmd");

      const results = res.body.results;
      expect(results.lifeExpectancyFactor).toBe(25.5);
      expect(results.currentYearRMD).toBeCloseTo(19607.84, 0);
      expect(results.rmdPercentage).toBeCloseTo(3.92, 1);
      expect(results.projections.length).toBeGreaterThan(0);

      const firstProjection = results.projections[0];
      expect(firstProjection.age).toBe(74);
      expect(firstProjection.rmdAmount).toBeCloseTo(19607.84, 0);
    });

    it("should reject missing required fields", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/rmd").send({
        accountBalance: 500000,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/calculators/roth-conversion", () => {
    it("should calculate roth conversion with tax impact", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/roth-conversion").send({
        currentAge: 55,
        retirementAge: 65,
        traditionalIRABalance: 500000,
        rothIRABalance: 100000,
        annualIncome: 150000,
        filingStatus: "single",
        stateRate: 0.05,
        expectedRetirementRate: 0.15,
        conversionAmount: 50000,
      });
      expect(res.status).toBe(201);
      expect(res.body.calculatorType).toBe("roth_conversion");

      const results = res.body.results;
      expect(results.conversionAmount).toBe(50000);
      expect(results.taxOnConversion).toBeGreaterThan(0);
      expect(results.effectiveTaxRate).toBeGreaterThan(0);
      expect(results.marginalBracketBeforeConversion).toBeGreaterThan(0);
      expect(results.marginalBracketAfterConversion).toBeGreaterThanOrEqual(results.marginalBracketBeforeConversion);
      expect(typeof results.breakevenYears).toBe("number");
      expect(results.projections.length).toBeGreaterThan(0);
      expect(results.bracketImpact.additionalTax).toBeGreaterThan(0);
    });
  });

  describe("POST /api/calculators/asset-location", () => {
    it("should optimize asset location with tax-efficiency placement", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/asset-location").send({
        holdings: [{
          name: "VTI", ticker: "VTI", marketValue: 100000, assetClass: "US Equity",
          currentAccountType: "taxable", expectedReturn: 0.08, dividendYield: 0.02,
          turnoverRate: 0.04, taxEfficiency: "high",
        }],
        taxableCapacity: 200000,
        traditionalCapacity: 150000,
        rothCapacity: 100000,
        marginalTaxRate: 0.32,
        capitalGainsTaxRate: 0.15,
        investmentHorizon: 20,
      });
      expect(res.status).toBe(201);
      expect(res.body.calculatorType).toBe("asset_location");

      const results = res.body.results;
      expect(results).toHaveProperty("recommendations");
      expect(results.recommendations).toHaveLength(1);
      expect(results.recommendations[0]).toHaveProperty("ticker", "VTI");
      expect(results.recommendations[0]).toHaveProperty("recommendedAccountType");
      expect(results).toHaveProperty("estimatedAnnualTaxSavings");
    });
  });

  describe("POST /api/calculators/qsbs", () => {
    it("should evaluate QSBS eligibility and compute exclusion", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/calculators/qsbs").send({
        positions: [{
          companyName: "TechCo", sharesOwned: 10000, costBasis: 50000,
          currentValue: 500000, acquisitionDate: "2020-01-15",
          isOriginalIssue: true, companyGrossAssets: "under_50m",
          isCCorporation: true, qualifiedTradeOrBusiness: true,
        }],
      });
      expect(res.status).toBe(201);
      expect(res.body.calculatorType).toBe("qsbs");

      const results = res.body.results;
      expect(results.positions).toHaveLength(1);
      expect(results.positions[0].companyName).toBe("TechCo");
      expect(results.positions[0].unrealizedGain).toBe(450000);
      expect(results.positions[0].section1202Eligible).toBe(true);
      expect(results.positions[0].excludableGain).toBeGreaterThan(0);
      expect(results.positions[0].estimatedTaxSavings).toBeGreaterThan(0);
      expect(results.summary.totalPositions).toBe(1);
      expect(results.summary.totalUnrealizedGain).toBe(450000);
      expect(results.summary.totalExcludableGain).toBeGreaterThan(0);
    });
  });

  describe("GET /api/calculators/runs", () => {
    it("should return calculator runs for authenticated user", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/calculators/runs");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/calculators/runs");
      expect(res.status).toBe(401);
    });
  });
});
