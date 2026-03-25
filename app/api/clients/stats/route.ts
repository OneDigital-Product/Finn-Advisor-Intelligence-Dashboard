import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getHouseholds as getLiveHouseholds,
  getClientsValue as getOrionClientsValue,
  getContributionsForRange,
  getBillingSummary,
} from "@server/integrations/mulesoft/api";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import {
  getOpenOpportunities,
  getHouseholdsByAdvisor,
  getOpenCasesByAdvisor,
  getStaleOpportunities,
} from "@server/integrations/salesforce/queries";

// Cache SF advisor ID from successful MuleSoft fetches so direct SF fallback works
const _g = globalThis as any;
if (!_g._advisorSfIdCache) _g._advisorSfIdCache = new Map<string, { sfId: string; ts: number }>();
const advisorSfIdCache: Map<string, { sfId: string; ts: number }> = _g._advisorSfIdCache;
const SF_ID_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ---------------------------------------------------------------------------
// GET /api/clients/stats
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    // ----- Salesforce-eligible users -> live stats from MuleSoft -----
    if (isSalesforceUser(advisor.email) && isMulesoftEnabled()) {
      const sfUsername = getSalesforceUsername(advisor.email);
      logger.info(
        `[Clients Stats] advisorEmail=${advisor.email} sfUsername=${sfUsername} mulesoftEnabled=true`
      );
      try {
        // Use allSettled so Orion data survives even if SF fails
        // Use small pageSize to avoid Salesforce JSON truncation on large books.
        // We only need totalSize + a sample of statuses for the stats endpoint.
        const [sfSettled, orionSettled] = await Promise.allSettled([
          getLiveHouseholds({
            username: sfUsername,
            pageSize: 50,
          }),
          getOrionClientsValue(),
        ]);

        const sfResult = sfSettled.status === "fulfilled" ? sfSettled.value : null;
        const orionAccounts = orionSettled.status === "fulfilled" ? orionSettled.value : [];

        if (sfSettled.status === "rejected") {
          logger.warn({ err: sfSettled.reason }, "[Clients Stats] SF households failed — using Orion-only stats");
        }
        if (orionSettled.status === "rejected") {
          logger.warn({ err: orionSettled.reason }, "[Clients Stats] Orion clients failed");
        }

        // Only use Orion data when SF is also available (SF scopes clients to this advisor;
        // without SF, Orion returns the entire firm's 35K+ portfolios unfiltered)
        if (sfResult && orionAccounts.length > 0) {
          // Compute total AUM from Orion portfolio data — uses totalValue (NOT value)
          const totalAum = orionAccounts.reduce((sum, a) => sum + (a.totalValue || 0), 0);
          const nonZeroAccounts = orionAccounts.filter((a) => (a.totalValue || 0) > 0);
          const clientCount = sfResult.totalSize || 0;

          // Compute active client count from household statuses.
          // We fetch pageSize=50 to avoid SF JSON truncation on large books,
          // so we may only have a sample. Extrapolate from the sample ratio.
          const households = sfResult?.householdAccounts || [];
          const activeStatuses = new Set(["active", "client"]);
          let activeClientCount = clientCount; // default: assume all active
          if (households.length > 0) {
            const sampleActive = households.filter((h: any) => {
              const status = (h.FinServ__Status__c || "").toLowerCase();
              return activeStatuses.has(status) || status === "";
            }).length;
            // Extrapolate: if 48/50 in sample are active, apply that ratio to total
            const activeRatio = sampleActive / households.length;
            activeClientCount = Math.round(clientCount * activeRatio);
          }
          const averageClientAUM = clientCount > 0 ? Math.round(totalAum / clientCount) : 0;

          let topClient: { name: string; aum: number } | null = null;
          if (nonZeroAccounts.length > 0) {
            const sorted = [...nonZeroAccounts].sort(
              (a, b) => (b.totalValue || 0) - (a.totalValue || 0)
            );
            topClient = { name: sorted[0].name, aum: sorted[0].totalValue || 0 };
          }

          // Try real billing data from Orion first, fall back to 85bps estimate
          let revenueYTD = 0;
          let revenueSource = "estimated";
          try {
            const billing = await getBillingSummary();
            if (billing && billing.totalFees > 0) {
              revenueYTD = Math.round(billing.totalFees);
              revenueSource = "orion-billing";
            }
          } catch { /* silent — fall through to estimate */ }
          if (revenueYTD === 0) {
            const revenueRate = 0.0085;
            revenueYTD = Math.round(
              (totalAum * revenueRate * (new Date().getMonth() + 1)) / 12
            );
          }

          // Compute real net flows from Orion Reporting/Scope (async, non-blocking)
          // Use a sample of top accounts to estimate book-level flows
          const topAccountIds = nonZeroAccounts
            .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
            .slice(0, 50)
            .map((a) => Number(a.id))
            .filter((id) => !isNaN(id));

          let netFlowsMTD = 0;
          let netFlowsQTD = 0;
          let netFlowsYTD = 0;
          let netFlowsSource = "estimated";

          if (topAccountIds.length > 0) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const quarter = Math.floor(month / 3);
            const mtdStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
            const qtdStart = `${year}-${String(quarter * 3 + 1).padStart(2, "0")}-01`;
            const ytdStart = `${year}-01-01`;
            const today = now.toISOString().split("T")[0];

            try {
              const [mtdResult, qtdResult, ytdResult] = await Promise.allSettled([
                getContributionsForRange(topAccountIds, mtdStart, today),
                getContributionsForRange(topAccountIds, qtdStart, today),
                getContributionsForRange(topAccountIds, ytdStart, today),
              ]);

              const extractFlow = (result: PromiseSettledResult<any>): number => {
                if (result.status !== "fulfilled" || !result.value) return 0;
                const calcs = result.value?.calculations || (Array.isArray(result.value) ? result.value : []);
                const activity = calcs.find((c: any) => c.$type === "calculated-activity") || calcs[0];
                return activity?.value ?? 0;
              };

              // Scale up from sample to full book if we sampled
              const scaleFactor = nonZeroAccounts.length > 0
                ? nonZeroAccounts.reduce((s, a) => s + (a.totalValue || 0), 0) /
                  topAccountIds.reduce((s, id) => {
                    const acct = nonZeroAccounts.find((a) => Number(a.id) === id);
                    return s + (acct?.totalValue || 0);
                  }, 0)
                : 1;

              netFlowsMTD = Math.round(extractFlow(mtdResult) * scaleFactor);
              netFlowsQTD = Math.round(extractFlow(qtdResult) * scaleFactor);
              netFlowsYTD = Math.round(extractFlow(ytdResult) * scaleFactor);
              netFlowsSource = topAccountIds.length < nonZeroAccounts.length ? "sampled" : "actual";
            } catch (err) {
              logger.warn({ err }, "[Clients Stats] Net flows computation failed, returning zeros");
            }
          }

          const netFlowsPercentage = totalAum > 0 ? (netFlowsYTD / totalAum) * 100 : 0;

          // ── Fetch full open opportunity pipeline from SF (non-blocking) ──
          let openOpportunitiesList: any[] = [];
          const advisorSfId = sfResult?.advisor?.id;
          // Cache SF advisor ID for direct fallback use
          if (advisorSfId && advisor.email) {
            advisorSfIdCache.set(advisor.email, { sfId: advisorSfId, ts: Date.now() });
          }
          if (advisorSfId && isSalesforceEnabled()) {
            try {
              const openOpps = await getOpenOpportunities(advisorSfId);
              openOpportunitiesList = openOpps.slice(0, 50).map((o: any) => ({
                id: o.Id,
                name: o.Name || "Opportunity",
                stageName: o.StageName,
                amount: o.Amount || 0,
                closeDate: o.CloseDate,
                probability: o.Probability || 0,
                accountName: o.Account?.Name || "",
                type: o.Type || "",
                lastActivityDate: o.LastActivityDate,
                description: o.Description || "",
              }));
            } catch (err) {
              logger.warn({ err }, "[Clients Stats] Open opportunities fetch failed");
            }
          }

          // Pipeline summary
          const pipelineTotal = openOpportunitiesList.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
          const pipelineWeighted = openOpportunitiesList.reduce(
            (sum: number, o: any) => sum + (o.amount || 0) * ((o.probability || 0) / 100), 0
          );

          return NextResponse.json({
            totalAum,
            netFlowsMTD,
            netFlowsQTD,
            netFlowsYTD,
            netFlowsPercentage,
            netFlowsSource,
            revenueYTD,
            revenueSource,
            clientCount,
            activeClientCount,
            averageClientAUM,
            topClient,
            isDemoData: false,
            isLiveData: true,
            sfAvailable: !!sfResult,
            advisorName: sfResult?.advisor?.name,
            advisorDivision: sfResult?.advisor?.division,
            // Revenue goals — from SF Apex REST advisor object
            revenueGoals: {
              recurringWonSalesThisYear: sfResult?.advisor?.recurringWonSalesThisYear ?? 0,
              ytdWmNonRecurringWonSales: sfResult?.advisor?.ytdWmNonRecurringWonSales ?? 0,
              wmYtdRecurringSalesGoal: sfResult?.advisor?.wmYtdRecurringSalesGoal ?? 0,
              wmYtdRecurringSalesPctToGoal: sfResult?.advisor?.wmYtdRecurringSalesPctToGoal ?? 0,
              wmYtdNonRecurringSalesGoal: sfResult?.advisor?.wmYtdNonRecurringSalesGoal ?? 0,
              wmYtdNonRecurringSalesPctToGoal: sfResult?.advisor?.wmYtdNonRecurringSalesPctToGoal ?? 0,
              source: "salesforce-apex-household-v3",
            },
            openTasks: sfResult?.openTasks?.length || 0,
            upcomingEvents: sfResult?.upcomingEvents?.length || 0,
            openCases: sfResult?.openCases?.length || 0,
            staleOpportunities: sfResult?.staleOpportunities?.length || 0,
            recentlyClosedOpportunities: sfResult?.recentlyClosedOpportunities?.length || 0,
            openTasksList: (sfResult?.openTasks || []).slice(0, 20).map((t: any) => ({
              id: t.Id,
              subject: t.Subject || "Task",
              status: t.Status,
              priority: t.Priority,
              createdDate: t.CreatedDate,
              relatedTo: t.What?.Name || "",
            })),
            openCasesList: (sfResult?.openCases || []).slice(0, 10).map((c: any) => ({
              id: c.Id,
              subject: c.Subject || "Case",
              status: c.Status,
              priority: c.Priority,
              accountName: c.Account?.Name || "",
              createdDate: c.CreatedDate,
            })),
            staleOpportunitiesList: (sfResult?.staleOpportunities || [])
              .slice(0, 10)
              .map((o: any) => ({
                id: o.Id,
                name: o.Name || "Opportunity",
                stageName: o.StageName,
                accountName: o.Account?.Name || "",
                lastActivityDate: o.LastActivityDate,
              })),
            recentlyClosedOpportunitiesList: (sfResult?.recentlyClosedOpportunities || [])
              .slice(0, 10)
              .map((o: any) => ({
                id: o.Id,
                name: o.Name || "Opportunity",
                stageName: o.StageName,
                accountName: o.Account?.Name || "",
                amount: o.Amount || 0,
                closeDate: o.CloseDate,
              })),
            upcomingEventsList: (sfResult?.upcomingEvents || []).slice(0, 10).map((e: any) => ({
              id: e.Id,
              subject: e.Subject || "Event",
              startDateTime: e.StartDateTime || e.ActivityDateTime,
              endDateTime: e.EndDateTime,
              location: e.Location || "",
              type: e.Type || e.EventSubtype || "Meeting",
              whoName: e.Who?.Name || "",
              whatName: e.What?.Name || "",
              isAllDay: e.IsAllDayEvent || false,
            })),
            orionPortfolioCount: orionAccounts.length,
            orionNonZeroCount: nonZeroAccounts.length,
            // Pipeline data from SF getOpenOpportunities
            openOpportunities: openOpportunitiesList.length,
            openOpportunitiesList,
            pipelineTotal: Math.round(pipelineTotal),
            pipelineWeighted: Math.round(pipelineWeighted),
          }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } });
        }
      } catch (err) {
        logger.error({ err }, "[Clients Stats] Live SF/Orion fetch failed, trying direct SF");
      }

      // ── Direct SF fallback — MuleSoft batch failed but SF may be up ──
      const cachedSfId = advisorSfIdCache.get(advisor.email);
      const fallbackSfId = cachedSfId && (Date.now() - cachedSfId.ts < SF_ID_CACHE_TTL) ? cachedSfId.sfId : null;
      if (isSalesforceEnabled() && fallbackSfId) {
        try {
          const sfId = fallbackSfId;
          const [hhResult, casesResult, staleResult, oppsResult] = await Promise.allSettled([
            getHouseholdsByAdvisor(sfId),
            getOpenCasesByAdvisor(sfId),
            getStaleOpportunities(sfId),
            getOpenOpportunities(sfId),
          ]);

          const households = hhResult.status === "fulfilled" ? hhResult.value : [];
          const cases = casesResult.status === "fulfilled" ? casesResult.value : [];
          const stale = staleResult.status === "fulfilled" ? staleResult.value : [];
          const opps = oppsResult.status === "fulfilled" ? oppsResult.value : [];

          if (households.length > 0) {
            const totalAum = households.reduce((sum, h: any) => sum + (h.FinServ__TotalAUMPrimary__c || 0), 0);
            const activeCount = households.filter((h: any) => {
              const s = (h.FinServ__Status__c || "").toLowerCase();
              return s === "active" || s === "client" || s === "";
            }).length;

            return NextResponse.json({
              totalAum,
              netFlowsMTD: 0, netFlowsQTD: 0, netFlowsYTD: 0,
              netFlowsPercentage: 0, netFlowsSource: "unavailable",
              revenueYTD: Math.round((totalAum * 0.0085 * (new Date().getMonth() + 1)) / 12),
              revenueSource: "estimated",
              clientCount: households.length,
              activeClientCount: activeCount,
              averageClientAUM: households.length > 0 ? Math.round(totalAum / households.length) : 0,
              topClient: null,
              isDemoData: false, isLiveData: true,
              sfAvailable: true,
              openCases: cases.length,
              openCasesList: cases.slice(0, 10).map((c: any) => ({
                id: c.Id, subject: c.Subject || "Case", status: c.Status,
                priority: c.Priority, accountName: c.Account?.Name || "", createdDate: c.CreatedDate,
              })),
              staleOpportunities: stale.length,
              staleOpportunitiesList: stale.slice(0, 10).map((o: any) => ({
                id: o.Id, name: o.Name || "Opportunity", stageName: o.StageName,
                accountName: o.Account?.Name || "", lastActivityDate: o.LastActivityDate,
              })),
              openOpportunities: opps.length,
              openOpportunitiesList: opps.slice(0, 50).map((o: any) => ({
                id: o.Id, name: o.Name || "Opportunity", stageName: o.StageName,
                amount: o.Amount || 0, closeDate: o.CloseDate, probability: o.Probability || 0,
                accountName: o.Account?.Name || "", type: o.Type || "",
                lastActivityDate: o.LastActivityDate, description: o.Description || "",
              })),
              pipelineTotal: Math.round(opps.reduce((s: number, o: any) => s + (o.Amount || 0), 0)),
              pipelineWeighted: Math.round(opps.reduce((s: number, o: any) => s + (o.Amount || 0) * ((o.Probability || 0) / 100), 0)),
              source: "sf-direct",
            }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } });
          }
        } catch (err) {
          logger.warn({ err }, "[Clients Stats] Direct SF fallback also failed");
        }
      }
    }

    // ----- Standard path -> local database -----
    const [allClients, allHouseholds] = await Promise.all([
      storage.getClients(advisor.id),
      storage.getHouseholds(advisor.id),
    ]);

    const totalAum = allHouseholds.reduce(
      (sum, h) => sum + parseFloat((h.totalAum as string) || "0"),
      0
    );
    const clientCount = allClients.length;
    const activeClientCount = allClients.filter(
      (c) => c.status === "active" || !c.status
    ).length;
    const averageClientAUM = clientCount > 0 ? totalAum / clientCount : 0;

    const revenueRate = 0.0085;
    // TODO: Replace with real Orion billing/flow data when available for non-UAT users
    const netFlowsMTD = 0; // Was hardcoded 287000 — removed fake data
    const netFlowsQTD = 0; // Was hardcoded 842000 — removed fake data
    const netFlowsYTD = 0; // Was hardcoded 1250000 — removed fake data
    const revenueYTD = Math.round(totalAum * revenueRate);

    const netFlowsPercentage = totalAum > 0 ? (netFlowsYTD / totalAum) * 100 : 0;

    let topClient: { name: string; aum: number } | null = null;
    if (allClients.length > 0) {
      const aumMap = await storage.getAumByClient(allClients.map((c) => c.id));
      const clientAums = allClients.map((client) => {
        const aumData = aumMap.get(client.id);
        return {
          name: `${client.firstName} ${client.lastName}`,
          aum: aumData?.totalAum ?? 0,
        };
      });
      topClient = clientAums.sort((a, b) => b.aum - a.aum)[0] || null;
    }

    return NextResponse.json({
      totalAum,
      netFlowsMTD,
      netFlowsQTD,
      netFlowsYTD,
      netFlowsPercentage: parseFloat(netFlowsPercentage.toFixed(2)),
      revenueYTD,
      clientCount,
      activeClientCount,
      averageClientAUM: Math.round(averageClientAUM),
      topClient,
      isDemoData: true,
    }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } });
  } catch (error: any) {
    logger.error({ err: error }, "[Clients Stats] API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
