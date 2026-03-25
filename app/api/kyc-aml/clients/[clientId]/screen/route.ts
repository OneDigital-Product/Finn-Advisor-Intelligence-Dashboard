import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { runAutomatedScreening } from "@server/routes/kyc-aml";
import { logger } from "@server/lib/logger";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { clientId } = await params;
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    const result = await runAutomatedScreening(client.id, advisor.id, advisor.name);
    if (!result) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    return NextResponse.json({
      results: result.results,
      matchesFound: result.screeningResult.matches.length,
      autoResolved: result.screeningResult.autoResolved.length,
      highestConfidence: result.screeningResult.highestConfidence,
      requiresManualReview: result.screeningResult.requiresManualReview,
      screeningRiskScore: result.screeningResult.screeningRiskScore,
    });
  } catch (error: any) {
    logger.error({ err: error }, "AML screening error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
