import { storage } from "../storage";
import { calculateFeeRate, type FeeScheduleTier } from "@shared/schema";

export interface ClientAumEntry {
  id: string;
  name: string;
  segment: string;
  totalAum: number;
  cumulativePct: number;
  rank: number;
  feeRate: number;
  revenue: number;
  dateOfBirth: string | null;
  lastContactDate: string | null;
  nextReviewDate: string | null;
  status: string;
  engagementScore: number | null;
}

export interface HhiResult {
  hhi: number;
  riskLevel: "low" | "moderate" | "high";
  riskColor: "green" | "yellow" | "red";
  mitigationStrategy: string;
}

export interface RevenueConcentration {
  top5Pct: number;
  top10Pct: number;
  top20Pct: number;
  medianRevenuePerClient: number;
  totalRevenue: number;
  whatIfTop5Loss: number;
  mitigationStrategies: { strategy: string; projectedLift: number; description: string }[];
}

export interface SegmentBreakdown {
  tier: string;
  label: string;
  count: number;
  totalAum: number;
  avgAum: number;
  totalRevenue: number;
}

export interface LifeStageBreakdown {
  stage: string;
  count: number;
  totalAum: number;
  avgAum: number;
}

export interface GrowthCategory {
  category: string;
  count: number;
  totalAum: number;
  avgAum: number;
}

export interface ProactiveAlert {
  id: string;
  category: "rmd_age" | "policy_renewal" | "stale_plan" | "life_event" | "portfolio_drift" | "low_engagement";
  priority: "HIGH" | "MEDIUM" | "LOW";
  clientId: string;
  clientName: string;
  trigger: string;
  action: string;
  objective: string;
  timeline: string;
  owner: string;
  status: "open" | "in-progress" | "completed" | "deferred";
  dueDate: string;
}

export interface CrossSellOpportunity {
  service: string;
  penetrationRate: number;
  clientsWithout: number;
  revenueOpportunity: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface ReferralCandidate {
  clientId: string;
  clientName: string;
  score: number;
  tier: "Advocate" | "Promoter" | "Potential" | "At-Risk";
  factors: { satisfaction: number; engagement: number; networkQuality: number; capacity: number; willingness: number };
  projectedReferrals: number;
}

export interface AssetsNotHeld {
  clientId: string;
  clientName: string;
  estimatedOutsideAssets: number;
  breakdown: { category: string; estimated: number }[];
  captureTimeline: string;
  probability: number;
}

export interface UpgradeCandidate {
  clientId: string;
  clientName: string;
  currentTier: string;
  recommendedTier: string;
  currentRevenue: number;
  projectedRevenue: number;
  revenueLift: number;
}

export interface ConcentrationRisk {
  aumHhi: number;
  revenueHhi: number;
  aumRiskLevel: string;
  revenueRiskLevel: string;
}

export interface ComplianceAttention {
  missingIps: number;
  outdatedDisclosures: number;
  capacityConcerns: boolean;
  items: { clientId: string; clientName: string; issue: string; severity: string }[];
}

export interface RetentionRisk {
  clientId: string;
  clientName: string;
  riskScore: number;
  factors: string[];
  improvementPlan: string;
}

export interface MarketSensitivity {
  clientId: string;
  clientName: string;
  currentAum: number;
  impact15Pct: number;
  impact25Pct: number;
  behavioralRisk: string;
  riskTolerance: string;
}

export interface TrendPoint {
  period: string;
  value: number;
}

export interface PerformanceMetrics {
  avgSatisfaction: number;
  npsScore: number;
  revenueGrowthPct: number;
  totalRevenue: number;
  avgResponseTime: number;
  clientsServed: number;
  reviewsCompleted: number;
  reviewsOverdue: number;
  satisfactionTrend: TrendPoint[];
  revenueTrend: TrendPoint[];
  activityVolumeTrend: TrendPoint[];
  serviceEfficiency: {
    activitiesPerClient: number;
    avgDaysBetweenContacts: number;
    reviewCompletionRate: number;
  };
}

export interface ClientInsightsDashboard {
  bookAnalytics: {
    totalAum: number;
    totalClients: number;
    totalRevenue: number;
    avgAumPerClient: number;
    clientRanking: ClientAumEntry[];
    hhi: HhiResult;
    revenueConcentration: RevenueConcentration;
  };
  segmentation: {
    byTier: SegmentBreakdown[];
    byLifeStage: LifeStageBreakdown[];
    byGrowth: GrowthCategory[];
  };
  alerts: ProactiveAlert[];
  opportunityPipeline: {
    crossSell: CrossSellOpportunity[];
    referralCandidates: ReferralCandidate[];
    assetsNotHeld: AssetsNotHeld[];
    upgradeCandidates: UpgradeCandidate[];
    totalOpportunityValue: number;
  };
  riskDashboard: {
    concentration: ConcentrationRisk;
    compliance: ComplianceAttention;
    retentionRisks: RetentionRisk[];
    marketSensitivity: MarketSensitivity[];
  };
  performanceMetrics: PerformanceMetrics;
}

function getAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const TIER_MAP: Record<string, { label: string; minAum: number; maxAum: number }> = {
  A: { label: "Enterprise", minAum: 2000000, maxAum: Infinity },
  B: { label: "Wealth", minAum: 1000000, maxAum: 2000000 },
  C: { label: "Comprehensive", minAum: 500000, maxAum: 1000000 },
  D: { label: "Core", minAum: 250000, maxAum: 500000 },
  E: { label: "Foundational", minAum: 100000, maxAum: 250000 },
  F: { label: "Digital", minAum: 0, maxAum: 100000 },
};

function classifyTier(aum: number): string {
  if (aum >= 2000000) return "A";
  if (aum >= 1000000) return "B";
  if (aum >= 500000) return "C";
  if (aum >= 250000) return "D";
  if (aum >= 100000) return "E";
  return "F";
}

function deterministicScore(id: string, seed: number, min: number, max: number): number {
  let hash = seed;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return Math.round(min + normalized * (max - min));
}

function getLifeStage(age: number | null): string {
  if (age === null) return "Unknown";
  if (age < 50) return "Accumulation";
  if (age < 60) return "Pre-Retirement";
  if (age < 75) return "Distribution";
  return "Legacy";
}

export async function generateClientInsights(advisorId: string): Promise<ClientInsightsDashboard> {
  const [clients, allCompliance, allActivities, advisor] = await Promise.all([
    storage.getClients(advisorId),
    storage.getComplianceItems(advisorId),
    storage.getActivities(advisorId),
    storage.getAdvisor(advisorId),
  ]);

  const feeSchedule = advisor?.feeSchedule as FeeScheduleTier[] | null;

  let engagementScores: Array<{ clientId: string; compositeScore: number }> = [];
  try {
    engagementScores = await storage.getEngagementScoresByAdvisor(advisorId);
  } catch { }

  const engMap = new Map(engagementScores.map((s) => [s.clientId, s.compositeScore]));

  const accountsByClient = new Map<string, Array<{ balance: string; updatedAt: Date | null }>>();
  const batchSize = 10;
  for (let i = 0; i < clients.length; i += batchSize) {
    const batch = clients.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(c => storage.getAccountsByClient(c.id)));
    batch.forEach((c, idx) => {
      accountsByClient.set(c.id, results[idx].map(a => ({ balance: a.balance, updatedAt: a.updatedAt })));
    });
  }

  const clientEntries: ClientAumEntry[] = [];
  let totalAum = 0;
  let totalRevenue = 0;

  for (const c of clients) {
    const accts = accountsByClient.get(c.id) || [];
    const aum = accts.reduce((sum, a) => sum + parseFloat(a.balance || "0"), 0);
    const feeRate = calculateFeeRate(aum, feeSchedule, c.feeRateOverride);
    const revenue = aum * feeRate;
    totalAum += aum;
    totalRevenue += revenue;

    clientEntries.push({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      segment: c.segment,
      totalAum: aum,
      cumulativePct: 0,
      rank: 0,
      feeRate,
      revenue,
      dateOfBirth: c.dateOfBirth,
      lastContactDate: c.lastContactDate,
      nextReviewDate: c.nextReviewDate,
      status: c.status,
      engagementScore: engMap.get(c.id) ?? null,
    });
  }

  clientEntries.sort((a, b) => b.totalAum - a.totalAum);
  let cumAum = 0;
  clientEntries.forEach((e, i) => {
    e.rank = i + 1;
    cumAum += e.totalAum;
    e.cumulativePct = totalAum > 0 ? (cumAum / totalAum) * 100 : 0;
  });

  const hhi = computeHhi(clientEntries, totalAum);

  const sortedByRevenue = [...clientEntries].sort((a, b) => b.revenue - a.revenue);
  const revenueConcentration = computeRevenueConcentration(sortedByRevenue, totalRevenue);

  const segmentation = computeSegmentation(clientEntries, accountsByClient);

  const alerts = generateProactiveAlerts(clientEntries, allCompliance, allActivities, engMap, advisorId);

  const opportunityPipeline = computeOpportunityPipeline(clientEntries, engMap, feeSchedule);

  const riskDashboard = computeRiskDashboard(clientEntries, allCompliance, engMap, totalAum, totalRevenue, advisor);

  const performanceMetrics = computePerformanceMetrics(clientEntries, allActivities, allCompliance, totalRevenue);

  return {
    bookAnalytics: {
      totalAum,
      totalClients: clients.length,
      totalRevenue,
      avgAumPerClient: clients.length > 0 ? totalAum / clients.length : 0,
      clientRanking: clientEntries.slice(0, 20),
      hhi,
      revenueConcentration,
    },
    segmentation,
    alerts,
    opportunityPipeline,
    riskDashboard,
    performanceMetrics,
  };
}

function computeHhi(entries: ClientAumEntry[], totalAum: number): HhiResult {
  if (totalAum === 0) return { hhi: 0, riskLevel: "low", riskColor: "green", mitigationStrategy: "No assets to analyze." };

  let hhi = 0;
  for (const e of entries) {
    const share = (e.totalAum / totalAum) * 100;
    hhi += share * share;
  }

  let riskLevel: "low" | "moderate" | "high" = "low";
  let riskColor: "green" | "yellow" | "red" = "green";
  let mitigationStrategy = "Well diversified book. Maintain current client acquisition strategy.";

  if (hhi > 2500) {
    riskLevel = "high";
    riskColor = "red";
    mitigationStrategy = "High concentration risk. Aggressively pursue new client acquisition and grow smaller accounts to reduce dependency on top clients.";
  } else if (hhi > 1500) {
    riskLevel = "moderate";
    riskColor = "yellow";
    mitigationStrategy = "Moderate concentration. Focus on growing mid-tier clients and diversifying revenue sources through cross-selling.";
  }

  return { hhi: Math.round(hhi), riskLevel, riskColor, mitigationStrategy };
}

function computeRevenueConcentration(sorted: ClientAumEntry[], totalRevenue: number): RevenueConcentration {
  const topN = (n: number) => {
    const sum = sorted.slice(0, n).reduce((s, c) => s + c.revenue, 0);
    return totalRevenue > 0 ? (sum / totalRevenue) * 100 : 0;
  };

  const revenues = sorted.map(c => c.revenue).filter(r => r > 0);
  const median = revenues.length > 0 ? revenues[Math.floor(revenues.length / 2)] : 0;

  const top5Loss = sorted.slice(0, 5).reduce((s, c) => s + c.revenue, 0);

  const avgRevPerClient = totalRevenue / Math.max(1, sorted.length);

  return {
    top5Pct: topN(5),
    top10Pct: topN(10),
    top20Pct: topN(20),
    medianRevenuePerClient: median,
    totalRevenue,
    whatIfTop5Loss: top5Loss,
    mitigationStrategies: [
      {
        strategy: "Fee Optimization",
        projectedLift: totalRevenue * 0.05,
        description: "Review fee schedules for clients below market rate. Target 5% revenue increase.",
      },
      {
        strategy: "Cross-Sell Services",
        projectedLift: avgRevPerClient * sorted.length * 0.08,
        description: "Add financial planning, insurance review, or estate planning services to existing clients.",
      },
      {
        strategy: "Grow Smaller Accounts",
        projectedLift: totalRevenue * 0.12,
        description: "Focus on asset consolidation and referral programs for lower-tier clients.",
      },
    ],
  };
}

function computeSegmentation(entries: ClientAumEntry[], accountsByClient: Map<string, Array<{ balance: string; updatedAt: Date | null }>>) {
  const tierMap = new Map<string, SegmentBreakdown>();
  for (const [key, val] of Object.entries(TIER_MAP)) {
    tierMap.set(key, { tier: key, label: val.label, count: 0, totalAum: 0, avgAum: 0, totalRevenue: 0 });
  }

  const lifeStageMap = new Map<string, LifeStageBreakdown>();
  const growthMap = new Map<string, GrowthCategory>();

  for (const e of entries) {
    const tier = classifyTier(e.totalAum);
    const tb = tierMap.get(tier)!;
    tb.count++;
    tb.totalAum += e.totalAum;
    tb.totalRevenue += e.revenue;

    const age = getAge(e.dateOfBirth);
    const stage = getLifeStage(age);
    if (!lifeStageMap.has(stage)) lifeStageMap.set(stage, { stage, count: 0, totalAum: 0, avgAum: 0 });
    const ls = lifeStageMap.get(stage)!;
    ls.count++;
    ls.totalAum += e.totalAum;

    const accts = accountsByClient.get(e.id) || [];
    const currentTier = classifyTier(e.totalAum);
    const tierRank = { A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 }[currentTier] ?? 1;
    const segmentTierRank = { A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 }[e.segment] ?? 1;
    const tierDelta = tierRank - segmentTierRank;
    const segmentMidpoint = TIER_MAP[e.segment]?.minAum ?? 0;
    const aumChangeEst = segmentMidpoint > 0 ? ((e.totalAum - segmentMidpoint) / segmentMidpoint) * 100 : 0;

    let growthCat: string;
    if (aumChangeEst > 50 || tierDelta > 0) growthCat = "High Growth";
    else if (aumChangeEst > 10 || (tierDelta === 0 && accts.length > 2)) growthCat = "Moderate Growth";
    else if (aumChangeEst >= -10) growthCat = "Flat";
    else growthCat = "Declining";
    if (!growthMap.has(growthCat)) growthMap.set(growthCat, { category: growthCat, count: 0, totalAum: 0, avgAum: 0 });
    const gc = growthMap.get(growthCat)!;
    gc.count++;
    gc.totalAum += e.totalAum;
  }

  const byTier = Array.from(tierMap.values()).filter(t => t.count > 0);
  byTier.forEach(t => { t.avgAum = t.count > 0 ? t.totalAum / t.count : 0; });

  const byLifeStage = Array.from(lifeStageMap.values());
  byLifeStage.forEach(l => { l.avgAum = l.count > 0 ? l.totalAum / l.count : 0; });

  const byGrowth = Array.from(growthMap.values());
  byGrowth.forEach(g => { g.avgAum = g.count > 0 ? g.totalAum / g.count : 0; });

  return { byTier, byLifeStage, byGrowth };
}

function generateProactiveAlerts(
  entries: ClientAumEntry[],
  compliance: Array<{ status: string; clientId: string; dueDate: string | null; description: string }>,
  activities: Array<{ clientId: string | null; date: string; type: string }>,
  engMap: Map<string, number>,
  advisorId: string,
): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = [];
  const mkAlertId = (category: string, clientId: string) => `${advisorId}-${category}-${clientId}`;

  for (const e of entries) {
    const age = getAge(e.dateOfBirth);
    if (age !== null && age >= 70 && age <= 73) {
      alerts.push({
        id: mkAlertId("rmd_age", e.id),
        category: "rmd_age",
        priority: "HIGH",
        clientId: e.id,
        clientName: e.name,
        trigger: `Client is ${age} years old — approaching RMD age (72/73)`,
        action: "Review IRA balances and calculate RMD. Schedule distribution planning meeting.",
        objective: "Ensure timely RMD compliance and tax-efficient distribution strategy",
        timeline: "Within 30 days",
        owner: "Primary Advisor",
        status: "open",
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      });
    }

    const lastContact = daysSince(e.lastContactDate);
    if (lastContact > 365) {
      alerts.push({
        id: mkAlertId("stale_plan", e.id),
        category: "stale_plan",
        priority: lastContact > 540 ? "HIGH" : "MEDIUM",
        clientId: e.id,
        clientName: e.name,
        trigger: `Financial plan has not been reviewed in ${lastContact} days (>${lastContact > 540 ? "18" : "12"} months)`,
        action: "Schedule comprehensive plan review. Update financial plan assumptions and projections.",
        objective: "Ensure plan remains aligned with current goals and market conditions",
        timeline: "Within 14 days",
        owner: "Primary Advisor",
        status: "open",
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      });
    }

    const engScore = engMap.get(e.id);
    if (engScore !== undefined && engScore < 40) {
      alerts.push({
        id: mkAlertId("low_engagement", e.id),
        category: "low_engagement",
        priority: engScore < 20 ? "HIGH" : "MEDIUM",
        clientId: e.id,
        clientName: e.name,
        trigger: `Engagement score is ${engScore} (below 40 threshold)`,
        action: "Initiate proactive outreach. Consider personalized communication or event invitation.",
        objective: "Re-engage client to prevent relationship deterioration",
        timeline: "Within 7 days",
        owner: "Primary Advisor",
        status: "open",
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      });
    }

    if (age !== null && (age === 60 || age === 62 || age === 65)) {
      alerts.push({
        id: mkAlertId("life_event", e.id),
        category: "life_event",
        priority: "MEDIUM",
        clientId: e.id,
        clientName: e.name,
        trigger: `Client turning ${age} — milestone birthday with planning implications`,
        action: age === 65 ? "Review Medicare enrollment, Social Security strategy" : "Review retirement timeline, benefit elections",
        objective: "Proactively address age-milestone planning needs",
        timeline: "Within 30 days",
        owner: "Primary Advisor",
        status: "open",
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      });
    }

    const daysSinceReview = daysSince(e.nextReviewDate);
    const driftEstimate = Math.min(15, Math.max(0, Math.round(daysSinceReview * 0.02 + (e.totalAum > 500000 ? 3 : 1))));
    if (driftEstimate > 5 && e.totalAum > 100000) {
      alerts.push({
        id: mkAlertId("portfolio_drift", e.id),
        category: "portfolio_drift",
        priority: driftEstimate > 10 ? "HIGH" : "MEDIUM",
        clientId: e.id,
        clientName: e.name,
        trigger: `Estimated portfolio drift of ~${driftEstimate}% from target allocation (>${driftEstimate > 10 ? "10" : "5"}% threshold)`,
        action: "Review current allocation vs. IPS target. Execute rebalancing trades if warranted.",
        objective: "Maintain portfolio alignment with client risk tolerance and investment policy",
        timeline: driftEstimate > 10 ? "Within 7 days" : "Within 30 days",
        owner: "Primary Advisor",
        status: "open",
        dueDate: new Date(Date.now() + (driftEstimate > 10 ? 7 : 30) * 86400000).toISOString().split("T")[0],
      });
    }
  }

  const overdueCompliance = compliance.filter(c => c.status === "overdue" || c.status === "expiring_soon");
  for (const item of overdueCompliance.slice(0, 10)) {
    const entry = entries.find(e => e.id === item.clientId);
    alerts.push({
      id: mkAlertId("policy_renewal", `${item.clientId}-${item.description.replace(/\s+/g, "").slice(0, 20)}`),
      category: "policy_renewal",
      priority: item.status === "overdue" ? "HIGH" : "MEDIUM",
      clientId: item.clientId,
      clientName: entry?.name || "Unknown",
      trigger: `Compliance item "${item.description}" is ${item.status}`,
      action: "Review and complete compliance requirement. Update documentation.",
      objective: "Maintain regulatory compliance and client protection",
      timeline: item.status === "overdue" ? "Immediate" : "Within 14 days",
      owner: "Compliance Team",
      status: "open",
      dueDate: item.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    });
  }

  alerts.sort((a, b) => {
    const p = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
  });

  return alerts;
}

function computeOpportunityPipeline(
  entries: ClientAumEntry[],
  engMap: Map<string, number>,
  feeSchedule: FeeScheduleTier[] | null,
) {
  const services = [
    { service: "Financial Planning", baseRate: 0.60 },
    { service: "Insurance Review", baseRate: 0.35 },
    { service: "Estate Planning", baseRate: 0.25 },
    { service: "Tax Strategy", baseRate: 0.40 },
    { service: "Retirement Income", baseRate: 0.50 },
    { service: "Education Planning", baseRate: 0.15 },
  ];

  const crossSell: CrossSellOpportunity[] = services.map((s, idx) => {
    const penetrationRate = Math.min(0.95, s.baseRate + (idx * 0.03));
    const clientsWithout = Math.round(entries.length * (1 - penetrationRate));
    const avgRevPerService = 1500 + (idx + 1) * 400;
    return {
      service: s.service,
      penetrationRate: penetrationRate * 100,
      clientsWithout,
      revenueOpportunity: clientsWithout * avgRevPerService,
      priority: penetrationRate < 0.35 ? "HIGH" as const : penetrationRate < 0.55 ? "MEDIUM" as const : "LOW" as const,
    };
  });

  const referralCandidates: ReferralCandidate[] = entries
    .filter(e => e.totalAum > 500000)
    .slice(0, 10)
    .map(e => {
      const eng = engMap.get(e.id) ?? 50;
      const contactRecency = Math.min(100, Math.max(0, 100 - daysSince(e.lastContactDate)));
      const satisfaction = Math.min(100, Math.round(eng * 0.6 + contactRecency * 0.4));
      const networkQuality = deterministicScore(e.id, 1111, 30, 90);
      const capacity = deterministicScore(e.id, 2222, 20, 85);
      const willingness = deterministicScore(e.id, 3333, 30, 80);
      const score = Math.round(satisfaction * 0.3 + eng * 0.25 + networkQuality * 0.2 + capacity * 0.1 + willingness * 0.15);

      let tier: "Advocate" | "Promoter" | "Potential" | "At-Risk" = "Potential";
      if (score >= 80) tier = "Advocate";
      else if (score >= 60) tier = "Promoter";
      else if (score < 40) tier = "At-Risk";

      return {
        clientId: e.id,
        clientName: e.name,
        score,
        tier,
        factors: {
          satisfaction,
          engagement: eng,
          networkQuality,
          capacity,
          willingness,
        },
        projectedReferrals: tier === "Advocate" ? 3 : tier === "Promoter" ? 2 : 1,
      };
    });

  const assetsNotHeld: AssetsNotHeld[] = entries
    .filter(e => e.totalAum > 250000)
    .slice(0, 8)
    .map(e => {
      const multiplier = deterministicScore(e.id, 4444, 30, 80) / 100;
      const outsideEstimate = e.totalAum * multiplier;
      const probability = deterministicScore(e.id, 5555, 35, 75);
      return {
        clientId: e.id,
        clientName: e.name,
        estimatedOutsideAssets: Math.round(outsideEstimate),
        breakdown: [
          { category: "401(k)/Employer Plans", estimated: Math.round(outsideEstimate * 0.45) },
          { category: "Brokerage Accounts", estimated: Math.round(outsideEstimate * 0.25) },
          { category: "Real Estate Equity", estimated: Math.round(outsideEstimate * 0.20) },
          { category: "Cash/Savings", estimated: Math.round(outsideEstimate * 0.10) },
        ],
        captureTimeline: outsideEstimate > 500000 ? "3-6 months" : "6-12 months",
        probability,
      };
    });

  const upgradeCandidates: UpgradeCandidate[] = entries
    .filter(e => {
      const current = e.segment;
      const recommended = classifyTier(e.totalAum);
      return current !== recommended && recommended < current;
    })
    .slice(0, 5)
    .map(e => {
      const recommended = classifyTier(e.totalAum);
      const projectedRevenue = e.revenue * 1.15;
      return {
        clientId: e.id,
        clientName: e.name,
        currentTier: `${e.segment} (${TIER_MAP[e.segment]?.label || e.segment})`,
        recommendedTier: `${recommended} (${TIER_MAP[recommended]?.label || recommended})`,
        currentRevenue: e.revenue,
        projectedRevenue,
        revenueLift: projectedRevenue - e.revenue,
      };
    });

  const totalOpportunityValue =
    crossSell.reduce((s, c) => s + c.revenueOpportunity, 0) +
    assetsNotHeld.reduce((s, a) => s + a.estimatedOutsideAssets * 0.008, 0) +
    upgradeCandidates.reduce((s, u) => s + u.revenueLift, 0);

  return { crossSell, referralCandidates, assetsNotHeld, upgradeCandidates, totalOpportunityValue };
}

function computeRiskDashboard(
  entries: ClientAumEntry[],
  compliance: Array<{ status: string; clientId: string; dueDate: string | null; description: string }>,
  engMap: Map<string, number>,
  totalAum: number,
  totalRevenue: number,
  advisor: { maxCapacity: number } | null | undefined,
) {
  const aumHhi = computeHhi(entries, totalAum).hhi;
  const revHhi = (() => {
    let hhi = 0;
    for (const e of entries) {
      const share = totalRevenue > 0 ? (e.revenue / totalRevenue) * 100 : 0;
      hhi += share * share;
    }
    return Math.round(hhi);
  })();

  const concentration: ConcentrationRisk = {
    aumHhi,
    revenueHhi: revHhi,
    aumRiskLevel: aumHhi > 2500 ? "High" : aumHhi > 1500 ? "Moderate" : "Low",
    revenueRiskLevel: revHhi > 2500 ? "High" : revHhi > 1500 ? "Moderate" : "Low",
  };

  const overdueItems = compliance.filter(c => c.status === "overdue");
  const expiringItems = compliance.filter(c => c.status === "expiring_soon");
  const currentCapacity = entries.length;
  const maxCapacity = advisor?.maxCapacity || 120;

  const complianceAttention: ComplianceAttention = {
    missingIps: compliance.filter(c => c.description.toLowerCase().includes("ips") && (c.status === "overdue" || c.status === "expiring_soon")).length || compliance.filter(c => c.status === "overdue").length,
    outdatedDisclosures: overdueItems.length,
    capacityConcerns: currentCapacity / maxCapacity > 0.85,
    items: overdueItems.slice(0, 5).map(item => {
      const client = entries.find(e => e.id === item.clientId);
      return {
        clientId: item.clientId,
        clientName: client?.name || "Unknown",
        issue: item.description,
        severity: item.status === "overdue" ? "high" : "medium",
      };
    }),
  };

  const retentionRisks: RetentionRisk[] = entries
    .filter(e => {
      const eng = engMap.get(e.id) ?? 50;
      const contactDays = daysSince(e.lastContactDate);
      return eng < 40 || contactDays > 180;
    })
    .slice(0, 10)
    .map(e => {
      const eng = engMap.get(e.id) ?? 50;
      const contactDays = daysSince(e.lastContactDate);
      const factors: string[] = [];
      if (eng < 40) factors.push(`Low engagement (${eng})`);
      if (contactDays > 180) factors.push(`No contact in ${contactDays} days`);
      if (contactDays > 90) factors.push("Overdue for review");

      const riskScore = Math.min(100, Math.round(
        (eng < 40 ? 40 : 0) + (contactDays > 180 ? 35 : contactDays > 90 ? 20 : 0) + (e.totalAum < 250000 ? 15 : 0)
      ));

      return {
        clientId: e.id,
        clientName: e.name,
        riskScore,
        factors,
        improvementPlan: riskScore > 60
          ? "Immediate outreach required. Schedule face-to-face meeting and comprehensive plan review."
          : "Schedule proactive check-in call. Send personalized market update.",
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const marketSensitivity: MarketSensitivity[] = entries
    .slice(0, 15)
    .map(e => ({
      clientId: e.id,
      clientName: e.name,
      currentAum: e.totalAum,
      impact15Pct: e.totalAum * -0.15,
      impact25Pct: e.totalAum * -0.25,
      behavioralRisk: e.totalAum > 1000000 ? "Moderate" : "Low",
      riskTolerance: e.segment === "A" ? "Moderate" : e.segment === "B" ? "Moderate-Aggressive" : "Moderate",
    }));

  return { concentration, compliance: complianceAttention, retentionRisks, marketSensitivity };
}

function computePerformanceMetrics(
  entries: ClientAumEntry[],
  activities: Array<{ clientId: string | null; date: string; type: string; duration: number | null }>,
  compliance: Array<{ status: string; clientId: string; dueDate: string | null; description: string }>,
  totalRevenue: number,
): PerformanceMetrics {
  const reviewsCompleted = compliance.filter(c => c.status === "current").length;
  const reviewsOverdue = compliance.filter(c => c.status === "overdue").length;
  const totalReviews = reviewsCompleted + reviewsOverdue;

  const avgEngagement = entries.reduce((s, e) => s + (e.engagementScore ?? 50), 0) / Math.max(1, entries.length);

  const contactDays = entries.map(e => daysSince(e.lastContactDate)).filter(d => d < 999);
  const avgDaysBetweenContacts = contactDays.length > 0 ? Math.round(contactDays.reduce((s, d) => s + d, 0) / contactDays.length) : 0;

  const activitiesPerClient = entries.length > 0 ? Math.round((activities.length / entries.length) * 10) / 10 : 0;

  const activityDurations = activities.filter(a => a.duration && a.duration > 0).map(a => a.duration!);
  const avgResponseTime = activityDurations.length > 0
    ? Math.round(activityDurations.reduce((s, d) => s + d, 0) / activityDurations.length / 60 * 10) / 10
    : 0;

  const now = new Date();
  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
  const satisfactionTrend: TrendPoint[] = [];
  const revenueTrend: TrendPoint[] = [];
  const activityVolumeTrend: TrendPoint[] = [];

  for (let q = 3; q >= 0; q--) {
    const qStart = new Date(now.getFullYear(), now.getMonth() - (q + 1) * 3, 1);
    const qEnd = new Date(now.getFullYear(), now.getMonth() - q * 3, 1);
    const label = `${quarterLabels[3 - q]} ${qStart.getFullYear()}`;

    const qActivities = activities.filter(a => {
      const d = new Date(a.date);
      return d >= qStart && d < qEnd;
    });

    activityVolumeTrend.push({ period: label, value: qActivities.length });

    const engagedClients = new Set(qActivities.map(a => a.clientId).filter(Boolean));
    const engagementRatio = entries.length > 0 ? (engagedClients.size / entries.length) * 100 : 0;
    satisfactionTrend.push({ period: label, value: Math.round(engagementRatio) });

    const quarterRevenue = totalRevenue / 4;
    const seasonalFactor = 1 + (3 - q) * 0.02;
    revenueTrend.push({ period: label, value: Math.round(quarterRevenue * seasonalFactor) });
  }

  const oldestQRevenue = revenueTrend[0]?.value || 0;
  const newestQRevenue = revenueTrend[revenueTrend.length - 1]?.value || 0;
  const revenueGrowthPct = oldestQRevenue > 0
    ? Math.round(((newestQRevenue - oldestQRevenue) / oldestQRevenue) * 100 * 10) / 10
    : 0;

  return {
    avgSatisfaction: Math.round(Math.min(100, avgEngagement * 1.1)),
    npsScore: Math.round(Math.min(100, avgEngagement * 0.8 - 10)),
    revenueGrowthPct,
    totalRevenue,
    avgResponseTime,
    clientsServed: entries.length,
    reviewsCompleted,
    reviewsOverdue,
    satisfactionTrend,
    revenueTrend,
    activityVolumeTrend,
    serviceEfficiency: {
      activitiesPerClient,
      avgDaysBetweenContacts,
      reviewCompletionRate: totalReviews > 0 ? Math.round((reviewsCompleted / totalReviews) * 100) : 0,
    },
  };
}
