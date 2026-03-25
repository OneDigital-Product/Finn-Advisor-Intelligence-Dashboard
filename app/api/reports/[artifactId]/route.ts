import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { db } from "@server/db";
import { reportArtifacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { updateReportDraft } from "@server/engines/report-service";
import { logger } from "@server/lib/logger";

const updateReportSchema = z.object({
  content: z.any(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { artifactId } = await params;
    const advisorId = session.userId;

    const [artifact] = await db
      .select()
      .from(reportArtifacts)
      .where(and(eq(reportArtifacts.id, artifactId), eq(reportArtifacts.advisorId, advisorId)));

    if (!artifact) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    return NextResponse.json(artifact);
  } catch (err) {
    logger.error({ err: err }, "GET /api/reports/:artifactId error");
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

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
    const body = await request.json();
    const parsed = validateBody(updateReportSchema, body);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const artifact = await updateReportDraft(artifactId, { content: data.content }, advisorId);
    return NextResponse.json(artifact);
  } catch (err: any) {
    logger.error({ err: err }, "PATCH /api/reports/:artifactId error");
    return NextResponse.json({ error: "Failed to update report" }, { status: 400 });
  }
}
