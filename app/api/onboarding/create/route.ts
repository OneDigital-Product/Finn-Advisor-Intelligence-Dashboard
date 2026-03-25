import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { createFirst100DaysWorkflow } from "@server/engines/onboarding-engine";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const createOnboardingSchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const body = await request.json();
    const parsed = createOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const client = await storage.getClient(parsed.data.clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized for this client" }, { status: 403 });

    const workflow = await createFirst100DaysWorkflow(
      storage,
      parsed.data.clientId,
      advisor.id,
      advisor.name,
    );

    return NextResponse.json(workflow);
  } catch (err: any) {
    logger.error({ err: err }, "[Onboarding] Create error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
