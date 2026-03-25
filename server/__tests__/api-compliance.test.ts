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
    getComplianceItems: vi.fn(),
    getComplianceItemsByClient: vi.fn(),
    updateComplianceItem: vi.fn(),
    getComplianceReviews: vi.fn(),
    getComplianceReview: vi.fn(),
    createComplianceReview: vi.fn(),
    updateComplianceReview: vi.fn(),
    getComplianceReviewEvents: vi.fn(),
    createComplianceReviewEvent: vi.fn(),
    getActivities: vi.fn(),
    getClients: vi.fn(),
    getClient: vi.fn(),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    getMeetings: vi.fn().mockResolvedValue([]),
    getFilteredAlerts: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
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

import { registerAuthRoutes } from "../routes/auth";
import { registerComplianceRoutes } from "../routes/compliance";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerComplianceRoutes(app);
  return app;
}

async function loginAsAdvisor(agent: ReturnType<typeof request.agent>) {
  ms.getAdvisorByEmail.mockResolvedValue({
    id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
    passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
  });
  await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
}

describe("Compliance API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor" });
    ms.getFirstAdvisor.mockResolvedValue({ id: "advisor-1" });
  });

  describe("GET /api/compliance", () => {
    it("should return compliance dashboard with health score", async () => {
      ms.getComplianceItems.mockResolvedValue([
        { id: "c-1", clientId: "client-1", status: "current" },
        { id: "c-2", clientId: "client-1", status: "overdue" },
        { id: "c-3", clientId: "client-1", status: "expiring_soon" },
      ]);
      ms.getActivities.mockResolvedValue([]);
      ms.getClients.mockResolvedValue([{ id: "client-1", firstName: "John", lastName: "Doe" }]);
      ms.getClient.mockResolvedValue({ id: "client-1", firstName: "John", lastName: "Doe" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/compliance");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("overdue");
      expect(res.body).toHaveProperty("expiringSoon");
      expect(res.body).toHaveProperty("current");
      expect(res.body).toHaveProperty("healthScore");
      expect(res.body.overdue).toHaveLength(1);
    });

    it("should return 100% health with no items", async () => {
      ms.getComplianceItems.mockResolvedValue([]);
      ms.getActivities.mockResolvedValue([]);
      ms.getClients.mockResolvedValue([]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/compliance");

      expect(res.body.healthScore).toBe(100);
    });
  });

  describe("GET /api/clients/:clientId/compliance-reviews", () => {
    it("should return reviews with events", async () => {
      ms.getComplianceReviews.mockResolvedValue([{ id: "r-1", clientId: "client-1", status: "draft" }]);
      ms.getComplianceReviewEvents.mockResolvedValue([{ id: "e-1", reviewId: "r-1", eventType: "created" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/compliance-reviews");

      expect(res.status).toBe(200);
      expect(res.body[0]).toHaveProperty("events");
    });
  });

  describe("POST /api/clients/:clientId/compliance-reviews", () => {
    it("should create compliance review", async () => {
      ms.createComplianceReview.mockResolvedValue({ id: "r-1", clientId: "client-1", status: "draft" });
      ms.createComplianceReviewEvent.mockResolvedValue({});
      ms.getComplianceReviewEvents.mockResolvedValue([{ id: "e-1", eventType: "created" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/compliance-reviews").send({ title: "Annual Review" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("events");
    });
  });

  describe("PATCH /api/compliance-reviews/:id", () => {
    it("should transition draft → submitted", async () => {
      ms.getComplianceReview.mockResolvedValue({ id: "r-1", status: "draft", reviewItems: null });
      ms.updateComplianceReview.mockResolvedValue({ id: "r-1", status: "submitted" });
      ms.createComplianceReviewEvent.mockResolvedValue({});
      ms.getComplianceReviewEvents.mockResolvedValue([]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/compliance-reviews/r-1").send({ status: "submitted" });

      expect(res.status).toBe(200);
    });

    it("should reject invalid status transition", async () => {
      ms.getComplianceReview.mockResolvedValue({ id: "r-1", status: "draft" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/compliance-reviews/r-1").send({ status: "approved" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Cannot transition");
    });

    it("should return 404 for non-existent review", async () => {
      ms.getComplianceReview.mockResolvedValue(null);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      expect((await agent.patch("/api/compliance-reviews/nonexistent").send({ status: "submitted" })).status).toBe(404);
    });
  });

  describe("PATCH /api/compliance-items/:id", () => {
    it("should update compliance item", async () => {
      ms.updateComplianceItem.mockResolvedValue({ id: "c-1", status: "current", completedDate: "2026-03-11" });

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.patch("/api/compliance-items/c-1").send({ status: "current", completedDate: "2026-03-11" });

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/compliance-reviews/:id/events", () => {
    it("should return events", async () => {
      ms.getComplianceReviewEvents.mockResolvedValue([{ id: "e-1", reviewId: "r-1", eventType: "created" }]);

      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/compliance-reviews/r-1/events");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });
});
