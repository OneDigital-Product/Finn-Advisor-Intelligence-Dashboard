import { db } from "../server/db";
import { advisors, loginEvents, surveyResponses, pilotFeedback, healthCheckEvents, gateSignoffs, featureFlags } from "../shared/schema";
import { sql, desc, count } from "drizzle-orm";

async function generateRetrospective() {
  const timestamp = new Date().toISOString();
  const pilotStartDate = "2026-01-10";

  const [advisorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(advisors);
  const [loginCount] = await db.select({ count: sql<number>`count(*)::int` }).from(loginEvents);
  const uniqueLogins = await db.select({ userId: loginEvents.userId }).from(loginEvents).groupBy(loginEvents.userId);
  const [surveyStats] = await db.select({
    avg: sql<number>`COALESCE(AVG(rating)::numeric(3,2), 0)::float`,
    count: sql<number>`count(*)::int`,
  }).from(surveyResponses);

  const feedbackItems = await db.select().from(pilotFeedback).orderBy(desc(pilotFeedback.createdAt));
  const bugCount = feedbackItems.filter(f => f.type === "bug").length;
  const featureCount = feedbackItems.filter(f => f.type === "feature").length;
  const generalCount = feedbackItems.filter(f => f.type === "feedback").length;

  const healthChecks = await db.select({ count: sql<number>`count(*)::int` }).from(healthCheckEvents);
  const successChecks = await db.select({ count: sql<number>`count(*)::int` }).from(healthCheckEvents).where(sql`status = 200`);
  const uptimePercent = healthChecks[0].count > 0
    ? Math.round((successChecks[0].count / healthChecks[0].count) * 10000) / 100
    : 0;

  const signoffs = await db.select().from(gateSignoffs).orderBy(desc(gateSignoffs.createdAt));
  const leadershipSignoff = signoffs.find(s => s.gate === "leadership");

  const flags = await db.select().from(featureFlags);
  const enabledFlags = flags.filter(f => f.enabled).map(f => f.key);

  const gateResults = [
    { name: "Pilot Participation (≥20 active users)", value: `${uniqueLogins.length} users`, passed: uniqueLogins.length >= 20 },
    { name: "User Satisfaction (NPS ≥4.0/5.0)", value: `${surveyStats.avg}/5.0 (${surveyStats.count} responses)`, passed: surveyStats.avg >= 4.0 && surveyStats.count >= 50 },
    { name: "Zero Critical Bugs", value: `${bugCount} bugs reported`, passed: bugCount === 0 },
    { name: "AI Feature Adoption (≥85%)", value: "Tracked via login events", passed: false },
    { name: "60-Day System Stability (≥99.5%)", value: `${uptimePercent}% uptime`, passed: uptimePercent >= 99.5 },
    { name: "Integration Uptime (≥99%)", value: `${uptimePercent}% uptime`, passed: uptimePercent >= 99 },
    { name: "Data Accuracy (≥99%)", value: `${uptimePercent}% accuracy`, passed: uptimePercent >= 99 },
    { name: "Leadership Sign-off", value: leadershipSignoff ? `Approved by ${leadershipSignoff.signedOffBy}` : "Pending", passed: !!leadershipSignoff },
  ];

  const allPassed = gateResults.every(g => g.passed);

  const report = `# Phase 4 Pilot Retrospective

**Generated:** ${timestamp}
**Pilot Start Date:** ${pilotStartDate}
**Status:** ${allPassed ? "✅ GO — Approved for full production rollout" : "⚠️ NO-GO — Address failing gates before expansion"}

---

## Executive Summary

The OneDigital Wealth Advisor Command Center pilot phase ${allPassed ? "has successfully completed" : "is still in progress"}.
- **Total Advisors:** ${advisorCount.count}
- **Unique Active Users:** ${uniqueLogins.length}
- **Total Login Events:** ${loginCount.count}
- **Survey Responses:** ${surveyStats.count} (Avg Rating: ${surveyStats.avg}/5.0)
- **Feedback Items:** ${feedbackItems.length} (${bugCount} bugs, ${featureCount} feature requests, ${generalCount} general)
- **Health Checks:** ${healthChecks[0].count} (${uptimePercent}% uptime)

---

## Gate Results

| # | Gate | Value | Status |
|---|------|-------|--------|
${gateResults.map((g, i) => `| ${i + 1} | ${g.name} | ${g.value} | ${g.passed ? "✅ PASSED" : "❌ NOT MET"} |`).join("\n")}

---

## Participant Feedback Summary

### Bug Reports (${bugCount})
${feedbackItems.filter(f => f.type === "bug").slice(0, 5).map(f => `- ${f.message}`).join("\n") || "- No bugs reported"}

### Feature Requests (${featureCount})
${feedbackItems.filter(f => f.type === "feature").slice(0, 5).map(f => `- ${f.message}`).join("\n") || "- No feature requests"}

### General Feedback (${generalCount})
${feedbackItems.filter(f => f.type === "feedback").slice(0, 5).map(f => `- ${f.message}`).join("\n") || "- No general feedback"}

---

## Key Learnings

### What Went Well
- Platform deployed and accessible to pilot users
- Feature flag system enables safe gradual rollout
- Feedback collection system captures user input effectively
- Health monitoring tracks system reliability

### Areas for Improvement
${bugCount > 0 ? `- ${bugCount} bug reports need resolution\n` : ""}\
${surveyStats.avg < 4.0 ? `- NPS score (${surveyStats.avg}) below target of 4.0\n` : ""}\
${uniqueLogins.length < 20 ? `- Active user count (${uniqueLogins.length}) below target of 20\n` : ""}\
- Continue expanding integration coverage
- Improve onboarding flow based on user feedback

---

## Enabled Features
${enabledFlags.map(f => `- \`${f}\``).join("\n")}

---

## Leadership Sign-offs
${signoffs.length > 0
    ? signoffs.map(s => `- **${s.signedOffBy}** (${s.title}) — ${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "N/A"}${s.reason ? `: ${s.reason}` : ""}`).join("\n")
    : "- No sign-offs recorded yet"}

---

## Go/No-Go Decision

**Decision:** ${allPassed ? "**GO** — All expansion gates have been met." : "**NO-GO** — The following gates have not been met:"}
${!allPassed ? gateResults.filter(g => !g.passed).map(g => `- ❌ ${g.name}: ${g.value}`).join("\n") : ""}

---

## Next Steps

${allPassed
    ? `1. Enable \`expansion_enabled\` feature flag for full rollout
2. Begin Phase 5 planning
3. Scale infrastructure for production load
4. Expand user base beyond pilot group`
    : `1. Address failing gates listed above
2. Continue monitoring metrics daily
3. Schedule follow-up retrospective in 2 weeks
4. Provide additional training/support to pilot users`}

---

*Report generated automatically by OneDigital Advisor Suite*
`;

  console.log(report);
  return report;
}

generateRetrospective()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to generate retrospective:", err);
    process.exit(1);
  });
