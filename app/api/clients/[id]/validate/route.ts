import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { db } from "@server/db";
import { runFullValidation } from "@server/engines/pre-case-validator";
import { logger } from "@server/lib/logger";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const { id } = await params;
    const clientId = id;

    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const validationResult = await runFullValidation(clientId);

    const { preCaseValidations } = await import("@shared/schema");
    const [saved] = await db
      .insert(preCaseValidations)
      .values({
        clientId,
        advisorId: advisor.id,
        validationType: "full",
        overallResult: validationResult.overallResult,
        modules: validationResult.modules,
      })
      .returning();

    return NextResponse.json({ ...validationResult, id: saved.id });
  } catch (err: any) {
    logger.error({ err: err }, "[NIGO] Validate error:");
    return NextResponse.json({ message: "Failed to run validation" }, { status: 500 });
  }
}
