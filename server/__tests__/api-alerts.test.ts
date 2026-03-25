import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

vi.mock("../storage", () => {
  return {
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
      getAlertDashboardSummary: vi.fn(),
      dismissAlert: vi.fn(),
      getAlertConfig: vi.fn(),
      upsertAlertConfig: vi.fn(),
    },
  };
});
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("../engines/alert-engine", () => {
  const MockAlertEngine = vi.fn();
  MockAlertEngine.prototype.run = vi.fn().mockResolvedValue({ generated: 3, alerts: [] });
  MockAlertEngine.prototype.pruneDismissedAlerts = vi.fn().mockResolvedValue(2);
  return { AlertEngine: MockAlertEngine };
});
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn(),
}));
vi.mock("@shared/schema", () => ({
  approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {},
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerAlertGenerationRoutes } from "../routes/alert-generation";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerAlertGenerationRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: request.SuperAgentTest) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    title: "Senior Advisor", avatarUrl: null, onboardingCompleted: true, passwordHash,
  } as ReturnType<typeof ms.getAdvisorByEmail> extends Promise<infer T> ? T : never);
  ms.getAdvisor.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    title: "Senior Advisor", avatarUrl: null, onboardingCompleted: true, passwordHash,
  } as ReturnType<typeof ms.getAdvisor> extends Promise<infer T> ? T : never);
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Alerts API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/alerts/generate", () => {
    it("should generate alerts for authenticated advisor", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/alerts/generate").send({ types: ["compliance"] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated requests", async () => {
      const res = await request(app).post("/api/alerts/generate");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/alerts/dashboard", () => {
    it("should return dashboard summary", async () => {
      const summary = { total: 5, dismissed: 2, active: 3 };
      ms.getAlertDashboardSummary.mockResolvedValue(summary as ReturnType<typeof ms.getAlertDashboardSummary> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/alerts/dashboard");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(summary);
    });

    it("should reject unauthenticated requests", async () => {
      const res = await request(app).get("/api/alerts/dashboard");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/alerts/:id/dismiss", () => {
    it("should dismiss an alert", async () => {
      ms.dismissAlert.mockResolvedValue({ id: "alert-1", dismissed: true } as ReturnType<typeof ms.dismissAlert> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/alert-1/dismiss");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 404 for non-existent alert", async () => {
      ms.dismissAlert.mockResolvedValue(null as ReturnType<typeof ms.dismissAlert> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/nonexistent/dismiss");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/alerts/config", () => {
    it("should return alert configuration", async () => {
      const config = { alertTypes: [{ type: "compliance", enabled: true }] };
      ms.getAlertConfig.mockResolvedValue(config as ReturnType<typeof ms.getAlertConfig> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/alerts/config");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(config);
    });
  });

  describe("PATCH /api/alerts/config", () => {
    it("should update alert configuration", async () => {
      const updatedConfig = { alertType: "compliance", enabled: false };
      ms.upsertAlertConfig.mockResolvedValue(updatedConfig as ReturnType<typeof ms.upsertAlertConfig> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/config").send({ alertType: "compliance", enabled: false });
      expect(res.status).toBe(200);
    });

    it("should require alertType", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/config").send({ enabled: false });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/alerts/prune", () => {
    it("should prune dismissed alerts", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/alerts/prune");
      expect(res.status).toBe(200);
    });
  });
});
