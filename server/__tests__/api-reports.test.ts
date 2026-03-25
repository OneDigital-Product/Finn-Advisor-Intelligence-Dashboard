import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import { hashPassword } from "../auth";

const mockDbChain = () => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  returning: vi.fn().mockResolvedValue([{ id: "tpl-1", name: "Test Template", templateType: "quarterly", sections: [{ id: "s1" }], advisorId: "advisor-1" }]),
  set: vi.fn().mockReturnThis(),
});

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
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([{ id: "tpl-1", name: "Test Template", templateType: "quarterly", sections: [{ id: "s1" }], advisorId: "advisor-1" }]),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  };
  return {
    db: {
      select: vi.fn().mockReturnValue(chain),
      insert: vi.fn().mockReturnValue(chain),
      update: vi.fn().mockReturnValue(chain),
      delete: vi.fn().mockReturnValue(chain),
    },
  };
});
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({
  approvalItems: {},
  investorProfiles: {},
  reportArtifacts: { id: "id", advisorId: "advisorId", clientId: "clientId", templateId: "templateId", status: "status", createdAt: "createdAt" },
  reportTemplates: { id: "id", advisorId: "advisorId", isActive: "isActive", templateType: "templateType", createdAt: "createdAt" },
  calculatorRuns: {},
  clients: {},
}));
vi.mock("../engines/report-service", () => ({
  generateReportArtifact: vi.fn().mockResolvedValue({
    id: "rpt-1", templateId: "tpl-1", reportName: "Q1 Report",
    status: "draft", advisorId: "advisor-1", renderedHtml: "<h1>Report</h1>",
  }),
  updateReportDraft: vi.fn().mockResolvedValue({
    id: "rpt-1", status: "draft", content: { updated: true },
  }),
  finalizeReport: vi.fn().mockResolvedValue({
    id: "rpt-1", status: "finalized",
  }),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerReportRoutes } from "../routes/reports";
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
  registerReportRoutes(app);
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

describe("Report API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/report-templates", () => {
    it("should return templates for authenticated user", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/report-templates");
      expect(res.status).toBe(200);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/report-templates");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/report-templates", () => {
    it("should create a report template", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/report-templates").send({
        name: "Quarterly Review Template",
        description: "Standard quarterly client review",
        templateType: "quarterly",
        sections: [{ id: "s1", title: "Summary", type: "text" }],
      });
      expect(res.status).toBe(201);
    });

    it("should reject missing name", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/report-templates").send({
        templateType: "quarterly",
        sections: [{ id: "s1" }],
      });
      expect(res.status).toBe(400);
    });

    it("should reject empty sections", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/report-templates").send({
        name: "Template",
        templateType: "quarterly",
        sections: [],
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/report-templates/:templateId", () => {
    it("should update a template", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/report-templates/tpl-1").send({
        name: "Updated Template Name",
      });
      expect(res.status).toBe(200);
    });

    it("should reject empty update body", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/report-templates/tpl-1").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/report-templates/:templateId", () => {
    it("should soft-delete a template", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.delete("/api/report-templates/tpl-1");
      expect(res.status).toBe(204);
    });
  });

  describe("POST /api/reports", () => {
    it("should generate a report artifact", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/reports").send({
        templateId: "tpl-1",
        reportName: "Q1 2024 Review",
        clientId: "client-1",
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id", "rpt-1");
      expect(res.body).toHaveProperty("status", "draft");
    });

    it("should reject missing templateId", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/reports").send({
        reportName: "Missing Template",
      });
      expect(res.status).toBe(400);
    });

    it("should reject missing reportName", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/reports").send({
        templateId: "tpl-1",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/reports", () => {
    it("should return reports for authenticated user", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/reports");
      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /api/reports/:artifactId", () => {
    it("should update a report draft", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/reports/rpt-1").send({
        content: { sections: [{ title: "Updated" }] },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("PATCH /api/reports/:artifactId/finalize", () => {
    it("should finalize a report", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/reports/rpt-1/finalize");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "finalized");
    });
  });

  describe("PATCH /api/reports/:artifactId/archive", () => {
    it("should archive a report", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/reports/rpt-1/archive");
      expect(res.status).toBe(200);
    });
  });
});
