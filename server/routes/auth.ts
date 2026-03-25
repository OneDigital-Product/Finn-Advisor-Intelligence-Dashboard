import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { hashPassword, verifyPassword } from "../auth";
import { storage } from "../storage";
import { isAIAvailable } from "../openai";
import { db } from "../db";
import { approvalItems, investorProfiles, reportArtifacts, calculatorRuns, clients } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { getActiveOnboardings } from "../engines/onboarding-engine";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  title: z.string().optional(),
});

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const body = validateBody(signupSchema, req, res);
      if (!body) return;
      const { name, email, password, title } = body;

      const emailLower = email.toLowerCase().trim();
      if (!emailLower.endsWith("@onedigital.com")) {
        return res.status(400).json({ message: "Only @onedigital.com email addresses are allowed" });
      }

      const existingAdvisor = await storage.getAdvisorByEmail(emailLower);
      if (existingAdvisor) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const existingAssociate = await storage.getAssociateByEmail(emailLower);
      if (existingAssociate) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = hashPassword(password);
      const advisor = await storage.createAdvisor({
        name,
        email: emailLower,
        title: title || "Financial Advisor",
        passwordHash,
      });

      req.session.userId = advisor.id;
      req.session.userType = "advisor";
      req.session.userName = advisor.name;
      req.session.userEmail = advisor.email;
      req.session.userAvatarUrl = advisor.avatarUrl ?? undefined;
      await new Promise<void>((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));

      storage.recordLoginEvent({ userId: advisor.id, userType: "advisor", userName: advisor.name, userEmail: advisor.email }).catch(() => {});

      return res.json({
        id: advisor.id,
        name: advisor.name,
        email: advisor.email,
        type: "advisor",
        title: advisor.title,
        avatarUrl: advisor.avatarUrl,
        onboardingCompleted: advisor.onboardingCompleted,
      });
    } catch (error: any) {
      logger.error({ err: error }, "Signup error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const body = validateBody(loginSchema, req, res);
      if (!body) return;
      const { email, password } = body;

      const advisor = await storage.getAdvisorByEmail(email);
      if (advisor && advisor.passwordHash && verifyPassword(password, advisor.passwordHash)) {
        req.session.userId! = advisor.id;
        req.session.userType! = "advisor";
        req.session.userName = advisor.name;
        req.session.userEmail = advisor.email;
        req.session.userAvatarUrl = advisor.avatarUrl ?? undefined;
        await new Promise<void>((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));
        storage.recordLoginEvent({ userId: advisor.id, userType: "advisor", userName: advisor.name, userEmail: advisor.email }).catch(() => {});
        return res.json({ id: advisor.id, name: advisor.name, email: advisor.email, type: "advisor", title: advisor.title, avatarUrl: advisor.avatarUrl, onboardingCompleted: advisor.onboardingCompleted });
      }

      const associate = await storage.getAssociateByEmail(email);
      if (associate && associate.passwordHash && verifyPassword(password, associate.passwordHash)) {
        if (!associate.active) return res.status(403).json({ message: "Account is inactive" });
        req.session.userId! = associate.id;
        req.session.userType! = "associate";
        req.session.userName = associate.name;
        req.session.userEmail = associate.email;
        req.session.userAvatarUrl = associate.avatarUrl ?? undefined;
        await new Promise<void>((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));
        storage.recordLoginEvent({ userId: associate.id, userType: "associate", userName: associate.name, userEmail: associate.email }).catch(() => {});
        return res.json({ id: associate.id, name: associate.name, email: associate.email, type: "associate", role: associate.role, avatarUrl: associate.avatarUrl });
      }

      res.status(401).json({ message: "Invalid email or password" });
    } catch (error: any) {
      logger.error({ err: error }, "Login error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      let onboardingCompleted = true;
      if (req.session.userType === "advisor") {
        const advisor = await storage.getAdvisor(req.session.userId!);
        if (advisor) {
          onboardingCompleted = advisor.onboardingCompleted;
        }
      }
      res.json({
        id: req.session.userId!,
        type: req.session.userType!,
        name: req.session.userName,
        email: req.session.userEmail,
        avatarUrl: req.session.userAvatarUrl || null,
        onboardingCompleted,
      });
    } catch (error: any) {
      logger.error({ err: error }, "GET /api/auth/me error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.use("/api", requireAuth);

  app.get("/api/advisor", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(404).json({ message: "No advisor found" });
      res.json({ ...advisor, aiEnabled: isAIAvailable() });
    } catch (error: any) {
      logger.error({ err: error }, "GET /api/advisor error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/onboarding/complete", async (req, res) => {
    try {
      if (req.session.userType !== "advisor") {
        return res.status(403).json({ message: "Only advisors can complete onboarding" });
      }
      const updated = await storage.updateAdvisor(req.session.userId!, { onboardingCompleted: true });
      if (!updated) return res.status(404).json({ message: "Advisor not found" });
      res.json({ success: true, onboardingCompleted: true });
    } catch (error: any) {
      logger.error({ err: error }, "POST /api/onboarding/complete error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/dashboard", async (req, res) => {
    try {
    const advisor = await getSessionAdvisor(req);
    if (!advisor) return res.status(404).json({ message: "No advisor found" });

    const [allMeetings, allAlerts, allTasks, allClients, allHouseholds] = await Promise.all([
      storage.getMeetings(advisor.id),
      storage.getFilteredAlerts(advisor.id, { limit: 20 }),
      storage.getTasks(advisor.id),
      storage.getClients(advisor.id),
      storage.getHouseholds(advisor.id),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const todaysMeetings = allMeetings.filter(m => m.startTime.startsWith(today));

    const meetingsWithClients = await Promise.all(
      todaysMeetings.map(async (meeting) => {
        if (!meeting.clientId) return { ...meeting, client: null };
        const client = await storage.getClient(meeting.clientId);
        const clientAccounts = client ? await storage.getAccountsByClient(client.id) : [];
        const totalAum = clientAccounts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
        return { ...meeting, client: client ? { ...client, totalAum } : null };
      })
    );

    const totalAum = allHouseholds.reduce((sum, h) => sum + parseFloat(h.totalAum as string || "0"), 0);
    const clientsBySegment = { A: 0, B: 0, C: 0, D: 0 };
    allClients.forEach(c => {
      if (c.segment in clientsBySegment) clientsBySegment[c.segment as keyof typeof clientsBySegment]++;
    });

    const pendingTasks = allTasks.filter(t => t.status !== "completed");
    const tasksWithClients = await Promise.all(
      pendingTasks.slice(0, 10).map(async (task) => {
        if (!task.clientId) return { ...task, clientName: null };
        const client = await storage.getClient(task.clientId);
        return { ...task, clientName: client ? `${client.firstName} ${client.lastName}` : null };
      })
    );

    const [pendingApprovalsList, pendingApprovalsCountResult, expiringProfilesList, recentReportsList, recentCalcRuns] = await Promise.all([
      db.select().from(approvalItems).where(and(eq(approvalItems.status, "pending"), eq(approvalItems.submittedBy, advisor.id))).orderBy(desc(approvalItems.createdAt)).limit(3),
      db.select({ count: sql<number>`count(*)::int` }).from(approvalItems).where(and(eq(approvalItems.status, "pending"), eq(approvalItems.submittedBy, advisor.id))),
      db.select({
        id: investorProfiles.id,
        clientId: investorProfiles.clientId,
        profileType: investorProfiles.profileType,
        expirationDate: investorProfiles.expirationDate,
      }).from(investorProfiles)
        .innerJoin(clients, eq(investorProfiles.clientId, clients.id))
        .where(and(
          eq(clients.advisorId, advisor.id),
          gte(investorProfiles.expirationDate, new Date()),
          lte(investorProfiles.expirationDate, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          eq(investorProfiles.status, "finalized"),
        ))
        .orderBy(investorProfiles.expirationDate)
        .limit(5),
      db.select({
        id: reportArtifacts.id,
        reportName: reportArtifacts.reportName,
        status: reportArtifacts.status,
        clientId: reportArtifacts.clientId,
        createdAt: reportArtifacts.createdAt,
      }).from(reportArtifacts)
        .where(eq(reportArtifacts.advisorId, advisor.id))
        .orderBy(desc(reportArtifacts.createdAt))
        .limit(5),
      db.select({
        id: calculatorRuns.id,
        calculatorType: calculatorRuns.calculatorType,
        clientId: calculatorRuns.clientId,
        createdAt: calculatorRuns.createdAt,
      }).from(calculatorRuns)
        .where(eq(calculatorRuns.advisorId, advisor.id))
        .orderBy(desc(calculatorRuns.createdAt))
        .limit(5),
    ]);

    const expiringProfilesWithClients = await Promise.all(
      expiringProfilesList.map(async (p) => {
        const client = await storage.getClient(p.clientId);
        const expiresIn = Math.ceil((new Date(p.expirationDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return {
          ...p,
          clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
          expiresIn,
        };
      })
    );

    const recentReportsWithClients = await Promise.all(
      recentReportsList.map(async (r) => {
        const client = r.clientId ? await storage.getClient(r.clientId) : null;
        return {
          ...r,
          clientName: client ? `${client.firstName} ${client.lastName}` : null,
        };
      })
    );

    const recentCalcRunsWithClients = await Promise.all(
      recentCalcRuns.map(async (c) => {
        const client = c.clientId ? await storage.getClient(c.clientId) : null;
        return {
          ...c,
          clientName: client ? `${client.firstName} ${client.lastName}` : null,
        };
      })
    );

    const activeOnboardings = await getActiveOnboardings(storage, advisor.id);

    res.json({
      todaysMeetings: meetingsWithClients,
      alerts: allAlerts.filter(a => !a.isRead),
      bookSnapshot: {
        totalAum,
        totalClients: allClients.length,
        clientsBySegment,
        netFlowsMTD: 287000,
        netFlowsQTD: 842000,
        netFlowsYTD: 1250000,
        revenueYTD: 285000,
        isDemoData: true,
      },
      actionQueue: tasksWithClients,
      upcomingMeetings: allMeetings.filter(m => m.startTime > new Date().toISOString()).slice(0, 5),
      pendingApprovalsCount: pendingApprovalsCountResult[0]?.count || 0,
      pendingApprovals: pendingApprovalsList,
      expiringProfiles: expiringProfilesWithClients,
      recentReports: recentReportsWithClients,
      recentCalculatorRuns: recentCalcRunsWithClients,
      activeOnboardings,
    });
    } catch (err) {
      logger.error({ err }, "[Dashboard] Failed to load dashboard");
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  });
}
