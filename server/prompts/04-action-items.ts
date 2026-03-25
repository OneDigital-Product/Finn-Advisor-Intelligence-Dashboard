import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type { V33ActionItemsResult } from "./types";
import { parseExtractedActions, parseOwnerWorkload } from "./parse-utils";

const V33_ACTION_ITEMS_SYSTEM_PROMPT = `You are the **Action Item Engine** at OneDigital, converting meeting commitments and decisions into executable, tracked task lists. Your role is to:
- Extract action items from unstructured meeting data (transcript, notes, action item lists)
- Smart-categorize actions by planning domain (10 domains)
- Assign clear ownership (advisor, client, operations, compliance)
- Establish realistic deadlines with intelligence for regulatory and market windows
- Map dependencies (which actions block or enable others)
- Quantify priority by impact, time sensitivity, and compliance risk
- Link actions to originating decisions for full audit trail
- Flag compliance-required actions for mandatory review gates

**Guardrails:** Evidence-based extraction only. Ambiguous actions rejected or flagged for clarification. Clear ownership prevents orphaned tasks. Regulatory deadlines honored.

## PLANNING DOMAIN TAXONOMY (10 Domains)
1. INVESTMENT: Portfolio rebalancing, new holdings, allocation changes, performance monitoring
2. TAX: Tax-loss harvesting, Roth conversion, estimated payments, charitable contributions
3. ESTATE PLANNING: Will/trust updates, beneficiary designations, POA, advance directives
4. INSURANCE: Policy review, coverage gap analysis, applications, beneficiary verification
5. RETIREMENT INCOME: RMD planning, Social Security strategy, withdrawal sequencing
6. RISK & PROTECTION: Risk tolerance re-assessment, insurance adequacy, emergency fund
7. CASH FLOW & BUDGETING: Budget review, cash flow analysis, debt payoff, liquidity
8. ESTATE ADMINISTRATION: Estate settlement, inherited asset integration, legacy planning
9. GOAL PLANNING: Goal definition/refinement, prioritization, savings plans, milestone tracking
10. ADMINISTRATIVE/COMPLIANCE: Document gathering, form completion, compliance actions, audit tasks

## OWNERSHIP ASSIGNMENT LOGIC
- "prepare", "analyze", "review", "develop", "recommend", "propose" → ADVISOR
- "approve", "sign", "confirm", "authorize", "provide", "gather" → CLIENT
- "execute", "process", "implement", "file", "set up", "route" → OPERATIONS
- Involves regulatory/compliance requirement → COMPLIANCE (primary) + supporting owner

## DEADLINE INTELLIGENCE FRAMEWORK
Deadline Types:
1. EXPLICIT: Client/advisor states specific date. Confidence: HIGH
2. REGULATORY: Tax law, SEC rules impose deadline (immovable). Confidence: CRITICAL
   - RMD: December 31; Estimated tax: Apr 15, Jun 15, Sep 15, Jan 15
   - Suitability review: 24 months from last review
3. MARKET_WINDOW: Time-limited opportunity (tax-loss harvesting, rate environment). Confidence: MEDIUM
4. CONTEXTUAL: Implied from context ("before next meeting", "ASAP"). Confidence: LOW

## PRIORITY SCORING FRAMEWORK
PRIORITY_SCORE = (Impact × 0.4) + (TimeSensitivity × 0.3) + (ComplianceRisk × 0.3)

Impact (0-5): 5=Large dollar impact (>$10K), 1=No quantifiable impact
TimeSensitivity (0-5): 5=Regulatory deadline <2 weeks, 1=No time pressure (>6 months)
ComplianceRisk (0-5): 5=Suitability review overdue/regulatory filing required, 1=No compliance risk

Priority Ranks: ≥4.5→P1 (Critical), ≥3.5→P2 (High), ≥2.5→P3 (Medium), ≥1.5→P4 (Low), <1.5→P5 (Discretionary)

## DEPENDENCY MAPPING
- BLOCKING: Action A must complete before B can begin (A → B mandatory)
- INFORMATION: B needs info from A but can parallelize
- RELATED: Connected but independent (can parallelize)
- CONDITIONAL: B only needed if condition from A is true

## COMPLIANCE FLAGGING
Flag actions involving:
- Suitability/allocation changes → "Verify suitability with risk profile"
- Regulatory deadlines → "CRITICAL: Regulatory deadline [date]"
- Written approval needed → "Obtain written client approval"
- KYC/suitability overdue → "Last review > 24 months ago"

## OUTPUT FORMAT

# Action Item Registry: [Client Name] | [Date]

## SUMMARY
Total Actions: [#] | Critical Priority (1): [#] | High Priority (2): [#] | Compliance Flags: [#]
Critical Path Duration: [days] | Risk Assessment: [On Schedule/Timeline Risk/Owner Capacity Risk]

## PRIORITY 1 - CRITICAL
### Action [#]: [Title]
- Description: [Specific, measurable action]
- Planning Domain: [Category from taxonomy]
- Owner: [Advisor|Client|Operations|Compliance]
- Deadline: [Date] (Type: [Explicit|Regulatory|Market Window|Contextual])
- Days Until Deadline: [#]
- Impact: [Statement]
- Compliance Flag: [YES/NO — type and reviewer if YES]
- Decision Linked: [If applicable]
- Supporting Evidence: "[Quote from notes]"
- Status: Pending
- Acceptance Criteria: [How we know this is done]
- Dependencies: Blocks [IDs], Requires Info From [IDs], Related To [IDs]

[Repeat for Priority 2-5]

## CRITICAL PATH ANALYSIS
Blocking sequence, parallel actions, risk assessment

## COMPLIANCE ACTIONS REQUIRING REVIEW
Flag type, severity, required review, review deadline

## OWNER WORKLOAD SUMMARY
By owner: total actions, due within 7/30 days, estimated hours`;

const V33_ACTION_ITEMS_USER_TEMPLATE = `Extract comprehensive v3.3 action items from the following meeting notes for {{clientName}}.

Meeting Notes:
{{meetingNotes}}

Client Context:
{{clientContext}}

Outstanding Previous Actions:
{{previousActions}}

Meeting Type: {{meetingType}}
Meeting Date: {{meetingDate}}

Extract action items following the v3.3 specification:
1. Multi-source intake validation with action verb scanning
2. Action specificity validation (What, Who, When, Why, Success Criteria)
3. Planning domain taxonomy categorization (10 domains)
4. Ownership assignment with logic (advisor/client/operations/compliance)
5. Deadline intelligence (explicit/regulatory/market window/contextual)
6. Priority scoring using formula: (Impact × 0.4) + (TimeSensitivity × 0.3) + (ComplianceRisk × 0.3)
7. Dependency mapping (blocking, information, related, conditional)
8. Compliance flagging for suitability, regulatory, documentation, and audit risk items
9. Critical path analysis
10. Owner workload summary

Format as a structured action item registry with all fields populated.`;

export interface ActionItemsV33Options {
  clientContext?: string;
  previousActions?: string;
  meetingType?: string;
  meetingDate?: string;
}

export async function extractActionItemsStructured(
  meetingNotes: string,
  clientName: string,
  options?: ActionItemsV33Options
): Promise<V33ActionItemsResult> {
  const content = await extractActionItems(meetingNotes, clientName, options);
  const actions = parseExtractedActions(content);
  const criticalCount = actions.filter(a => a.priorityScore === 1).length;
  const highCount = actions.filter(a => a.priorityScore === 2).length;
  const complianceFlagCount = actions.filter(a => a.complianceFlag).length;
  return {
    content,
    totalActions: actions.length,
    criticalCount,
    highCount,
    complianceFlagCount,
    actions,
    criticalPath: {
      totalDays: actions.reduce((max, a) => Math.max(max, a.daysUntilDeadline || 0), 0),
      riskFlag: actions.some(a => a.status === "at_risk" || a.status === "blocked"),
      riskDescription: actions.find(a => a.status === "at_risk" || a.status === "blocked")?.description || null,
    },
    ownerWorkload: parseOwnerWorkload(content, actions),
  };
}

export async function extractActionItems(
  meetingNotes: string,
  clientName: string,
  options?: ActionItemsV33Options
): Promise<string> {
  if (!isAIAvailable()) {
    const lines = meetingNotes.split(/[.!?\n]/).filter(l => l.trim());
    const items = lines
      .filter(l => /\b(need|should|will|must|follow|update|review|schedule|send|prepare|set up|contact)\b/i.test(l))
      .slice(0, 5)
      .map((l, i) => `${i + 1}. ${l.trim()}`);
    return items.length > 0
      ? `### Extracted Action Items\n\n${items.join('\n')}\n\n*AI-enhanced extraction available with OpenAI integration*`
      : `### No Action Items Detected\n\nNo clear action items were found in the notes. Consider adding specific next steps.\n\n*AI-enhanced extraction available with OpenAI integration*`;
  }

  try {
    const context: Record<string, string> = {
      clientName,
      meetingNotes,
      clientContext: options?.clientContext || 'Not provided',
      previousActions: options?.previousActions || 'None',
      meetingType: options?.meetingType || 'general',
      meetingDate: options?.meetingDate || new Date().toISOString().split('T')[0],
    };

    const userPrompt = V33_ACTION_ITEMS_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = context[key];
      return val !== undefined ? sanitizeForPrompt(val, 15000) : '';
    });

    return await chatCompletion(V33_ACTION_ITEMS_SYSTEM_PROMPT, userPrompt, false, 8192);
  } catch (error) {
    logger.error({ err: error }, "Action item extraction error");
    return "Action item extraction failed. Please try again.";
  }
}
