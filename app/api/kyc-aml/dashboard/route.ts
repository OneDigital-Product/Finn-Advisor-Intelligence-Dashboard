import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const [riskRatings, screeningResults, reviewSchedules, eddRecordsData, auditLog, allClients, ofacCount, pepCount, screeningConfig] = await Promise.all([
      storage.getKycRiskRatingsByAdvisor(advisor.id),
      storage.getAmlScreeningResultsByAdvisor(advisor.id),
      storage.getKycReviewSchedulesByAdvisor(advisor.id),
      storage.getEddRecordsByAdvisor(advisor.id),
      storage.getKycAuditLogByAdvisor(advisor.id),
      storage.getClients(advisor.id),
      storage.getOfacSdnEntryCount(),
      storage.getPepEntryCount(),
      storage.getScreeningConfig(advisor.id),
    ]);

    const clientMap = new Map(allClients.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

    const latestRatingsMap = new Map<string, typeof riskRatings[0]>();
    for (const r of riskRatings) {
      if (!latestRatingsMap.has(r.clientId)) {
        latestRatingsMap.set(r.clientId, r);
      }
    }
    const latestRatings = Array.from(latestRatingsMap.values());

    const highRisk = latestRatings.filter(r => r.riskTier === "high" || r.riskTier === "prohibited");
    const standardRisk = latestRatings.filter(r => r.riskTier === "standard");
    const lowRisk = latestRatings.filter(r => r.riskTier === "low");

    const now = new Date().toISOString().split("T")[0];
    const upcomingReviews = reviewSchedules.filter(s => s.status === "scheduled" && s.nextReviewDate <= new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split("T")[0]);
    const overdueReviews = reviewSchedules.filter(s => s.status === "scheduled" && s.nextReviewDate < now);

    const pendingScreenings = screeningResults.filter(s => s.matchStatus === "potential_match" && !s.resolvedAt);
    const pendingEdd = eddRecordsData.filter(e => e.status === "pending" || e.status === "in_progress");

    const autoResolvedCount = screeningResults.filter(s => s.resolution === "auto_resolved").length;
    const confirmedMatchCount = screeningResults.filter(s => s.matchStatus === "confirmed_match").length;
    const falsePositiveCount = screeningResults.filter(s => s.matchStatus === "false_positive" && s.resolution !== "auto_resolved").length;
    const clearCount = screeningResults.filter(s => s.matchStatus === "clear").length;

    const expiringDocuments: any[] = [];
    for (const client of allClients) {
      const docs = await storage.getDocumentsByClient(client.id);
      for (const doc of docs) {
        if (doc.expirationDate) {
          const expDate = new Date(doc.expirationDate);
          const daysUntil = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 30 && daysUntil > -90) {
            expiringDocuments.push({
              ...doc,
              clientName: clientMap.get(client.id) || "Unknown",
              daysUntilExpiration: daysUntil,
              isExpired: daysUntil <= 0,
            });
          }
        }
      }
    }

    const totalClients = allClients.length;
    const ratedClients = latestRatings.length;
    const complianceRate = totalClients > 0 ? Math.round((ratedClients / totalClients) * 100) : 0;

    const screenedClients = new Set(screeningResults.map(s => s.clientId)).size;
    const screeningCoverage = totalClients > 0 ? Math.round((screenedClients / totalClients) * 100) : 0;

    const DEFAULT_SCREENING_CONFIG = {
      ofacEnabled: true,
      pepEnabled: true,
      internalWatchlistEnabled: true,
      nameMatchThreshold: 85,
      autoResolveThreshold: 65,
      highConfidenceThreshold: 90,
      rescreeningFrequencyDays: 90,
    };

    return NextResponse.json({
      summary: {
        totalClients,
        ratedClients,
        complianceRate,
        highRiskCount: highRisk.length,
        standardRiskCount: standardRisk.length,
        lowRiskCount: lowRisk.length,
        pendingScreenings: pendingScreenings.length,
        pendingEdd: pendingEdd.length,
        upcomingReviews: upcomingReviews.length,
        overdueReviews: overdueReviews.length,
        expiringDocuments: expiringDocuments.length,
        screeningCoverage,
        screenedClients,
        autoResolvedCount,
        confirmedMatchCount,
        falsePositiveCount,
        clearCount,
        totalScreenings: screeningResults.length,
        ofacEntryCount: ofacCount,
        pepEntryCount: pepCount,
        lastOfacUpdate: screeningConfig?.lastOfacUpdate || null,
        lastRescreeningRun: screeningConfig?.lastRescreeningRun || null,
      },
      screeningConfig: screeningConfig || DEFAULT_SCREENING_CONFIG,
      riskRatings: latestRatings.map(r => ({
        ...r,
        clientName: clientMap.get(r.clientId) || "Unknown",
      })),
      screeningResults: screeningResults.slice(0, 50).map(s => ({
        ...s,
        clientName: clientMap.get(s.clientId) || "Unknown",
      })),
      reviewSchedules: reviewSchedules.map(s => ({
        ...s,
        clientName: clientMap.get(s.clientId) || "Unknown",
      })),
      eddRecords: eddRecordsData.map(e => ({
        ...e,
        clientName: clientMap.get(e.clientId) || "Unknown",
      })),
      expiringDocuments: expiringDocuments.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration),
      auditLog: auditLog.slice(0, 30).map(a => ({
        ...a,
        clientName: clientMap.get(a.clientId) || "Unknown",
      })),
    });
  } catch (error: any) {
    logger.error({ err: error }, "KYC dashboard error:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
