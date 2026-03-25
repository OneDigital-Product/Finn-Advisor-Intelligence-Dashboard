import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const DEFAULT_SCREENING_CONFIG = {
  ofacEnabled: true, pepEnabled: true, internalWatchlistEnabled: true,
  nameMatchThreshold: 85, autoResolveThreshold: 65, highConfidenceThreshold: 90, rescreeningFrequencyDays: 90,
};

async function getOrCreateScreeningConfig(advisorId: string) {
  let config = await storage.getScreeningConfig(advisorId);
  if (!config) config = await storage.createScreeningConfig({ advisorId, ...DEFAULT_SCREENING_CONFIG });
  return config;
}

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const config = await getOrCreateScreeningConfig(advisor.id);
    const [ofacCount, pepCount] = await Promise.all([
      storage.getOfacSdnEntryCount(),
      storage.getPepEntryCount(),
    ]);

    return NextResponse.json({ ...config, ofacEntryCount: ofacCount, pepEntryCount: pepCount });
  } catch (error: any) {
    logger.error({ err: error }, "Get screening config error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const config = await getOrCreateScreeningConfig(advisor.id);
    const { nameMatchThreshold, autoResolveThreshold, highConfidenceThreshold, rescreeningFrequencyDays, ofacEnabled, pepEnabled, internalWatchlistEnabled } = await request.json();

    const updates: any = {};
    if (nameMatchThreshold !== undefined) updates.nameMatchThreshold = nameMatchThreshold;
    if (autoResolveThreshold !== undefined) updates.autoResolveThreshold = autoResolveThreshold;
    if (highConfidenceThreshold !== undefined) updates.highConfidenceThreshold = highConfidenceThreshold;
    if (rescreeningFrequencyDays !== undefined) updates.rescreeningFrequencyDays = rescreeningFrequencyDays;
    if (ofacEnabled !== undefined) updates.ofacEnabled = ofacEnabled;
    if (pepEnabled !== undefined) updates.pepEnabled = pepEnabled;
    if (internalWatchlistEnabled !== undefined) updates.internalWatchlistEnabled = internalWatchlistEnabled;

    const updated = await storage.updateScreeningConfig(config.id, updates);

    const clients = await storage.getClients(advisor.id);
    if (clients.length > 0) {
      await storage.createKycAuditLog({
        clientId: clients[0].id,
        advisorId: advisor.id,
        action: "screening_config_updated",
        entityType: "screening_config",
        details: updates,
        performedBy: advisor.name,
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "Update screening config error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
