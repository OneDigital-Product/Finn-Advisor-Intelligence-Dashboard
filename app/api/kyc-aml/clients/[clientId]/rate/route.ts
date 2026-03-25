import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import {
  calculateRiskRating,
  calculateNextReviewDate,
  getReviewFrequencyMonths,
  getRequiredEddDocuments,
} from "@server/engines/kyc-risk-engine";
import { logger } from "@server/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { clientId } = await params;
    const client = await storage.getClient(clientId);
    if (!client || client.advisorId !== advisor.id) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    const { pepStatus, sourceOfWealth, overrideReason } = await request.json();

    const latestScreening = await storage.getAmlScreeningResults(client.id);
    const unresolvedMatches = latestScreening.filter(s => s.matchStatus === "potential_match" && !s.resolvedAt);
    const screeningRiskScore = unresolvedMatches.length > 0
      ? Math.min(100, Math.max(...unresolvedMatches.map(m => m.matchConfidence || 0)))
      : 0;

    const result = calculateRiskRating(client, pepStatus || false, sourceOfWealth, screeningRiskScore);

    const rating = await storage.createKycRiskRating({
      clientId: client.id,
      advisorId: advisor.id,
      riskScore: result.riskScore,
      riskTier: result.riskTier,
      residencyRisk: result.factors.residencyRisk,
      occupationRisk: result.factors.occupationRisk,
      sourceOfWealthRisk: result.factors.sourceOfWealthRisk,
      pepStatus: pepStatus || false,
      pepRisk: result.factors.pepRisk,
      factors: result.factors,
      overrideReason: overrideReason || null,
      ratedBy: advisor.name,
    });

    const nextReviewDate = calculateNextReviewDate(result.riskTier);
    const existingSchedule = await storage.getKycReviewSchedule(client.id);
    if (existingSchedule) {
      await storage.updateKycReviewSchedule(existingSchedule.id, {
        riskTier: result.riskTier,
        nextReviewDate,
        reviewFrequencyMonths: getReviewFrequencyMonths(result.riskTier),
        lastReviewDate: new Date().toISOString().split("T")[0],
      });
    } else {
      await storage.createKycReviewSchedule({
        clientId: client.id,
        advisorId: advisor.id,
        riskTier: result.riskTier,
        lastReviewDate: new Date().toISOString().split("T")[0],
        nextReviewDate,
        reviewFrequencyMonths: getReviewFrequencyMonths(result.riskTier),
        status: "scheduled",
      });
    }

    await storage.createKycAuditLog({
      clientId: client.id,
      advisorId: advisor.id,
      action: "risk_rating_created",
      entityType: "kyc_risk_rating",
      entityId: rating.id,
      details: { riskScore: result.riskScore, riskTier: result.riskTier, pepStatus, screeningRiskScore },
      performedBy: advisor.name,
    });

    if (result.riskTier === "high" || result.riskTier === "prohibited") {
      const eddDocs = getRequiredEddDocuments(
        result.factors.pepRisk > 0 ? "PEP status" : "High-risk rating"
      );
      await storage.createEddRecord({
        clientId: client.id,
        advisorId: advisor.id,
        triggerReason: `Automated trigger: ${result.riskTier} risk rating (score: ${result.riskScore})`,
        status: "pending",
        requiredDocuments: eddDocs,
        collectedDocuments: [],
        assignedTo: advisor.name,
      });

      await storage.createKycAuditLog({
        clientId: client.id,
        advisorId: advisor.id,
        action: "edd_triggered",
        entityType: "edd_record",
        details: { reason: "High risk rating triggered EDD", riskTier: result.riskTier },
        performedBy: "System",
      });
    }

    return NextResponse.json(rating);
  } catch (error: any) {
    logger.error({ err: error }, "Risk rating error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
