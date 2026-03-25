import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
  type MeetingSummaryInput,
} from "../ai-core";
import { logger } from "../lib/logger";
import type { V33MeetingSummaryResult } from "./types";
import {
  parseDecisions,
  parseComplianceMoments,
  parseSentimentAnalysis,
  parseSummaryActionItems,
} from "./parse-utils";

const V33_MEETING_SUMMARY_SYSTEM_PROMPT = `You are the **Meeting Summary Engine** at OneDigital, translating raw meeting data into compliance-aware, CRM-ready documentation. Your role is to:
- Synthesize multi-modal inputs into a single source of truth for client interactions
- Track decision rationale and evidence chains for regulatory defensibility
- Flag compliance-critical moments (suitability discussions, risk disclosures, conflicts)
- Extract and prioritize action items with ownership, dependencies, and deadline intelligence
- Detect follow-up triggers (what needs to happen before next engagement)
- Generate both technical (advisor) and client-friendly versions simultaneously
- Integrate sentiment analysis to inform behavioral follow-up

**Guardrails:** Evidence-based reconstruction only. Quote directly from transcript when available. Flag uncertain inferences. Maintain client privacy in shared documentation.

## INPUT SOURCE PROCESSING RULES
INPUT TYPE: Transcript → Trust Level: Highest (verbatim record)
INPUT TYPE: Advisor Notes → Trust Level: Medium (subjective interpretation)
INPUT TYPE: Action Items → Trust Level: Medium (may be incomplete)
INPUT TYPE: Annotations → Trust Level: Low (opinion-based)

INTEGRATION RULE: Prioritize transcript > notes > annotations. If conflict, flag for advisor review.

## COMPLIANCE-AWARE SUMMARIZATION TRIGGERS
Detect and flag these compliance moments:
- Suitability Discussion: Risk profile, allocation change, product recommendation
- Risk Disclosure: Risk, volatility, loss potential mentions
- Fee Discussion: Costs, fees, compensation mentions
- Conflict of Interest: Firm-affiliated products, dual roles
- Regulatory Trigger: RMD, inheritance treatment, tax consequence
- Client Agreement: Verbal consent to strategy, action, or recommendation

## DECISION TRACKING
For each decision capture:
- What was decided (specific action/strategy)
- Why (rationale from transcript/notes)
- Who agreed (client, spouse, advisor)
- Evidence chain (quotes, prior decisions, calculations)
- Decision status: AGREED | TENTATIVE | PROPOSED_UNCONFIRMED

## SENTIMENT ANALYSIS
Extract:
- Overall meeting sentiment (positive, neutral, anxious, frustrated)
- Topic-specific sentiments with evidence
- Behavioral flags: decision speed, question frequency, risk comfort, spouse alignment

## OUTPUT FORMAT
Generate TWO outputs:

### ADVISOR-FACING TECHNICAL SUMMARY (Markdown)
Include these sections:
I. MEETING OVERVIEW (participants, topics, key decisions)
II. DECISION REGISTRY (with evidence chain for each decision)
III. COMPLIANCE-CRITICAL MOMENTS (table with moment type, timestamp/reference, quote, status, follow-up required)
IV. SENTIMENT ANALYSIS & BEHAVIORAL INTELLIGENCE
V. ACTION ITEM REGISTRY (by owner: advisor, client, operations/compliance)
VI. FOLLOW-UP TRIGGERS & AUTOMATION RULES
VII. COMPLIANCE CERTIFICATION checklist
VIII. UNRESOLVED ITEMS & FOLLOW-UP NOTES

### CLIENT-FRIENDLY RECAP
After the advisor summary, output a client-friendly version with:
- What We Covered Today (plain language)
- Key Decisions We Made (with simple rationale)
- What You Need to Do (action items table)
- What We're Doing For You (advisor actions table)
- Important Information (risk/fee context in plain language)
- Questions? (next steps and contact info)

## SUGGESTED TASKS
After the summaries, output a JSON block fenced with \`\`\`suggested_tasks and \`\`\` containing an array of suggested tasks. Each task should have:
- "title": concise task title
- "type": one of "follow_up", "account_opening", "document_request", "rebalancing", "insurance", "estate_planning", "tax_planning", "compliance", "general"
- "description": brief description
- "suggestedDueDate": ISO date string
- "priority": "high", "medium", or "low"

## VALIDATION RULES
- Every decision must have a quote from transcript or notes (mark TENTATIVE if unavailable)
- All regulatory/suitability/risk moments must be identified and flagged
- Every action item must have owner, deadline, and description
- CRM-required JSON fields must all be populated`;

const V33_MEETING_SUMMARY_USER_TEMPLATE = `Summarize the following completed meeting with {{clientName}} using the v3.3 specification.

Meeting Title: {{meetingTitle}}
Meeting Type: {{meetingType}}
Meeting Date: {{meetingDate}}

## INPUT SOURCES (process in priority order: Transcript > Notes > Action Items > Annotations)

### Transcript (Trust Level: HIGHEST — verbatim record)
{{transcript}}

### Advisor Notes (Trust Level: MEDIUM — subjective interpretation)
{{meetingNotes}}

### Pre-Existing Action Items (Trust Level: MEDIUM — may be incomplete)
{{actionItemsList}}

### Annotations (Trust Level: LOW — opinion-based)
{{annotations}}

Client Information:
{{clientInfo}}

Current Holdings (top positions):
{{holdings}}

Performance Data:
{{performance}}

Outstanding Tasks:
{{tasks}}

Life Events:
{{lifeEvents}}

Generate a comprehensive v3.3 meeting summary including:
1. Multi-source input processing with source hierarchy (transcript > notes > action items > annotations)
2. Decision extraction with evidence chains and decision status (AGREED/TENTATIVE/PROPOSED_UNCONFIRMED)
3. Compliance-critical moment flagging (suitability, risk disclosure, fee, conflict of interest)
4. Sentiment tracking with topic-specific analysis
5. Action item extraction with ownership, deadlines, and dependencies
6. Follow-up trigger detection
7. Dual output: advisor-technical summary AND client-friendly recap
8. Suggested tasks JSON block

Ensure all compliance moments are explicitly flagged with required documentation and follow-up actions.`;

function generateFallbackMeetingSummary(data: MeetingSummaryInput): string {
  const { clientName, meetingTitle, meetingType, meetingDate, meetingNotes, tasks } = data;
  return `## Meeting Summary: ${clientName}

### Meeting Overview
- **Title:** ${meetingTitle}
- **Type:** ${meetingType}
- **Date:** ${meetingDate}

### Notes
${meetingNotes || 'No notes recorded for this meeting.'}

### Outstanding Tasks
${tasks.length > 0 ? tasks.map(t => `- ${t.title} - Priority: ${t.priority}, Due: ${t.dueDate || 'No date'}`).join('\n') : 'No outstanding tasks.'}

---
*Summary generated ${new Date().toLocaleDateString()} | AI-enhanced summaries available with OpenAI integration*

\`\`\`suggested_tasks
${JSON.stringify([
  { title: `Follow up with ${clientName} on action items`, type: "follow_up", description: `Review and follow up on items discussed during ${meetingTitle}.`, suggestedDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], priority: "medium" },
  ...(meetingNotes?.toLowerCase().includes('document') ? [{ title: `Request updated documents from ${clientName}`, type: "document_request", description: "Collect any outstanding documents mentioned in the meeting.", suggestedDueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], priority: "medium" }] : []),
])}
\`\`\``;
}

export interface MeetingSummaryV33Input extends MeetingSummaryInput {
  transcript?: string;
  annotations?: string;
  actionItemsList?: string;
}

export async function generateMeetingSummaryStructured(
  data: MeetingSummaryV33Input,
  customConfig?: { systemPrompt: string; userPromptTemplate: string } | null
): Promise<V33MeetingSummaryResult> {
  const content = await generateMeetingSummary(data, customConfig);

  const clientSummaryMatch = content.match(/(?:client.?friendly|meeting recap|what we discussed)[^]*$/i);
  const advisorEnd = content.search(/(?:client.?friendly|meeting recap|what we discussed)/i);

  return {
    advisorSummary: advisorEnd > 0 ? content.substring(0, advisorEnd).trim() : content,
    clientSummary: clientSummaryMatch?.[0]?.trim() || "",
    decisions: parseDecisions(content),
    complianceMoments: parseComplianceMoments(content),
    sentimentAnalysis: parseSentimentAnalysis(content),
    actionItems: parseSummaryActionItems(content),
    complianceCertification: {
      suitabilityDocumented: content.includes("suitability") && (content.includes("✓") || content.toLowerCase().includes("documented")),
      riskDisclosuresDocumented: content.includes("risk") && (content.includes("✓") || content.toLowerCase().includes("documented")),
      feeDiscussionsDocumented: content.includes("fee") && (content.includes("✓") || content.toLowerCase().includes("documented")),
      regulatoryTriggersAddressed: content.includes("regulatory") && (content.includes("✓") || content.toLowerCase().includes("addressed")),
    },
  };
}

export async function generateMeetingSummary(
  data: MeetingSummaryV33Input,
  customConfig?: { systemPrompt: string; userPromptTemplate: string } | null
): Promise<string> {
  if (!isAIAvailable()) {
    return generateFallbackMeetingSummary(data);
  }

  try {
    const systemPrompt = customConfig?.systemPrompt || V33_MEETING_SUMMARY_SYSTEM_PROMPT;
    const userTemplate = customConfig?.userPromptTemplate || V33_MEETING_SUMMARY_USER_TEMPLATE;
    const context: Record<string, string> = {
      clientName: data.clientName,
      clientInfo: JSON.stringify(data.clientInfo, null, 2),
      meetingTitle: data.meetingTitle,
      meetingType: data.meetingType,
      meetingDate: data.meetingDate,
      transcript: data.transcript || 'No transcript available',
      meetingNotes: data.meetingNotes || (data.transcript ? 'See transcript above' : 'No notes recorded'),
      actionItemsList: data.actionItemsList || 'No pre-existing action items',
      annotations: data.annotations || 'No annotations',
      holdings: JSON.stringify(data.holdings.slice(0, 10), null, 2),
      performance: JSON.stringify(data.performance, null, 2),
      tasks: data.tasks.map(t => `- ${t.title} (${t.priority}, due: ${t.dueDate})`).join('\n'),
      lifeEvents: data.lifeEvents.map(e => `- ${e.eventDate}: ${e.description}`).join('\n'),
    };

    const userPrompt = userTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = context[key];
      return val !== undefined ? sanitizeForPrompt(val, 10000) : '';
    });

    return await chatCompletion(systemPrompt, userPrompt, false, 8192);
  } catch (error) {
    logger.error({ err: error }, "Meeting summary generation error");
    return generateFallbackMeetingSummary(data);
  }
}
