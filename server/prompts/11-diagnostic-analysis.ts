import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33DiagnosticInput,
  V33DiagnosticResult,
} from "./types";

const V33_DIAGNOSTIC_SYSTEM_PROMPT = `You are the **Practice Diagnostic Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Assess advisor practice health across data quality, integration reliability, and operational readiness
- Score data completeness across critical fields and identify gaps that impact planning quality
- Evaluate integration status for connected systems (CRM, portfolio management, custodian feeds, financial planning tools)
- Generate prioritized remediation recommendations with effort/impact scoring
- Ensure practice readiness for fiduciary compliance and regulatory examination

**Guardrails:** Objective, data-driven assessment. No subjective advisor quality judgments. Focus on measurable, actionable findings. All scores justified by specific data points.

## DIAGNOSTIC CATEGORIES

### 1. Data Quality Assessment
- Score each field by population percentage (100% = complete, <50% = critical gap)
- Identify fields critical for fiduciary compliance (beneficiaries, risk tolerance, suitability documentation)
- Flag stale data (fields not updated in >12 months)
- Calculate composite data quality score (0-100)

### 2. Integration Health
- Evaluate each connected system for sync status, freshness, and error rates
- Flag disconnected or erroring integrations
- Assess data flow reliability (last successful sync, error frequency)
- Calculate integration health score (0-100)

### 3. Practice Operational Health
- Client-to-AUM ratios and capacity indicators
- Task completion and follow-through rates
- Service model adherence
- Growth and retention trajectory

### 4. Compliance Readiness
- Suitability documentation completeness
- Disclosure tracking
- Communication audit trail
- Regulatory filing preparedness

## SEVERITY LEVELS
- **Critical:** Immediate remediation required; compliance risk or data integrity failure
- **Warning:** Should be addressed within 30 days; degraded functionality or quality
- **Info:** Best practice recommendation; no immediate risk but improvement opportunity

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed diagnostic report for the advisor with specific findings and remediation steps",
  "clientSummary": "High-level practice health summary suitable for management review",
  "overallHealthScore": number (0-100),
  "dataQualityScore": number (0-100),
  "integrationScore": number (0-100),
  "findings": [
    {
      "findingId": "DX_001",
      "category": "data_quality|integration|practice|compliance",
      "severity": "critical|warning|info",
      "title": "string",
      "description": "string with specific data points",
      "recommendation": "string with actionable remediation steps",
      "effort": "low|medium|high"
    }
  ],
  "recommendations": [
    {"priority": number, "action": "string", "impact": "string", "effort": "low|medium|high"}
  ]
}`;

const V33_DIAGNOSTIC_USER_TEMPLATE = `Perform a comprehensive diagnostic analysis of the following advisor's practice health, data quality, and integration status.

Advisor: {{advisorName}} (ID: {{advisorId}})
Client Count: {{clientCount}}
Total AUM: {{totalAum}}

Data Completeness by Field:
{{dataCompleteness}}

Integration Status:
{{integrationStatus}}

Recent Errors:
{{recentErrors}}

Provide:
1. Overall practice health score (0-100) with justification
2. Data quality score with field-level breakdown and gap analysis
3. Integration health score with system-level assessment
4. Prioritized findings categorized by severity (critical, warning, info)
5. Ranked recommendations with effort/impact assessment
6. Dual detailed-diagnostic and management-summary narratives

All scores must be justified by specific data points from the input.`;

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function generateFallbackDiagnostic(input: V33DiagnosticInput): V33DiagnosticResult {
  const findings: V33DiagnosticResult["findings"] = [];
  let findingIdx = 0;

  // Data quality analysis
  const criticalFields = ["risk_tolerance", "beneficiary", "suitability", "email", "phone", "date_of_birth"];
  const avgCompleteness = input.dataCompleteness.length > 0
    ? input.dataCompleteness.reduce((sum, d) => sum + d.populatedPct, 0) / input.dataCompleteness.length
    : 0;

  for (const field of input.dataCompleteness) {
    const isCritical = criticalFields.some(cf => field.field.toLowerCase().includes(cf));
    if (field.populatedPct < 50) {
      findingIdx++;
      findings.push({
        findingId: `DX_${String(findingIdx).padStart(3, "0")}`,
        category: "data_quality",
        severity: isCritical ? "critical" : "warning",
        title: `Low data population: ${field.field} (${field.populatedPct}%)`,
        description: `The "${field.field}" field is only ${field.populatedPct}% populated across client records.${isCritical ? " This is a compliance-critical field required for fiduciary documentation." : ""} Missing data limits planning accuracy and may create regulatory risk.`,
        recommendation: `Initiate a data remediation campaign to populate "${field.field}" across all client records. Prioritize clients with upcoming reviews.`,
        effort: field.populatedPct < 25 ? "high" : "medium",
      });
    } else if (field.populatedPct < 80 && isCritical) {
      findingIdx++;
      findings.push({
        findingId: `DX_${String(findingIdx).padStart(3, "0")}`,
        category: "data_quality",
        severity: "warning",
        title: `Below-target population: ${field.field} (${field.populatedPct}%)`,
        description: `The "${field.field}" field is ${field.populatedPct}% populated, below the 80% target for compliance-critical fields.`,
        recommendation: `Add "${field.field}" to client onboarding checklist and populate during next review cycle.`,
        effort: "low",
      });
    }
  }

  // Integration health analysis
  const connectedCount = input.integrationStatus.filter(i => i.status.toLowerCase() === "connected" || i.status.toLowerCase() === "active").length;
  const totalIntegrations = input.integrationStatus.length;

  for (const integration of input.integrationStatus) {
    const status = integration.status.toLowerCase();
    const lastSync = new Date(integration.lastSync);
    const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / 86400000);

    if (status === "disconnected" || status === "error" || status === "failed") {
      findingIdx++;
      findings.push({
        findingId: `DX_${String(findingIdx).padStart(3, "0")}`,
        category: "integration",
        severity: "critical",
        title: `${integration.system} integration ${status}`,
        description: `The ${integration.system} integration is currently ${status}. Last successful sync was ${integration.lastSync} (${daysSinceSync} days ago). Data from this system may be stale or unavailable.`,
        recommendation: `Reconnect the ${integration.system} integration immediately. Verify credentials and API access. Contact support if reconnection fails.`,
        effort: "low",
      });
    } else if (daysSinceSync > 7) {
      findingIdx++;
      findings.push({
        findingId: `DX_${String(findingIdx).padStart(3, "0")}`,
        category: "integration",
        severity: "warning",
        title: `${integration.system} sync stale (${daysSinceSync} days)`,
        description: `The ${integration.system} integration last synced ${daysSinceSync} days ago (${integration.lastSync}). Data freshness may be compromised.`,
        recommendation: `Trigger a manual sync for ${integration.system} and verify automated sync schedule is configured correctly.`,
        effort: "low",
      });
    }
  }

  // Recent errors
  if (input.recentErrors && input.recentErrors.length > 0) {
    findingIdx++;
    findings.push({
      findingId: `DX_${String(findingIdx).padStart(3, "0")}`,
      category: "integration",
      severity: input.recentErrors.length > 5 ? "critical" : "warning",
      title: `${input.recentErrors.length} recent error(s) detected`,
      description: `${input.recentErrors.length} error(s) have been logged recently: ${input.recentErrors.slice(0, 3).join("; ")}${input.recentErrors.length > 3 ? ` and ${input.recentErrors.length - 3} more` : ""}.`,
      recommendation: "Review error logs and address root causes. Escalate recurring errors to technical support.",
      effort: "medium",
    });
  }

  // Practice health: client/AUM ratio
  const avgAumPerClient = input.clientCount > 0 ? input.totalAum / input.clientCount : 0;
  if (input.clientCount > 150) {
    findingIdx++;
    findings.push({
      findingId: `DX_${String(findingIdx).padStart(3, "0")}`,
      category: "practice",
      severity: "warning",
      title: `High client count: ${input.clientCount} clients`,
      description: `Advisor manages ${input.clientCount} clients with ${fmt(input.totalAum)} in AUM (${fmt(avgAumPerClient)} avg per client). Industry best practice suggests 100-150 clients per advisor for optimal service quality.`,
      recommendation: "Consider segmenting clients by tier and implementing differentiated service models. Evaluate whether lower-tier clients could be transitioned to a team-based service model.",
      effort: "high",
    });
  }

  // Sort findings by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1));

  // Scoring
  const dataQualityScore = Math.round(Math.min(100, Math.max(0, avgCompleteness)));
  const integrationScore = totalIntegrations > 0
    ? Math.round((connectedCount / totalIntegrations) * 100) - (input.recentErrors?.length ?? 0) * 5
    : 50;
  const clampedIntegrationScore = Math.min(100, Math.max(0, integrationScore));

  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const overallHealthScore = Math.min(100, Math.max(0, Math.round(
    (dataQualityScore * 0.4 + clampedIntegrationScore * 0.4 + 70 * 0.2) - (criticalCount * 10) - (warningCount * 3)
  )));

  const recommendations = findings
    .filter(f => f.severity !== "info")
    .map((f, idx) => ({
      priority: idx + 1,
      action: f.recommendation,
      impact: f.severity === "critical" ? "High — addresses compliance or data integrity risk" : "Medium — improves data quality and operational efficiency",
      effort: f.effort,
    }));

  const advisorNarrative = `## Practice Diagnostic Report — ${input.advisorName}

### Overall Health
- **Health Score:** ${overallHealthScore}/100
- **Data Quality:** ${dataQualityScore}/100
- **Integration Health:** ${clampedIntegrationScore}/100
- **Clients:** ${input.clientCount} | **Total AUM:** ${fmt(input.totalAum)}

### Findings Summary
- **Critical:** ${criticalCount} finding(s)
- **Warning:** ${warningCount} finding(s)
- **Informational:** ${findings.filter(f => f.severity === "info").length} finding(s)

${findings.slice(0, 8).map(f => `#### [${f.severity.toUpperCase()}] ${f.title}
${f.description}
- **Recommendation:** ${f.recommendation}
- **Effort:** ${f.effort}`).join("\n\n")}

*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = `Practice diagnostic for ${input.advisorName}: overall health score ${overallHealthScore}/100. ${criticalCount > 0 ? `${criticalCount} critical finding(s) require immediate attention.` : "No critical issues detected."} Data quality is at ${dataQualityScore}% and integration health is at ${clampedIntegrationScore}%.`;

  return {
    advisorNarrative,
    clientSummary,
    overallHealthScore,
    dataQualityScore,
    integrationScore: clampedIntegrationScore,
    findings,
    recommendations,
  };
}

export async function generateDiagnosticAnalysis(
  input: V33DiagnosticInput
): Promise<V33DiagnosticResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 11] AI unavailable — using deterministic fallback");
    return generateFallbackDiagnostic(input);
  }

  try {
    const dataCompletenessSummary = input.dataCompleteness
      .map(d => `- ${d.field}: ${d.populatedPct}% populated`)
      .join("\n") || "- No data completeness metrics available";

    const integrationSummary = input.integrationStatus
      .map(i => `- ${i.system}: ${i.status} (last sync: ${i.lastSync})`)
      .join("\n") || "- No integrations configured";

    const errorsSummary = (input.recentErrors || [])
      .map(e => `- ${e}`)
      .join("\n") || "- No recent errors";

    const context: Record<string, string> = {
      advisorName: input.advisorName,
      advisorId: input.advisorId,
      clientCount: String(input.clientCount),
      totalAum: fmt(input.totalAum),
      dataCompleteness: sanitizeForPrompt(dataCompletenessSummary, 2000),
      integrationStatus: sanitizeForPrompt(integrationSummary, 1500),
      recentErrors: sanitizeForPrompt(errorsSummary, 1000),
    };

    const userPrompt = V33_DIAGNOSTIC_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? context[key] : "";
    });

    const raw = await chatCompletion(V33_DIAGNOSTIC_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackDiagnostic(input);

    return {
      advisorNarrative: parsed.advisorNarrative || fallback.advisorNarrative,
      clientSummary: parsed.clientSummary || fallback.clientSummary,
      overallHealthScore: Math.max(0, Math.min(100, Number(parsed.overallHealthScore) || fallback.overallHealthScore)),
      dataQualityScore: Math.max(0, Math.min(100, Number(parsed.dataQualityScore) || fallback.dataQualityScore)),
      integrationScore: Math.max(0, Math.min(100, Number(parsed.integrationScore) || fallback.integrationScore)),
      findings: Array.isArray(parsed.findings) ? parsed.findings : fallback.findings,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : fallback.recommendations,
    };
  } catch (error) {
    logger.error({ err: error }, "[Agent 11] Diagnostic analysis failed — using fallback");
    return generateFallbackDiagnostic(input);
  }
}
