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
    createBehavioralAnalysis: vi.fn().mockResolvedValue({ id: "ba-1", sentiment: "anxious", behavioralRiskScore: 65 }),
    getBehavioralAnalysesByClient: vi.fn().mockResolvedValue([]),
    getMeeting: vi.fn(),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../engines/behavioral-finance", () => {
  const BehavioralFinanceEngine = vi.fn();
  BehavioralFinanceEngine.prototype.analyzeClientCommunication = vi.fn().mockResolvedValue({
    clientId: "client-1", advisorId: "advisor-1", sentiment: "anxious",
    sentimentScore: -0.3, behavioralRiskScore: 65, anxietyLevel: "moderate",
    dominantBias: "loss_aversion", sourceType: "email",
    biasIndicators: [{ bias: "loss_aversion", confidence: 0.8, evidence: "worried about losses" }],
    coachingNotes: "Consider reframing discussion around long-term goals",
  });
  BehavioralFinanceEngine.prototype.getClientBehavioralProfile = vi.fn().mockResolvedValue({
    clientId: "client-1", analyses: [], averageSentiment: 0, dominantBiases: [],
  });
  BehavioralFinanceEngine.prototype.checkVolatilityAlerts = vi.fn().mockResolvedValue({
    hasAlert: false, alerts: [],
  });
  BehavioralFinanceEngine.prototype.generateMeetingBehavioralNotes = vi.fn().mockResolvedValue(
    "Client shows moderate anxiety about market conditions."
  );
  BehavioralFinanceEngine.prototype.getDeEscalationScripts = vi.fn().mockReturnValue([
    { id: "s1", bias: "loss_aversion", script: "Let's look at the long-term picture." },
  ]);
  BehavioralFinanceEngine.prototype.getAvailableBiases = vi.fn().mockReturnValue([
    "loss_aversion", "recency_bias", "anchoring",
  ]);
  BehavioralFinanceEngine.prototype.analyzeMeetingTranscript = vi.fn().mockResolvedValue(null);
  return { BehavioralFinanceEngine };
});

import { registerAuthRoutes } from "../routes/auth";
import { registerBehavioralFinanceRoutes } from "../routes/behavioral-finance";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", status: "active",
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerBehavioralFinanceRoutes(app);
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

describe("Behavioral Finance API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/clients/:id/behavioral/analyze", () => {
    it("should analyze client communication", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/behavioral/analyze").send({
        communicationText: "I'm really worried about the market downturn and want to sell everything",
        sourceType: "email",
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("analysis");
      expect(ms.createBehavioralAnalysis).toHaveBeenCalled();
    });

    it("should reject short communication text", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/behavioral/analyze").send({
        communicationText: "short",
        sourceType: "email",
      });
      expect(res.status).toBe(400);
    });

    it("should reject invalid source type", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/behavioral/analyze").send({
        communicationText: "I'm really worried about my portfolio performance",
        sourceType: "invalid_source",
      });
      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/nonexistent/behavioral/analyze").send({
        communicationText: "I'm really worried about the market conditions",
        sourceType: "email",
      });
      expect(res.status).toBe(404);
    });

    it("should deny access to another advisor's client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other-advisor" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/behavioral/analyze").send({
        communicationText: "I'm worried about the market downturn and volatility",
        sourceType: "email",
      });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/clients/:id/behavioral", () => {
    it("should return behavioral profile", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/behavioral");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("clientId");
    });

    it("should return 404 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/nonexistent/behavioral");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/clients/:id/behavioral/alerts", () => {
    it("should return volatility alerts", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/behavioral/alerts");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/clients/:id/behavioral/coaching-notes", () => {
    it("should return coaching notes", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/behavioral/coaching-notes");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("notes");
    });
  });

  describe("GET /api/behavioral/de-escalation-scripts", () => {
    it("should return de-escalation scripts", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/behavioral/de-escalation-scripts");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("scripts");
      expect(res.body).toHaveProperty("biases");
    });

    it("should filter by bias", async () => {
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/behavioral/de-escalation-scripts?bias=loss_aversion");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/clients/:id/behavioral/timeline", () => {
    it("should return behavioral timeline", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getBehavioralAnalysesByClient.mockResolvedValue([
        { id: "ba-1", createdAt: new Date(), sentiment: "anxious", sentimentScore: -0.3, behavioralRiskScore: 65, anxietyLevel: "moderate", dominantBias: "loss_aversion", sourceType: "email", coachingNotes: "Note" },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/behavioral/timeline");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("timeline");
      expect(res.body.timeline).toHaveLength(1);
    });
  });

  describe("POST /api/clients/:id/behavioral/analyze-meeting/:meetingId", () => {
    it("should return 404 for non-existent meeting", async () => {
      ms.getMeeting.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/behavioral/analyze-meeting/meeting-1");
      expect(res.status).toBe(404);
    });

    it("should reject meeting not belonging to client", async () => {
      ms.getMeeting.mockResolvedValue({ id: "meeting-1", clientId: "other-client" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/behavioral/analyze-meeting/meeting-1");
      expect(res.status).toBe(400);
    });
  });
});
