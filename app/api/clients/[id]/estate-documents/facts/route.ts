import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { candidateFacts } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const allFacts = await storage.db
      .select()
      .from(candidateFacts)
      .where(eq(candidateFacts.clientId, clientId));

    const estateRelatedFacts = allFacts.filter(f =>
      f.factType.startsWith("estate_")
    );

    return NextResponse.json({
      facts: estateRelatedFacts,
      count: estateRelatedFacts.length,
      byType: {
        beneficiaries: estateRelatedFacts.filter(f => f.factType === "estate_beneficiary").length,
        trustees: estateRelatedFacts.filter(f => f.factType === "estate_trustee").length,
        provisions: estateRelatedFacts.filter(f => f.factType === "estate_provision").length,
        conditions: estateRelatedFacts.filter(f => f.factType === "estate_condition").length,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, "Error fetching estate document facts");
    return NextResponse.json({ error: "Failed to fetch estate document facts" }, { status: 500 });
  }
}
