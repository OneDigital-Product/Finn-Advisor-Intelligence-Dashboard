import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { db } from "@server/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const clientId = id;

    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { preCaseValidations } = await import("@shared/schema");
    const results = await db
      .select()
      .from(preCaseValidations)
      .where(eq(preCaseValidations.clientId, clientId))
      .orderBy(desc(preCaseValidations.createdAt))
      .limit(10);

    return NextResponse.json(results);
  } catch (err: any) {
    logger.error({ err: err }, "[NIGO] Validations error:");
    return NextResponse.json({ message: "Failed to fetch validations" }, { status: 500 });
  }
}
