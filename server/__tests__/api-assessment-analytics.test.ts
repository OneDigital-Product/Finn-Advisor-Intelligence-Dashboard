import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

const { mockAssessClient } = vi.hoisted(() => ({
  mockAssessClient: vi.fn(),
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
    getClient: vi.fn(),
    getAccountsByClient: vi.fn().mockResolvedValue([]),
    getActivities: vi.fn().mockResolvedValue([]),
    getComplianceItems: vi.fn().mockResolvedValue([]),
    getAdvisorAssessmentDefaults: vi.fn(),
    upsertAdvisorAssessmentDefaults: vi.fn(),
    getLatestAssessment: vi.fn(),
    getAssessmentHistory: vi.fn(),
    getDiagnosticConfigs: vi.fn(),
    getDiagnosticConfig: vi.fn(),
    getActiveDiagnosticConfig: vi.fn(),
    getDiagnosticResults: vi.fn(),
    getDiagnosticResult: vi.fn(),
    deleteDiagnosticResult: vi.fn(),
    createDiagnosticResult: vi.fn(),
    getHoldingsByClient: vi.fn().mockResolvedValue([]),
    getActivitiesByClient: vi.fn().mockResolvedValue([]),
    getTasksByClient: vi.fn().mockResolvedValue([]),
    getDocumentsByClient: vi.fn().mockResolvedValue([]),
    getComplianceItemsByClient: vi.fn().mockResolvedValue([]),
    getPerformanceByHousehold: vi.fn().mockResolvedValue([]),
    getHousehold: vi.fn(),
    getHouseholdMembers: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("../openai", () => ({
  isAIAvailable: () => false,
  generateDiagnosticAnalysis: vi.fn().mockResolvedValue({ summary: "Test analysis", findings: [] }),
}));
vi.mock("../db", () => ({ db: {} }));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("../engines/assessment-engine", () => {
  return {
    AssessmentEngine: class {
      assessClient = mockAssessClient;
    },
  };
});
vi.mock("../pdf/assessment-pdf", () => ({
  AssessmentPDF: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue(Buffer.from("fake-pdf")),
  })),
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn() }));
vi.mock("@shared/schema", () => ({
  approvalItems: {},
  investorProfiles: {},
  calculateFeeRate: vi.fn().mockReturnValue(0.01),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerAssessmentRoutes } from "../routes/assessment";
import { registerAnalyticsRoutes } from "../routes/analytics";
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

const mockClient = {
  id: "client-1",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  advisorId: "advisor-1",
  segment: "A",
  status: "active",
  lastContactDate: new Date().toISOString(),
  nextReviewDate: null,
  referralSource: "website",
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerAssessmentRoutes(app);
  registerAnalyticsRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue(mockAdvisor);
  ms.getAdvisor.mockResolvedValue(mockAdvisor);
  ms.getFirstAdvisor.mockResolvedValue(mockAdvisor);
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Assessment API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/assessment/settings", () => {
    it("should return default assessment settings when none configured", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisorAssessmentDefaults.mockResolvedValue(null);

      const res = await agent.get("/api/assessment/settings");
      expect(res.status).toBe(200);
      expect(res.body.retirementAge).toBe(67);
      expect(res.body.withdrawalRate).toBe("4.00");
      expect(res.body.insuranceMultiplier).toBe(10);
      expect(res.body.hnwThreshold).toBe("1000000.00");
    });

    it("should return custom assessment settings", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getAdvisorAssessmentDefaults.mockResolvedValue({
        advisorId: "advisor-1",
        retirementAge: 62,
        withdrawalRate: "3.50",
        insuranceMultiplier: 12,
        hnwThreshold: "2000000.00",
      });

      const res = await agent.get("/api/assessment/settings");
      expect(res.status).toBe(200);
      expect(res.body.retirementAge).toBe(62);
      expect(res.body.withdrawalRate).toBe("3.50");
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/assessment/settings");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/assessment/settings", () => {
    it("should update assessment settings", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.upsertAdvisorAssessmentDefaults.mockResolvedValue({
        advisorId: "advisor-1",
        retirementAge: 62,
        withdrawalRate: "3.50",
        insuranceMultiplier: 12,
        hnwThreshold: "1500000.00",
      });

      const res = await agent.put("/api/assessment/settings").send({
        retirementAge: 62,
        withdrawalRate: "3.50",
        insuranceMultiplier: 12,
        hnwThreshold: "1500000.00",
      });
      expect(res.status).toBe(200);
      expect(res.body.retirementAge).toBe(62);
      expect(ms.upsertAdvisorAssessmentDefaults).toHaveBeenCalledWith("advisor-1", {
        retirementAge: 62,
        withdrawalRate: "3.50",
        insuranceMultiplier: 12,
        hnwThreshold: "1500000.00",
      });
    });
  });

  describe("POST /api/clients/:id/assessment", () => {
    it("should generate assessment for client", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getClient.mockResolvedValue(mockClient);
      mockAssessClient.mockResolvedValue({
        overallScore: 85,
        summary: "Good financial health",
        sections: [],
      });

      const res = await agent.post("/api/clients/client-1/assessment").send({});
      expect(res.status).toBe(200);
      expect(res.body.overallScore).toBe(85);
    });

    it("should reject for client of another advisor", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other-advisor" });

      const res = await agent.post("/api/clients/client-1/assessment").send({});
      expect(res.status).toBe(403);
    });

    it("should return 404 for nonexistent client", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getClient.mockResolvedValue(null);

      const res = await agent.post("/api/clients/nonexistent/assessment").send({});
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/clients/:id/assessment", () => {
    it("should return latest assessment", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getClient.mockResolvedValue(mockClient);
      ms.getLatestAssessment.mockResolvedValue({
        id: "assess-1",
        assessmentData: { overallScore: 90, summary: "Excellent" },
      });

      const res = await agent.get("/api/clients/client-1/assessment");
      expect(res.status).toBe(200);
      expect(res.body.overallScore).toBe(90);
    });

    it("should return 404 when no assessment exists", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getClient.mockResolvedValue(mockClient);
      ms.getLatestAssessment.mockResolvedValue(null);

      const res = await agent.get("/api/clients/client-1/assessment");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("No assessment found");
    });
  });

  describe("GET /api/clients/:id/assessment/history", () => {
    it("should return assessment history", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getClient.mockResolvedValue(mockClient);
      ms.getAssessmentHistory.mockResolvedValue([
        { id: "a-1", overallScore: 85, summary: "Good", generatedAt: "2024-01-01", expiresAt: "2024-07-01" },
        { id: "a-2", overallScore: 90, summary: "Excellent", generatedAt: "2024-06-01", expiresAt: "2024-12-01" },
      ]);

      const res = await agent.get("/api/clients/client-1/assessment/history");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].overallScore).toBe(85);
      expect(res.body[1].overallScore).toBe(90);
    });
  });
});

describe("Analytics API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/analytics", () => {
    it("should return comprehensive analytics data", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getClients.mockResolvedValue([mockClient]);
      ms.getHouseholds.mockResolvedValue([{ id: "h-1", totalAum: "500000" }]);
      ms.getTasks.mockResolvedValue([]);
      ms.getActivities.mockResolvedValue([]);
      ms.getComplianceItems.mockResolvedValue([
        { status: "current" },
        { status: "expiring_soon" },
      ]);
      ms.getAccountsByClient.mockResolvedValue([{ id: "acc-1", balance: "250000", householdId: "h-1" }]);

      const res = await agent.get("/api/analytics");
      expect(res.status).toBe(200);
      expect(res.body.totalAum).toBe(500000);
      expect(res.body.totalClients).toBe(1);
      expect(res.body.clientAnalytics).toHaveLength(1);
      expect(res.body.clientAnalytics[0].name).toBe("John Doe");
      expect(res.body.clientAnalytics[0].totalAum).toBe(250000);
      expect(res.body.segmentAnalytics).toHaveProperty("A");
      expect(res.body.segmentAnalytics.A.count).toBe(1);
      expect(res.body.complianceOverview.current).toBe(1);
      expect(res.body.complianceOverview.expiringSoon).toBe(1);
      expect(res.body.capacityMetrics.currentClients).toBe(1);
      expect(res.body.capacityMetrics.maxCapacity).toBe(120);
      expect(res.body.capacityMetrics.utilizationPct).toBeCloseTo(100 / 120, 0);
    });

    it("should identify at-risk clients with old contact dates", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      ms.getClients.mockResolvedValue([{ ...mockClient, lastContactDate: oldDate }]);
      ms.getHouseholds.mockResolvedValue([]);
      ms.getTasks.mockResolvedValue([]);
      ms.getActivities.mockResolvedValue([]);
      ms.getComplianceItems.mockResolvedValue([]);
      ms.getAccountsByClient.mockResolvedValue([{ balance: "100000" }]);

      const res = await agent.get("/api/analytics");
      expect(res.status).toBe(200);
      expect(res.body.atRiskClients).toHaveLength(1);
      expect(res.body.atRiskClients[0].isAtRisk).toBe(true);
      expect(res.body.atRiskClients[0].daysSinceContact).toBeGreaterThan(90);
    });
  });

  describe("GET /api/diagnostics/configs", () => {
    it("should return active diagnostic configs", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getDiagnosticConfigs.mockResolvedValue([
        { id: "dc-1", name: "Standard", isActive: true },
        { id: "dc-2", name: "Deprecated", isActive: false },
      ]);

      const res = await agent.get("/api/diagnostics/configs");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Standard");
    });
  });

  describe("GET /api/diagnostics/results/:clientId", () => {
    it("should return diagnostic results for client", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getDiagnosticResults.mockResolvedValue([
        { id: "dr-1", clientId: "client-1", analysisJson: "{}" },
      ]);

      const res = await agent.get("/api/diagnostics/results/client-1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("GET /api/diagnostics/result/:id", () => {
    it("should return specific diagnostic result", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getDiagnosticResult.mockResolvedValue({
        id: "dr-1", clientId: "client-1", analysisJson: "{}", renderedHtml: "<p>Report</p>",
      });

      const res = await agent.get("/api/diagnostics/result/dr-1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("dr-1");
    });

    it("should return 404 for nonexistent result", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.getDiagnosticResult.mockResolvedValue(null);

      const res = await agent.get("/api/diagnostics/result/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/diagnostics/results/:id", () => {
    it("should delete diagnostic result", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      ms.deleteDiagnosticResult.mockResolvedValue(undefined);

      const res = await agent.delete("/api/diagnostics/results/dr-1");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
