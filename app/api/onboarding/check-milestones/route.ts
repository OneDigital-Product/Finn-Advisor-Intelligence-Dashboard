import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { checkMilestoneProgression } from "@server/engines/onboarding-engine";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const result = await checkMilestoneProgression(storage, advisor.id);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err: err }, "[Onboarding] Check milestones error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
