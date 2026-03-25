import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { AssessmentEngine } from "@server/engines/assessment-engine";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const engine = new AssessmentEngine();

export async function POST(
  request: Request,
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

    const body = await request.json().catch(() => ({}));
    const { regenerate } = body || {};
    const result = await engine.assessClient(id, advisor.id, regenerate === true);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "[Assessment] Generate error");
    return NextResponse.json(
      { error: "Failed to generate assessment. Please try again." },
      { status: 500 }
    );
  }
}

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

    const assessment = await storage.getLatestAssessment(id);
    if (!assessment)
      return NextResponse.json(
        { error: "No assessment found. Generate one first." },
        { status: 404 }
      );

    return NextResponse.json(assessment.assessmentData);
  } catch (err: any) {
    logger.error({ err }, "[Assessment] Fetch error");
    return NextResponse.json({ error: "Failed to fetch assessment" }, { status: 500 });
  }
}
