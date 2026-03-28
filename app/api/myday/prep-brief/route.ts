import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { chatCompletion, isAIAvailable } from "@server/openai";
import { logger } from "@server/lib/logger";

// ── In-memory brief cache (30-min TTL) ──
const briefCache = new Map<string, { brief: string; ts: number }>();
const BRIEF_TTL = 30 * 60 * 1000;

function getCachedBrief(key: string): string | null {
  const entry = briefCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > BRIEF_TTL) {
    briefCache.delete(key);
    return null;
  }
  return entry.brief;
}

// ── Currency formatter ──
function fmtAum(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ── POST /api/myday/prep-brief ──
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const ctx = body?.prepContext;

    // ── Validation ──
    if (!ctx) {
      return NextResponse.json({ error: "Missing prepContext" }, { status: 400 });
    }
    if (ctx.matchConfidence !== "exact") {
      return NextResponse.json({ error: "Only exact-match events are supported" }, { status: 400 });
    }
    if (!ctx.clientId || !ctx.clientName) {
      return NextResponse.json({ error: "Missing clientId or clientName" }, { status: 400 });
    }
    // Check imminent (within 60 minutes)
    const eventStart = new Date(ctx.eventStartTime).getTime();
    const now = Date.now();
    if (isNaN(eventStart) || eventStart - now > 60 * 60 * 1000) {
      return NextResponse.json({ error: "Event is not imminent (must start within 60 minutes)" }, { status: 400 });
    }

    // ── Cache check ──
    const cacheKey = `${ctx.eventId}:${ctx.clientId}`;
    const cached = getCachedBrief(cacheKey);
    if (cached) {
      logger.info({ eventId: ctx.eventId, clientId: ctx.clientId, cacheHit: true }, "[PrepBrief] Cache hit");
      return NextResponse.json({ brief: cached, generatedAt: new Date().toISOString(), cached: true });
    }

    // ── AI availability ──
    if (!isAIAvailable()) {
      logger.warn("[PrepBrief] AI not available");
      return NextResponse.json({ brief: "", generatedAt: "", cached: false, error: "AI not available" });
    }

    // ── Build prompt ──
    const systemPrompt = `You are a meeting prep assistant for a wealth advisor. Generate a brief, factual 2-3 sentence summary they can read in 5 seconds before a client meeting.

Rules:
- Use ONLY the data provided below. Do not add any information not present.
- Do not recommend actions or suggest conversation topics.
- Do not speculate about client preferences, goals, or personality.
- Do not claim completeness — task and case lists may be partial. Say "in your priority list" rather than "you have N total."
- Do not imply that missing review dates indicate neglect.
- Do not generate greetings, sign-offs, or filler.
- Keep tone professional, calm, and concise.
- Output plain text only. No markdown, no bullets, no headers.
- If very little data is available, generate a shorter 1-sentence summary.`;

    const tasks = (ctx.matchedTasks || []);
    const cases = (ctx.matchedCases || []);

    const taskLines = tasks.length > 0
      ? tasks.map((t: any) => `- ${t.subject} (${t.rankLabel})`).join("\n")
      : "None in priority list";

    const caseLines = cases.length > 0
      ? cases.map((c: any) => `- ${c.subject} (priority: ${c.priority})`).join("\n")
      : "None in priority list";

    const winLine = ctx.matchedRecentWin
      ? `${ctx.matchedRecentWin.name}, ${fmtAum(ctx.matchedRecentWin.amount)}, closed ${ctx.matchedRecentWin.closeDate}`
      : "None";

    const userPrompt = `Meeting: ${ctx.eventSubject} at ${new Date(ctx.eventStartTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}

Client: ${ctx.clientName}
${ctx.aum ? `AUM: ${fmtAum(ctx.aum)}` : "AUM: Not available"}
${ctx.segment ? `Segment: Tier ${ctx.segment}` : ""}
${ctx.status ? `Status: ${ctx.status}` : ""}

Open tasks from your priority list:
${taskLines}

Open cases from your priority list:
${caseLines}

Recent win: ${winLine}
Last review: ${ctx.lastReview || "No date on file"}
Next review: ${ctx.nextReview || "No date on file"}`;

    // ── Generate ──
    const t0 = Date.now();
    const brief = await chatCompletion(systemPrompt, userPrompt, false, 256);
    const durationMs = Date.now() - t0;

    logger.info({ eventId: ctx.eventId, clientId: ctx.clientId, cacheHit: false, success: true, durationMs }, "[PrepBrief] Generated");

    // ── Cache result ──
    if (brief) {
      briefCache.set(cacheKey, { brief, ts: Date.now() });
    }

    return NextResponse.json({
      brief: brief || "",
      generatedAt: new Date().toISOString(),
      cached: false,
    });

  } catch (err: any) {
    logger.error({ err: err?.message }, "[PrepBrief] Generation failed");
    return NextResponse.json({ brief: "", generatedAt: "", cached: false, error: "Generation failed" });
  }
}
