import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { runAutomatedScreening } from "@server/routes/kyc-aml";
import { logger } from "@server/lib/logger";

const DEFAULT_SCREENING_CONFIG = {
  ofacEnabled: true,
  pepEnabled: true,
  internalWatchlistEnabled: true,
  nameMatchThreshold: 85,
  autoResolveThreshold: 65,
  highConfidenceThreshold: 90,
  rescreeningFrequencyDays: 90,
};

async function getOrCreateScreeningConfig(advisorId: string) {
  let config = await storage.getScreeningConfig(advisorId);
  if (!config) {
    config = await storage.createScreeningConfig({
      advisorId,
      ...DEFAULT_SCREENING_CONFIG,
    });
  }
  return config;
}

export async function POST() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const clients = await storage.getClients(advisor.id);
    let screened = 0;
    let matchesFound = 0;
    let autoResolved = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        const result = await runAutomatedScreening(client.id, advisor.id, advisor.name);
        if (result) {
          screened++;
          matchesFound += result.screeningResult.matches.length;
          autoResolved += result.screeningResult.autoResolved.length;
        }
      } catch (err) {
        logger.error({ err, clientId: client.id }, "Batch screening error for client");
        errors++;
      }
    }

    const config = await getOrCreateScreeningConfig(advisor.id);
    await storage.updateScreeningConfig(config.id, {
      lastRescreeningRun: new Date(),
    });

    if (clients.length > 0) {
      await storage.createKycAuditLog({
        clientId: clients[0].id,
        advisorId: advisor.id,
        action: "batch_screening_completed",
        entityType: "aml_screening",
        details: { screened, matchesFound, autoResolved, errors, totalClients: clients.length },
        performedBy: advisor.name,
      });
    }

    return NextResponse.json({ screened, matchesFound, autoResolved, errors, totalClients: clients.length });
  } catch (error: any) {
    logger.error({ err: error }, "Batch screening error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
