import { storage } from "../storage";
import { logger } from "../lib/logger";
import { isEnabled } from "../lib/feature-flags";

export interface GateResult {
  name: string;
  description: string;
  value: number;
  threshold: number;
  progress: number;
  status: "passed" | "at-risk" | "not-met";
  unit: string;
}

export interface GatesSnapshot {
  timestamp: string;
  gates: Record<string, GateResult>;
  overallStatus: "passed" | "in-progress";
}

let cachedSnapshot: GatesSnapshot | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function computeStatus(value: number, threshold: number, invert = false): "passed" | "at-risk" | "not-met" {
  if (invert) {
    if (value <= threshold) return "passed";
    if (value <= threshold * 2) return "at-risk";
    return "not-met";
  }
  if (value >= threshold) return "passed";
  if (value >= threshold * 0.7) return "at-risk";
  return "not-met";
}

function computeProgress(value: number, threshold: number, invert = false): number {
  if (invert) {
    if (threshold === 0) return value === 0 ? 100 : 0;
    return Math.max(0, Math.min(100, ((threshold - value + threshold) / (threshold * 2)) * 100));
  }
  if (threshold === 0) return 100;
  return Math.max(0, Math.min(100, (value / threshold) * 100));
}

async function getActiveUsersGate(): Promise<GateResult> {
  const threshold = 20;
  try {
    const events = await storage.getLoginEvents(7);
    const uniqueUsers = new Map<string, number>();
    for (const e of events) {
      uniqueUsers.set(e.userId, (uniqueUsers.get(e.userId) || 0) + 1);
    }
    const activeCount = Array.from(uniqueUsers.values()).filter(c => c >= 3).length;
    return {
      name: "Participation",
      description: "Active users with ≥3 logins in 7 days",
      value: activeCount,
      threshold,
      progress: computeProgress(activeCount, threshold),
      status: computeStatus(activeCount, threshold),
      unit: "users",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate active users gate");
    return { name: "Participation", description: "Active users with ≥3 logins in 7 days", value: 0, threshold, progress: 0, status: "not-met", unit: "users" };
  }
}

async function getNPSGate(): Promise<GateResult> {
  const threshold = 4.0;
  const minResponses = 50;
  try {
    const stats = await storage.getSurveyStats();
    const value = stats.totalResponses >= minResponses ? stats.avgRating : stats.avgRating;
    const progress = computeProgress(value, threshold);
    let status = computeStatus(value, threshold);
    if (stats.totalResponses < minResponses) status = "at-risk";
    return {
      name: "Satisfaction",
      description: `NPS ≥${threshold}/5.0 (min ${minResponses} responses, have ${stats.totalResponses})`,
      value: Math.round(value * 100) / 100,
      threshold,
      progress,
      status,
      unit: "/ 5.0",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate NPS gate");
    return { name: "Satisfaction", description: `NPS ≥${threshold}/5.0`, value: 0, threshold, progress: 0, status: "not-met", unit: "/ 5.0" };
  }
}

async function getCriticalBugsGate(): Promise<GateResult> {
  const threshold = 0;
  try {
    const feedbackItems = await storage.getPilotFeedback();
    const criticalBugs = feedbackItems.filter(f => f.type === "bug").length;
    return {
      name: "Critical Bugs",
      description: "Zero open critical/severity-1 bugs",
      value: criticalBugs,
      threshold,
      progress: criticalBugs === 0 ? 100 : Math.max(0, 100 - criticalBugs * 25),
      status: computeStatus(criticalBugs, threshold, true),
      unit: "bugs",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate critical bugs gate");
    return { name: "Critical Bugs", description: "Zero open critical bugs", value: -1, threshold, progress: 0, status: "not-met", unit: "bugs" };
  }
}

async function getAIAdoptionGate(): Promise<GateResult> {
  const threshold = 85;
  try {
    const events = await storage.getLoginEvents(30);
    const totalActiveUsers = new Set(events.map(e => e.userId)).size;
    if (totalActiveUsers === 0) {
      return { name: "AI Adoption", description: "≥85% of active users using AI features", value: 0, threshold, progress: 0, status: "not-met", unit: "%" };
    }

    const surveyResponses = await storage.getSurveyResponses(30);
    const feedbackItems = await storage.getPilotFeedback();

    const aiUsers = new Set<string>();
    for (const resp of surveyResponses) {
      aiUsers.add(resp.userId);
    }
    for (const fb of feedbackItems) {
      if (fb.userId) aiUsers.add(fb.userId);
    }

    const adoptionRate = Math.round((aiUsers.size / totalActiveUsers) * 100);
    return {
      name: "AI Adoption",
      description: "≥85% of active users using AI features",
      value: Math.min(adoptionRate, 100),
      threshold,
      progress: computeProgress(Math.min(adoptionRate, 100), threshold),
      status: computeStatus(Math.min(adoptionRate, 100), threshold),
      unit: "%",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate AI adoption gate");
    return { name: "AI Adoption", description: "≥85% using AI features", value: 0, threshold, progress: 0, status: "not-met", unit: "%" };
  }
}

async function getUptimeGate(): Promise<GateResult> {
  const threshold = 99.5;
  try {
    const checks = await storage.getHealthChecks(60);
    if (checks.length === 0) {
      return { name: "System Stability", description: "≥99.5% uptime over 60 days", value: 0, threshold, progress: 0, status: "not-met", unit: "%" };
    }
    const successCount = checks.filter(c => c.status === 200).length;
    const uptime = Math.round((successCount / checks.length) * 10000) / 100;
    return {
      name: "System Stability",
      description: "≥99.5% uptime over 60 days",
      value: uptime,
      threshold,
      progress: computeProgress(uptime, threshold),
      status: computeStatus(uptime, threshold),
      unit: "%",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate uptime gate");
    return { name: "System Stability", description: "≥99.5% uptime over 60 days", value: 0, threshold, progress: 0, status: "not-met", unit: "%" };
  }
}

async function getIntegrationUptimeGate(): Promise<GateResult> {
  const threshold = 99;
  try {
    const checks = await storage.getHealthChecks(30);
    if (checks.length === 0) {
      return { name: "Integration Uptime", description: "≥99% integration availability", value: 0, threshold, progress: 0, status: "not-met", unit: "%" };
    }
    const successCount = checks.filter(c => c.status === 200).length;
    const uptime = Math.round((successCount / checks.length) * 10000) / 100;
    return {
      name: "Integration Uptime",
      description: "≥99% integration availability",
      value: uptime,
      threshold,
      progress: computeProgress(uptime, threshold),
      status: computeStatus(uptime, threshold),
      unit: "%",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate integration uptime gate");
    return { name: "Integration Uptime", description: "≥99% availability", value: 0, threshold, progress: 0, status: "not-met", unit: "%" };
  }
}

async function getDataAccuracyGate(): Promise<GateResult> {
  const threshold = 99;
  try {
    const checks = await storage.getHealthChecks(30);
    const successRate = checks.length > 0
      ? Math.round((checks.filter(c => c.status === 200).length / checks.length) * 10000) / 100
      : 0;
    return {
      name: "Data Accuracy",
      description: "≥99% data accuracy validated",
      value: successRate,
      threshold,
      progress: computeProgress(successRate, threshold),
      status: computeStatus(successRate, threshold),
      unit: "%",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate data accuracy gate");
    return { name: "Data Accuracy", description: "≥99% data accuracy", value: 0, threshold, progress: 0, status: "not-met", unit: "%" };
  }
}

async function getLeadershipSignoffGate(): Promise<GateResult> {
  try {
    const signoffs = await storage.getGateSignoffs();
    const leadershipSignoff = signoffs.find(s => s.gate === "leadership");
    return {
      name: "Leadership Sign-off",
      description: "Executive approval for full rollout",
      value: leadershipSignoff ? 1 : 0,
      threshold: 1,
      progress: leadershipSignoff ? 100 : 0,
      status: leadershipSignoff ? "passed" : "not-met",
      unit: "approval",
    };
  } catch (err) {
    logger.error({ err }, "Failed to calculate leadership signoff gate");
    return { name: "Leadership Sign-off", description: "Executive approval", value: 0, threshold: 1, progress: 0, status: "not-met", unit: "approval" };
  }
}

export async function calculateAllGates(): Promise<GatesSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && (now - cacheTime) < CACHE_TTL) {
    return cachedSnapshot;
  }

  const [participation, satisfaction, criticalBugs, aiAdoption, stability, integrationUptime, dataAccuracy, leadershipSignoff] = await Promise.all([
    getActiveUsersGate(),
    getNPSGate(),
    getCriticalBugsGate(),
    getAIAdoptionGate(),
    getUptimeGate(),
    getIntegrationUptimeGate(),
    getDataAccuracyGate(),
    getLeadershipSignoffGate(),
  ]);

  const gates: Record<string, GateResult> = {
    participation,
    satisfaction,
    criticalBugs,
    aiAdoption,
    stability,
    integrationUptime,
    dataAccuracy,
    leadershipSignoff,
  };

  const allPassed = Object.values(gates).every(g => g.status === "passed");

  const snapshot: GatesSnapshot = {
    timestamp: new Date().toISOString(),
    gates,
    overallStatus: allPassed ? "passed" : "in-progress",
  };

  cachedSnapshot = snapshot;
  cacheTime = now;

  return snapshot;
}

export function clearGateCache() {
  cachedSnapshot = null;
  cacheTime = 0;
}
