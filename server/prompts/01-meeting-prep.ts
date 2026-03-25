import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
  buildMeetingPrepContext,
  type MeetingPrepInput,
  type BehavioralContext,
  type ComplianceItemData,
} from "../ai-core";
import { logger } from "../lib/logger";
import type { V33MeetingPrepInput, V33MeetingPrepResult } from "./types";
import {
  parseMeetingType,
  parseDataFreshness,
  parseDriftAlerts,
  parseGoalProgress,
  parseComplianceFlags,
  countTalkingPoints,
} from "./parse-utils";

const V33_MEETING_PREP_SYSTEM_PROMPT = `You are the **Meeting Prep Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Transform raw client data into structured, evidence-based preparation documents
- Enable advisors to enter meetings with specific talking points backed by calculations
- Flag compliance, suitability, and risk considerations before conversations occur
- Surface behavioral patterns and communication preferences
- Identify meeting-critical quantitative changes (drift, performance gaps, cash flow shifts)

**Guardrails:** Educational, not prescriptive. No protected-class inference. Fiduciary standard ("best interest"). Privacy-conscious data handling.

## MEETING TYPE CLASSIFICATION
Classify meeting by type to trigger relevant preparation paths:

| Meeting Type | Prep Focus | Data Priority |
|---|---|---|
| Annual Review | Portfolio drift, goal progress, tax harvesting | Holdings, goals, cash flow |
| Discovery | Goals clarification, risk profiling, life assessment | Life situation, goals, constraints |
| Problem-Solving | Specific issue resolution (underperformance, concentration, tax) | Issue-specific holdings, history |
| Life Event | Inheritance, retirement, major purchase, death in family | Event impact scenarios, goals |
| Retirement Transition | RMD strategy, income planning, estate coordination | Assets, income, age, timeline |
| Rebalancing | Asset allocation drift, risk mismatch, opportunity windows | Current allocation, drift %, targets |

## INSTRUCTIONS

### Step 1: Validate & Assess Data Freshness
FOR each data category (holdings, goals, life events, communications):
  IF last_updated < 90 days AGO: mark as FRESH ✓
  ELSE IF last_updated 90-180 days AGO: mark as STALE ⚠️ + flag for advisor review
  ELSE: mark as CRITICAL_STALE 🚨 + recommend data refresh before meeting
Document confidence level (1-5) in data completeness.

### Step 2: Trigger Pre-Meeting Calculations

**Portfolio Drift Analysis:**
- Calculate current_allocation vs target_allocation for each asset class
- Compute drift_pct = abs(current - target)
- Status: "in_tolerance" if drift < 5%, "drift_warning" if 5-8%, "rebalance_urgent" if > 8%
- Generate impact_statement for significant drift

**Goal Progress Scoring:**
- For each goal: compute progress_pct and projected on-track percentage
- Status: "ahead" if projected > 110%, "on_track" if 90-110%, "at_risk" if < 90%
- Generate gap_statement with dollar shortfall/surplus

**Cash Flow Changes:**
- Analyze recent deposits/withdrawals vs rolling averages
- Classify trend: "increased_savings", "consistent", "declining_contributions", "new_withdrawals"

**Risk Tolerance vs. Allocation Mismatch:**
- Compare documented risk tolerance against portfolio volatility
- Flag MISALIGNED_CONSERVATIVE (too aggressive) or MISALIGNED_AGGRESSIVE (too conservative)

### Step 3: Extract Behavioral Intelligence
- Analyze historical meeting sentiments and communication patterns
- Identify anxiety indicators (mentions of risk/loss, after-hours communications, reactive patterns)
- Build preference profile (communication preference, detail level, decision speed, spouse involvement)

### Step 4: Identify Compliance Checkpoints
Flag required disclosures:
1. Suitability review status (if last review > 24 months, schedule new one)
2. Conflicts of interest (if holding firm-affiliated products)
3. Performance vs. benchmark (if not reviewed in last annual meeting)
4. Fee structure verification (if any account changes since last review)

Flag if:
- KYC may need updating (major life change, net worth shift > 25%)
- Suitability mismatch detected
- Beneficiary information outdated (> 3 years since last verification)

## OUTPUT FORMAT
Generate a markdown document with these sections in order:

# Meeting Preparation Brief
## Client: [Name] | Date: [Date] | Type: [Type]

### I. SNAPSHOT: KEY CHANGES & RED FLAGS
[3-5 most material quantitative changes, ordered by impact]

### II. PORTFOLIO SNAPSHOT WITH DRIFT ANALYSIS
[Current allocation vs. target, drift metrics, rebalancing trigger status]

### III. GOAL PROGRESS DASHBOARD
[Table of all goals with progress %, on-track status, gap statements]

### IV. CASH FLOW ASSESSMENT
[Recent contribution/withdrawal trends, income changes, liquidity needs]

### V. BEHAVIORAL INTELLIGENCE
- Communication Preferences
- Decision Style
- Anxiety Indicators (if detected)
- Past Concerns (recurring topics)

### VI. MARKET & REGULATORY CONTEXT
[Relevant context for this client segment]

### VII. COMPLIANCE CHECKPOINTS
- Suitability Review Status
- KYC Update Needed?
- Beneficiary Verification
- Disclosures Needed

### VIII. SUGGESTED TALKING POINTS (in priority order)
[Specific, data-driven talking points with evidence]

### IX. DOCUMENT REQUESTS & ACTION ITEMS FOR NEXT STEPS
[Docs/info client should bring, linked to goals or compliance needs]

## VALIDATION RULES
- All calculations must produce quantitative outputs (no "seems" or "appears")
- Data freshness flags must be honored; stale data marked in output
- Behavioral intelligence inferred only from documented communication patterns
- Compliance checkpoints match current regulatory requirements
- No protected-class inference (age mentioned only for regulatory triggers like RMD)`;

const V33_MEETING_PREP_USER_TEMPLATE = `Generate a comprehensive v3.3 meeting preparation brief for an upcoming meeting with {{clientName}}.

Meeting Type: {{meetingType}}

Client Information:
{{clientInfo}}

Current Holdings (top positions):
{{holdings}}

Performance Data:
{{performance}}

Recent Meeting Notes:
{{recentMeetings}}

Outstanding Tasks:
{{tasks}}

Life Events:
{{lifeEvents}}

Compliance Items:
{{complianceItems}}

{{behavioralNotes}}

{{researchHighlights}}

Follow the v3.3 specification to generate:
1. Data freshness assessment for all input categories
2. Portfolio drift analysis with specific drift percentages and status
3. Goal progress scoring with on-track/at-risk classification
4. Cash flow change detection and trend analysis
5. Risk tolerance vs. allocation mismatch check
6. Behavioral intelligence extraction from communication patterns
7. Compliance checkpoint identification with specific flags
8. Meeting-type-aware preparation sections
9. Prioritized talking points backed by quantitative evidence

Ensure all outputs include specific numbers, percentages, and dollar amounts—never use vague language like "seems" or "appears."`;

function generateFallbackMeetingPrep(data: MeetingPrepInput): string {
  const { clientName, clientInfo, holdings, performance, tasks, lifeEvents, complianceItems } = data;
  const ytdPerf = performance.find(p => p.period === 'YTD');
  const topHoldings = holdings.slice(0, 5);

  return `## Meeting Prep Brief: ${clientName}

### Agenda Suggestions
- Review portfolio performance and allocation
- Discuss outstanding action items (${tasks.length} pending)
${lifeEvents.length > 0 ? `- Address recent life events\n` : ''}${complianceItems.filter((c: ComplianceItemData) => c.status !== 'current').length > 0 ? `- Review compliance items requiring attention\n` : ''}
### Performance Summary
${ytdPerf ? `The portfolio has returned ${ytdPerf.returnPct}% year-to-date, compared to the benchmark return of ${ytdPerf.benchmarkPct ?? 'N/A'}%. ${parseFloat(ytdPerf.returnPct) > parseFloat(ytdPerf.benchmarkPct ?? '0') ? 'The portfolio is outperforming the benchmark.' : 'The portfolio is trailing the benchmark slightly.'}` : 'Performance data not available for this period.'}

### Top Holdings
${topHoldings.map(h => `- **${h.ticker}** (${h.name}): $${Number(h.marketValue).toLocaleString()} (${h.weight}% of portfolio) | Unrealized G/L: $${Number(h.unrealizedGainLoss).toLocaleString()}`).join('\n')}

### Outstanding Tasks
${tasks.length > 0 ? tasks.map(t => `- ${t.title} - Priority: ${t.priority}, Due: ${t.dueDate || 'No date'}`).join('\n') : 'No outstanding tasks.'}

### Life Events
${lifeEvents.length > 0 ? lifeEvents.map(e => `- ${e.eventDate}: ${e.description}`).join('\n') : 'No recent life events noted.'}

### Compliance Checklist
${complianceItems.length > 0 ? complianceItems.map(c => `- ${c.type}: **${c.status.toUpperCase()}** (Due: ${c.dueDate || 'N/A'})`).join('\n') : 'All compliance items current.'}

---
*Brief generated ${new Date().toLocaleDateString()} | AI-enhanced briefs available with OpenAI integration*`;
}

export type MeetingPrepV33Input = MeetingPrepInput & V33MeetingPrepInput;

export async function generateMeetingPrepStructured(
  data: MeetingPrepV33Input,
  customConfig?: { systemPrompt: string; userPromptTemplate: string } | null
): Promise<V33MeetingPrepResult> {
  const content = await generateMeetingPrep(data, customConfig);
  const meetingType = parseMeetingType(data.meetingType || "annual_review");
  return {
    content,
    meetingType,
    dataFreshness: parseDataFreshness(content),
    driftAlerts: parseDriftAlerts(content),
    goalProgress: parseGoalProgress(content),
    complianceFlags: parseComplianceFlags(content),
    talkingPointCount: countTalkingPoints(content),
  };
}

export async function generateMeetingPrep(
  data: MeetingPrepInput & V33MeetingPrepInput,
  customConfig?: { systemPrompt: string; userPromptTemplate: string } | null
): Promise<string> {
  if (!isAIAvailable()) {
    return generateFallbackMeetingPrep(data);
  }

  try {
    const systemPrompt = customConfig?.systemPrompt || V33_MEETING_PREP_SYSTEM_PROMPT;
    const userTemplate = customConfig?.userPromptTemplate || V33_MEETING_PREP_USER_TEMPLATE;
    const context = buildMeetingPrepContext(data);

    context.meetingType = data.meetingType || 'annual_review';

    if (data.behavioralContext && (data.behavioralContext.anxietyLevel === "high" || data.behavioralContext.anxietyLevel === "critical" || data.behavioralContext.behavioralRiskScore > 50)) {
      context.behavioralNotes = `Behavioral Alert: Client anxiety level is ${data.behavioralContext.anxietyLevel}. Dominant bias: ${data.behavioralContext.dominantBias || 'None detected'}. Recent sentiment: ${data.behavioralContext.recentSentiment}. Behavioral risk score: ${data.behavioralContext.behavioralRiskScore}/100. Include a behavioral coaching section in the prep brief with de-escalation strategies.`;
    } else {
      context.behavioralNotes = '';
    }

    if (data.researchHighlights) {
      context.researchHighlights = data.researchHighlights;
    } else {
      context.researchHighlights = '';
    }

    const userPrompt = userTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = context[key];
      return val !== undefined ? sanitizeForPrompt(val, 10000) : '';
    });

    return await chatCompletion(systemPrompt, userPrompt, false, 8192);
  } catch (error) {
    logger.error({ err: error }, "Meeting prep generation error");
    return generateFallbackMeetingPrep(data);
  }
}
