import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { db } from "@server/db";
import { factFinderDefinitions, factFinderResponses } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { calculateCompletionPercentage } from "@server/engines/fact-finder-renderer";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;

    const [response] = await db
      .select()
      .from(factFinderResponses)
      .where(and(eq(factFinderResponses.id, id), eq(factFinderResponses.advisorId, advisor.id)))
      .limit(1);

    if (!response) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(response);
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinderResponses] GET by id error:");
    return NextResponse.json({ message: "Failed to fetch response" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;

    const body = await request.json();
    const { answers } = body;

    const [existing] = await db
      .select()
      .from(factFinderResponses)
      .where(and(eq(factFinderResponses.id, id), eq(factFinderResponses.advisorId, advisor.id)))
      .limit(1);

    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const [definition] = await db
      .select()
      .from(factFinderDefinitions)
      .where(eq(factFinderDefinitions.id, existing.definitionId))
      .limit(1);

    const completionPercentage = definition
      ? calculateCompletionPercentage(definition, answers)
      : 0;

    const [updated] = await db
      .update(factFinderResponses)
      .set({ answers, completionPercentage, updatedAt: new Date() })
      .where(eq(factFinderResponses.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinderResponses] PATCH error:");
    return NextResponse.json({ message: "Failed to update response" }, { status: 500 });
  }
}
