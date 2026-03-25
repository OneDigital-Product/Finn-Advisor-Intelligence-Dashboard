import { NextResponse } from "next/server";
import { requireAuth, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getHouseholds as getLiveHouseholds } from "@server/integrations/mulesoft/api";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import {
  getTasksByHousehold,
  getEventsByHousehold,
  getActivityHistory,
} from "@server/integrations/salesforce/queries";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import { logger } from "@server/lib/logger";

// Reuse globalThis cache from GET /api/clients
const g = globalThis as any;
if (!g._enrichedClientsCache) g._enrichedClientsCache = null;
const ENRICHED_CLIENTS_TTL = 10 * 60 * 1000;

function getCache(): {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
} | null {
  return g._enrichedClientsCache;
}

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/clients/[id]/activity — Tier 3 (fast, from cached SF data)
// ---------------------------------------------------------------------------
export async function GET(request: Request, { params }: RouteContext) {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;
  const { id } = await params;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  const userEmail = session.userEmail;
  const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;
  const householdId = id;

  // -----------------------------------------------------------------------
  // Salesforce activity data for UAT advisors
  // -----------------------------------------------------------------------
  if (isSalesforceUser(userEmail) && isMulesoftEnabled()) {
    try {
      // Try to get SF household result from cache or a single fetch
      let sfHouseholdResult: any = null;

      const cache = getCache();
      if (
        cache &&
        cache.userEmail === userEmail &&
        Date.now() - cache.ts < ENRICHED_CLIENTS_TTL
      ) {
        // Cache exists and is fresh — still need the household page for
        // tasks/cases/events/opportunities. Do a minimal single-page fetch.
        try {
          sfHouseholdResult = await getLiveHouseholds({
            username: sfUsername!,
            pageSize: 1,
          });
        } catch {
          sfHouseholdResult = null;
        }
      } else {
        // No cache — do a single-page fetch
        try {
          sfHouseholdResult = await getLiveHouseholds({
            username: sfUsername!,
            pageSize: 1,
          });
        } catch {
          sfHouseholdResult = null;
        }
      }

      // --- Tasks ---
      const allOpenTasks = sfHouseholdResult?.openTasks || [];
      const householdTasks = allOpenTasks.filter(
        (t: any) =>
          t.WhatId === householdId ||
          t.AccountId === householdId ||
          t.What?.Id === householdId
      );
      const filteredTasks =
        householdTasks.length > 0 ? householdTasks : allOpenTasks;
      const tasks = filteredTasks.slice(0, 10).map((t: any) => ({
        id: t.Id,
        title: t.Subject || "Task",
        status: t.Status || "Open",
        priority: t.Priority || "Normal",
        description: t.Description || "",
        dueDate: t.ActivityDate || t.CreatedDate,
        type: t.Type || "",
        whoName: t.Who?.Name || "",
        whatName: t.What?.Name || "",
        ownerId: t.OwnerId || "",
        clientId: householdId,
        isHouseholdFiltered: householdTasks.length > 0,
      }));

      // --- Cases ---
      const mapCaseToComplianceStatus = (
        status?: string,
        priority?: string
      ): string => {
        const s = (status || "").toLowerCase();
        if ((priority || "").toLowerCase() === "high" || s === "escalated")
          return "overdue";
        if (s === "new" || s === "working") return "pending";
        return "expiring_soon";
      };

      const allOpenCases = sfHouseholdResult?.openCases || [];
      const householdCases = allOpenCases.filter(
        (c: any) =>
          c.AccountId === householdId || c.Account?.Id === householdId
      );
      const filteredCases =
        householdCases.length > 0 ? householdCases : allOpenCases;
      const cases = filteredCases.map((c: any) => ({
        id: c.Id || `case-${Math.random().toString(36).slice(2)}`,
        type: c.Type || c.Reason || "Open Case",
        description: [c.Subject, c.Description || c.Status]
          .filter(Boolean)
          .join(" \u2014 "),
        status: mapCaseToComplianceStatus(c.Status, c.Priority),
        dueDate: c.CreatedDate || null,
        completedDate: c.ClosedDate || null,
        ownerId: c.OwnerId || "",
        isLive: true,
      }));

      // --- Events ---
      const upcomingEvents = (
        sfHouseholdResult?.upcomingEvents ||
        sfHouseholdResult?.events ||
        []
      ).map((e: any) => ({
        id: e.Id,
        subject: e.Subject,
        startDateTime: e.StartDateTime,
        endDateTime: e.EndDateTime,
        location: e.Location || "",
        type: e.Type || "",
        whoName: e.Who?.Name || "",
        whatName: e.What?.Name || "",
        isAllDayEvent: e.IsAllDayEvent || false,
        isLive: true,
      }));

      // --- Stale Opportunities ---
      const staleOpportunities = (
        sfHouseholdResult?.staleOpportunities ||
        sfHouseholdResult?.opportunities ||
        []
      ).map((o: any) => ({
        id: o.Id,
        name: o.Name,
        stageName: o.StageName,
        closeDate: o.CloseDate,
        lastActivityDate: o.LastActivityDate,
        amount: o.Amount || 0,
        accountName: o.Account?.Name || "",
        isLive: true,
      }));

      // --- Recently Closed Opportunities ---
      const recentlyClosedOpportunities = (
        sfHouseholdResult?.recentlyClosedOpportunities || []
      ).map((o: any) => ({
        id: o.Id,
        name: o.Name,
        stageName: o.StageName,
        closeDate: o.CloseDate,
        lastActivityDate: o.LastActivityDate,
        amount: o.Amount || 0,
        accountName: o.Account?.Name || "",
        isLive: true,
      }));

      return NextResponse.json({
        tasks,
        cases,
        events: upcomingEvents,
        staleOpportunities,
        recentlyClosedOpportunities,
        isLiveData: true,
      });
    } catch (err) {
      logger.error({ err }, `[Activity] SF activity fetch failed for ${id}, trying direct SF queries`);
    }

    // -----------------------------------------------------------------------
    // Direct SF SOQL fallback — when MuleSoft batch is down but SF is up
    // -----------------------------------------------------------------------
    if (isSalesforceEnabled() && isValidSalesforceId(householdId)) {
      try {
        const [sfTasks, sfEvents, sfHistory] = await Promise.allSettled([
          getTasksByHousehold(householdId),
          getEventsByHousehold(householdId),
          getActivityHistory(householdId, 30),
        ]);

        const tasks = (sfTasks.status === "fulfilled" ? sfTasks.value : []).map((t: any) => ({
          id: t.Id,
          title: t.Subject || "Task",
          status: t.Status || "Open",
          priority: t.Priority || "Normal",
          description: "",
          dueDate: t.ActivityDate || t.CreatedDate,
          type: t.Type || "",
          whoName: "",
          whatName: "",
          ownerId: "",
          clientId: householdId,
          isHouseholdFiltered: true,
        }));

        const events = (sfEvents.status === "fulfilled" ? sfEvents.value : []).map((e: any) => ({
          id: e.Id,
          subject: e.Subject,
          startDateTime: e.StartDateTime,
          endDateTime: e.EndDateTime,
          location: "",
          type: e.Type || "",
          whoName: "",
          whatName: "",
          isAllDayEvent: false,
          isLive: true,
        }));

        const activityHistory = (sfHistory.status === "fulfilled" ? sfHistory.value : []).map((a: any) => ({
          id: a.Id,
          subject: a.Subject,
          activityDate: a.ActivityDate,
          activityType: a.ActivityType,
          status: a.Status,
          callType: a.CallType || null,
          callDuration: a.CallDurationInSeconds || null,
        }));

        if (tasks.length > 0 || events.length > 0) {
          return NextResponse.json({
            tasks,
            cases: [],
            events,
            staleOpportunities: [],
            recentlyClosedOpportunities: [],
            activityHistory,
            isLiveData: true,
            source: "sf-direct",
          });
        }
      } catch (err) {
        logger.warn({ err }, `[Activity] Direct SF fallback also failed for ${id}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Local DB fallback
  // -----------------------------------------------------------------------
  const client = await storage.getClient(id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const [tasks, events] = await Promise.all([
    storage.getTasksByClient(id).catch(() => []),
    storage.getMeetingsByClient(id).catch(() => []),
  ]);

  return NextResponse.json({
    tasks: tasks || [],
    cases: [],
    events: events || [],
    staleOpportunities: [],
    recentlyClosedOpportunities: [],
    isLiveData: false,
  });
} catch (err) {
    logger.error({ err }, "[clients/[id]/activity] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
