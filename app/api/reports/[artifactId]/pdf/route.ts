import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { reportArtifacts } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@server/lib/logger";

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

    if (!artifact.renderedHtml) {
      return NextResponse.json({ error: "No rendered content available" }, { status: 404 });
    }

    return new NextResponse(artifact.renderedHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    logger.error({ err: err }, "GET /api/reports/:artifactId/pdf error");
    return NextResponse.json({ error: "Failed to get report PDF" }, { status: 500 });
  }
}
