import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { generateMeetingSummaryStructured } from "@server/prompts/02-meeting-summary";
import { generateClientInsights } from "@server/prompts/06-client-insight-generation";
import { logger } from "@server/lib/logger";
import { z } from "zod";
import type { V33ClientInsightInput } from "@server/prompts/types";

// ── 30-min cache ──
const reviewCache = new Map<string, { result: any; expiry: number }>();
const CACHE_TTL = 30 * 60 * 1000;

const bodySchema = z.object({
  reviewType: z.enum(["annual", "quarterly", "ad-hoc"]),
  meetingId: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { reviewType } = parsed.data;
    const cacheKey = `${id}:${reviewType}`;

    const cached = reviewCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return NextResponse.json({ ...cached.result, cached: true });
    }

    // Assemble comprehensive context
    const [monolithic, portfolio] = await Promise.all([
      storage.getClientMonolithic?.(id).catch(() => null),
      storage.getClientPortfolio?.(id).catch(() => null),
    ]);

    const clientData = { ...client, ...(monolithic || {}) };
    const clientName = `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim() || "Client";
    const totalAum = clientData.totalAum || clientData.aum || 0;

    const meetingTypeMap: Record<string, string> = {
      annual: "annual_review",
      quarterly: "annual_review",
      "ad-hoc": "problem_solving",
    };

    // Call Agent 02: Meeting Summary (used as review summary)
    const summaryInput = {
      clientName,
      clientInfo: {
        age: clientData.age || 50,
        riskTolerance: clientData.riskTolerance || "moderate",
        totalAum: totalAum,
        household: clientData.household || clientName,
        segment: clientData.segment || "mass_affluent",
      },
      meetingTitle: `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} Review Summary`,
      meetingType: meetingTypeMap[reviewType] || "annual_review",
      meetingDate: new Date().toISOString().split("T")[0],
      meetingNotes: [
        `Review type: ${reviewType}`,
        `Client AUM: $${totalAum.toLocaleString()}`,
        clientData.healthScore != null ? `Health Score: ${clientData.healthScore}` : "",
        clientData.reviewStatus ? `Review Status: ${clientData.reviewStatus}` : "",
        (portfolio?.holdings || []).length > 0 ? `Portfolio: ${(portfolio?.holdings || []).length} holdings` : "",
      ].filter(Boolean).join("\n"),
      holdings: (portfolio?.holdings || []).slice(0, 20).map((h: any) => ({
        ticker: h.ticker || h.symbol || "",
        name: h.description || h.name || "",
        shares: h.shares || 0,
        marketValue: h.marketValue || 0,
        costBasis: h.costBasis || 0,
        unrealizedGainLoss: h.unrealizedGainLoss || 0,
      })),
      performance: portfolio?.portfolioPerformance ? [portfolio.portfolioPerformance] : [],
      tasks: (clientData.tasks || []).slice(0, 10).map((t: any) => ({
        title: t.title || t.subject || "",
        priority: t.priority || "Normal",
        dueDate: t.dueDate || null,
        status: t.status || "open",
      })),
      lifeEvents: (clientData.lifeEvents || []).slice(0, 5).map((e: any) => ({
        type: e.type || e.eventType || "",
        date: e.date || e.eventDate || "",
        description: e.description || "",
      })),
    };

    // Call Agent 06: Client Insights
    const insightInput: V33ClientInsightInput = {
      clientId: id,
      clientName,
      totalAum,
      accountCount: (portfolio?.accounts || []).length || clientData.accountCount || 0,
      segment: clientData.segment,
      riskTolerance: clientData.riskTolerance,
      age: clientData.age,
      topHoldings: (portfolio?.topHoldingsByValue || portfolio?.holdings || []).slice(0, 10).map((h: any) => ({
        ticker: h.ticker || h.symbol || "",
        name: h.name || h.description || "",
        marketValue: h.marketValue || 0,
        weight: h.weight || 0,
      })),
      pendingTasks: (clientData.tasks || []).filter((t: any) => t.status === "open").length,
      financialGoals: (clientData.financialGoals || clientData.goals || []).map((g: any) => ({
        name: g.name || g.goalName || "",
        targetAmount: g.amount || g.targetAmount || 0,
        currentAmount: g.currentAmount || g.currentSavings || 0,
        targetDate: g.targetDate || g.deadline || "",
      })),
    };

    const [reviewSummary, insights] = await Promise.all([
      generateMeetingSummaryStructured(summaryInput),
      generateClientInsights(insightInput),
    ]);

    const result = {
      reviewType,
      reviewSummary,
      insights,
      clientName,
      generatedAt: new Date().toISOString(),
    };

    reviewCache.set(cacheKey, { result, expiry: Date.now() + CACHE_TTL });
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "[ReviewSummary] Generate error");
    return NextResponse.json(
      { error: "Failed to generate review summary. Please try again." },
      { status: 500 }
    );
  }
}
