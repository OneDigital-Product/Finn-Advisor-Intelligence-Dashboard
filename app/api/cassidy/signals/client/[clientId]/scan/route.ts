import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { clients, detectedSignals, accounts, holdings, lifeEvents, documentChecklist } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";
import { sseEventBus } from "@server/lib/sse-event-bus";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { clientId } = await params;
    const advisorId = auth.session.userId;

    const [client] = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const existingSignals = await storage.db
      .select()
      .from(detectedSignals)
      .where(and(
        eq(detectedSignals.clientId, clientId),
        eq(detectedSignals.advisorId, advisorId),
      ));

    const existingTypes = new Set(
      existingSignals
        .filter((s) => s.status !== "dismissed")
        .map((s) => s.signalType)
    );

    const actionedTypes = new Set(
      existingSignals
        .filter((s) => s.status === "actioned")
        .map((s) => s.signalType)
    );

    for (const t of actionedTypes) {
      existingTypes.add(t);
    }

    const clientAccounts = await storage.db
      .select()
      .from(accounts)
      .where(eq(accounts.clientId, clientId));

    const accountIds = clientAccounts.map((a) => a.id);
    let clientHoldings: any[] = [];
    if (accountIds.length > 0) {
      clientHoldings = await storage.db
        .select()
        .from(holdings)
        .where(inArray(holdings.accountId, accountIds));
    }

    const clientLifeEvents = await storage.db
      .select()
      .from(lifeEvents)
      .where(eq(lifeEvents.clientId, clientId));

    const clientDocChecklist = await storage.db
      .select()
      .from(documentChecklist)
      .where(eq(documentChecklist.clientId, clientId));

    const VALID_SIGNAL_TYPES = new Set([
      "retirement", "divorce", "death", "business_sale", "business_acquisition",
      "liquidity_event", "concentrated_stock", "marriage", "birth", "relocation",
      "beneficiary_change", "trust_estate_change", "employment_change",
      "insurance_need", "legal_entity_change",
    ]);

    const LIFE_EVENT_TO_SIGNAL: Record<string, string> = {
      retirement: "retirement", divorce: "divorce", death: "death",
      marriage: "marriage", birth: "birth", baby: "birth",
      relocation: "relocation", move: "relocation", moving: "relocation",
      employment: "employment_change", job_change: "employment_change",
      job: "employment_change", promotion: "employment_change", career: "employment_change",
      business_sale: "business_sale", business_acquisition: "business_acquisition",
      inheritance: "liquidity_event", windfall: "liquidity_event", ipo: "liquidity_event",
      trust: "trust_estate_change", estate: "trust_estate_change", will: "trust_estate_change",
      beneficiary: "beneficiary_change", insurance: "insurance_need",
      legal: "legal_entity_change", llc: "legal_entity_change", corporation: "legal_entity_change",
    };

    const newSignals: Array<{
      clientId: string; advisorId: string; signalType: string; description: string;
      confidence: string; materiality: string; sourceSnippet: string | null;
      dateReference: string | null; recommendedActions: any[]; status: string;
      reviewRequired: boolean; reasoning: string;
    }> = [];

    const totalPortfolioValue = clientHoldings.reduce(
      (sum: number, h: any) => sum + parseFloat(h.marketValue || "0"), 0
    );

    if (totalPortfolioValue > 0) {
      const holdingsByTicker: Record<string, number> = {};
      for (const h of clientHoldings) {
        const key = h.ticker;
        holdingsByTicker[key] = (holdingsByTicker[key] || 0) + parseFloat(h.marketValue || "0");
      }
      for (const [ticker, value] of Object.entries(holdingsByTicker)) {
        const concentration = value / totalPortfolioValue;
        if (concentration >= 0.25 && !existingTypes.has("concentrated_stock")) {
          newSignals.push({
            clientId, advisorId, signalType: "concentrated_stock",
            description: `${ticker} represents ${(concentration * 100).toFixed(1)}% of portfolio — concentration risk detected`,
            confidence: concentration >= 0.4 ? "HIGH" : "MEDIUM",
            materiality: concentration >= 0.4 ? "CRITICAL" : "IMPORTANT",
            sourceSnippet: `${ticker}: $${value.toLocaleString()} of $${totalPortfolioValue.toLocaleString()} total`,
            dateReference: null,
            recommendedActions: [
              { action_type: "notify_advisor", description: "Alert advisor about concentration" },
              { action_type: "trigger_planning_triage", description: "Review diversification options" },
            ],
            status: "pending", reviewRequired: true,
            reasoning: `Holding ${ticker} exceeds 25% portfolio concentration threshold at ${(concentration * 100).toFixed(1)}%.`,
          });
          existingTypes.add("concentrated_stock");
        }
      }
    }

    if (client.dateOfBirth) {
      const dob = new Date(client.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

      if (age >= 72 && !existingTypes.has("retirement")) {
        const hasTraditionalIRA = clientAccounts.some((a) =>
          a.accountType?.toLowerCase().includes("ira") || a.accountType?.toLowerCase().includes("traditional")
        );
        if (hasTraditionalIRA) {
          newSignals.push({
            clientId, advisorId, signalType: "retirement",
            description: `Client is ${age} years old — Required Minimum Distribution (RMD) review needed`,
            confidence: "HIGH", materiality: "CRITICAL",
            sourceSnippet: `DOB: ${client.dateOfBirth}, Age: ${age}`,
            dateReference: `Age ${age}, RMD applies at 73+`,
            recommendedActions: [
              { action_type: "trigger_planning_triage", description: "Run RMD calculator" },
              { action_type: "create_follow_up_task", description: "Create RMD review task" },
            ],
            status: "pending", reviewRequired: false,
            reasoning: `Client age ${age} exceeds RMD threshold (73). Traditional/IRA accounts detected.`,
          });
          existingTypes.add("retirement");
        }
      }
    }

    const beneficiaryAccounts = clientAccounts.filter((a) => {
      const type = (a.accountType || "").toLowerCase();
      return type.includes("ira") || type.includes("401k") || type.includes("retirement")
        || type.includes("trust") || type.includes("life") || type.includes("annuity");
    });

    if (beneficiaryAccounts.length > 0 && !existingTypes.has("beneficiary_change")) {
      const hasBeneficiaryDocs = clientDocChecklist.some((d) => {
        const name = (d.documentName || "").toLowerCase();
        const cat = (d.category || "").toLowerCase();
        return (name.includes("beneficiary") || cat.includes("beneficiary")) && d.received;
      });

      if (!hasBeneficiaryDocs) {
        newSignals.push({
          clientId, advisorId, signalType: "beneficiary_change",
          description: `${beneficiaryAccounts.length} account(s) may have missing or outdated beneficiary designations`,
          confidence: "MEDIUM", materiality: "CRITICAL",
          sourceSnippet: `Accounts: ${beneficiaryAccounts.map((a) => a.accountType).join(", ")}`,
          dateReference: null,
          recommendedActions: [
            { action_type: "run_beneficiary_audit", description: "Run beneficiary audit" },
            { action_type: "create_follow_up_task", description: "Create beneficiary review task" },
          ],
          status: "pending", reviewRequired: true,
          reasoning: `${beneficiaryAccounts.length} beneficiary-eligible account(s) found without confirmed beneficiary designation documents on file.`,
        });
        existingTypes.add("beneficiary_change");
      }
    }

    const ESTATE_DOC_CHECKS = [
      { name: "Will / Last Testament", keyword: "will", reviewYears: 3 },
      { name: "Trust Documents", keyword: "trust", reviewYears: 5 },
      { name: "Power of Attorney", keyword: "power of attorney", reviewYears: 3 },
      { name: "Healthcare Directive", keyword: "healthcare", reviewYears: 3 },
      { name: "Beneficiary Designations", keyword: "beneficiary", reviewYears: 2 },
    ];

    const estateDocItems = clientDocChecklist.filter((d) =>
      (d.category || "").toLowerCase() === "estate planning"
    );

    if (!existingTypes.has("trust_estate_change")) {
      const missingDocs: string[] = [];
      const staleDocs: string[] = [];

      for (const check of ESTATE_DOC_CHECKS) {
        const match = estateDocItems.find((d) =>
          (d.documentName || "").toLowerCase().includes(check.keyword)
        );
        if (!match || !match.received) {
          missingDocs.push(check.name);
        } else if (match.receivedDate) {
          const reviewDate = new Date(match.receivedDate);
          const expiryDate = new Date(reviewDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + check.reviewYears);
          if (new Date() > expiryDate) {
            staleDocs.push(`${check.name} (last: ${match.receivedDate})`);
          }
        }
      }

      if (missingDocs.length > 0 || staleDocs.length > 0) {
        const parts: string[] = [];
        if (missingDocs.length > 0) parts.push(`Missing: ${missingDocs.join(", ")}`);
        if (staleDocs.length > 0) parts.push(`Overdue review: ${staleDocs.join(", ")}`);

        newSignals.push({
          clientId, advisorId, signalType: "trust_estate_change",
          description: `Estate document gaps detected — ${missingDocs.length} missing, ${staleDocs.length} overdue for review`,
          confidence: missingDocs.length >= 2 ? "HIGH" : "MEDIUM",
          materiality: missingDocs.length >= 2 ? "CRITICAL" : "IMPORTANT",
          sourceSnippet: parts.join("; "), dateReference: null,
          recommendedActions: [
            { action_type: "create_follow_up_task", description: "Create estate document review task" },
            { action_type: "notify_advisor", description: "Alert advisor about missing estate documents" },
          ],
          status: "pending", reviewRequired: true,
          reasoning: `Estate planning document checklist review found ${missingDocs.length} missing document(s) and ${staleDocs.length} document(s) overdue for review. ${parts.join(". ")}.`,
        });
        existingTypes.add("trust_estate_change");
      }
    }

    const isProfileOutdated = (() => {
      const missingFields: string[] = [];
      if (!client.dateOfBirth) missingFields.push("date of birth");
      if (!client.riskTolerance) missingFields.push("risk tolerance");
      if (!client.address && !client.city && !client.state) missingFields.push("address");
      if (!client.phone) missingFields.push("phone");
      if (!client.occupation) missingFields.push("occupation");

      const lastContactStr = client.lastContactDate;
      const staleContact = lastContactStr
        ? new Date(lastContactStr) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        : false;

      return { missingFields, staleContact };
    })();

    if (
      (isProfileOutdated.missingFields.length >= 2 || isProfileOutdated.staleContact) &&
      !existingTypes.has("insurance_need")
    ) {
      const reasons: string[] = [];
      if (isProfileOutdated.missingFields.length > 0) {
        reasons.push(`Missing: ${isProfileOutdated.missingFields.join(", ")}`);
      }
      if (isProfileOutdated.staleContact) {
        reasons.push(`Last contact over 1 year ago (${client.lastContactDate})`);
      }

      newSignals.push({
        clientId, advisorId, signalType: "insurance_need",
        description: `Profile gaps may affect insurance and planning accuracy — ${isProfileOutdated.missingFields.length} field(s) missing${isProfileOutdated.staleContact ? ", last contact >1 year ago" : ""}`,
        confidence: isProfileOutdated.missingFields.length >= 3 ? "HIGH" : "MEDIUM",
        materiality: "IMPORTANT",
        sourceSnippet: reasons.join("; "),
        dateReference: client.lastContactDate || null,
        recommendedActions: [
          { action_type: "refresh_investor_profile", description: "Update investor profile" },
          { action_type: "create_follow_up_task", description: "Schedule profile review" },
        ],
        status: "pending", reviewRequired: false,
        reasoning: `Incomplete or stale client profile data impacts insurance analysis and planning recommendations. ${reasons.join(". ")}.`,
      });
      existingTypes.add("insurance_need");
    }

    const recentLifeEvents = clientLifeEvents.filter((e) => {
      const eventDate = new Date(e.eventDate);
      return eventDate >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    });

    for (const event of recentLifeEvents) {
      const rawType = event.eventType.toLowerCase().replace(/\s+/g, "_");
      let mappedType = LIFE_EVENT_TO_SIGNAL[rawType];

      if (!mappedType) {
        for (const [keyword, signalType] of Object.entries(LIFE_EVENT_TO_SIGNAL)) {
          if (rawType.includes(keyword)) {
            mappedType = signalType;
            break;
          }
        }
      }

      if (!mappedType || !VALID_SIGNAL_TYPES.has(mappedType)) continue;
      if (existingTypes.has(mappedType)) continue;

      const isCritical = ["divorce", "death", "business_sale"].includes(mappedType);
      newSignals.push({
        clientId, advisorId, signalType: mappedType,
        description: `Life event detected: ${event.description}`,
        confidence: "HIGH",
        materiality: isCritical ? "CRITICAL" : "IMPORTANT",
        sourceSnippet: null, dateReference: event.eventDate,
        recommendedActions: [
          { action_type: "create_follow_up_task", description: "Create follow-up task" },
          { action_type: "notify_advisor", description: "Send alert" },
        ],
        status: "pending", reviewRequired: true,
        reasoning: `Recent life event (${event.eventType}) on ${event.eventDate} may require planning adjustments.`,
      });
      existingTypes.add(mappedType);
    }

    let insertedCount = 0;
    if (newSignals.length > 0) {
      await storage.db.insert(detectedSignals).values(newSignals);
      insertedCount = newSignals.length;
      logger.info({ clientId, signalCount: insertedCount }, "Proactive scan: new signals detected and stored");
    }

    sseEventBus.publishToUser(advisorId, "signals:proactive_scan_complete", {
      clientId,
      newSignalCount: insertedCount,
      totalActiveCount: existingSignals.filter((s) => s.status === "pending").length + insertedCount,
    });

    return NextResponse.json({
      scanned: true,
      newSignals: insertedCount,
      totalExisting: existingSignals.length,
    });
  } catch (err) {
    logger.error({ err }, "Error running proactive signal scan");
    return NextResponse.json({ error: "Failed to run proactive scan" }, { status: 500 });
  }
}
