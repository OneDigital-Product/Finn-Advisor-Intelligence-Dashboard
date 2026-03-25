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
      getLatestAssessment: vi.fn(),
      getAssessmentHistory: vi.fn(),
    },
  };
});
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("../engines/assessment-engine", () => {
  const MockAssessmentEngine = vi.fn();
  MockAssessmentEngine.prototype.assessClient = vi.fn().mockResolvedValue({ overallScore: 85, summary: "Good standing", sections: [] });
  return { AssessmentEngine: MockAssessmentEngine };
});
vi.mock("../pdf/assessment-pdf", () => {
  const MockAssessmentPDF = vi.fn();
  MockAssessmentPDF.prototype.generate = vi.fn().mockResolvedValue(Buffer.from("fake-pdf"));
  return { AssessmentPDF: MockAssessmentPDF };
});
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn(),
}));
vi.mock("@shared/schema", () => ({
  approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {},
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerAssessmentRoutes } from "../routes/assessment";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", phone: "555-0100", status: "active",
  dateOfBirth: null, riskProfile: null, investmentObjective: null,
  annualIncome: null, netWorth: null, notes: null,
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerAssessmentRoutes(app);
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

describe("Assessment API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/clients/:id/assessment", () => {
    it("should generate assessment for owned client", async () => {
      ms.getClient.mockResolvedValue(mockClient as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/assessment");
      expect(res.status).toBe(200);
      expect(res.body.overallScore).toBeDefined();
    });

    it("should reject assessment for non-owned client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other-advisor" } as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/assessment");
      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/nonexistent/assessment");
      expect(res.status).toBe(404);
    });

    it("should reject unauthenticated requests", async () => {
      const res = await request(app).post("/api/clients/client-1/assessment");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/clients/:id/assessment", () => {
    it("should return latest assessment", async () => {
      ms.getClient.mockResolvedValue(mockClient as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      ms.getLatestAssessment.mockResolvedValue({
        id: "assess-1", assessmentData: { overallScore: 85 },
      } as ReturnType<typeof ms.getLatestAssessment> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/assessment");
      expect(res.status).toBe(200);
      expect(res.body.overallScore).toBe(85);
    });

    it("should return 404 when no assessment exists", async () => {
      ms.getClient.mockResolvedValue(mockClient as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      ms.getLatestAssessment.mockResolvedValue(null as ReturnType<typeof ms.getLatestAssessment> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/assessment");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/clients/:id/assessment/history", () => {
    it("should return assessment history", async () => {
      ms.getClient.mockResolvedValue(mockClient as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      ms.getAssessmentHistory.mockResolvedValue([
        { id: "a1", overallScore: 85, summary: "Good", generatedAt: "2025-01-01", expiresAt: "2025-04-01" },
        { id: "a2", overallScore: 72, summary: "Fair", generatedAt: "2024-10-01", expiresAt: "2025-01-01" },
      ] as ReturnType<typeof ms.getAssessmentHistory> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/assessment/history");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].overallScore).toBe(85);
    });

    it("should reject non-owned client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other" } as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/assessment/history");
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/clients/:id/assessment-pdf", () => {
    it("should reject for non-owned client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other" } as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/assessment-pdf");
      expect(res.status).toBe(403);
    });

    it("should reject for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null as ReturnType<typeof ms.getClient> extends Promise<infer T> ? T : never);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/nonexistent/assessment-pdf");
      expect(res.status).toBe(404);
    });
  });
});
