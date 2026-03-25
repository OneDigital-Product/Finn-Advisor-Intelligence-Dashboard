import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { runMonteCarloSimulation, type SimulationParams } from "@server/monte-carlo";
import { logger } from "@server/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; scenarioId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id: clientId, scenarioId } = await params;
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const scenario = await storage.getMonteCarloScenario(scenarioId);
    if (!scenario || scenario.clientId !== clientId) return NextResponse.json({ message: "Scenario not found" }, { status: 404 });

    const clientAccounts = await storage.getAccountsByClient(clientId);
    const totalPortfolio = clientAccounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);

    const events = await storage.getScenarioEvents(scenarioId);

    const simParams: SimulationParams = {
      currentAge: scenario.currentAge,
      retirementAge: scenario.retirementAge,
      lifeExpectancy: scenario.lifeExpectancy,
      initialPortfolio: totalPortfolio,
      annualSpending: parseFloat(scenario.annualSpending),
      expectedReturn: parseFloat(scenario.expectedReturn),
      returnStdDev: parseFloat(scenario.returnStdDev),
      inflationRate: parseFloat(scenario.inflationRate),
      preRetirementContribution: parseFloat(scenario.preRetirementContribution || "0"),
      events: events.map(e => ({
        name: e.name,
        type: e.type as "expense" | "income",
        amount: parseFloat(e.amount),
        startAge: e.startAge,
        endAge: e.endAge,
        inflationAdjusted: e.inflationAdjusted,
      })),
    };

    const results = runMonteCarloSimulation(simParams);

    await storage.updateMonteCarloScenario(scenarioId, { results });

    return NextResponse.json({ scenario: { ...scenario, results }, simulationResults: results, portfolioUsed: totalPortfolio });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
