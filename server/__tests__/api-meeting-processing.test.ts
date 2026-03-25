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
    getMeeting: vi.fn(),
    updateMeeting: vi.fn().mockResolvedValue({}),
    getMeetingProcessConfig: vi.fn().mockResolvedValue(null),
    upsertMeetingProcessConfig: vi.fn().mockResolvedValue({
      autoCreateTasks: true, syncToSalesforce: true,
      generateFollowUpEmail: true, defaultTaskPriority: "medium", defaultTaskDueDays: 7,
    }),
    getAlertDashboardSummary: vi.fn().mockResolvedValue({
      total: 5, unread: 2, critical: 1, categories: {},
    }),
    dismissAlert: vi.fn(),
    getAlertConfig: vi.fn().mockResolvedValue({ alerts: [] }),
    upsertAlertConfig: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock("../openai", () => ({
  isAIAvailable: () => false,
  generateFollowUpEmail: vi.fn().mockResolvedValue("Dear John,\n\nThank you for our meeting today."),
}));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../engines/meeting-pipeline", () => {
  const MeetingPipeline = vi.fn();
  MeetingPipeline.prototype.process = vi.fn().mockResolvedValue({
    tasksCreated: 3, emailGenerated: true, salesforceSync: false,
  });
  return { MeetingPipeline };
});
vi.mock("../engines/alert-engine", () => {
  const AlertEngine = vi.fn();
  AlertEngine.prototype.run = vi.fn().mockResolvedValue({
    generated: 5, types: ["portfolio_drift", "review_due"],
  });
  AlertEngine.prototype.pruneDismissedAlerts = vi.fn().mockResolvedValue(3);
  return { AlertEngine };
});

import { registerAuthRoutes } from "../routes/auth";
import { registerMeetingProcessingRoutes } from "../routes/meeting-processing";
import { registerAlertGenerationRoutes } from "../routes/alert-generation";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerMeetingProcessingRoutes(app);
  registerAlertGenerationRoutes(app);
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

describe("Meeting Processing API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/meetings/:id/process", () => {
    it("should process meeting with default config", async () => {
      ms.getMeeting.mockResolvedValue({
        id: "meeting-1", advisorId: "advisor-1", clientId: "client-1",
        title: "Quarterly Review", notes: "Review portfolio performance",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/process");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tasksCreated");
    });

    it("should reject processing meeting of another advisor", async () => {
      ms.getMeeting.mockResolvedValue({
        id: "meeting-1", advisorId: "other-advisor", clientId: "client-1",
        title: "Review",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/process");
      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent meeting", async () => {
      ms.getMeeting.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/nonexistent/process");
      expect(res.status).toBe(404);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).post("/api/meetings/meeting-1/process");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/meetings/:id/process/email", () => {
    it("should generate follow-up email", async () => {
      ms.getMeeting.mockResolvedValue({
        id: "meeting-1", advisorId: "advisor-1", clientId: "client-1",
        title: "Quarterly Review", transcriptSummary: "Discussed portfolio rebalancing",
      });
      ms.getClient.mockResolvedValue({
        id: "client-1", firstName: "John", lastName: "Doe", email: "john@test.com",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/process/email");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("email");
      expect(res.body.email).toHaveProperty("to");
      expect(res.body.email).toHaveProperty("subject");
      expect(res.body.email).toHaveProperty("body");
    });

    it("should return 400 when meeting has no content", async () => {
      ms.getMeeting.mockResolvedValue({
        id: "meeting-1", advisorId: "advisor-1", clientId: "client-1",
        title: "Empty", transcriptSummary: null, notes: null,
      });
      ms.getClient.mockResolvedValue({
        id: "client-1", firstName: "John", lastName: "Doe", email: "john@test.com",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/process/email");
      expect(res.status).toBe(400);
    });

    it("should return 400 when meeting has no client", async () => {
      ms.getMeeting.mockResolvedValue({
        id: "meeting-1", advisorId: "advisor-1", clientId: null,
        title: "No Client Meeting", transcriptSummary: "Some notes",
      });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/meetings/meeting-1/process/email");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/meetings/:id/process/config", () => {
    it("should return default config when none exists", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/meetings/any-id/process/config");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("autoCreateTasks", true);
      expect(res.body).toHaveProperty("syncToSalesforce", true);
      expect(res.body).toHaveProperty("defaultTaskPriority", "medium");
    });
  });

  describe("PATCH /api/meetings/:id/process/config", () => {
    it("should update process config", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/meetings/any-id/process/config").send({
        autoCreateTasks: false,
        defaultTaskDueDays: 14,
      });
      expect(res.status).toBe(200);
      expect(ms.upsertMeetingProcessConfig).toHaveBeenCalled();
    });
  });
});

describe("Alert Generation API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/alerts/generate", () => {
    it("should generate alerts for advisor", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/alerts/generate").send({
        types: ["portfolio_drift", "review_due"],
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("generated");
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).post("/api/alerts/generate");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/alerts/dashboard", () => {
    it("should return alert dashboard summary", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/alerts/dashboard");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("total");
    });
  });

  describe("PATCH /api/alerts/:id/dismiss", () => {
    it("should dismiss an alert", async () => {
      ms.dismissAlert.mockResolvedValue({ id: "alert-1" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/alert-1/dismiss");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent alert", async () => {
      ms.dismissAlert.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/nonexistent/dismiss");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/alerts/config", () => {
    it("should return alert configuration", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/alerts/config");
      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /api/alerts/config", () => {
    it("should update alert configuration", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/config").send({
        alertType: "portfolio_drift",
        enabled: true,
        threshold: 5,
      });
      expect(res.status).toBe(200);
      expect(ms.upsertAlertConfig).toHaveBeenCalled();
    });

    it("should reject missing alertType", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/alerts/config").send({
        enabled: true,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/alerts/prune", () => {
    it("should prune dismissed alerts", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/alerts/prune");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("pruned");
    });
  });
});
