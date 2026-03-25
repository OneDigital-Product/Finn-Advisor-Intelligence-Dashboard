import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { finalizeReport } from "@server/engines/report-service";
import { AuditLogger } from "@server/integrations/cassidy/audit-logger";
import { logger } from "@server/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { artifactId } = await params;
    const advisorId = session.userId;

    const artifact = await finalizeReport(artifactId, advisorId);

    await AuditLogger.logEvent(artifactId, "report_finalized", {
      report_id: artifactId,
      advisor_id: advisorId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(artifact);
  } catch (err: any) {
    logger.error({ err: err }, "PATCH /api/reports/:artifactId/finalize error");
    return NextResponse.json({ error: "Failed to finalize report" }, { status: 400 });
  }
}
