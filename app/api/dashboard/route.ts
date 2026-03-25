import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { db } from "@server/db";
import { approvalItems, investorProfiles, reportArtifacts, calculatorRuns, clients } from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { getActiveOnboardings } from "@server/engines/onboarding-engine";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const [allMeetings, allAlerts, allTasks, allClients, allHouseholds] = await Promise.all([
      storage.getMeetings(advisor.id),
      storage.getFilteredAlerts(advisor.id, { limit: 20 }),
      storage.getTasks(advisor.id),
      storage.getClients(advisor.id),
      storage.getHouseholds(advisor.id),
    ]);

    // Build client lookup map to avoid N+1 queries (allClients already fetched above)
    const clientMap = new Map(allClients.map(c => [c.id, c]));

    const today = new Date().toISOString().split("T")[0];
    const todaysMeetings = allMeetings.filter(m => m.startTime.startsWith(today));

    // Batch-fetch AUM for all meeting clients in one query
    const meetingClientIds = todaysMeetings.map(m => m.clientId).filter(Boolean) as string[];
    const aumMap = meetingClientIds.length > 0 ? await storage.getAumByClient(meetingClientIds) : new Map();

    const meetingsWithClients = todaysMeetings.map((meeting) => {
      if (!meeting.clientId) return { ...meeting, client: null };
      const client = clientMap.get(meeting.clientId) || null;
      const aumData = aumMap.get(meeting.clientId);
      const totalAum = aumData?.totalAum ?? 0;
      return { ...meeting, client: client ? { ...client, totalAum } : null };
    });

    const totalAum = allHouseholds.reduce((sum, h) => sum + parseFloat(h.totalAum as string || "0"), 0);
    const clientsBySegment = { A: 0, B: 0, C: 0, D: 0 };
    allClients.forEach(c => {
      if (c.segment in clientsBySegment) clientsBySegment[c.segment as keyof typeof clientsBySegment]++;
    });

    const pendingTasks = allTasks.filter(t => t.status !== "completed");
    const tasksWithClients = pendingTasks.slice(0, 10).map((task) => {
      if (!task.clientId) return { ...task, clientName: null };
      const client = clientMap.get(task.clientId);
      return { ...task, clientName: client ? `${client.firstName} ${client.lastName}` : null };
    });

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

    const expiringProfilesWithClients = expiringProfilesList.map((p) => {
      const client = clientMap.get(p.clientId);
      const expiresIn = Math.ceil((new Date(p.expirationDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return {
        ...p,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
        expiresIn,
      };
    });

    const recentReportsWithClients = recentReportsList.map((r) => {
      const client = r.clientId ? clientMap.get(r.clientId) : undefined;
      return {
        ...r,
        clientName: client ? `${client.firstName} ${client.lastName}` : null,
      };
    });

    const recentCalcRunsWithClients = recentCalcRuns.map((c) => {
      const client = c.clientId ? clientMap.get(c.clientId) : undefined;
      return {
        ...c,
        clientName: client ? `${client.firstName} ${client.lastName}` : null,
      };
    });

    const activeOnboardings = await getActiveOnboardings(storage, advisor.id);

    return NextResponse.json({
      todaysMeetings: meetingsWithClients,
      alerts: allAlerts.filter(a => !a.isRead),
      bookSnapshot: {
        totalAum,
        totalClients: allClients.length,
        clientsBySegment,
        netFlowsMTD: 0,
        netFlowsQTD: 0,
        netFlowsYTD: 0,
        revenueYTD: Math.round(totalAum * 0.0085),
        revenueSource: "estimated_85bps",
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
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    });
  } catch (err) {
    logger.error({ err }, "[Dashboard] Failed to load dashboard");
    return NextResponse.json({ message: "Failed to load dashboard" }, { status: 500 });
  }
}
