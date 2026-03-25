import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;
    const clientId = id;
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const scenarios = await storage.getMonteCarloScenarios(clientId);
    return NextResponse.json(scenarios);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;
    const clientId = id;
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { name, currentAge, retirementAge, lifeExpectancy, annualSpending, expectedReturn, returnStdDev, inflationRate, preRetirementContribution } = await request.json();
    if (!name || typeof name !== "string") return NextResponse.json({ message: "Name is required" }, { status: 400 });
    if (!currentAge || !retirementAge || !annualSpending) return NextResponse.json({ message: "Current age, retirement age, and annual spending are required" }, { status: 400 });

    const scenario = await storage.createMonteCarloScenario({
      clientId,
      name,
      currentAge: parseInt(currentAge),
      retirementAge: parseInt(retirementAge),
      lifeExpectancy: lifeExpectancy ? parseInt(lifeExpectancy) : 90,
      annualSpending: String(annualSpending),
      expectedReturn: expectedReturn ? String(expectedReturn) : "0.07",
      returnStdDev: returnStdDev ? String(returnStdDev) : "0.12",
      inflationRate: inflationRate ? String(inflationRate) : "0.03",
      preRetirementContribution: preRetirementContribution ? String(preRetirementContribution) : "0",
    });
    return NextResponse.json(scenario);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
