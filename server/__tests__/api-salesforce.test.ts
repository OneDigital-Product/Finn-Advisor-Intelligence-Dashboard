import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

const {
  mockIsSalesforceEnabled,
  mockValidateConnection,
  mockBatchSync,
  mockSyncContacts,
  mockSyncAccounts,
  mockGenerateFullReport,
} = vi.hoisted(() => ({
  mockIsSalesforceEnabled: vi.fn(),
  mockValidateConnection: vi.fn(),
  mockBatchSync: vi.fn(),
  mockSyncContacts: vi.fn(),
  mockSyncAccounts: vi.fn(),
  mockGenerateFullReport: vi.fn(),
}));

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
    getRecentSalesforceSyncLogs: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({ db: {} }));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {} }));
vi.mock("../integrations/salesforce/client", () => ({
  isSalesforceEnabled: mockIsSalesforceEnabled,
  validateConnection: mockValidateConnection,
}));
vi.mock("../integrations/salesforce/sync", () => ({
  syncTask: vi.fn(),
  syncMeeting: vi.fn(),
  batchSync: mockBatchSync,
}));
vi.mock("../integrations/salesforce/inbound", () => ({
  syncContacts: mockSyncContacts,
  syncAccounts: mockSyncAccounts,
}));
vi.mock("../integrations/salesforce/reconciliation", () => ({
  generateFullReport: mockGenerateFullReport,
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerSalesforceRoutes } from "../routes/salesforce";
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
  registerSalesforceRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue(mockAdvisor);
  ms.getAdvisor.mockResolvedValue(mockAdvisor);
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Salesforce Integration API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SALESFORCE_WEBHOOK_SECRET = "test-sf-webhook-secret";
    app = createApp();
  });

  describe("GET /api/integrations/salesforce/status", () => {
    it("should return disabled status when Salesforce is not enabled", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      mockIsSalesforceEnabled.mockReturnValue(false);

      const res = await agent.get("/api/integrations/salesforce/status");
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
      expect(res.body.authenticated).toBe(false);
    });

    it("should return enabled and authenticated status", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      mockIsSalesforceEnabled.mockReturnValue(true);
      mockValidateConnection.mockResolvedValue(true);
      ms.getRecentSalesforceSyncLogs.mockResolvedValue([
        { syncedAt: "2024-01-15T10:00:00Z", recordType: "Task", direction: "outbound" },
      ]);

      const res = await agent.get("/api/integrations/salesforce/status");
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.recentSyncs).toHaveLength(1);
      expect(res.body.lastSync).toBe("2024-01-15T10:00:00Z");
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/integrations/salesforce/status");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/integrations/salesforce/sync", () => {
    it("should perform outbound sync of tasks and meetings", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      mockIsSalesforceEnabled.mockReturnValue(true);
      mockBatchSync.mockResolvedValue({ synced: 5, errors: 0 });

      const res = await agent.post("/api/integrations/salesforce/sync")
        .query({ direction: "outbound", recordTypes: ["Task", "Event"] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.direction).toBe("outbound");
    });

    it("should perform inbound sync of contacts", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      mockIsSalesforceEnabled.mockReturnValue(true);
      mockSyncContacts.mockResolvedValue({ imported: 3, updated: 1 });

      const res = await agent.post("/api/integrations/salesforce/sync")
        .query({ direction: "inbound", recordTypes: ["Contact"] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.direction).toBe("inbound");
    });

    it("should reject when Salesforce is not enabled", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      mockIsSalesforceEnabled.mockReturnValue(false);

      const res = await agent.post("/api/integrations/salesforce/sync");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("not enabled");
    });
  });

  describe("POST /api/integrations/salesforce/reconcile", () => {
    it("should generate reconciliation report", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      mockIsSalesforceEnabled.mockReturnValue(true);
      mockGenerateFullReport.mockResolvedValue({
        missingInSalesforce: 2,
        missingLocally: 1,
        mismatches: 0,
      });

      const res = await agent.post("/api/integrations/salesforce/reconcile");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.report.missingInSalesforce).toBe(2);
    });

    it("should reject when Salesforce is not enabled", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      mockIsSalesforceEnabled.mockReturnValue(false);

      const res = await agent.post("/api/integrations/salesforce/reconcile");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/integrations/salesforce/webhook", () => {
    it("should accept webhook payload", async () => {
      const { createHmac } = await import("crypto");
      const body = JSON.stringify({ type: "update", id: "sf-123" });
      const signature = createHmac("sha256", "test-sf-webhook-secret").update(body).digest("hex");
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent
        .post("/api/integrations/salesforce/webhook")
        .set("x-sf-signature", signature)
        .set("Content-Type", "application/json")
        .send(body);
      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });
});
