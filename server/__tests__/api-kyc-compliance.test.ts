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
    getKycRiskRatingsByAdvisor: vi.fn().mockResolvedValue([]),
    getAmlScreeningResultsByAdvisor: vi.fn().mockResolvedValue([]),
    getKycReviewSchedulesByAdvisor: vi.fn().mockResolvedValue([]),
    getEddRecordsByAdvisor: vi.fn().mockResolvedValue([]),
    getKycAuditLogByAdvisor: vi.fn().mockResolvedValue([]),
    getOfacSdnEntryCount: vi.fn().mockResolvedValue(0),
    getPepEntryCount: vi.fn().mockResolvedValue(0),
    getScreeningConfig: vi.fn().mockResolvedValue(null),
    createScreeningConfig: vi.fn().mockResolvedValue({ id: "sc-1", ofacEnabled: true, pepEnabled: true, internalWatchlistEnabled: true, nameMatchThreshold: 85, autoResolveThreshold: 65, highConfidenceThreshold: 90, rescreeningFrequencyDays: 90 }),
    getDocumentsByClient: vi.fn().mockResolvedValue([]),
    getAmlScreeningResults: vi.fn().mockResolvedValue([]),
    createKycRiskRating: vi.fn().mockResolvedValue({ id: "kr-1", clientId: "client-1", riskScore: 35, riskTier: "standard" }),
    getKycReviewSchedule: vi.fn().mockResolvedValue(null),
    createKycReviewSchedule: vi.fn().mockResolvedValue({ id: "ks-1" }),
    updateKycReviewSchedule: vi.fn().mockResolvedValue({ id: "ks-1" }),
    createKycAuditLog: vi.fn().mockResolvedValue({ id: "al-1" }),
    getAllOfacSdnEntries: vi.fn().mockResolvedValue([]),
    getAllPepEntries: vi.fn().mockResolvedValue([]),
    createAmlScreeningResult: vi.fn().mockResolvedValue({ id: "sr-1", matchStatus: "clear" }),
    updateAmlScreeningResult: vi.fn().mockResolvedValue({ id: "sr-1", clientId: "client-1", matchConfidence: 50 }),
    getKycRiskRating: vi.fn().mockResolvedValue(null),
    getKycAuditLog: vi.fn().mockResolvedValue([]),
    getEddRecords: vi.fn().mockResolvedValue([]),
    updateEddRecord: vi.fn().mockResolvedValue({ id: "edd-1", clientId: "client-1", status: "in_progress" }),
    updateScreeningConfig: vi.fn().mockResolvedValue({}),
    createEddRecord: vi.fn().mockResolvedValue({ id: "edd-1" }),
    getFiduciaryRuleConfig: vi.fn().mockResolvedValue(null),
    createFiduciaryValidationLog: vi.fn().mockResolvedValue({ id: "fvl-1" }),
    getFiduciaryValidationLogs: vi.fn().mockResolvedValue([]),
    getFiduciaryValidationStats: vi.fn().mockResolvedValue({ total: 0, passed: 0, warned: 0, blocked: 0 }),
    getFiduciaryValidationLog: vi.fn().mockResolvedValue(null),
    resolveFiduciaryValidation: vi.fn().mockResolvedValue(null),
    upsertFiduciaryRuleConfig: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../engines/fiduciary-compliance", () => ({
  fiduciaryEngine: {
    getAvailableRules: vi.fn().mockReturnValue([{ id: "r1", name: "Test Rule", enabled: true, severity: "warning" }]),
    getConfig: vi.fn().mockReturnValue({ globalEnabled: true, blockThreshold: 3, rules: [] }),
    updateRuleConfig: vi.fn().mockReturnValue(true),
    setGlobalEnabled: vi.fn(),
    setBlockThreshold: vi.fn(),
  },
  validateAIContent: vi.fn().mockResolvedValue({
    outcome: "pass",
    matches: [],
    warnings: [],
    blocks: [],
    ruleSetVersion: "1.0",
  }),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerKycAmlRoutes } from "../routes/kyc-aml";
import { registerFiduciaryComplianceRoutes } from "../routes/fiduciary-compliance";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", phone: "555-0100", segment: "A", status: "active",
  dateOfBirth: "1970-01-15", riskProfile: "moderate", investmentObjective: "growth",
  notes: null, address: null, city: null, state: null, zipCode: null, occupation: null,
  employer: null, annualIncome: null, netWorth: null, taxBracket: null, maritalStatus: null,
  dependents: null, lastContactDate: null, nextReviewDate: null, onboardingStatus: "complete",
  ssn: null, beneficiaries: null, insurancePolicies: null,
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerKycAmlRoutes(app);
  registerFiduciaryComplianceRoutes(app);
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

describe("KYC/AML API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/kyc/dashboard", () => {
    it("should return KYC dashboard for advisor", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/kyc/dashboard");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("summary");
      expect(res.body).toHaveProperty("screeningConfig");
      expect(res.body).toHaveProperty("riskRatings");
      expect(res.body).toHaveProperty("screeningResults");
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/kyc/dashboard");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/kyc/clients/:clientId/rate", () => {
    it("should rate client risk", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/kyc/clients/client-1/rate").send({
        pepStatus: false,
        sourceOfWealth: "employment",
      });
      expect(res.status).toBe(200);
      expect(ms.createKycRiskRating).toHaveBeenCalled();
      expect(ms.createKycAuditLog).toHaveBeenCalled();
    });

    it("should return 404 for unknown client", async () => {
      ms.getClient.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/kyc/clients/unknown/rate").send({ pepStatus: false });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/kyc/clients/:clientId/screen", () => {
    it("should screen client against watchlists", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/kyc/clients/client-1/screen");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("results");
      expect(res.body).toHaveProperty("matchesFound");
    });

    it("should return 404 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/kyc/clients/nonexistent/screen");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/kyc/screening/:id/resolve", () => {
    it("should resolve screening result", async () => {
      ms.getAmlScreeningResultsByAdvisor.mockResolvedValue([
        { id: "sr-1", clientId: "client-1", matchStatus: "potential_match", resolvedAt: null, matchConfidence: 80 },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/kyc/screening/sr-1/resolve").send({
        resolution: "false_positive",
        notes: "Name is similar but different person",
      });
      expect(res.status).toBe(200);
      expect(ms.updateAmlScreeningResult).toHaveBeenCalled();
    });

    it("should reject missing resolution", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/kyc/screening/sr-1/resolve").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/kyc/edd/:id", () => {
    it("should update EDD record", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/kyc/edd/edd-1").send({
        status: "in_progress",
        findings: "Additional documentation collected",
      });
      expect(res.status).toBe(200);
      expect(ms.updateEddRecord).toHaveBeenCalled();
    });
  });
});

describe("Fiduciary Compliance API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/fiduciary/validate", () => {
    it("should validate content and return result", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/fiduciary/validate").send({
        content: "This stock is guaranteed to double in value next year",
        contentType: "email",
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("outcome");
    });

    it("should reject empty content", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/fiduciary/validate").send({
        content: "",
        contentType: "email",
      });
      expect(res.status).toBe(400);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).post("/api/fiduciary/validate").send({
        content: "Test content", contentType: "email",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/fiduciary/rules", () => {
    it("should return available rules", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/fiduciary/rules");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("rules");
      expect(res.body).toHaveProperty("config");
    });
  });

  describe("GET /api/fiduciary/stats", () => {
    it("should return validation stats", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/fiduciary/stats");
      expect(res.status).toBe(200);
    });
  });
});
