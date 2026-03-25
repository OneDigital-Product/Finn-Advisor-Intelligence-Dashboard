import { NextResponse } from "next/server";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { getActiveOnboardings } from "@server/engines/onboarding-engine";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const session = await getSession();
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const onboardings = await getActiveOnboardings(storage, advisor.id);
    return NextResponse.json(onboardings);
  } catch (err: any) {
    logger.error({ err: err }, "[Onboarding] Active error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
