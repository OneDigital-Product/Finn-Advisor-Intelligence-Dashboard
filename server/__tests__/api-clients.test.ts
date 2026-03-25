import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

vi.mock("../storage", () => ({
  storage: {
    getAdvisor: vi.fn(),
    getAdvisorByEmail: vi.fn(),
    getAssociateByEmail: vi.fn(),
    getFirstAdvisor: vi.fn(),
    updateAdvisor: vi.fn(),
    getClient: vi.fn(),
    getClients: vi.fn(),
    searchClients: vi.fn(),
    getClientsByAssociate: vi.fn(),
    getAccountsByClient: vi.fn(),
    getHoldingsByClient: vi.fn(),
    getHoldingsByAccount: vi.fn(),
    getActivitiesByClient: vi.fn(),
    getTasksByClient: vi.fn(),
    getTasksByMeeting: vi.fn(),
    getMeetingsByClient: vi.fn(),
    getDocumentsByClient: vi.fn(),
    getComplianceItemsByClient: vi.fn(),
    getLifeEvents: vi.fn(),
    getPerformanceByHousehold: vi.fn(),
    getHouseholdMembers: vi.fn(),
    getTransactionsByAccount: vi.fn(),
    getDocumentChecklist: vi.fn(),
    getAlternativeAssetsByClient: vi.fn(),
    getClientTeamMembers: vi.fn(),
    addClientTeamMember: vi.fn(),
    removeClientTeamMember: vi.fn(),
    getAllAssociates: vi.fn(),
    createAssociate: vi.fn(),
    updateAssociate: vi.fn(),
    deleteAssociate: vi.fn(),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    getMeetings: vi.fn().mockResolvedValue([]),
    getFilteredAlerts: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getHouseholds: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));

import { registerAuthRoutes } from "../routes/auth";
import { registerClientRoutes } from "../routes/clients";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerClientRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
  });
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

async function loginAsAssociate(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue(null);
  ms.getAssociateByEmail.mockResolvedValue({
    id: "associate-1", name: "Test Associate", email: "associate@test.com",
    passwordHash, role: "analyst", active: true, avatarUrl: null,
  });
  await agent.post("/api/auth/login").send({ email: "associate@test.com", password: testPassword });
}

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", phone: "555-0100", segment: "A", status: "active",
  dateOfBirth: "1970-01-15", riskProfile: "moderate", investmentObjective: "growth",
  notes: null, address: null, city: null, state: null, zipCode: null, occupation: null,
  employer: null, annualIncome: null, netWorth: null, taxBracket: null, maritalStatus: null,
  dependents: null, lastContactDate: null, nextReviewDate: null, onboardingStatus: "complete",
  ssn: null, beneficiaries: null, insurancePolicies: null,
};

const mockAccount = {
  id: "account-1", clientId: "client-1", householdId: "household-1",
  accountNumber: "ACC-001", accountType: "Individual", custodian: "Schwab",
  balance: "500000", taxStatus: "taxable", model: "Growth", status: "active",
};

describe("Client API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor" });
    ms.getFirstAdvisor.mockResolvedValue({ id: "advisor-1" });
  });

  describe("GET /api/clients", () => {
    it("should return clients list for advisor", async () => {
      ms.getClients.mockResolvedValue([mockClient]);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty("totalAum", 500000);
      expect(res.body[0]).toHaveProperty("accountCount", 1);
    });

    it("should search clients when query provided", async () => {
      ms.searchClients.mockResolvedValue([mockClient]);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients?search=John");

      expect(res.status).toBe(200);
      expect(ms.searchClients).toHaveBeenCalledWith("advisor-1", "John");
    });

    it("should return assigned clients for associate", async () => {
      ms.getClientsByAssociate.mockResolvedValue([mockClient]);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);

      const agent = request.agent(app);
      await loginAsAssociate(agent);
      const res = await agent.get("/api/clients");

      expect(res.status).toBe(200);
      expect(ms.getClientsByAssociate).toHaveBeenCalledWith("associate-1");
    });

    it("should return 401 when not authenticated", async () => {
      const res = await request(app).get("/api/clients");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/clients/:id", () => {
    it("should return client details with related data", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      ms.getActivitiesByClient.mockResolvedValue([]);
      ms.getTasksByClient.mockResolvedValue([]);
      ms.getMeetingsByClient.mockResolvedValue([]);
      ms.getDocumentsByClient.mockResolvedValue([]);
      ms.getComplianceItemsByClient.mockResolvedValue([]);
      ms.getLifeEvents.mockResolvedValue([]);
      ms.getHoldingsByClient.mockResolvedValue([]);
      ms.getDocumentChecklist.mockResolvedValue([]);
      ms.getAlternativeAssetsByClient.mockResolvedValue([]);
      ms.getPerformanceByHousehold.mockResolvedValue([]);
      ms.getHouseholdMembers.mockResolvedValue([]);
      ms.getTransactionsByAccount.mockResolvedValue([]);
      ms.getTasksByMeeting.mockResolvedValue([]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("client");
      expect(res.body).toHaveProperty("accounts");
      expect(res.body).toHaveProperty("totalAum", 500000);
    });

    it("should return 404 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/nonexistent");

      expect(res.status).toBe(404);
    });

    it("should deny associate access to unassigned client", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getClientsByAssociate.mockResolvedValue([]);

      const agent = request.agent(app);
      await loginAsAssociate(agent);
      const res = await agent.get("/api/clients/client-1");

      expect(res.status).toBe(403);
    });
  });

  describe("Client Team Management", () => {
    it("GET /api/clients/:clientId/team should return team members without password", async () => {
      ms.getClientTeamMembers.mockResolvedValue([
        { id: "tm-1", clientId: "client-1", associateId: "a-1", role: "support", associate: { id: "a-1", name: "Test", passwordHash: "secret" } },
      ]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/team");

      expect(res.status).toBe(200);
      expect(res.body[0].associate).not.toHaveProperty("passwordHash");
    });

    it("POST /api/clients/:clientId/team should add team member", async () => {
      ms.getClientTeamMembers.mockResolvedValue([]);
      ms.addClientTeamMember.mockResolvedValue({ id: "tm-1", clientId: "client-1", associateId: "a-1", role: "support" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/team").send({ associateId: "a-1" });

      expect(res.status).toBe(200);
    });

    it("POST /api/clients/:clientId/team should reject duplicates", async () => {
      ms.getClientTeamMembers.mockResolvedValue([{ id: "tm-1", associateId: "a-1" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/team").send({ associateId: "a-1" });

      expect(res.status).toBe(400);
    });

    it("should reject team addition by associate", async () => {
      const agent = request.agent(app);
      await loginAsAssociate(agent);
      const res = await agent.post("/api/clients/client-1/team").send({ associateId: "a-2" });

      expect(res.status).toBe(403);
    });
  });

  describe("Associate CRUD", () => {
    it("GET /api/associates should omit password hashes", async () => {
      ms.getAllAssociates.mockResolvedValue([{ id: "a-1", name: "A1", email: "a1@test.com", passwordHash: "secret" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/associates");

      expect(res.status).toBe(200);
      expect(res.body[0]).not.toHaveProperty("passwordHash");
    });

    it("POST /api/associates should create associate", async () => {
      ms.getAssociateByEmail.mockResolvedValue(null);
      ms.createAssociate.mockResolvedValue({ id: "new-1", name: "New", email: "new@test.com", role: "analyst", passwordHash: "hash" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/associates").send({ name: "New", email: "new@test.com", password: "Pass123!" });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("POST /api/associates should reject duplicate email", async () => {
      ms.getAssociateByEmail.mockResolvedValue({ id: "existing-1" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/associates").send({ name: "Dup", email: "dup@test.com", password: "Pass123!" });

      expect(res.status).toBe(400);
    });

    it("PATCH /api/associates/:id should update associate", async () => {
      ms.updateAssociate.mockResolvedValue({ id: "a-1", name: "Updated", email: "a1@test.com", role: "senior", passwordHash: "hash" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/associates/a-1").send({ name: "Updated", role: "senior" });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("DELETE /api/associates/:id should delete", async () => {
      ms.deleteAssociate.mockResolvedValue(undefined);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.delete("/api/associates/a-1");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("should reject associate CRUD by non-advisor", async () => {
      const agent = request.agent(app);
      await loginAsAssociate(agent);

      expect((await agent.post("/api/associates").send({ name: "T", email: "t@t.com", password: "P123!" })).status).toBe(403);
      expect((await agent.delete("/api/associates/a-1")).status).toBe(403);
      expect((await agent.patch("/api/associates/a-1").send({ name: "X" })).status).toBe(403);
    });
  });

  describe("GET /api/accounts/:accountId/holdings", () => {
    it("should return holdings for an account", async () => {
      ms.getHoldingsByAccount.mockResolvedValue([{ id: "h-1", ticker: "AAPL", name: "Apple", shares: "100" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/accounts/account-1/holdings");

      expect(res.status).toBe(200);
      expect(res.body[0].ticker).toBe("AAPL");
    });
  });
});
