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
    getWithdrawalRequests: vi.fn().mockResolvedValue([]),
    getWithdrawalRequest: vi.fn(),
    createWithdrawalRequest: vi.fn().mockResolvedValue({
      id: "w-1", advisorId: "advisor-1", clientId: "client-1", accountId: "account-1",
      amount: "50000", method: "ach", reason: "RMD distribution", frequency: "one_time",
      status: "pending", taxWithholding: null, notes: null,
    }),
    updateWithdrawalRequest: vi.fn().mockResolvedValue({ id: "w-1", status: "nwr_applied" }),
    createWithdrawalAuditEntry: vi.fn().mockResolvedValue({ id: "wa-1" }),
    getWithdrawalAuditLog: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../integrations/orion/set-aside", () => ({
  createSetAside: vi.fn().mockResolvedValue({ setAsideId: "sa-1" }),
  applyNwrTag: vi.fn().mockResolvedValue({ tagId: "nwr-1" }),
  removeNwrTag: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../integrations/salesforce/withdrawal-case", () => ({
  createWithdrawalCase: vi.fn().mockResolvedValue({ caseId: "case-1", caseNumber: "CN-001" }),
  updateWithdrawalCaseStatus: vi.fn().mockResolvedValue(undefined),
  getWithdrawalCaseStatus: vi.fn().mockResolvedValue({ status: "Working", lastModified: new Date().toISOString() }),
}));
vi.mock("../integrations/salesforce/validate-salesforce-id", () => ({
  isValidSalesforceId: vi.fn().mockReturnValue(true),
}));
vi.mock("../integrations/eclipse/import-generator", () => ({
  generateEclipseImportFile: vi.fn().mockReturnValue({ fileName: "eclipse-import.csv", recordCount: 1, content: "csv-data" }),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerWithdrawalRoutes } from "../routes/withdrawals";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", status: "active",
};

const mockAccount = {
  id: "account-1", clientId: "client-1", accountNumber: "ACC-001",
  accountType: "Individual", balance: "500000", status: "active",
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerWithdrawalRoutes(app);
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

describe("Withdrawal API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/withdrawals", () => {
    it("should return withdrawals for advisor", async () => {
      ms.getWithdrawalRequests.mockResolvedValue([]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/withdrawals");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/withdrawals");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/withdrawals", () => {
    it("should create withdrawal request", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals").send({
        clientId: "client-1",
        accountId: "account-1",
        amount: "50000",
        method: "ach",
        reason: "RMD distribution",
      });
      expect(res.status).toBe(201);
      expect(ms.createWithdrawalRequest).toHaveBeenCalled();
      expect(ms.createWithdrawalAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ action: "request_created" })
      );
    });

    it("should reject invalid method", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals").send({
        clientId: "client-1", accountId: "account-1", amount: "50000",
        method: "bitcoin", reason: "test",
      });
      expect(res.status).toBe(400);
    });

    it("should reject when client not found", async () => {
      ms.getClient.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals").send({
        clientId: "unknown", accountId: "account-1", amount: "50000",
        method: "ach", reason: "test",
      });
      expect(res.status).toBe(404);
    });

    it("should reject negative amount", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals").send({
        clientId: "client-1", accountId: "account-1", amount: "-100",
        method: "ach", reason: "test",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/withdrawals/:id/set-aside", () => {
    it("should create set-aside for pending withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", clientId: "client-1", accountId: "account-1",
        amount: "50000", method: "ach", reason: "RMD", frequency: "one_time",
        status: "pending", orionSetAsideId: null, orionNwrTagId: null,
      });
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/set-aside");
      expect(res.status).toBe(200);
      expect(ms.updateWithdrawalRequest).toHaveBeenCalledWith("w-1", expect.objectContaining({ status: "nwr_applied" }));
    });

    it("should reject set-aside for completed withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", status: "completed",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/set-aside");
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/withdrawals/:id/salesforce-case", () => {
    it("should create Salesforce case for pending withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", clientId: "client-1", accountId: "account-1",
        amount: "50000", method: "ach", reason: "RMD", frequency: "one_time",
        status: "pending", salesforceCaseId: null,
      });
      ms.getClient.mockResolvedValue(mockClient);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      ms.updateWithdrawalRequest.mockResolvedValue({ id: "w-1", status: "sf_case_created" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/salesforce-case");
      expect(res.status).toBe(200);
      expect(ms.updateWithdrawalRequest).toHaveBeenCalledWith("w-1", expect.objectContaining({ status: "sf_case_created" }));
      expect(ms.createWithdrawalAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ action: "salesforce_case_created" })
      );
    });

    it("should reject if case already created", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", status: "sf_case_created",
        salesforceCaseId: "existing-case",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/salesforce-case");
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/withdrawals/:id/eclipse-file", () => {
    it("should generate Eclipse import file", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", clientId: "client-1", accountId: "account-1",
        amount: "50000", method: "ach", reason: "RMD", frequency: "one_time",
        status: "sf_case_created", eclipseFileGenerated: false,
      });
      ms.getClient.mockResolvedValue(mockClient);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      ms.updateWithdrawalRequest.mockResolvedValue({ id: "w-1", status: "eclipse_generated" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/eclipse-file");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("eclipseFile");
      expect(res.body.eclipseFile).toHaveProperty("fileName");
      expect(ms.createWithdrawalAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ action: "eclipse_file_generated" })
      );
    });

    it("should reject for completed withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", status: "completed",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/eclipse-file");
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/withdrawals/:id/confirm-trade", () => {
    it("should confirm trade for eclipse-generated withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", clientId: "client-1", accountId: "account-1",
        status: "eclipse_generated", eclipseFileGenerated: true,
        orionNwrTagId: null, salesforceCaseId: null,
      });
      ms.updateWithdrawalRequest.mockResolvedValue({ id: "w-1", status: "completed" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/confirm-trade");
      expect(res.status).toBe(200);
      expect(ms.updateWithdrawalRequest).toHaveBeenCalledWith("w-1", expect.objectContaining({ status: "completed" }));
    });

    it("should reject if Eclipse file not generated", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", status: "sf_case_created",
        eclipseFileGenerated: false,
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/confirm-trade");
      expect(res.status).toBe(409);
    });

    it("should reject for pending withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", status: "pending",
        eclipseFileGenerated: false,
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/confirm-trade");
      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/withdrawals/:id/cancel", () => {
    it("should cancel a pending withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", clientId: "client-1", accountId: "account-1",
        status: "pending", orionNwrTagId: null, salesforceCaseId: null,
      });
      ms.updateWithdrawalRequest.mockResolvedValue({ id: "w-1", status: "cancelled" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/cancel");
      expect(res.status).toBe(200);
      expect(ms.updateWithdrawalRequest).toHaveBeenCalledWith("w-1", expect.objectContaining({ status: "cancelled" }));
    });

    it("should reject cancelling already completed withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", status: "completed",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/withdrawals/w-1/cancel");
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/withdrawals/:id/audit-log", () => {
    it("should return audit log for authorized withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue({
        id: "w-1", advisorId: "advisor-1", status: "pending",
      });
      ms.getWithdrawalAuditLog.mockResolvedValue([
        { id: "wa-1", action: "request_created", performedBy: "advisor-1" },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/withdrawals/w-1/audit-log");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 404 for non-existent withdrawal", async () => {
      ms.getWithdrawalRequest.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/withdrawals/nonexistent/audit-log");
      expect(res.status).toBe(404);
    });
  });
});
