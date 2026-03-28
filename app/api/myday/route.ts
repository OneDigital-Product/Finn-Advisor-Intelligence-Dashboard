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
import { getCache, isCacheValid, warmEnrichedCache, getMemberEmailIndex, isMemberEmailIndexValid, warmMemberEmailIndex } from "@server/lib/enriched-clients-cache";
import { computeHouseholdSignals, extractReviewsDueSoon, extractNeglectedHouseholds, extractBottomHealthScores } from "@server/lib/household-signals";
import { isAIAvailable } from "@server/openai";

// ── Task ranking helpers ─────────────────────────────────────────

interface RankedTask {
  id: string;
  subject: string;
  status: string;
  priority: string;
  dueDate: string | null;
  relatedTo: string;
  clientId: string | null;  // resolved from cache name-match when available
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
        clientId: null as string | null,  // resolved post-rank when cache is available
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

          // Urgency counts — from SF result
          const openCasesCount = sfResult?.openCases?.length || 0;
          const staleOppsCount = sfResult?.staleOpportunities?.length || 0;
          const upcomingEventsCount = sfResult?.upcomingEvents?.length || 0;

          // Ranked tasks — top 8
          const allTasks = sfResult?.openTasks || [];
          const rankedTasks = rankTasks(allTasks, todayStr, weekEndStr).slice(0, 8);
          // FIX: count overdue from full array only (was double-counting ranked + full)
          const overdueCount = allTasks.filter((t: any) => {
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
            clientId: null as string | null,  // resolved when cache is available
            createdDate: c.CreatedDate,
          }));

          // Stale opps — show SF-provided count as-is
          const staleCount = staleOppsCount;

          // Revenue progress — from SF advisor record (already fetched)
          const sfAdvisor = sfResult?.advisor || {};
          const revenueProgress = {
            ytdRecurringWon: parseFloat(sfAdvisor.recurringWonSalesThisYear || "0"),
            ytdRecurringGoal: parseFloat(sfAdvisor.wmYtdRecurringSalesGoal || "0"),
            pctToGoal: parseFloat(sfAdvisor.wmYtdRecurringSalesPctToGoal || "0"),
          };

          // SF Events — serialize detail for Today's Schedule (already fetched, was only counted)
          const sfEvents = (sfResult?.upcomingEvents || []).slice(0, 10).map((e: any) => ({
            id: e.Id,
            subject: e.Subject || "Event",
            startTime: e.StartDateTime || e.ActivityDateTime || "",
            endTime: e.EndDateTime || "",
            location: e.Location || "",
            type: e.Type || e.EventSubtype || "",
            whoName: e.Who?.Name || "",
            whatName: e.What?.Name || "",
            isAllDay: !!e.IsAllDayEvent,
            source: "salesforce" as const,
          }));

          // Stale opportunity detail — top 3 most idle, for left-rail module
          const staleOppDetails = (sfResult?.staleOpportunities || [])
            .map((o: any) => {
              const lastActivity = o.LastActivityDate || null;
              const daysIdle = lastActivity
                ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / 86_400_000)
                : null;
              return {
                id: o.Id,
                name: o.Name || "Opportunity",
                accountName: o.Account?.Name || "",
                stageName: o.StageName || "",
                lastActivityDate: lastActivity,
                daysIdle,
              };
            })
            .sort((a: any, b: any) => (b.daysIdle ?? 9999) - (a.daysIdle ?? 9999))
            .slice(0, 3);

          // Recently closed opportunities — for Recent Wins module
          const recentWins = (sfResult?.recentlyClosedOpportunities || []).slice(0, 3).map((o: any) => ({
            id: o.Id,
            name: o.Name || "Opportunity",
            amount: parseFloat(o.Amount || "0"),
            closeDate: o.CloseDate || "",
            accountName: o.Account?.Name || "",
          }));

          // ── Full-book intelligence via shared signal catalog ──
          let _fullBookAvailable = false;
          let reviewsDueSoon: any[] = [];
          let neglectedHouseholds: any[] = [];
          let bottomHealthScores: any[] = [];

          const userEmail = advisor.email;
          if (isCacheValid(userEmail)) {
            _fullBookAvailable = true;
            const cacheData = getCache()!.data;

            // Compute signals for every client in the book
            const allSignals = cacheData.map((c: any) => computeHouseholdSignals(c));

            // Extract book-level intelligence from shared signal contract
            reviewsDueSoon = extractReviewsDueSoon(allSignals, 3);
            neglectedHouseholds = extractNeglectedHouseholds(allSignals, 3);
            bottomHealthScores = extractBottomHealthScores(allSignals, 3);

            // Resolve clientId for tasks and cases via cache name-match
            // (same pattern used by prepContexts at line ~338)
            const _norm = (s: string) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
            for (const task of rankedTasks) {
              if (!task.relatedTo) continue;
              const target = _norm(task.relatedTo);
              const hit = cacheData.find((c: any) =>
                _norm((c.firstName || "") + " " + (c.lastName || "")) === target
              );
              if (hit) task.clientId = hit.id;
            }
            for (const caseItem of topCases) {
              if (!caseItem.accountName) continue;
              const target = _norm(caseItem.accountName);
              const hit = cacheData.find((c: any) =>
                _norm((c.firstName || "") + " " + (c.lastName || "")) === target
              );
              if (hit) caseItem.clientId = hit.id;
            }
          } else {
            // Cache cold — trigger background warming, then chain member-email warming
            warmEnrichedCache(advisor.email)
              .then(() => warmMemberEmailIndex(advisor.email))
              .catch(() => {});
          }

          // ── Email → household reverse index for Outlook matching ──
          // Source priority: member person-account emails first (canonical in FSC orgs),
          // then cache/household emails as fallback (for Person Account orgs).
          let _emailIndex: any[] = [];
          let _memberEmailsAvailable = false;
          if (_fullBookAvailable) {
            const seen = new Set<string>();
            const dupes = new Set<string>();
            const cacheDataForIndex = getCache()!.data;
            let memberEmailCount = 0;
            let cacheEmailCount = 0;

            // Step 1: Member emails as primary source
            if (isMemberEmailIndexValid(userEmail)) {
              _memberEmailsAvailable = true;
              const memberEntries = getMemberEmailIndex();
              for (const me of memberEntries) {
                if (seen.has(me.email)) { dupes.add(me.email); continue; }
                seen.add(me.email);
                _emailIndex.push(me);
                memberEmailCount++;
              }
            }

            // Step 2: Cache/household emails as fallback (fills gaps only)
            for (const c of cacheDataForIndex) {
              if (!c.email) continue;
              const em = c.email.toLowerCase().trim();
              if (!em) continue;
              if (seen.has(em)) continue; // Already covered by member email — skip
              if (dupes.has(em)) continue;
              seen.add(em);
              _emailIndex.push({
                email: em,
                clientId: c.id,
                name: [c.firstName, c.lastName].filter(Boolean).join(" "),
                aum: c.totalAum || 0,
                segment: c.segment || "",
              });
              cacheEmailCount++;
            }

            // Remove ambiguous duplicates
            if (dupes.size > 0) {
              _emailIndex = _emailIndex.filter((e: any) => !dupes.has(e.email));
              memberEmailCount = _emailIndex.filter((e: any) => !cacheDataForIndex.some((c: any) => c.id === e.clientId && c.email)).length;
              cacheEmailCount = _emailIndex.length - memberEmailCount;
            }

            logger.info({
              source: _memberEmailsAvailable ? "member" : "cache",
              memberEmails: memberEmailCount,
              cacheEmails: cacheEmailCount,
              totalIndexSize: _emailIndex.length,
              duplicatesExcluded: dupes.size,
              _memberEmailsAvailable,
              _fullBookAvailable,
            }, "[MyDay] Email index coverage");

            // If member index not yet warm, trigger background warming
            if (!_memberEmailsAvailable) {
              warmMemberEmailIndex(userEmail).catch(() => {});
            }
          }

          // ── SF Event client resolution + prep context (cache-backed) ──
          const normalizeName = (s: string) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
          const prepContexts: any[] = [];

          if (_fullBookAvailable) {
            const cacheData = getCache()!.data;

            for (const evt of sfEvents) {
              if (!evt.whatName) {
                prepContexts.push({
                  eventId: evt.id, eventSubject: evt.subject, eventStartTime: evt.startTime,
                  clientId: null, clientName: null, matchConfidence: "none",
                  aum: null, segment: null, status: null, serviceModel: null,
                  reviewFrequency: null, lastReview: null, nextReview: null,
                  matchedTasks: [], matchedCases: [], matchedRecentWin: null,
                  _taskCountIsPartial: true as const, _caseCountIsPartial: true as const,
                });
                continue;
              }

              const target = normalizeName(evt.whatName);
              const matched = cacheData.find((c: any) =>
                normalizeName((c.firstName || "") + " " + (c.lastName || "")) === target
              );

              if (matched) {
                // Inject visible context into the sfEvent object
                evt.clientContext = {
                  clientId: matched.id,
                  aum: matched.totalAum || 0,
                  segment: matched.segment || "",
                };

                // Build prep context with partial task/case matching
                const clientNameNorm = normalizeName(evt.whatName);
                const matchedTasks = rankedTasks
                  .filter((t: any) => normalizeName(t.relatedTo) === clientNameNorm)
                  .map((t: any) => ({ subject: t.subject, dueDate: t.dueDate, rankLabel: t.rankLabel }));
                const matchedCases = topCases
                  .filter((c: any) => normalizeName(c.accountName) === clientNameNorm)
                  .map((c: any) => ({ subject: c.subject, priority: c.priority }));
                const matchedWin = recentWins.find((w: any) => normalizeName(w.accountName) === clientNameNorm);

                prepContexts.push({
                  eventId: evt.id, eventSubject: evt.subject, eventStartTime: evt.startTime,
                  clientId: matched.id, clientName: evt.whatName, matchConfidence: "exact",
                  aum: matched.totalAum || null, segment: matched.segment || null,
                  status: matched.status || null, serviceModel: matched.serviceModel || null,
                  reviewFrequency: matched.reviewFrequency || null,
                  lastReview: matched.lastReview || null, nextReview: matched.nextReview || null,
                  matchedTasks, matchedCases,
                  matchedRecentWin: matchedWin ? { name: matchedWin.name, amount: matchedWin.amount, closeDate: matchedWin.closeDate } : null,
                  _taskCountIsPartial: true as const, _caseCountIsPartial: true as const,
                });
              } else {
                prepContexts.push({
                  eventId: evt.id, eventSubject: evt.subject, eventStartTime: evt.startTime,
                  clientId: null, clientName: null, matchConfidence: "none",
                  aum: null, segment: null, status: null, serviceModel: null,
                  reviewFrequency: null, lastReview: null, nextReview: null,
                  matchedTasks: [], matchedCases: [], matchedRecentWin: null,
                  _taskCountIsPartial: true as const, _caseCountIsPartial: true as const,
                });
              }
            }
          }

          // ── Instrumentation ──
          const matchedCount = prepContexts.filter((p: any) => p.matchConfidence === "exact").length;
          logger.info({
            sfEventCount: sfEvents.length,
            matchedCount,
            _fullBookAvailable,
          }, "[MyDay] SF Event match instrumentation");

          return NextResponse.json({
            // Book snapshot
            totalAum,
            clientCount,
            advisorName: sfResult?.advisor?.name || advisor.name,

            // Urgency counts
            urgency: {
              openCases: openCasesCount,
              overdueTasks: overdueCount,
              staleOpps: staleCount,
            },

            // Ranked task list (top 8)
            tasks: rankedTasks,

            // Top cases (top 3)
            cases: topCases,

            // SF Events (for schedule enrichment)
            sfEvents,

            // Stale opportunity detail (top 3 most idle)
            staleOppDetails,

            // Revenue progress
            revenueProgress,

            // Non-recurring revenue progress (from SF advisor record)
            nonRecurringRevenue: {
              ytdWon: parseFloat(sfAdvisor.ytdWmNonRecurringWonSales || "0"),
              ytdGoal: parseFloat(sfAdvisor.wmYtdNonRecurringSalesGoal || "0"),
              pctToGoal: parseFloat(sfAdvisor.wmYtdNonRecurringSalesPctToGoal || "0"),
            },

            // Recently closed opportunities (for Recent Wins)
            recentWins,

            // Briefing sentence data
            briefing: {
              meetingsToday: upcomingEventsCount,
              urgentCategories: [
                openCasesCount > 0 ? "open cases" : null,
                overdueCount > 0 ? "overdue tasks" : null,
                staleCount > 0 ? "stale opportunities" : null,
              ].filter(Boolean).length,
            },

            // Full-book intelligence (cache-backed, via shared signal catalog)
            _fullBookAvailable,
            _memberEmailsAvailable,
            reviewsDueSoon,
            neglectedHouseholds,
            bottomHealthScores,

            // Pending workflow gates
            pendingGates: await (async () => {
              try {
                const gates = await storage.getWorkflowGatesByOwner(advisor.id, "pending");
                const enriched = await Promise.all(
                  gates.slice(0, 3).map(async (gate: any) => {
                    const instance = await storage.getWorkflowInstance(gate.instanceId);
                    const def = instance ? await storage.getWorkflowDefinition_v2(instance.definitionId) : null;
                    const client = instance?.clientId ? await storage.getClient(instance.clientId) : null;
                    return {
                      gateId: gate.id,
                      gateName: gate.gateName || gate.stepName || "Approval",
                      workflowName: def?.name || "Workflow",
                      clientName: client ? `${client.firstName} ${client.lastName}` : null,
                      clientId: instance?.clientId || null,
                      createdAt: gate.createdAt,
                      expiresAt: gate.expiresAt || null,
                      actions: gate.actions || [
                        { label: "Approve", value: "approved" },
                        { label: "Reject", value: "rejected", destructive: true },
                      ],
                    };
                  })
                );
                return enriched;
              } catch { return []; }
            })(),

            // Prep contexts (hidden — for future AI summarization)
            prepContexts,

            // Email → household index for Outlook matching
            _emailIndex,

            // Metadata
            _aiAvailable: isAIAvailable(),
            isLiveData: true,
            isDemoData: false,
            source: "mulesoft",
            generatedAt: now.toISOString(),
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
      advisorName: advisor.name,

      urgency: {
        openCases: urgentAlerts.length,
        overdueTasks: overdueCount,
        staleOpps: 0,
      },

      tasks: localRanked,
      cases: topCases,
      sfEvents: [],
      staleOppDetails: [],
      revenueProgress: { ytdRecurringWon: 0, ytdRecurringGoal: 0, pctToGoal: 0 },
      nonRecurringRevenue: { ytdWon: 0, ytdGoal: 0, pctToGoal: 0 },
      recentWins: [],

      briefing: {
        meetingsToday: todayMeetings.length,
        urgentCategories: [
          urgentAlerts.length > 0 ? "alerts" : null,
          overdueCount > 0 ? "overdue tasks" : null,
        ].filter(Boolean).length,
      },

      _fullBookAvailable: false,
      _memberEmailsAvailable: false,
      reviewsDueSoon: [],
      neglectedHouseholds: [],
      bottomHealthScores: [],
      pendingGates: [],
      prepContexts: [],
      _emailIndex: [],

      _aiAvailable: isAIAvailable(),
      isLiveData: false,
      isDemoData: true,
      source: "local-db",
      generatedAt: now.toISOString(),
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
