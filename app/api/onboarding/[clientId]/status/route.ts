import { NextRequest, NextResponse } from "next/server";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { getActiveOnboardings } from "@server/engines/onboarding-engine";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const session = await getSession();
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { clientId } = await params;

    const onboardings = await getActiveOnboardings(storage, advisor.id);
    const clientOnboarding = onboardings.find((o: any) => o.clientId === clientId);
    if (!clientOnboarding) return NextResponse.json({ message: "No active onboarding found for this client" }, { status: 404 });

    return NextResponse.json(clientOnboarding);
  } catch (err: any) {
    logger.error({ err: err }, "[Onboarding] Status error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
