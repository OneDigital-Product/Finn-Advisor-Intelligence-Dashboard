import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    getRecentOrionSyncLogs: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../integrations/orion/client", () => ({
  isOrionEnabled: vi.fn().mockReturnValue(true),
  validateConnection: vi.fn().mockResolvedValue(true),
}));
vi.mock("../integrations/orion/portfolio-sync", () => ({
  syncAllAccounts: vi.fn().mockResolvedValue({ synced: 10, errors: [] }),
}));
vi.mock("../integrations/orion/reconciliation", () => ({
  reconcileAccounts: vi.fn().mockResolvedValue({ matched: 8, mismatched: 2, details: [] }),
}));
vi.mock("../integrations/zoom/client", () => ({
  isZoomEnabled: vi.fn().mockReturnValue(true),
  validateConnection: vi.fn().mockResolvedValue(true),
}));
vi.mock("../integrations/zoom/meetings", () => ({
  createZoomMeeting: vi.fn().mockResolvedValue({ meetingUrl: "https://zoom.us/j/123", id: "z-123" }),
}));
vi.mock("../integrations/zoom/webhooks", () => ({
  handleRecordingComplete: vi.fn().mockResolvedValue(undefined),
  verifyZoomSignature: vi.fn().mockReturnValue(true),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerOrionRoutes } from "../routes/orion";
import { registerZoomRoutes } from "../routes/zoom";
import { storage } from "../storage";
import { isOrionEnabled } from "../integrations/orion/client";
import { isZoomEnabled } from "../integrations/zoom/client";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerOrionRoutes(app);
  registerZoomRoutes(app);
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

describe("Orion Integration API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isOrionEnabled).mockReturnValue(true);
    app = createApp();
  });

  describe("GET /api/integrations/orion/status", () => {
    it("should return Orion status when enabled", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/orion/status");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("enabled", true);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body).toHaveProperty("recentSyncs");
    });

    it("should show disabled when Orion not enabled", async () => {
      vi.mocked(isOrionEnabled).mockReturnValue(false);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/orion/status");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("enabled", false);
      expect(res.body).toHaveProperty("authenticated", false);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/integrations/orion/status");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/integrations/orion/sync", () => {
    it("should trigger sync when enabled", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/orion/sync");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("synced");
    });

    it("should reject when Orion not enabled", async () => {
      vi.mocked(isOrionEnabled).mockReturnValue(false);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/orion/sync");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Orion integration not enabled");
    });
  });

  describe("POST /api/integrations/orion/reconcile", () => {
    it("should reconcile accounts when enabled", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/orion/reconcile");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("report");
    });

    it("should reject when Orion not enabled", async () => {
      vi.mocked(isOrionEnabled).mockReturnValue(false);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/orion/reconcile");
      expect(res.status).toBe(400);
    });
  });
});

describe("Zoom Integration API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isZoomEnabled).mockReturnValue(true);
    app = createApp();
  });

  describe("GET /api/integrations/zoom/status", () => {
    it("should return Zoom status when enabled", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/zoom/status");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("enabled", true);
      expect(res.body).toHaveProperty("authenticated", true);
    });

    it("should show disabled when Zoom not enabled", async () => {
      vi.mocked(isZoomEnabled).mockReturnValue(false);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/integrations/zoom/status");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("enabled", false);
    });
  });

  describe("POST /api/integrations/zoom/meetings", () => {
    it("should create Zoom meeting", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/meetings").send({
        meetingId: "meeting-1",
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("meetingUrl");
    });

    it("should reject missing meetingId", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/meetings").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("meetingId required");
    });

    it("should reject when Zoom not enabled", async () => {
      vi.mocked(isZoomEnabled).mockReturnValue(false);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/meetings").send({
        meetingId: "meeting-1",
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Zoom integration not enabled");
    });
  });

  describe("POST /api/integrations/zoom/webhooks", () => {
    it("should handle endpoint validation event (authenticated)", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/webhooks").send({
        event: "endpoint.url_validation",
        payload: { plainToken: "test-token" },
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("plainToken", "test-token");
      expect(res.body).toHaveProperty("encryptedToken");
    });

    it("should handle recording complete event", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/webhooks").send({
        event: "recording.completed",
        payload: { meetingId: "meeting-1" },
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("received", true);
    });

    it("should handle unknown events gracefully", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/integrations/zoom/webhooks").send({
        event: "unknown.event",
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("received", true);
    });
  });
});
