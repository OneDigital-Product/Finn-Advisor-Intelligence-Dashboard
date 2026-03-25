import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const SYSTEM_DEFAULTS = {
  retirementAge: 67,
  withdrawalRate: "4.00",
  insuranceMultiplier: 10,
  hnwThreshold: "1000000.00",
};

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const defaults = await storage.getAdvisorAssessmentDefaults(advisor.id);
    return NextResponse.json(defaults || { ...SYSTEM_DEFAULTS, advisorId: advisor.id });
  } catch (err: any) {
    logger.error({ err }, "[Assessment] Get settings error");
    return NextResponse.json({ error: "Failed to fetch assessment settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { retirementAge, withdrawalRate, insuranceMultiplier, hnwThreshold } =
      await request.json();
    const data: any = {};
    if (retirementAge !== undefined) data.retirementAge = Number(retirementAge);
    if (withdrawalRate !== undefined) data.withdrawalRate = String(withdrawalRate);
    if (insuranceMultiplier !== undefined) data.insuranceMultiplier = Number(insuranceMultiplier);
    if (hnwThreshold !== undefined) data.hnwThreshold = String(hnwThreshold);

    const result = await storage.upsertAdvisorAssessmentDefaults(advisor.id, data);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "[Assessment] Update settings error");
    return NextResponse.json({ error: "Failed to update assessment settings" }, { status: 500 });
  }
}
