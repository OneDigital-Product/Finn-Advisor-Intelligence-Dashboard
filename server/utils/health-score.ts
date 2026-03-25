import type { Activity, ComplianceItem, Performance } from "@shared/schema";

interface HealthScoreInput {
  activities: Activity[];
  lastContactDate: string | null;
  nextReviewDate: string | null;
  performanceData: Performance[];
  complianceItems: ComplianceItem[];
  aumGrowthRate: number;
}

export function calculateHealthScore(input: HealthScoreInput): number {
  const {
    activities,
    lastContactDate,
    nextReviewDate,
    performanceData,
    complianceItems,
    aumGrowthRate,
  } = input;

  const activityScore = scoreActivityFrequency(activities);
  const reviewScore = scoreReviewCompliance(lastContactDate, nextReviewDate);
  const perfScore = scorePerformance(performanceData);
  const aumScore = scoreAumGrowth(aumGrowthRate);
  const complianceScore = scoreCompliance(complianceItems);

  const weighted =
    activityScore * 0.25 +
    reviewScore * 0.25 +
    perfScore * 0.20 +
    aumScore * 0.15 +
    complianceScore * 0.15;

  return Math.round(Math.min(100, Math.max(0, weighted)));
}

function scoreActivityFrequency(activities: Activity[]): number {
  if (!activities.length) return 20;

  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
  const recentActivities = activities.filter(a => {
    const d = new Date(a.date).getTime();
    return d >= sixMonthsAgo && d <= now;
  });

  const count = recentActivities.length;
  if (count >= 8) return 100;
  if (count >= 6) return 90;
  if (count >= 4) return 75;
  if (count >= 2) return 55;
  if (count >= 1) return 35;
  return 20;
}

function scoreReviewCompliance(
  lastContactDate: string | null,
  nextReviewDate: string | null,
): number {
  const now = new Date();

  if (!lastContactDate && !nextReviewDate) return 40;

  let score = 50;

  if (lastContactDate) {
    const daysSinceContact = Math.floor(
      (now.getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceContact <= 30) score += 25;
    else if (daysSinceContact <= 60) score += 15;
    else if (daysSinceContact <= 90) score += 5;
    else score -= 10;
  }

  if (nextReviewDate) {
    const daysUntilReview = Math.floor(
      (new Date(nextReviewDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilReview < 0) {
      score -= 20;
    } else if (daysUntilReview <= 14) {
      score += 15;
    } else if (daysUntilReview <= 30) {
      score += 25;
    } else if (daysUntilReview <= 90) {
      score += 10;
    }
  }

  return Math.min(100, Math.max(0, score));
}

function scorePerformance(performanceData: Performance[]): number {
  if (!performanceData.length) return 50;

  const ytd = performanceData.find(p => p.period === "YTD");
  const oneYear = performanceData.find(p => p.period === "1Y");

  const target = ytd || oneYear;
  if (!target || !target.benchmarkPct) return 50;

  const returnPct = parseFloat(target.returnPct as string);
  const benchPct = parseFloat(target.benchmarkPct as string);
  const diff = returnPct - benchPct;

  if (diff >= 5) return 100;
  if (diff >= 2) return 85;
  if (diff >= 0) return 70;
  if (diff >= -2) return 50;
  if (diff >= -5) return 30;
  return 15;
}

function scoreAumGrowth(growthRate: number): number {
  if (growthRate >= 15) return 100;
  if (growthRate >= 10) return 90;
  if (growthRate >= 5) return 75;
  if (growthRate >= 0) return 55;
  if (growthRate >= -5) return 35;
  return 15;
}

function scoreCompliance(items: ComplianceItem[]): number {
  if (!items.length) return 85;

  const total = items.length;
  const completed = items.filter(i => i.status === "completed" || i.status === "resolved").length;
  const overdue = items.filter(i => {
    if (i.status === "completed" || i.status === "resolved") return false;
    if (!i.dueDate) return false;
    return new Date(i.dueDate) < new Date();
  }).length;

  const completionRatio = completed / total;
  let score = completionRatio * 80 + 20;

  if (overdue > 0) {
    score -= overdue * 15;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}
