import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { AssessmentEngine } from "@server/engines/assessment-engine";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const engine = new AssessmentEngine();

export async function POST(
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

    if (!client.email)
      return NextResponse.json({ error: "Client has no email address" }, { status: 400 });

    let assessment = await storage.getLatestAssessment(id);
    if (!assessment) {
      await engine.assessClient(id, advisor.id);
      assessment = await storage.getLatestAssessment(id);
    }

    const advisorData = await storage.getAdvisor(advisor.id);

    return NextResponse.json({
      success: true,
      message: `Assessment PDF ready to send to ${client.email}`,
      clientEmail: client.email,
      advisorName: advisorData?.name,
      note: "Email delivery requires email integration to be enabled (SENDGRID_API_KEY or SMTP configuration)",
    });
  } catch (err: any) {
    logger.error({ err }, "[Assessment] Email error");
    return NextResponse.json({ error: "Failed to prepare email" }, { status: 500 });
  }
}
