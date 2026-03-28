import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import {
  getClientsValue as getOrionClientsValue,
  getClientAccounts as getOrionAccounts,
  getClientAssets as getOrionAssets,
} from "@server/integrations/mulesoft/api";
import { resolveClientIdentity } from "@server/lib/client-identity";
import { BehavioralFinanceEngine } from "@server/engines/behavioral-finance";
import { logger } from "@server/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/client-360/[id]/prep
// Composite pre-meeting prep endpoint. Orchestrates 7+ upstream calls via
// Promise.allSettled. Hard-fails only on missing client identity.
// No AI generation — talking points are rule-based and deterministic.
// ---------------------------------------------------------------------------

import { resolveClientFast } from "@server/lib/enriched-clients-cache";

type RouteContext = { params: Promise<{ id: string }> };

/* ── Helpers ── */

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

function goalStatus(current: number, target: number): "on-track" | "behind" | "ahead" | "at-risk" {
  if (target <= 0) return "on-track";
  const pct = current / target;
  if (pct >= 1.0) return "ahead";
  if (pct >= 0.7) return "on-track";
  if (pct >= 0.4) return "behind";
  return "at-risk";
}

/** Match a household name to Orion AUM from the bulk value lookup. */
function matchOrionAum(name: string, orionClients: any[]): number {
  if (!orionClients?.length || !name) return 0;
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = normalise(name);
  for (const oc of orionClients) {
    const ocName = normalise(oc.name || oc.clientName || "");
    if (ocName === target || ocName.includes(target) || target.includes(ocName)) {
      return oc.totalValue || oc.currentValue || 0;
    }
  }
  return 0;
}

/** Generate rule-based talking points from assembled data. Max 5. */
function generateTalkingPoints(data: {
  goals: any[];
  topDrift: any | null;
  overdueTasks: any[];
  aumDeltaPct: number | null;
  staleOpps: any[];
  complianceFlags: string[];
  lifeEvents: any[];
}): string[] {
  const points: string[] = [];

  // 1. Goals behind
  for (const g of data.goals) {
    if (points.length >= 5) break;
    if (g.status === "behind" || g.status === "at-risk") {
      const pct = g.targetAmount > 0 ? Math.round((1 - g.currentAmount / g.targetAmount) * 100) : 0;
      points.push(`Review ${g.name} \u2014 currently ${pct}% below target`);
    }
  }

  // 2. Portfolio drift
  if (data.topDrift && Math.abs(data.topDrift.driftPct) > 3 && points.length < 5) {
    const dir = data.topDrift.driftPct > 0 ? "above" : "below";
    points.push(`${data.topDrift.assetClass} allocation is ${Math.abs(data.topDrift.driftPct).toFixed(1)}% ${dir} target \u2014 discuss rebalancing`);
  }

  // 3. Overdue tasks
  for (const t of data.overdueTasks) {
    if (points.length >= 5) break;
    points.push(`Follow up on ${t.subject} \u2014 overdue ${t.daysOverdue} days`);
  }

  // 4. AUM delta
  if (data.aumDeltaPct !== null && Math.abs(data.aumDeltaPct) > 5 && points.length < 5) {
    const verb = data.aumDeltaPct > 0 ? "grew" : "declined";
    points.push(`Portfolio ${verb} ${Math.abs(data.aumDeltaPct).toFixed(1)}% since last meeting`);
  }

  // 5. Stale opps
  for (const o of data.staleOpps) {
    if (points.length >= 5) break;
    points.push(`Revisit ${o.name} \u2014 no activity in ${o.daysSinceActivity} days`);
  }

  // 6. Compliance flags
  for (const f of data.complianceFlags) {
    if (points.length >= 5) break;
    points.push(f);
  }

  // 7. Life events
  for (const e of data.lifeEvents) {
    if (points.length >= 5) break;
    points.push(`Acknowledge ${e.description}`);
  }

  // Padding if < 3
  const padding = [
    "Confirm financial goals are current",
    "Review overall portfolio allocation",
    "Discuss any changes in personal circumstances",
  ];
  for (const p of padding) {
    if (points.length >= 3) break;
    points.push(p);
  }

  return points.slice(0, 5);
}

/* ── Route Handler ── */

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;
    const idCheck = validateId(id);
    if (!idCheck.valid) return idCheck.error;

    const now = new Date();
    const sources: string[] = [];

    // ── Client identity resolution ──
    // Try enriched cache → warm on miss → local DB fallback for non-SF users.
    const identity = await resolveClientIdentity(id, auth.session.userEmail);
    const userEmail = auth.session.userEmail;

    let clientName = "";
    let clientSegment = "C";
    let clientTotalAum = 0;
    let clientRiskTolerance: string | null = null;
    let clientServiceModel: string | null = null;
    let clientHouseholdId: string | null = null;
    let clientNextReview: string | null = null;
    let clientLastReview: string | null = null;

    // Fast-path: cache hit → SF page 1 → full warm fallback
    const cacheHit = await resolveClientFast(id, userEmail!);

    if (cacheHit) {
      clientName = [cacheHit.firstName, cacheHit.lastName].filter(Boolean).join(" ");
      clientSegment = cacheHit.segment || "C";
      clientTotalAum = cacheHit.totalAum || 0;
      clientRiskTolerance = cacheHit.riskTolerance || null;
      clientServiceModel = cacheHit.serviceModel || null;
      clientHouseholdId = cacheHit.householdId || id;
      clientNextReview = cacheHit.nextReview || null;
      clientLastReview = cacheHit.lastReview || null;
      sources.push("client:cache");
    } else {
      // Local DB fallback (non-SF users or warming failed)
      const client = await storage.getClient(id);
      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim();
      clientSegment = client.segment || "C";
      clientTotalAum = client.totalAum || 0;
      clientRiskTolerance = client.riskTolerance || null;
      clientServiceModel = client.serviceModel || null;
      clientHouseholdId = client.householdId || id;
      clientNextReview = client.nextReview || null;
      clientLastReview = client.lastReview || null;
      sources.push("client:local");
    }

    // ── Parallel fetches via Promise.allSettled ──
    const [
      meetingsResult,
      tasksResult,
      goalsResult,
      behavioralResult,
      complianceResult,
      lifeEventsResult,
      orionAumResult,
      membersResult,
    ] = await Promise.allSettled([
      storage.getMeetingsByClient(id),
      storage.getTasksByClient(id),
      storage.getFinancialGoalsByClient(id),
      new BehavioralFinanceEngine().getClientBehavioralProfile(id),
      storage.getComplianceReviews(id),
      storage.getLifeEvents(id),
      isMulesoftEnabled() ? getOrionClientsValue().catch(() => []) : Promise.resolve([]),
      storage.getHouseholdMembers
        ? storage.getHouseholdMembers(clientHouseholdId || id).catch(() => [])
        : Promise.resolve([]),
    ]);

    // ── Extract results with graceful fallbacks ──
    const allMeetings = meetingsResult.status === "fulfilled" ? meetingsResult.value : [];
    if (meetingsResult.status === "fulfilled") sources.push("meetings");

    const allTasks = tasksResult.status === "fulfilled" ? tasksResult.value : [];
    if (tasksResult.status === "fulfilled") sources.push("tasks");

    const allGoals = goalsResult.status === "fulfilled" ? goalsResult.value : [];
    if (goalsResult.status === "fulfilled") sources.push("goals");

    const behavioralProfile = behavioralResult.status === "fulfilled" ? behavioralResult.value : null;
    if (behavioralResult.status === "fulfilled") sources.push("behavioral");

    const complianceReviews = complianceResult.status === "fulfilled" ? complianceResult.value : [];
    if (complianceResult.status === "fulfilled") sources.push("compliance");

    const allLifeEvents = lifeEventsResult.status === "fulfilled" ? lifeEventsResult.value : [];
    if (lifeEventsResult.status === "fulfilled") sources.push("lifeEvents");

    const orionClients = orionAumResult.status === "fulfilled" ? orionAumResult.value : [];

    const members = membersResult.status === "fulfilled" ? (membersResult.value as any[]) : [];
    if (membersResult.status === "fulfilled") sources.push("members");

    // ── Meeting context ──
    const sortedMeetings = [...allMeetings].sort(
      (a, b) => new Date(a.startTime || a.date || "").getTime() - new Date(b.startTime || b.date || "").getTime()
    );

    const upcomingMeeting = sortedMeetings.find(
      (m) => new Date(m.startTime || m.date || "").getTime() >= now.getTime() && m.status !== "completed"
    ) || null;

    const completedMeetings = sortedMeetings
      .filter((m) => m.status === "completed")
      .sort((a, b) => new Date(b.startTime || b.date || "").getTime() - new Date(a.startTime || a.date || "").getTime());
    const lastMeeting = completedMeetings[0] || null;

    const meeting = upcomingMeeting
      ? { id: upcomingMeeting.id, title: upcomingMeeting.title || "Meeting", startTime: upcomingMeeting.startTime || "", type: upcomingMeeting.type || undefined }
      : null;

    const lastMeetingOut = lastMeeting
      ? {
          id: lastMeeting.id,
          date: lastMeeting.startTime || lastMeeting.date || "",
          title: lastMeeting.title || "Meeting",
          summary: lastMeeting.transcriptSummary || null,
          notes: lastMeeting.notes || null,
        }
      : null;

    // ── AUM (Orion preferred, local DB fallback) ──
    let totalAum = clientTotalAum;
    let aumSource: "orion" | "salesforce" | "local" = "local";
    let isLiveData = false;

    if (orionClients && orionClients.length > 0) {
      const orionAum = matchOrionAum(clientName, orionClients);
      if (orionAum > 0) {
        totalAum = orionAum;
        aumSource = "orion";
        isLiveData = true;
        sources.push("orion-aum");
      }
    }

    // ── Changes since last meeting ──
    const sinceDate = lastMeeting
      ? new Date(lastMeeting.startTime || lastMeeting.date || "")
      : new Date(now.getTime() - 30 * 86_400_000); // fallback: last 30 days

    // AUM delta — only meaningful when Orion (live) differs from cached/stored AUM.
    // When Orion is unavailable, both values are the same → delta is unknown, not 0%.
    const aumPrevious = clientTotalAum || null;
    const hasTwoDistinctSources = aumSource === "orion" && aumPrevious !== null && aumPrevious !== totalAum;
    const aumDeltaPct = hasTwoDistinctSources && aumPrevious > 0 && totalAum > 0
      ? ((totalAum - aumPrevious) / aumPrevious) * 100
      : null;
    const aumDeltaIsApproximate = hasTwoDistinctSources;

    const newTaskCount = allTasks.filter(
      (t: any) => new Date(t.createdAt || t.createdDate || "").getTime() >= sinceDate.getTime()
    ).length;

    const newCaseCount = 0; // Cases come from SF activity — not available in local storage without monolithic fetch

    // Life events: filter for credible, recent (90 days), non-empty description
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000);
    const filteredLifeEvents = allLifeEvents
      .filter((e: any) => {
        if (!e.description || e.description.trim().length === 0) return false;
        const eventDate = new Date(e.eventDate || "");
        if (eventDate.getTime() < ninetyDaysAgo.getTime()) return false;
        // Exclude synthetic/low-confidence if downstream metadata indicates it
        const actions = e.downstreamActions || [];
        if (Array.isArray(actions)) {
          for (const a of actions) {
            if (a?.source === "synthetic" || a?.confidence === "low") return false;
          }
        }
        return true;
      })
      .sort((a: any, b: any) => new Date(b.eventDate || "").getTime() - new Date(a.eventDate || "").getTime())
      .slice(0, 3)
      .map((e: any) => ({
        type: e.eventType || "event",
        description: e.description,
        date: e.eventDate || "",
      }));

    // ── Open items ──
    const overdueTasks = allTasks
      .filter((t: any) => {
        if (t.status === "completed") return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate).getTime() < now.getTime();
      })
      .map((t: any) => ({
        id: t.id,
        subject: t.title || t.subject || "Task",
        dueDate: t.dueDate,
        daysOverdue: daysBetween(t.dueDate, now),
      }))
      .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)
      .slice(0, 5);

    // Open cases and stale opps are SF-sourced; not available without monolithic fetch
    // Return empty arrays — these will populate when SF activity integration is added to this endpoint
    const openCases: any[] = [];
    const staleOpps: any[] = [];

    // ── Portfolio snapshot (Orion — skip expensive calls if MuleSoft unavailable) ──
    let portfolio: any = null;
    if (isMulesoftEnabled() && isLiveData) {
      try {
        const [accounts, assets] = await Promise.all([
          getOrionAccounts(clientName).catch(() => []),
          getOrionAssets(clientName).catch(() => []),
        ]);
        sources.push("orion-portfolio");

        // Allocation from assets
        const allocationMap: Record<string, number> = {};
        let totalValue = 0;
        for (const a of (assets || [])) {
          const cls = a.assetClass || a.productType || "Other";
          const val = a.marketValue || a.currentValue || 0;
          const bucket =
            cls.toLowerCase().includes("equity") || cls.toLowerCase().includes("stock") ? "EQ" :
            cls.toLowerCase().includes("fixed") || cls.toLowerCase().includes("bond") ? "FI" :
            cls.toLowerCase().includes("cash") || cls.toLowerCase().includes("money") ? "CA" : "ALT";
          allocationMap[bucket] = (allocationMap[bucket] || 0) + val;
          totalValue += val;
        }

        const allocation = ["EQ", "FI", "ALT", "CA"].map((label) => ({
          label,
          pct: totalValue > 0 ? Math.round(((allocationMap[label] || 0) / totalValue) * 100) : 0,
        }));

        // Top holding by value
        const sortedAssets = [...(assets || [])].sort(
          (a: any, b: any) => (b.marketValue || 0) - (a.marketValue || 0)
        );
        const topAsset = sortedAssets[0];
        const topHolding = topAsset && totalValue > 0
          ? {
              ticker: topAsset.ticker || topAsset.symbol || topAsset.name || "—",
              name: topAsset.name || topAsset.description || "",
              weightPct: Math.round(((topAsset.marketValue || 0) / totalValue) * 100),
            }
          : null;

        // Top drift — compare allocation to a generic 60/30/5/5 target for now
        // V2: use client's actual model target from Orion
        const targets: Record<string, number> = { EQ: 60, FI: 30, ALT: 5, CA: 5 };
        let maxDrift: any = null;
        for (const a of allocation) {
          const target = targets[a.label] || 0;
          const drift = a.pct - target;
          if (Math.abs(drift) > 3 && (!maxDrift || Math.abs(drift) > Math.abs(maxDrift.driftPct))) {
            maxDrift = { assetClass: a.label, actualPct: a.pct, targetPct: target, driftPct: drift };
          }
        }

        portfolio = {
          totalAum,
          allocation,
          topDrift: maxDrift,
          topHolding,
        };
      } catch (err) {
        logger.warn("Prep: portfolio fetch failed, returning null", { error: String(err) });
        portfolio = null;
      }
    }

    // ── Goals (max 3) ──
    const goals = allGoals
      .slice(0, 3)
      .map((g: any) => ({
        name: g.name || "Goal",
        targetAmount: g.targetAmount || 0,
        currentAmount: g.currentAmount || 0,
        status: goalStatus(g.currentAmount || 0, g.targetAmount || 0),
      }));

    // ── Behavioral (concise — 4 fields max) ──
    let behavioral: any = null;
    if (behavioralProfile && behavioralProfile.analysisCount > 0) {
      behavioral = {
        communicationStyle: behavioralProfile.latestAnalysis?.communicationPreference || null,
        anxietyLevel: behavioralProfile.latestAnalysis?.anxietyLevel || behavioralProfile.anxietyTrend || null,
        dominantBias: behavioralProfile.dominantBiases?.[0] || null,
        briefNote: behavioralProfile.latestAnalysis?.coachingNote || null,
      };
    }

    // ── Compliance ──
    const sortedReviews = [...complianceReviews].sort(
      (a: any, b: any) => new Date(b.reviewDate || b.createdAt || "").getTime() - new Date(a.reviewDate || a.createdAt || "").getTime()
    );
    const latestReview = sortedReviews[0];
    const complianceFlags: string[] = [];

    if (clientNextReview) {
      const nextReviewDate = new Date(clientNextReview);
      if (nextReviewDate.getTime() <= now.getTime() + 30 * 86_400_000) {
        complianceFlags.push("Suitability review due this month");
      }
    }
    if (latestReview && latestReview.status === "overdue") {
      complianceFlags.push("Compliance review overdue");
    }

    const compliance = {
      lastReviewDate: clientLastReview || latestReview?.reviewDate || null,
      nextReviewDate: clientNextReview || null,
      flags: complianceFlags,
    };

    // ── Talking points (rule-based, no AI) ──
    const talkingPoints = generateTalkingPoints({
      goals,
      topDrift: portfolio?.topDrift || null,
      overdueTasks,
      aumDeltaPct,
      staleOpps,
      complianceFlags,
      lifeEvents: filteredLifeEvents,
    });

    // ── Members ──
    const memberList = members.map((m: any) => ({
      firstName: m.client?.firstName || m.firstName || "",
      lastName: m.client?.lastName || m.lastName || "",
      relationship: m.relationship || undefined,
    }));

    // ── Response ──
    return NextResponse.json(
      {
        client: {
          id,
          name: clientName,
          segment: clientSegment,
          totalAum,
          aumSource,
          riskTolerance: clientRiskTolerance,
          serviceModel: clientServiceModel,
          members: memberList,
        },
        meeting,
        lastMeeting: lastMeetingOut,
        changes: {
          aumPrevious,
          aumCurrent: totalAum,
          aumDeltaPct: aumDeltaPct !== null ? Math.round(aumDeltaPct * 10) / 10 : null,
          aumDeltaIsApproximate,
          newTaskCount,
          newCaseCount,
          lifeEvents: filteredLifeEvents,
        },
        openItems: {
          overdueTasks,
          openCases,
          staleOpps,
        },
        portfolio,
        goals,
        behavioral,
        compliance,
        talkingPoints,
        isLiveData,
        generatedAt: now.toISOString(),
        _sources: sources,
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    logger.error("Prep endpoint error", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
