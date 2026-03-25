import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { AssessmentEngine } from "@server/engines/assessment-engine";
import { AssessmentPDF } from "@server/pdf/assessment-pdf";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const engine = new AssessmentEngine();

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

    let assessment = await storage.getLatestAssessment(id);
    let assessmentData: any;

    if (!assessment) {
      assessmentData = await engine.assessClient(id, advisor.id);
      assessment = await storage.getLatestAssessment(id);
    } else {
      assessmentData = assessment.assessmentData;
    }

    const advisorData = await storage.getAdvisor(advisor.id);
    const pdf = new AssessmentPDF();
    const buffer = await pdf.generate(assessmentData, client, advisorData?.name);

    const fileName = `${client.firstName}_${client.lastName}_Assessment_${new Date().toISOString().split("T")[0]}.pdf`;

    if (assessment) {
      try {
        await storage.createAssessmentPdf({
          assessmentId: assessment.id,
          type: "assessment",
          fileName,
          fileSize: buffer.length,
          downloadCount: 1,
        });
      } catch {}
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err: any) {
    logger.error({ err }, "[Assessment] PDF error");
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
