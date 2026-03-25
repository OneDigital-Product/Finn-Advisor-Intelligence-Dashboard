import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { db } from "@server/db";
import { factFinderResponses } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;

    const [updated] = await db
      .update(factFinderResponses)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(factFinderResponses.id, id), eq(factFinderResponses.advisorId, advisor.id)))
      .returning();

    if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinderResponses] Submit error:");
    return NextResponse.json({ message: "Failed to submit response" }, { status: 500 });
  }
}
