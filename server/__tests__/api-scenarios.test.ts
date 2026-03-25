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
    getMonteCarloScenarios: vi.fn().mockResolvedValue([]),
    getMonteCarloScenario: vi.fn(),
    createMonteCarloScenario: vi.fn().mockResolvedValue({
      id: "sc-1", clientId: "client-1", name: "Retirement Plan",
      currentAge: 45, retirementAge: 65, lifeExpectancy: 90,
      annualSpending: "80000", expectedReturn: "0.07",
      returnStdDev: "0.12", inflationRate: "0.03",
      preRetirementContribution: "20000",
    }),
    deleteMonteCarloScenario: vi.fn().mockResolvedValue(undefined),
    updateMonteCarloScenario: vi.fn().mockResolvedValue({}),
    getScenarioEvents: vi.fn().mockResolvedValue([]),
    createScenarioEvent: vi.fn().mockResolvedValue({
      id: "ev-1", scenarioId: "sc-1", name: "Social Security",
      type: "income", amount: "24000", startAge: 67,
      endAge: null, inflationAdjusted: true,
    }),
    deleteScenarioEvent: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("../openai", () => ({ isAIAvailable: () => false }));
vi.mock("../db", () => ({
  db: { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }) }) },
}));
vi.mock("../engines/onboarding-engine", () => ({ getActiveOnboardings: vi.fn().mockResolvedValue([]) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {} }));
vi.mock("../monte-carlo", () => ({
  runMonteCarloSimulation: vi.fn().mockReturnValue({
    successRate: 0.82,
    medianEndingBalance: 1500000,
    percentile10: 500000,
    percentile25: 900000,
    percentile75: 2100000,
    percentile90: 3000000,
    yearByYear: [],
  }),
}));

import { registerAuthRoutes } from "../routes/auth";
import { registerScenarioRoutes } from "../routes/scenarios";
import { storage } from "../storage";

import type { IStorage } from "../storage";
const ms = storage as unknown as { [K in keyof IStorage]: ReturnType<typeof vi.fn> };
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", status: "active",
};

const mockScenario = {
  id: "sc-1", clientId: "client-1", name: "Retirement Plan",
  currentAge: 45, retirementAge: 65, lifeExpectancy: 90,
  annualSpending: "80000", expectedReturn: "0.07",
  returnStdDev: "0.12", inflationRate: "0.03",
  preRetirementContribution: "20000",
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerScenarioRoutes(app);
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

describe("Monte Carlo Scenario API Routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/clients/:clientId/scenarios", () => {
    it("should return scenarios for authorized client", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenarios.mockResolvedValue([mockScenario]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/scenarios");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });

    it("should deny access to unauthorized client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other-advisor" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/scenarios");
      expect(res.status).toBe(403);
    });

    it("should return 403 for non-existent client", async () => {
      ms.getClient.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/nonexistent/scenarios");
      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/clients/client-1/scenarios");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/clients/:clientId/scenarios/:scenarioId", () => {
    it("should return scenario with events", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      ms.getScenarioEvents.mockResolvedValue([
        { id: "ev-1", scenarioId: "sc-1", name: "Social Security", type: "income" },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/scenarios/sc-1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "Retirement Plan");
      expect(res.body).toHaveProperty("events");
      expect(res.body.events).toHaveLength(1);
    });

    it("should return 404 for non-existent scenario", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/scenarios/nonexistent");
      expect(res.status).toBe(404);
    });

    it("should return 404 for scenario belonging to different client", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue({ ...mockScenario, clientId: "other-client" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.get("/api/clients/client-1/scenarios/sc-1");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/clients/:clientId/scenarios", () => {
    it("should create a scenario with valid inputs", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios").send({
        name: "Retirement Plan",
        currentAge: 45,
        retirementAge: 65,
        lifeExpectancy: 90,
        annualSpending: 80000,
        expectedReturn: 0.07,
        returnStdDev: 0.12,
        inflationRate: 0.03,
        preRetirementContribution: 20000,
      });
      expect(res.status).toBe(200);
      expect(ms.createMonteCarloScenario).toHaveBeenCalled();
      expect(res.body).toHaveProperty("name", "Retirement Plan");
    });

    it("should reject missing name", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios").send({
        currentAge: 45,
        retirementAge: 65,
        annualSpending: 80000,
      });
      expect(res.status).toBe(400);
    });

    it("should reject missing required age and spending fields", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios").send({
        name: "Incomplete",
      });
      expect(res.status).toBe(400);
    });

    it("should deny access to unauthorized client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios").send({
        name: "Test", currentAge: 45, retirementAge: 65, annualSpending: 80000,
      });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/clients/:clientId/scenarios/:scenarioId", () => {
    it("should delete a scenario", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.delete("/api/clients/client-1/scenarios/sc-1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(ms.deleteMonteCarloScenario).toHaveBeenCalledWith("sc-1");
    });

    it("should return 404 for non-existent scenario", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.delete("/api/clients/client-1/scenarios/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/clients/:clientId/scenarios/:scenarioId/events", () => {
    it("should create a scenario event", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios/sc-1/events").send({
        name: "Social Security",
        type: "income",
        amount: 24000,
        startAge: 67,
        inflationAdjusted: true,
      });
      expect(res.status).toBe(200);
      expect(ms.createScenarioEvent).toHaveBeenCalled();
    });

    it("should reject invalid event type", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios/sc-1/events").send({
        name: "Invalid",
        type: "transfer",
        amount: 5000,
        startAge: 65,
      });
      expect(res.status).toBe(400);
    });

    it("should reject missing required fields", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios/sc-1/events").send({
        name: "Incomplete",
      });
      expect(res.status).toBe(400);
    });

    it("should return 404 for non-existent scenario", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios/nonexistent/events").send({
        name: "Test", type: "income", amount: 1000, startAge: 65,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/clients/:clientId/scenarios/:scenarioId/events/:eventId", () => {
    it("should delete a scenario event", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      ms.getScenarioEvents.mockResolvedValue([
        { id: "ev-1", scenarioId: "sc-1", name: "Social Security" },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.delete("/api/clients/client-1/scenarios/sc-1/events/ev-1");
      expect(res.status).toBe(200);
      expect(ms.deleteScenarioEvent).toHaveBeenCalledWith("ev-1");
    });

    it("should return 404 for event not in scenario", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      ms.getScenarioEvents.mockResolvedValue([
        { id: "ev-1", scenarioId: "sc-1" },
      ]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.delete("/api/clients/client-1/scenarios/sc-1/events/ev-other");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/clients/:clientId/scenarios/:scenarioId/run", () => {
    it("should run Monte Carlo simulation", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(mockScenario);
      ms.getAccountsByClient.mockResolvedValue([
        { id: "acc-1", balance: "500000" },
        { id: "acc-2", balance: "300000" },
      ]);
      ms.getScenarioEvents.mockResolvedValue([]);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios/sc-1/run");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("simulationResults");
      expect(res.body.simulationResults).toHaveProperty("successRate", 0.82);
      expect(res.body).toHaveProperty("portfolioUsed", 800000);
      expect(ms.updateMonteCarloScenario).toHaveBeenCalled();
    });

    it("should return 404 for non-existent scenario", async () => {
      ms.getClient.mockResolvedValue(mockClient);
      ms.getMonteCarloScenario.mockResolvedValue(null);
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios/nonexistent/run");
      expect(res.status).toBe(404);
    });

    it("should deny access to unauthorized client", async () => {
      ms.getClient.mockResolvedValue({ ...mockClient, advisorId: "other" });
      const agent = request.agent(app);
      await loginAsAdvisor(agent);
      const res = await agent.post("/api/clients/client-1/scenarios/sc-1/run");
      expect(res.status).toBe(403);
    });
  });
});
