/**
 * GET /api/myday
 *
 * Dedicated My Day payload — trimmed, ranked, and fast.
 * Returns ONLY what the advisor's daily command center needs:
 *   - Book snapshot (AUM, client count)
 *   - Urgency counts (cases, overdue tasks, stale opps, today's meetings)
 *   - Ranked task list (top 8, sorted by priority logic)
 *   - Top cases list (top 3)
 *   - Advisor identity
 *
 * Skips (compared to /api/clients/stats):
 *   - Net flows (3 expensive Orion calls)
 *   - Full pipeline/opportunity fetch
 *   - Billing summary
 *   - Recently closed opportunities
 *   - Revenue goals detail
 *   - Top client / avg AUM
 */

import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
} from "@server/integrations/mulesoft/api";

// ── Task ranking helpers ─────────────────────────────────────────

interface RankedTask {
  id: string;
  subject: string;
  status: string;
  priority: string;
  dueDate: string | null;
  relatedTo: string;
  source: "salesforce" | "local";
  rank: number;       // 1 = overdue, 2 = today, 3 = meeting-tied, 4 = this week
  rankLabel: string;
}

function rankTasks(
  sfTasks: any[],
  todayStr: string,
  weekEndStr: string,
): RankedTask[] {
  const now = new Date();

  return sfTasks
    .map((t: any) => {
      const dueDate = t.ActivityDate || t.DueDate || null;
      const subject = t.Subject || "Task";
      const priority = (t.Priority || "normal").toLowerCase();

      let rank = 99;
      let rankLabel = "upcoming";

      if (dueDate) {
        const due = new Date(dueDate);
        if (due < now && dueDate < todayStr) {
          rank = 1;
          rankLabel = "overdue";
        } else if (dueDate === todayStr) {
          rank = 2;
          rankLabel = "today";
        } else if (dueDate <= weekEndStr) {
          rank = priority === "high" ? 3 : 4;
          rankLabel = "this week";
        }
      } else {
        // No due date — treat as lower priority
        rank = priority === "high" ? 3 : 5;
        rankLabel = priority === "high" ? "high priority" : "no due date";
      }

      return {
        id: t.Id || t.id,
        subject,
        status: t.Status || t.status || "open",
        priority: t.Priority || t.priority || "Normal",
        dueDate,
        relatedTo: t.What?.Name || t.relatedTo || "",
        source: "salesforce" as const,
        rank,
        rankLabel,
      };
    })
    .sort((a, b) => {
      // Primary: rank bucket
      if (a.rank !== b.rank) return a.rank - b.rank;
      // Secondary: overdue → most days overdue first
      if (a.rank === 1 && a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      // Tertiary: high priority first
      const pMap: Record<string, number> = { high: 0, medium: 1, normal: 2, low: 3 };
      return (pMap[a.priority.toLowerCase()] ?? 2) - (pMap[b.priority.toLowerCase()] ?? 2);
    });
}

// ── GET handler ──────────────────────────────────────────────────

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) {
      return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    }

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // ── Salesforce-eligible users → live data ──
    if (isSalesforceUser(advisor.email) && isMulesoftEnabled()) {
      const sfUsername = getSalesforceUsername(advisor.email);
      logger.info(`[MyDay] advisorEmail=${advisor.email} sfUsername=${sfUsername}`);

      try {
        const [sfSettled, orionSettled] = await Promise.allSettled([
          getLiveHouseholds({ username: sfUsername, pageSize: 50 }),
          getOrionClientsValue(),
        ]);

        const sfResult = sfSettled.status === "fulfilled" ? sfSettled.value : null;
        const orionAccounts = orionSettled.status === "fulfilled" ? orionSettled.value : [];

        if (sfSettled.status === "rejected") {
          logger.warn({ err: sfSettled.reason }, "[MyDay] SF households failed");
        }
        if (orionSettled.status === "rejected") {
          logger.warn({ err: orionSettled.reason }, "[MyDay] Orion clients failed");
        }

        if (sfResult && orionAccounts.length > 0) {
          const totalAum = orionAccounts.reduce((sum, a) => sum + (a.totalValue || 0), 0);
          const clientCount = sfResult.totalSize || 0;

          // Active client count (extrapolated from sample)
          const households = sfResult?.householdAccounts || [];
          const activeStatuses = new Set(["active", "client"]);
          let activeClientCount = clientCount;
          if (households.length > 0) {
            const sampleActive = households.filter((h: any) => {
              const status = (h.FinServ__Status__c || "").toLowerCase();
              return activeStatuses.has(status) || status === "";
            }).length;
            activeClientCount = Math.round(clientCount * (sampleActive / households.length));
          }

          // Urgency counts — from SF result
          const openCasesCount = sfResult?.openCases?.length || 0;
          const staleOppsCount = sfResult?.staleOpportunities?.length || 0;
          const upcomingEventsCount = sfResult?.upcomingEvents?.length || 0;

          // Ranked tasks — top 8
          const allTasks = sfResult?.openTasks || [];
          const rankedTasks = rankTasks(allTasks, todayStr, weekEndStr).slice(0, 8);
          const overdueCount = rankedTasks.filter((t) => t.rank === 1).length +
            allTasks.filter((t: any) => {
              const d = t.ActivityDate || t.DueDate;
              return d && d < todayStr;
            }).length;

          // Top 3 cases
          const topCases = (sfResult?.openCases || []).slice(0, 3).map((c: any) => ({
            id: c.Id,
            subject: c.Subject || "Case",
            status: c.Status,
            priority: c.Priority,
            accountName: c.Account?.Name || "",
            createdDate: c.CreatedDate,
          }));

          // Stale opps count only (≤5 is signal, >5 is noise → cap at meaningful)
          const filteredStaleCount = Math.min(staleOppsCount, 20);

          return NextResponse.json({
            // Book snapshot
            totalAum,
            clientCount,
            activeClientCount,
            advisorName: sfResult?.advisor?.name || advisor.name,

            // Urgency counts
            urgency: {
              openCases: openCasesCount,
              overdueTasks: overdueCount,
              staleOpps: filteredStaleCount,
              meetingsToday: upcomingEventsCount, // will be supplemented by /api/calendar/live on client
            },

            // Ranked task list (top 8)
            tasks: rankedTasks,

            // Top cases (top 3)
            cases: topCases,

            // Briefing sentence data
            briefing: {
              meetingsToday: upcomingEventsCount,
              urgentCategories: [
                openCasesCount > 0 ? "open cases" : null,
                overdueCount > 0 ? "overdue tasks" : null,
                filteredStaleCount > 0 ? "stale opportunities" : null,
              ].filter(Boolean).length,
            },

            // Metadata
            isLiveData: true,
            isDemoData: false,
            source: "mulesoft",
          }, {
            headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
          });
        }
      } catch (err) {
        logger.error({ err }, "[MyDay] Live SF/Orion fetch failed");
      }
    }

    // ── Local database fallback (demo/non-SF users) ──
    const [allClients, allHouseholds, localTasks, localAlerts] = await Promise.all([
      storage.getClients(advisor.id),
      storage.getHouseholds(advisor.id),
      storage.getTasks(advisor.id),
      storage.getAlerts(advisor.id),
    ]);

    const totalAum = allHouseholds.reduce(
      (sum, h) => sum + parseFloat((h.totalAum as string) || "0"), 0
    );
    const clientCount = allClients.length;
    const activeClientCount = allClients.filter((c) => c.status === "active" || !c.status).length;

    // Rank local tasks
    const localRanked = (localTasks || [])
      .filter((t: any) => t.status !== "completed")
      .map((t: any) => {
        const dueDate = t.dueDate || null;
        let rank = 5;
        let rankLabel = "upcoming";
        if (dueDate && dueDate < todayStr) { rank = 1; rankLabel = "overdue"; }
        else if (dueDate === todayStr) { rank = 2; rankLabel = "today"; }
        return {
          id: t.id,
          subject: t.title || t.description || "Task",
          status: t.status,
          priority: t.priority || "normal",
          dueDate,
          relatedTo: "",
          source: "local" as const,
          rank,
          rankLabel,
        };
      })
      .sort((a: any, b: any) => a.rank - b.rank)
      .slice(0, 8);

    const overdueCount = (localTasks || []).filter((t: any) =>
      t.status !== "completed" && t.dueDate && t.dueDate < todayStr
    ).length;

    const urgentAlerts = (localAlerts || []).filter((a: any) =>
      a.severity === "high" || a.severity === "critical"
    );

    // Top 3 alerts as cases substitute
    const topCases = urgentAlerts.slice(0, 3).map((a: any) => ({
      id: a.id,
      subject: a.title || a.message || "Alert",
      status: a.status || "active",
      priority: a.severity || "medium",
      accountName: a.clientName || "",
      createdDate: a.createdAt,
    }));

    const localMeetings = await storage.getMeetings(advisor.id);
    const todayMeetings = (localMeetings || []).filter((m: any) => {
      const mDate = (m.scheduledDate || m.date || "").split("T")[0];
      return mDate === todayStr;
    });

    return NextResponse.json({
      totalAum,
      clientCount,
      activeClientCount,
      advisorName: advisor.name,

      urgency: {
        openCases: urgentAlerts.length,
        overdueTasks: overdueCount,
        staleOpps: 0,
        meetingsToday: todayMeetings.length,
      },

      tasks: localRanked,
      cases: topCases,

      briefing: {
        meetingsToday: todayMeetings.length,
        urgentCategories: [
          urgentAlerts.length > 0 ? "alerts" : null,
          overdueCount > 0 ? "overdue tasks" : null,
        ].filter(Boolean).length,
      },

      isLiveData: false,
      isDemoData: true,
      source: "local-db",
    }, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
    });

  } catch (error) {
    logger.error({ err: error }, "[MyDay] Unexpected error");
    return NextResponse.json(
      { message: "Failed to load My Day data" },
      { status: 500 }
    );
  }
}
