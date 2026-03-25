import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { chatCompletion } from "@server/openai";
import { logger } from "@server/lib/logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const advisorId = auth.session.userId;
    if (!advisorId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const record = await storage.getNigoRecord(id);
    if (!record) return NextResponse.json({ message: "NIGO record not found" }, { status: 404 });
    if (record.advisorId !== advisorId) return NextResponse.json({ message: "Not authorized" }, { status: 403 });

    const client = await storage.getClient(record.clientId);
    const clientName = client ? `${client.firstName} ${client.lastName}` : "Unknown";

    const prompt = `You are a financial services operations expert. A custodial submission has been rejected (NIGO - Not In Good Order). Provide resolution guidance.

Details:
- Custodian: ${record.custodian}
- Submission Type: ${record.submissionType}
- Reason Code: ${record.reasonCode}
- Reason Description: ${record.reasonDescription || "Not provided"}
- Client: ${clientName}
- Days Outstanding: ${record.aging}

Provide:
1. A clear explanation of why this rejection typically occurs
2. Step-by-step resolution instructions
3. Required forms or documents (with form numbers if applicable)
4. Common mistakes to avoid when resubmitting
5. Estimated timeline for resolution

Format your response in clear, actionable sections.`;

    const guidance = await chatCompletion(
      "You are a helpful financial operations assistant.",
      prompt, true, 1000
    );

    await storage.updateNigoRecord(id, { resolutionGuidance: guidance });

    return NextResponse.json({ guidance });
  } catch (err) {
    logger.error({ err }, "Error generating NIGO guidance");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
