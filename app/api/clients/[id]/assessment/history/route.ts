import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const history = await storage.getAssessmentHistory(id);
    return NextResponse.json(
      history.map((a) => ({
        id: a.id,
        overallScore: a.overallScore,
        summary: a.summary,
        generatedAt: a.generatedAt,
        expiresAt: a.expiresAt,
      }))
    );
  } catch (err: any) {
    logger.error({ err }, "[Assessment] History error");
    return NextResponse.json({ error: "Failed to fetch assessment history" }, { status: 500 });
  }
}
