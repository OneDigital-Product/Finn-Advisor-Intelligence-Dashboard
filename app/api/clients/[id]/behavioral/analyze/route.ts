import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { BehavioralFinanceEngine } from "@server/engines/behavioral-finance";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const engine = new BehavioralFinanceEngine();

const analyzeSchema = z.object({
  communicationText: z.string().min(10, "Communication text must be at least 10 characters"),
  sourceType: z.enum(["meeting_transcript", "email", "phone_notes", "chat", "manual"]),
  sourceId: z.string().optional(),
  marketContext: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const analysisData = await engine.analyzeClientCommunication(
      id,
      advisor.id,
      parsed.data.communicationText,
      parsed.data.sourceType,
      parsed.data.sourceId,
      parsed.data.marketContext
    );

    const saved = await storage.createBehavioralAnalysis(analysisData);
    return NextResponse.json({ analysis: saved });
  } catch (err: any) {
    logger.error({ err: err }, "[Behavioral] Analyze error:");
    return NextResponse.json({ message: "Analysis failed" }, { status: 500 });
  }
}
