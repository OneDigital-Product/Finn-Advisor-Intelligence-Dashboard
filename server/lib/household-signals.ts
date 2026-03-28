/**
 * Household Signals — V3.0 Shared Signal Catalog
 *
 * Deterministic, code-computed signals for household/client intelligence.
 * Used by My Day (book-level scan) and Client 360 summary (per-client).
 *
 * COMPLEMENTS the AI-generated `detectedSignals` table (Cassidy).
 * These are facts and thresholds, not inferences.
 */

import { calculateHealthScore } from "../utils/health-score";
import type { Activity, ComplianceItem, Performance } from "@shared/schema";

// ── Types ──

export interface HouseholdSignals {
  // Identity (always present)
  clientId: string;
  clientName: string;
  segment: string;

  // Health (via calculateHealthScore)
  healthScore: number | null;
  healthScorePartial: boolean;

  // Review status (from cache lastReview / nextReview fields)
  reviewStatus: "current" | "due-soon" | "overdue" | "no-date";
  reviewDaysUntil: number | null;
  lastReviewDate: string | null;
  nextReviewDate: string | null;

  // Portfolio
  totalAum: number;
  aumSource: "orion" | "sf" | "derived";

  // Metadata
  _computedAt: number;
  _source: "enriched-cache" | "detail-route";
  _completeness: "full" | "partial";
}

/** Enriched cache client shape — the fields available from getCache().data[i] */
export interface EnrichedCacheClient {
  id: string;
  firstName: string;
  lastName: string;
  segment: string;
  status: string;
  totalAum: number;
  lastReview: string;
  nextReview: string;
  reviewFrequency: string;
  serviceModel: string;
  recentActivity: any[];
  complianceTasks: number;
  complianceCases: number;
  isLiveData: boolean;
  [key: string]: any;
}

/** Full detail inputs — available when Client 360 monolithic route provides richer data */
export interface DetailSignalInputs {
  activities: Activity[];
  lastContactDate: string | null;
  performanceData: Performance[];
  complianceItems: ComplianceItem[];
  aumGrowthRate: number;
}

// ── Computation ──

/**
 * Compute household signals from available data.
 *
 * Two modes:
 * 1. Cache-only (My Day book scan): client from enriched cache, no detailInputs.
 *    Health score is partial (3-4 sub-scores at defaults). Review status is real.
 *
 * 2. Detail-enriched (Client 360 summary): client from cache + detailInputs from
 *    monolithic route. Health score is full.
 */
export function computeHouseholdSignals(
  client: EnrichedCacheClient,
  detailInputs?: DetailSignalInputs,
): HouseholdSignals {
  const now = Date.now();
  const clientName = [client.firstName, client.lastName].filter(Boolean).join(" ");

  // ── Review status ──
  const { reviewStatus, reviewDaysUntil } = computeReviewStatus(
    client.nextReview,
    client.lastReview,
    now,
  );

  // ── Health score ──
  let healthScore: number | null = null;
  let healthScorePartial = true;

  if (detailInputs) {
    // Full path: all inputs available from detail route
    healthScore = calculateHealthScore({
      activities: detailInputs.activities,
      lastContactDate: detailInputs.lastContactDate,
      nextReviewDate: client.nextReview || null,
      performanceData: detailInputs.performanceData,
      complianceItems: detailInputs.complianceItems,
      aumGrowthRate: detailInputs.aumGrowthRate,
    });
    healthScorePartial = false;
  } else {
    // Cache-only path: use defaults for unavailable sub-inputs
    // activities=[] → sub-score 20, performance=[] → 50, compliance=[] → 85, aumGrowth=0 → 55
    // Only review sub-score uses real data (when populated)
    healthScore = calculateHealthScore({
      activities: [],
      lastContactDate: client.lastReview || null, // proxy: lastReview as last contact
      nextReviewDate: client.nextReview || null,
      performanceData: [],
      complianceItems: [],
      aumGrowthRate: 0,
    });
    healthScorePartial = true;
  }

  // ── AUM source ──
  // The enriched cache merges Orion + SF AUM (takes max). If isLiveData is true
  // and AUM > 0, it came from a live source. We can't distinguish Orion vs SF
  // at the cache level — mark as "derived" since it's the merged result.
  const aumSource: "orion" | "sf" | "derived" = client.isLiveData ? "derived" : "sf";

  return {
    clientId: client.id,
    clientName,
    segment: client.segment || "",
    healthScore,
    healthScorePartial,
    reviewStatus,
    reviewDaysUntil,
    lastReviewDate: client.lastReview || null,
    nextReviewDate: client.nextReview || null,
    totalAum: client.totalAum || 0,
    aumSource,
    _computedAt: now,
    _source: detailInputs ? "detail-route" : "enriched-cache",
    _completeness: detailInputs ? "full" : "partial",
  };
}

// ── Helpers ──

function computeReviewStatus(
  nextReview: string | undefined | null,
  lastReview: string | undefined | null,
  nowMs: number,
): { reviewStatus: HouseholdSignals["reviewStatus"]; reviewDaysUntil: number | null } {
  if (!nextReview && !lastReview) {
    return { reviewStatus: "no-date", reviewDaysUntil: null };
  }

  if (nextReview) {
    const reviewDate = new Date(nextReview);
    if (!isNaN(reviewDate.getTime())) {
      const daysUntil = Math.ceil((reviewDate.getTime() - nowMs) / 86_400_000);
      if (daysUntil < 0) {
        return { reviewStatus: "overdue", reviewDaysUntil: daysUntil };
      } else if (daysUntil <= 30) {
        return { reviewStatus: "due-soon", reviewDaysUntil: daysUntil };
      } else {
        return { reviewStatus: "current", reviewDaysUntil: daysUntil };
      }
    }
  }

  // Has lastReview but no nextReview — can't determine due status
  if (lastReview) {
    const lastDate = new Date(lastReview);
    if (!isNaN(lastDate.getTime())) {
      const daysSince = Math.floor((nowMs - lastDate.getTime()) / 86_400_000);
      // If last review was >180 days ago with no next date, flag as overdue
      if (daysSince > 180) {
        return { reviewStatus: "overdue", reviewDaysUntil: null };
      }
    }
  }

  return { reviewStatus: "no-date", reviewDaysUntil: null };
}

// ── Book-level aggregation helpers ──

/** Extract the 3 lowest health scores from a full-book signal scan. */
export function extractBottomHealthScores(
  signals: HouseholdSignals[],
  count: number = 3,
): Array<{ clientId: string; clientName: string; score: number; segment: string; partial: boolean }> {
  return signals
    .filter(s => s.healthScore !== null)
    .sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100))
    .slice(0, count)
    .map(s => ({
      clientId: s.clientId,
      clientName: s.clientName,
      score: s.healthScore!,
      segment: s.segment,
      partial: s.healthScorePartial,
    }));
}

/** Extract reviews due soon (nextReview within 30 days, sorted by urgency). */
export function extractReviewsDueSoon(
  signals: HouseholdSignals[],
  count: number = 3,
): Array<{ clientId: string; clientName: string; segment: string; nextReviewDate: string; daysUntil: number }> {
  return signals
    .filter(s => s.reviewStatus === "due-soon" || s.reviewStatus === "overdue")
    .filter(s => s.nextReviewDate !== null && s.reviewDaysUntil !== null)
    .sort((a, b) => (a.reviewDaysUntil ?? 0) - (b.reviewDaysUntil ?? 0))
    .slice(0, count)
    .map(s => ({
      clientId: s.clientId,
      clientName: s.clientName,
      segment: s.segment,
      nextReviewDate: s.nextReviewDate!,
      daysUntil: s.reviewDaysUntil!,
    }));
}

/** Extract neglected households (lastReview >90 days ago, sorted by most neglected). */
export function extractNeglectedHouseholds(
  signals: HouseholdSignals[],
  count: number = 3,
): Array<{ clientId: string; clientName: string; segment: string; lastReviewDate: string; daysSinceReview: number }> {
  return signals
    .filter(s => s.lastReviewDate !== null)
    .map(s => {
      const lastDate = new Date(s.lastReviewDate!);
      if (isNaN(lastDate.getTime())) return null;
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86_400_000);
      if (daysSince <= 90) return null;
      return {
        clientId: s.clientId,
        clientName: s.clientName,
        segment: s.segment,
        lastReviewDate: s.lastReviewDate!,
        daysSinceReview: daysSince,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.daysSinceReview - a.daysSinceReview)
    .slice(0, count);
}
