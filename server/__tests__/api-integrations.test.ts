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
    getRecentSalesforceSyncLogs: vi.fn(),
    getRecentOrionSyncLogs: vi.fn(),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    getMeetings: vi.fn().mockResolvedValue([]),
    getFilteredAlerts: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getClients: vi.fn().mockResolvedValue([]),
    getHouseholds: vi.fn().mockResolvedValue([]),
    getClientsByAssociate: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));

vi.mock("../integrations/salesforce/client", () => ({
  isSalesforceEnabled: vi.fn().mockReturnValue(false),
  validateConnection: vi.fn().mockResolvedValue(false),
}));
vi.mock("../integrations/salesforce/sync", () => ({ syncTask: vi.fn(), syncMeeting: vi.fn(), batchSync: vi.fn() }));
vi.mock("../integrations/salesforce/inbound", () => ({ syncContacts: vi.fn(), syncAccounts: vi.fn() }));
vi.mock("../integrations/salesforce/reconciliation", () => ({ generateFullReport: vi.fn() }));

vi.mock("../integrations/orion/client", () => ({
  isOrionEnabled: vi.fn().mockReturnValue(false),
  validateConnection: vi.fn().mockResolvedValue(false),
}));
vi.mock("../integrations/orion/portfolio-sync", () => ({ syncAllAccounts: vi.fn() }));
vi.mock("../integrations/orion/reconciliation", () => ({ reconcileAccounts: vi.fn() }));

vi.mock("../integrations/zoom/client", () => ({
  isZoomEnabled: vi.fn().mockReturnValue(false),
  validateConnection: vi.fn().mockResolvedValue(false),
}));
vi.mock("../integrations/zoom/meetings", () => ({ createZoomMeeting: vi.fn() }));
vi.mock("../integrations/zoom/webhooks", () => ({ handleRecordingComplete: vi.fn(), verifyZoomSignature: vi.fn() }));

import { registerAuthRoutes } from "../routes/auth";
import { registerSalesforceRoutes } from "../routes/salesforce";
import { registerOrionRoutes } from "../routes/orion";
import { registerZoomRoutes } from "../routes/zoom";
import { storage } from "../storage";
import { isSalesforceEnabled, validateConnection as sfValidateConn } from "../integrations/salesforce/client";
import { isOrionEnabled } from "../integrations/orion/client";
import { isZoomEnabled } from "../integrations/zoom/client";
import { batchSync } from "../integrations/salesforce/sync";
import { syncAllAccounts } from "../integrations/orion/portfolio-sync";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerSalesforceRoutes(app);
  registerOrionRoutes(app);
  registerZoomRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
  });
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Integration API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor" });
  });

  describe("Salesforce", () => {
    it("GET /api/integrations/salesforce/status - disabled", async () => {
      vi.mocked(isSalesforceEnabled).mockReturnValue(false);
      ms.getRecentSalesforceSyncLogs.mockResolvedValue([]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/salesforce/status");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ enabled: false, authenticated: false }));
    });

    it("GET /api/integrations/salesforce/status - enabled with logs", async () => {
      vi.mocked(isSalesforceEnabled).mockReturnValue(true);
      vi.mocked(sfValidateConn).mockResolvedValue(true);
      ms.getRecentSalesforceSyncLogs.mockResolvedValue([{ id: "log-1", syncedAt: "2026-03-10" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/salesforce/status");

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.recentSyncs).toHaveLength(1);
    });

    it("should return 401 when not authenticated", async () => {
      expect((await request(app).get("/api/integrations/salesforce/status")).status).toBe(401);
    });

    it("POST /api/integrations/salesforce/sync - disabled", async () => {
      vi.mocked(isSalesforceEnabled).mockReturnValue(false);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/salesforce/sync");

      expect(res.status).toBe(400);
    });

    it("POST /api/integrations/salesforce/sync - enabled", async () => {
      vi.mocked(isSalesforceEnabled).mockReturnValue(true);
      // @ts-expect-error - partial mock return for sync result
      vi.mocked(batchSync).mockResolvedValue({ synced: 5, errors: 0 });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/salesforce/sync").query({ direction: "outbound", recordTypes: ["Task"] });

      expect(res.status).toBe(200);
    });
  });

  describe("Orion", () => {
    it("GET /api/integrations/orion/status - disabled", async () => {
      vi.mocked(isOrionEnabled).mockReturnValue(false);
      ms.getRecentOrionSyncLogs.mockResolvedValue([]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/orion/status");

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });

    it("POST /api/integrations/orion/sync - disabled", async () => {
      vi.mocked(isOrionEnabled).mockReturnValue(false);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.post("/api/integrations/orion/sync")).status).toBe(400);
    });

    it("POST /api/integrations/orion/sync - enabled", async () => {
      vi.mocked(isOrionEnabled).mockReturnValue(true);
      // @ts-expect-error - partial mock return for sync result
      vi.mocked(syncAllAccounts).mockResolvedValue({ synced: 10, errors: 0, total: 10 });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/orion/sync");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Zoom", () => {
    it("GET /api/integrations/zoom/status - disabled", async () => {
      vi.mocked(isZoomEnabled).mockReturnValue(false);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/zoom/status");

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });

    it("POST /api/integrations/zoom/meetings - disabled", async () => {
      vi.mocked(isZoomEnabled).mockReturnValue(false);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/meetings").send({ meetingId: "m-1" });

      expect(res.status).toBe(400);
    });

    it("POST /api/integrations/zoom/meetings - missing meetingId", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/meetings").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("meetingId required");
    });
  });
});
