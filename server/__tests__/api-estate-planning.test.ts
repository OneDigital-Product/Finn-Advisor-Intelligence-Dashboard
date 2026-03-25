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
    getTrustsByClient: vi.fn().mockResolvedValue([]),
    getEstateExemptions: vi.fn().mockResolvedValue([]),
    getGiftHistory: vi.fn().mockResolvedValue([]),
    getBusinessEntitiesByClient: vi.fn().mockResolvedValue([]),
    getFlpStructuresByClient: vi.fn().mockResolvedValue([]),
    getCrtsByClient: vi.fn().mockResolvedValue([]),
    getTrustRelationships: vi.fn().mockResolvedValue([]),
    createTrust: vi.fn().mockResolvedValue({ id: "trust-1", clientId: "client-1", trustType: "GRAT", name: "Test GRAT" }),
    getTrust: vi.fn(),
    updateTrust: vi.fn().mockResolvedValue({ id: "trust-1" }),
    deleteTrust: vi.fn().mockResolvedValue(undefined),
    createTrustRelationship: vi.fn().mockResolvedValue({ id: "tr-1" }),
    getTrustRelationship: vi.fn(),
    deleteTrustRelationship: vi.fn().mockResolvedValue(undefined),
    createEstateExemption: vi.fn().mockResolvedValue({ id: "ex-1" }),
    getEstateExemption: vi.fn(),
    updateEstateExemption: vi.fn().mockResolvedValue({ id: "ex-1" }),
    createGiftHistoryEntry: vi.fn().mockResolvedValue({ id: "g-1" }),
    getGiftHistoryEntry: vi.fn(),
    deleteGiftHistoryEntry: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../engines/estate-tax-engine", () => ({
  computeFullEstateAnalysis: vi.fn().mockReturnValue({ totalTax: 0, effectiveRate: 0 }),
  computeEstateTax: vi.fn().mockReturnValue({ estimatedTax: 500000, effectiveRate: 0.20, taxableEstate: 10000000 }),
  computeSunsetComparison: vi.fn().mockReturnValue({ current: {}, postSunset: {} }),
  computeGRATAnalysis: vi.fn().mockReturnValue({}),
  computeGSTTracking: vi.fn().mockReturnValue({}),
  computeLifetimeExemptionTracker: vi.fn().mockReturnValue({}),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerEstatePlanningRoutes } from "../routes/estate-planning";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", status: "active", notes: null,
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerEstatePlanningRoutes(app);
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

describe("Estate Planning API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/clients/:clientId/estate-planning", () => {
    it("should return estate planning data for authorized client", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/estate-planning");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("trusts");
      expect(res.body).toHaveProperty("exemptions");
      expect(res.body).toHaveProperty("gifts");
      expect(res.body).toHaveProperty("summary");
      expect(res.body).toHaveProperty("trustTypes");
      expect(res.body.summary).toHaveProperty("currentFederalExemption");
    });

    it("should deny access to unauthorized client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other-advisor" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/estate-planning");
      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/clients/client-1/estate-planning");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/estate-planning/trusts", () => {
    it("should create a trust", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/estate-planning/trusts").send({
        clientId: "client-1", advisorId: "advisor-1", trustType: "GRAT", name: "Test GRAT",
      });
      expect(res.status).toBe(200);
      expect(ms.createTrust).toHaveBeenCalled();
    });

    it("should reject missing required fields", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/estate-planning/trusts").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/estate-planning/trusts/:id", () => {
    it("should update an existing trust", async () => {
      ms.getTrust.mockResolvedValue({ id: "trust-1", clientId: "client-1" });
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/estate-planning/trusts/trust-1").send({ name: "Updated GRAT" });
      expect(res.status).toBe(200);
    });

    it("should return 404 for non-existent trust", async () => {
      ms.getTrust.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/estate-planning/trusts/nonexistent").send({ name: "Test" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/estate-planning/trusts/:id", () => {
    it("should delete a trust", async () => {
      ms.getTrust.mockResolvedValue({ id: "trust-1", clientId: "client-1" });
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.delete("/api/estate-planning/trusts/trust-1");
      expect(res.status).toBe(200);
      expect(ms.deleteTrust).toHaveBeenCalledWith("trust-1");
    });
  });

  describe("POST /api/estate-planning/gifts", () => {
    it("should record a gift", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/estate-planning/gifts").send({
        clientId: "client-1", recipientName: "Jane Doe",
        giftDate: "2024-06-15", giftValue: "18000",
      });
      expect(res.status).toBe(200);
      expect(ms.createGiftHistoryEntry).toHaveBeenCalled();
    });
  });

  describe("POST /api/estate-planning/compute-tax", () => {
    it("should compute estate tax", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/estate-planning/compute-tax").send({
        totalEstateValue: 15000000,
        maritalDeduction: 0,
        charitableDeduction: 0,
        lifetimeGiftsUsed: 1000000,
        isMarried: false,
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("estateTax");
      expect(res.body).toHaveProperty("sunsetComparison");
    });
  });

  describe("GET /api/estate-planning/trust-types", () => {
    it("should return trust type reference data", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/estate-planning/trust-types");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("GRAT");
      expect(res.body).toHaveProperty("SLAT");
      expect(res.body).toHaveProperty("CRT");
    });
  });
});
