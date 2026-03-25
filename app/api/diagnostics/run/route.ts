import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { generateDiagnosticAnalysis } from "@server/openai";
import { renderDiagnosticTemplate } from "@server/routes/utils";
import { logger } from "@server/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { clientId, configId } = body;
    if (!clientId) return NextResponse.json({ message: "clientId required" }, { status: 400 });

    let config;
    if (configId) {
      config = await storage.getDiagnosticConfig(configId);
      if (!config) return NextResponse.json({ message: "Selected configuration not found." }, { status: 400 });
    } else {
      config = await storage.getActiveDiagnosticConfig();
    }
    if (!config) return NextResponse.json({ message: "No active diagnostic configuration found. Please configure one in Administration settings." }, { status: 400 });

    const client = await storage.getClient(clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    const [accts, hlds, acts, tsks, docs, compliance] = await Promise.all([
      storage.getAccountsByClient(client.id),
      storage.getHoldingsByClient(client.id),
      storage.getActivitiesByClient(client.id),
      storage.getTasksByClient(client.id),
      storage.getDocumentsByClient(client.id),
      storage.getComplianceItemsByClient(client.id),
    ]);

    let perf: any[] = [];
    let household: any = null;
    let householdMembers: any[] = [];
    if (accts.length > 0 && accts[0].householdId) {
      [perf, household] = await Promise.all([
        storage.getPerformanceByHousehold(accts[0].householdId),
        storage.getHousehold(accts[0].householdId),
      ]);
      if (household) {
        const members = await storage.getHouseholdMembers(household.id);
        householdMembers = members.map(m => ({ name: `${m.client.firstName} ${m.client.lastName}`, relationship: m.relationship }));
      }
    }

    const analysisJson = await generateDiagnosticAnalysis(config.analysisPrompt, {
      client, accounts: accts, holdings: hlds, performance: perf,
      activities: acts, tasks: tsks, documents: docs, complianceItems: compliance,
      household, householdMembers,
    });

    const renderedHtml = renderDiagnosticTemplate(config.htmlTemplate, analysisJson);

    const result = await storage.createDiagnosticResult({
      clientId: client.id,
      configId: config.id,
      analysisJson: JSON.stringify(analysisJson),
      renderedHtml,
    });

    return NextResponse.json({ result, analysisJson, renderedHtml });
  } catch (err: any) {
    logger.error({ err: err }, "[Diagnostics] Run error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
