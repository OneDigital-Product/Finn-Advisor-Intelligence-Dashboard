import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { parseOfacSdnCsvLine } from "@server/engines/kyc-risk-engine";
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
    config = await storage.createScreeningConfig({ advisorId, ...DEFAULT_SCREENING_CONFIG });
  }
  return config;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { csvData, clearExisting } = await request.json();
    if (!csvData || typeof csvData !== "string") {
      return NextResponse.json({ message: "csvData is required as a string" }, { status: 400 });
    }

    if (clearExisting) {
      await storage.clearOfacSdnEntries();
    }

    const lines = csvData.split("\n");
    const entries: any[] = [];

    for (const line of lines) {
      const parsed = parseOfacSdnCsvLine(line);
      if (parsed && parsed.sdnType === "Individual") {
        entries.push({
          sdnName: parsed.sdnName,
          sdnType: parsed.sdnType,
          program: parsed.program,
          title: parsed.title,
          remarks: parsed.remarks,
          sourceId: parsed.sourceId,
          aliases: [],
          addresses: [],
        });
      }
    }

    const inserted = await storage.bulkCreateOfacSdnEntries(entries);

    const config = await getOrCreateScreeningConfig(advisor.id);
    await storage.updateScreeningConfig(config.id, { lastOfacUpdate: new Date() });

    const clients = await storage.getClients(advisor.id);
    if (clients.length > 0) {
      await storage.createKycAuditLog({
        clientId: clients[0].id,
        advisorId: advisor.id,
        action: "ofac_sdn_list_updated",
        entityType: "ofac_sdn",
        details: { entriesIngested: inserted, totalLines: lines.length, clearedExisting: !!clearExisting },
        performedBy: advisor.name,
      });
    }

    return NextResponse.json({ inserted, totalLines: lines.length });
  } catch (error: any) {
    logger.error({ err: error }, "OFAC ingestion error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
