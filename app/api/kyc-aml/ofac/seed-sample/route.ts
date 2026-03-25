import { NextResponse } from "next/server";
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

export async function POST() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const sampleSdnEntries = [
      { sdnName: "PETROV, Vladimir Ilyich", sdnType: "Individual", program: "UKRAINE-EO13661", title: "General Director", remarks: "DOB 15 Mar 1970", sourceId: "SDN-SAMPLE-001", aliases: ["PETROV, V.I.", "Vladimir Petrov"], addresses: [] },
      { sdnName: "HASSAN, Ahmed Mohamed", sdnType: "Individual", program: "SDGT", title: "", remarks: "DOB 1985", sourceId: "SDN-SAMPLE-002", aliases: ["Ahmed HASSAN", "A. Hassan"], addresses: [] },
      { sdnName: "WEI, Li", sdnType: "Individual", program: "NONPRO-EO13382", title: "Director", remarks: "National of China", sourceId: "SDN-SAMPLE-003", aliases: ["LI Wei", "L. Wei"], addresses: [] },
      { sdnName: "GARCIA, Carlos Alberto", sdnType: "Individual", program: "SDNTK", title: "Commander", remarks: "DOB 1975", sourceId: "SDN-SAMPLE-004", aliases: ["Carlos GARCIA", "C.A. Garcia"], addresses: [] },
      { sdnName: "IVANOV, Sergei Nikolaevich", sdnType: "Individual", program: "RUSSIA-EO14024", title: "Deputy Minister", remarks: "DOB 1968", sourceId: "SDN-SAMPLE-005", aliases: ["Sergei IVANOV", "S.N. Ivanov"], addresses: [] },
      { sdnName: "AL-RASHID, Omar Khalil", sdnType: "Individual", program: "SDGT", title: "", remarks: "DOB 1990", sourceId: "SDN-SAMPLE-006", aliases: ["Omar AL-RASHID"], addresses: [] },
      { sdnName: "PARK, Jong-un", sdnType: "Individual", program: "DPRK3", title: "", remarks: "National of North Korea", sourceId: "SDN-SAMPLE-007", aliases: ["PARK Jong Un"], addresses: [] },
      { sdnName: "RAMIREZ, Juan Felipe", sdnType: "Individual", program: "SDNTK", title: "Financial Officer", remarks: "DOB 1982", sourceId: "SDN-SAMPLE-008", aliases: ["Juan RAMIREZ", "J.F. Ramirez"], addresses: [] },
    ];

    const samplePepEntries = [
      { fullName: "Boris Volkov", country: "Russia", position: "Deputy Finance Minister", level: "national", aliases: ["B. Volkov", "Boris V."], source: "PEP Sample DB" },
      { fullName: "Chen Xiaoming", country: "China", position: "Provincial Governor", level: "regional", aliases: ["Chen X.", "Xiaoming Chen"], source: "PEP Sample DB" },
      { fullName: "Maria Santos-Rodriguez", country: "Mexico", position: "Senator", level: "national", aliases: ["M. Santos", "Maria Santos"], source: "PEP Sample DB" },
      { fullName: "Abdullah Al-Faisal", country: "Saudi Arabia", position: "Royal Family Member", level: "national", aliases: ["A. Al-Faisal"], source: "PEP Sample DB" },
      { fullName: "Jean-Pierre Dubois", country: "France", position: "Former Minister of Trade", level: "national", aliases: ["JP Dubois", "J.P. Dubois"], source: "PEP Sample DB" },
      { fullName: "Olga Petrova", country: "Ukraine", position: "Head of State Enterprise", level: "state", aliases: ["O. Petrova"], source: "PEP Sample DB" },
    ];

    await storage.clearOfacSdnEntries();
    await storage.clearPepEntries();

    const sdnInserted = await storage.bulkCreateOfacSdnEntries(sampleSdnEntries);
    const pepInserted = await storage.bulkCreatePepEntries(samplePepEntries);

    const config = await getOrCreateScreeningConfig(advisor.id);
    await storage.updateScreeningConfig(config.id, { lastOfacUpdate: new Date() });

    const clients = await storage.getClients(advisor.id);
    if (clients.length > 0) {
      await storage.createKycAuditLog({
        clientId: clients[0].id,
        advisorId: advisor.id,
        action: "sample_watchlists_loaded",
        entityType: "ofac_sdn",
        details: { sdnEntries: sdnInserted, pepEntries: pepInserted },
        performedBy: advisor.name,
      });
    }

    return NextResponse.json({ sdnInserted, pepInserted });
  } catch (error: any) {
    logger.error({ err: error }, "Seed sample data error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
