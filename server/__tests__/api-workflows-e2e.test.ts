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
    getClient: vi.fn(),
    getClients: vi.fn(),
    searchClients: vi.fn(),
    getClientsByAssociate: vi.fn().mockResolvedValue([]),
    getAccountsByClient: vi.fn(),
    getHoldingsByClient: vi.fn(),
    getHoldingsByAccount: vi.fn(),
    getActivitiesByClient: vi.fn(),
    getTasksByClient: vi.fn(),
    getTasksByMeeting: vi.fn(),
    getMeetings: vi.fn(),
    getMeeting: vi.fn(),
    createMeeting: vi.fn(),
    updateMeeting: vi.fn(),
    getMeetingsByClient: vi.fn(),
    getDocumentsByClient: vi.fn(),
    getComplianceItemsByClient: vi.fn(),
    getLifeEvents: vi.fn(),
    getPerformanceByHousehold: vi.fn(),
    getHouseholdMembers: vi.fn(),
    getTransactionsByAccount: vi.fn(),
    getDocumentChecklist: vi.fn(),
    getAlternativeAssetsByClient: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getActivities: vi.fn(),
    createActivity: vi.fn(),
    getFilteredAlerts: vi.fn(),
    getHouseholds: vi.fn(),
    recordLoginEvent: vi.fn().mockResolvedValue(undefined),
    getActiveMeetingSummaryConfig: vi.fn(),
    getActiveTranscriptConfig: vi.fn(),
    getClientTeamMembers: vi.fn(),
    getAllAssociates: vi.fn(),
    getLatestAssessment: vi.fn(),
    getAssessmentHistory: vi.fn(),
  },
}));
vi.mock("../openai", () => ({
  isAIAvailable: () => false,
  generateMeetingSummary: vi.fn().mockResolvedValue("Summary content"),
  summarizeTranscript: vi.fn().mockResolvedValue("Transcript summary"),
  analyzeTranscriptWithConfig: vi.fn().mockResolvedValue({
    title: "Client Meeting", type: "review", summary: "Meeting summary",
    actionItems: [{ title: "Follow up", priority: "high", dueDate: "2026-03-20" }],
  }),
}));
vi.mock("../db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
    }),
  },
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
vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: vi.fn() }));
vi.mock("@shared/schema", () => ({ approvalItems: {}, investorProfiles: {}, reportArtifacts: {}, calculatorRuns: {}, clients: {}, insertMeetingSchema: {} }));

import { registerAuthRoutes } from "../routes/auth";
import { registerClientRoutes } from "../routes/clients";
import { registerMeetingRoutes } from "../routes/meetings";
import { registerAssessmentRoutes } from "../routes/assessment";
import { storage } from "../storage";

const ms = vi.mocked(storage);
const testPassword = "TestPassword123!";
const passwordHash = hashPassword(testPassword);

const mockClient = {
  id: "client-1", advisorId: "advisor-1", firstName: "John", lastName: "Doe",
  email: "john@test.com", phone: "555-0100", segment: "A", status: "active",
  dateOfBirth: "1970-01-15", riskProfile: "moderate", investmentObjective: "growth",
  notes: null, address: null, city: null, state: null, zipCode: null, occupation: null,
  employer: null, annualIncome: null, netWorth: null, taxBracket: null, maritalStatus: null,
  dependents: null, lastContactDate: null, nextReviewDate: null, onboardingStatus: "complete",
  ssn: null, beneficiaries: null, insurancePolicies: null,
};
const mockAccount = {
  id: "account-1", clientId: "client-1", householdId: "household-1",
  accountNumber: "ACC-001", accountType: "Individual", custodian: "Schwab",
  balance: "500000", taxStatus: "taxable", model: "Growth", status: "active",
};
const mockMeeting = {
  id: "meeting-1", advisorId: "advisor-1", clientId: "client-1",
  title: "Annual Review", startTime: "2026-03-11T10:00:00.000Z",
  endTime: "2026-03-11T11:00:00.000Z", type: "review", status: "completed",
  notes: "Discussion", location: "Office",
  prepBrief: null, transcriptRaw: null, transcriptSummary: null,
};
const mockTask = {
  id: "task-1", advisorId: "advisor-1", clientId: "client-1", meetingId: null,
  title: "Follow up", description: "Review", priority: "high",
  status: "pending", dueDate: "2026-03-20", type: "follow-up", completedAt: null,
};

function createAppWithAssessment() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerClientRoutes(app);
  registerAssessmentRoutes(app);
  return app;
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: "test-secret-32-chars-long-enough!", resave: false, saveUninitialized: false }));
  registerAuthRoutes(app);
  registerClientRoutes(app);
  registerMeetingRoutes(app);
  return app;
}

describe("E2E Workflow Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    ms.getAdvisor.mockResolvedValue({ id: "advisor-1", name: "Test Advisor", onboardingCompleted: true });
    ms.getFirstAdvisor.mockResolvedValue({ id: "advisor-1" });
  });

  describe("Login → Dashboard", () => {
    it("should login and access dashboard data", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
      });
      ms.getMeetings.mockResolvedValue([mockMeeting]);
      ms.getFilteredAlerts.mockResolvedValue([]);
      ms.getTasks.mockResolvedValue([mockTask]);
      ms.getClients.mockResolvedValue([mockClient]);
      ms.getHouseholds.mockResolvedValue([]);
      ms.getClient.mockResolvedValue(mockClient);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      ms.getTasksByMeeting.mockResolvedValue([]);

      const agent = request.agent(app);

      const loginRes = await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.type).toBe("advisor");

      const meRes = await agent.get("/api/auth/me");
      expect(meRes.status).toBe(200);
      expect(meRes.body.id).toBe("advisor-1");

      const dashRes = await agent.get("/api/dashboard");
      expect(dashRes.status).toBe(200);
      expect(dashRes.body).toHaveProperty("todaysMeetings");
      expect(dashRes.body).toHaveProperty("bookSnapshot");
      expect(dashRes.body).toHaveProperty("actionQueue");
      expect(dashRes.body.bookSnapshot).toHaveProperty("totalAum");
      expect(dashRes.body.bookSnapshot).toHaveProperty("totalClients");
    });
  });

  describe("Login → Client List → Client Detail", () => {
    it("should navigate from clients to detail", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
      });
      ms.getClients.mockResolvedValue([mockClient]);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      ms.getClient.mockResolvedValue(mockClient);
      ms.getActivitiesByClient.mockResolvedValue([]);
      ms.getTasksByClient.mockResolvedValue([mockTask]);
      ms.getMeetingsByClient.mockResolvedValue([mockMeeting]);
      ms.getDocumentsByClient.mockResolvedValue([]);
      ms.getComplianceItemsByClient.mockResolvedValue([]);
      ms.getLifeEvents.mockResolvedValue([]);
      ms.getHoldingsByClient.mockResolvedValue([]);
      ms.getDocumentChecklist.mockResolvedValue([]);
      ms.getAlternativeAssetsByClient.mockResolvedValue([]);
      ms.getPerformanceByHousehold.mockResolvedValue([]);
      ms.getHouseholdMembers.mockResolvedValue([]);
      ms.getTransactionsByAccount.mockResolvedValue([]);
      ms.getTasksByMeeting.mockResolvedValue([]);

      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      const clientsRes = await agent.get("/api/clients");
      expect(clientsRes.status).toBe(200);
      expect(clientsRes.body).toHaveLength(1);

      const detailRes = await agent.get(`/api/clients/${clientsRes.body[0].id}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.client.firstName).toBe("John");
      expect(detailRes.body).toHaveProperty("totalAum");
      expect(detailRes.body).toHaveProperty("tasks");
    });
  });

  describe("Meeting → Transcript → Summary → Tasks", () => {
    it("should create meeting, add transcript, summarize, and generate tasks", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
      });
      ms.getClient.mockResolvedValue(mockClient);
      ms.createMeeting.mockResolvedValue(mockMeeting);
      ms.getMeeting.mockResolvedValue(mockMeeting);
      ms.updateMeeting.mockResolvedValue({ ...mockMeeting, transcriptRaw: "text", transcriptSummary: "summary" });
      ms.getTasksByMeeting.mockResolvedValue([mockTask]);
      ms.getMeetings.mockResolvedValue([mockMeeting]);
      ms.getHoldingsByClient.mockResolvedValue([]);
      ms.getAccountsByClient.mockResolvedValue([]);
      ms.getTasksByClient.mockResolvedValue([]);
      ms.getLifeEvents.mockResolvedValue([]);
      ms.getActiveMeetingSummaryConfig.mockResolvedValue(null);
      ms.getPerformanceByHousehold.mockResolvedValue([]);
      ms.createTask.mockResolvedValue(mockTask);

      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      const createRes = await agent.post("/api/meetings").send({
        title: "Client Meeting", startTime: "2026-03-15T14:00:00Z",
        endTime: "2026-03-15T15:00:00Z", type: "review", clientId: "client-1",
      });
      expect(createRes.status).toBe(200);

      const transcriptRes = await agent.post("/api/meetings/meeting-1/transcript").send({
        text: "Advisor: Let's discuss your portfolio.\nClient: I'd like more bonds.",
      });
      expect(transcriptRes.status).toBe(200);
      expect(transcriptRes.body).toHaveProperty("summary");

      const summaryRes = await agent.post("/api/meetings/meeting-1/summarize");
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body).toHaveProperty("transcriptSummary");

      const meetingDetailRes = await agent.get("/api/meetings/meeting-1");
      expect(meetingDetailRes.status).toBe(200);
      expect(meetingDetailRes.body.id).toBe("meeting-1");
      expect(meetingDetailRes.body.client).toBeDefined();

      const meetingsListRes = await agent.get("/api/meetings");
      expect(meetingsListRes.status).toBe(200);
      expect(ms.getTasksByMeeting).toHaveBeenCalledWith("meeting-1");
      expect(ms.updateMeeting).toHaveBeenCalled();
    });
  });

  describe("Session persistence", () => {
    it("should maintain session across requests", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
      });
      ms.getClients.mockResolvedValue([mockClient]);
      ms.getAccountsByClient.mockResolvedValue([mockAccount]);
      ms.getMeetings.mockResolvedValue([mockMeeting]);
      ms.getClient.mockResolvedValue(mockClient);
      ms.getTasksByMeeting.mockResolvedValue([]);

      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      expect((await agent.get("/api/auth/me")).status).toBe(200);
      expect((await agent.get("/api/clients")).status).toBe(200);
      expect((await agent.get("/api/meetings")).status).toBe(200);
      expect((await agent.get("/api/auth/me")).body.id).toBe("advisor-1");
    });
  });

  describe("Session isolation", () => {
    it("should not share sessions between agents", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
      });

      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      await agent1.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      expect((await agent1.get("/api/auth/me")).status).toBe(200);
      expect((await agent2.get("/api/auth/me")).status).toBe(401);
    });
  });

  describe("Logout flow", () => {
    it("should prevent access after logout", async () => {
      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
      });

      const agent = request.agent(app);
      await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      expect((await agent.get("/api/auth/me")).status).toBe(200);
      expect((await agent.post("/api/auth/logout")).status).toBe(200);
      expect((await agent.get("/api/auth/me")).status).toBe(401);
    });
  });

  describe("Client → Assessment → History workflow", () => {
    it("should complete client detail to assessment generation to history retrieval", async () => {
      const assessmentApp = createAppWithAssessment();

      ms.getAdvisorByEmail.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        passwordHash, onboardingCompleted: true, avatarUrl: null, title: "Advisor",
      });
      ms.getAdvisor.mockResolvedValue({
        id: "advisor-1", name: "Test Advisor", email: "advisor@test.com",
        title: "Senior Advisor", avatarUrl: null, onboardingCompleted: true, passwordHash,
      });
      ms.getClient.mockResolvedValue(mockClient);
      ms.getAccountsByClient.mockResolvedValue([]);
      ms.getHoldingsByClient.mockResolvedValue([]);
      ms.getDocumentsByClient.mockResolvedValue([]);
      ms.getActivitiesByClient.mockResolvedValue([]);
      ms.getTasksByClient.mockResolvedValue([]);
      ms.getComplianceItemsByClient.mockResolvedValue([]);
      ms.getLifeEvents.mockResolvedValue([]);
      ms.getMeetingsByClient.mockResolvedValue([]);
      ms.getPerformanceByHousehold.mockResolvedValue([]);
      ms.getHouseholdMembers.mockResolvedValue([]);
      ms.getAlternativeAssetsByClient.mockResolvedValue([]);
      ms.getClientTeamMembers.mockResolvedValue([]);
      ms.getLatestAssessment.mockResolvedValue({
        id: "assess-1",
        assessmentData: { overallScore: 85, summary: "Good standing" },
        overallScore: 85,
        summary: "Good standing",
        generatedAt: "2026-03-01",
        expiresAt: "2026-06-01",
      });
      ms.getAssessmentHistory.mockResolvedValue([
        { id: "assess-1", overallScore: 85, summary: "Good standing", generatedAt: "2026-03-01", expiresAt: "2026-06-01" },
        { id: "assess-0", overallScore: 72, summary: "Fair", generatedAt: "2025-12-01", expiresAt: "2026-03-01" },
      ]);

      const agent = request.agent(assessmentApp);
      await agent.post("/api/auth/login").send({ email: "advisor@test.com", password: testPassword });

      const clientRes = await agent.get("/api/clients/client-1");
      expect(clientRes.status).toBe(200);
      expect(clientRes.body.client.id).toBe("client-1");

      const assessRes = await agent.post("/api/clients/client-1/assessment");
      expect(assessRes.status).toBe(200);
      expect(assessRes.body.overallScore).toBeDefined();

      const getAssessRes = await agent.get("/api/clients/client-1/assessment");
      expect(getAssessRes.status).toBe(200);
      expect(getAssessRes.body.overallScore).toBe(85);

      const historyRes = await agent.get("/api/clients/client-1/assessment/history");
      expect(historyRes.status).toBe(200);
      expect(historyRes.body).toHaveLength(2);
      expect(historyRes.body[0].overallScore).toBe(85);
    });
  });
});
