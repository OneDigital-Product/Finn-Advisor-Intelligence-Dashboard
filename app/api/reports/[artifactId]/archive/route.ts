import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { reportArtifacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
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

    const [updated] = await db
      .update(reportArtifacts)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(reportArtifacts.id, artifactId), eq(reportArtifacts.advisorId, advisorId)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    await AuditLogger.logEvent(artifactId, "report_archived", {
      report_id: artifactId,
      advisor_id: advisorId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(updated);
  } catch (err) {
    logger.error({ err: err }, "PATCH /api/reports/:artifactId/archive error");
    return NextResponse.json({ error: "Failed to archive report" }, { status: 500 });
  }
}
