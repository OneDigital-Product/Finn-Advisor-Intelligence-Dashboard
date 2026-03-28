/**
 * POST /api/client-360/[id]/prep-brief
 *
 * V3.3: Generates an AI-powered meeting prep brief using native Agent 01.
 * Assembles MeetingPrepV33Input from existing data sources, calls
 * generateMeetingPrepStructured(), and returns the structured result.
 *
 * Cache: 30-min TTL keyed on clientId + meetingId.
 */

import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { resolveClientFast } from "@server/lib/enriched-clients-cache";
import { generateMeetingPrepStructured } from "@server/prompts/01-meeting-prep";

type RouteContext = { params: Promise<{ id: string }> };

// Simple in-memory cache
const briefCache = new Map<string, { result: any; ts: number }>();
const BRIEF_TTL = 30 * 60 * 1000; // 30 minutes

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const advisor = await getSessionAdvisor(auth.session);
  if (!advisor) return NextResponse.json({ error: "No advisor" }, { status: 404 });

  try {
    const body = await request.json().catch(() => ({}));
    const meetingType = body.meetingType || "general";
    const meetingId = body.meetingId || null;

    // Check cache
    const cacheKey = `${id}:${meetingId || "default"}`;
    const cached = briefCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < BRIEF_TTL) {
      return NextResponse.json({ ...cached.result, cached: true });
    }

    // Resolve client
    const client = await resolveClientFast(id, advisor.email);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const clientName = `${client.firstName} ${client.lastName}`.trim();

    // Assemble input from existing data sources
    const [meetings, tasks, accounts] = await Promise.allSettled([
      storage.getMeetingsByClient(id).catch(() => []),
      storage.getTasksByClient(id).catch(() => []),
      storage.getAccountsByClient(id).catch(() => []),
    ]);

    const clientMeetings = meetings.status === "fulfilled" ? meetings.value : [];
    const clientTasks = tasks.status === "fulfilled" ? tasks.value : [];
    const clientAccounts = accounts.status === "fulfilled" ? accounts.value : [];

    // Build the input for Agent 01
    const input = {
      clientName,
      meetingType,
      clientInfo: `${clientName} · Tier ${client.segment || "—"} · AUM $${(client.totalAum || 0).toLocaleString()} · ${client.status || "active"} · Risk: ${client.riskTolerance || "moderate"}`,
      holdings: (client.topHoldings || []).map((h: any) => `${h.ticker || h.name}: $${(h.marketValue || h.value || 0).toLocaleString()}`).join(", ") || "No holdings data",
      performance: "Performance data available in portfolio view",
      meetings: clientMeetings.slice(0, 5).map((m: any) => `${m.date || m.startTime}: ${m.subject || m.title}`).join("\n") || "No recent meetings",
      tasks: clientTasks.filter((t: any) => t.status !== "completed").slice(0, 10).map((t: any) => `[${t.priority || "Normal"}] ${t.title || t.subject} — Due: ${t.dueDate || "No date"}`).join("\n") || "No open tasks",
      lifeEvents: "",
      compliance: "",
      behavioral: "",
    };

    const result = await generateMeetingPrepStructured(input);

    // Cache the result
    briefCache.set(cacheKey, { result, ts: Date.now() });

    // Prune old cache entries
    if (briefCache.size > 50) {
      const now = Date.now();
      for (const [k, v] of briefCache) {
        if (now - v.ts > BRIEF_TTL) briefCache.delete(k);
      }
    }

    logger.info({ clientId: id, meetingType, contentLength: result.content?.length || 0 }, "[Prep Brief] Agent 01 generated successfully");

    return NextResponse.json({ ...result, cached: false, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    logger.error({ err, clientId: id }, "[Prep Brief] Generation failed");
    return NextResponse.json({ error: "Failed to generate prep brief", details: err?.message }, { status: 500 });
  }
}
