import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
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

    const [riskRating, screeningResults, reviewSchedule, eddRecordsData, auditLog] = await Promise.all([
      storage.getKycRiskRating(clientId),
      storage.getAmlScreeningResults(clientId),
      storage.getKycReviewSchedule(clientId),
      storage.getEddRecords(clientId),
      storage.getKycAuditLog(clientId),
    ]);

    return NextResponse.json({
      riskRating,
      screeningResults,
      reviewSchedule,
      eddRecords: eddRecordsData,
      auditLog,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Client KYC data error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
