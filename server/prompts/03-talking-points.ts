import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
  type TalkingPointsInput,
  type ChatCompletionMeta,
} from "../ai-core";
import { applyFiduciaryGuardrails } from "../lib/fiduciary-guardrail";
import { logger } from "../lib/logger";
import type { V33TalkingPointsResult } from "./types";
import { parseMeetingType, parseTalkingPoints, parseConversationFlow } from "./parse-utils";

const V33_TALKING_POINTS_SYSTEM_PROMPT = `You are the **Conversation Intelligence Engine** at OneDigital, translating portfolio data, life events, and client behavior into meeting dialogue. Your role is to:
- Convert abstract financial concepts into client-specific, evidence-based talking points
- Match conversation tone and complexity to client personality (risk tolerance, anxiety level, decision style)
- Highlight quantifiable impact (dollars, percentages, timelines) rather than generic principles
- Design conversation flow (opening → core topics → transitions → closing)
- Integrate behavioral coaching (how to frame sensitive topics given recent events)
- Reference actual holdings and performance, not hypothetical examples
- Flag regulatory/market context that requires advisor awareness
- Provide meta-guidance on conversation flow, timing, and emotional positioning

**Guardrails:** Data-driven only (reference actual holdings/performance). No manipulation or pressure language. Fiduciary standard. Sensitive to life events and anxiety indicators.

## MEETING TYPE CONTEXT (Shapes Point Prioritization)

ANNUAL REVIEW: Performance review, allocation drift, goal progress. Tone: Collaborative, forward-looking.
DISCOVERY: Goals clarification, risk profiling, values-alignment. Tone: Curious, educational.
PROBLEM-SOLVING: Specific issue resolution. Tone: Empathetic, solution-oriented.
LIFE EVENT: Transition planning. Tone: Warm, reassuring, empowering.
RETIREMENT TRANSITION: Income planning, withdrawal strategy. Tone: Confident, detail-oriented.
REBALANCING: Risk alignment, performance opportunity. Tone: Educational, action-oriented.

## TALKING POINT STRUCTURE
Each talking point must include:
- CLIENT_SPECIFIC_REFERENCE: Actual holdings, performance, allocation
- QUANTITATIVE_IMPACT: Dollar amounts, percentages, timeline implications
- BEHAVIORAL_FRAME: How to present given client's anxiety level and decision style
- CONVERSATION_FLOW: Where this point sits (opening, core, transition, closing)
- META_COACHING: Tone, pacing, whether to pause for response, potential objections

## RISK-ADJUSTED LANGUAGE MAPPING

Conservative (3-4/10): Use "stability," "reliable," "principal protection." Avoid "aggressive," "volatile."
Moderate (5-6/10): Use "balanced," "diversified," "risk-managed returns." Avoid "might lose money," "speculative."
Aggressive (7-9/10): Use "growth-focused," "maximize returns." Avoid "safety," "conservative."

ANXIETY LEVEL HIGH: Use "We've planned for this," "You're in good shape," "Here's what we're watching." Avoid "Don't worry," "Markets always recover."
ANXIETY LEVEL LOW: Use "Confident," "On track," "Execute." Brief, fact-forward.

## LIFE EVENT SENSITIVITY
- Job Change: Address income/emergency fund BEFORE investment changes
- Inheritance: Address emotional impact before tactical deployment. No time pressure.
- Major Health Event: Brief and direct; don't linger unless client brings it up
- Death in Family: Compassion + Patience. Postpone non-essential discussion.

## CONVERSATION FLOW DESIGN

OPENING (Minutes 1-5): 1 strong positive data point. Warm tone, pause for response.
CORE TOPICS (Minutes 5-30): Tier 1 & 2 priorities in logical order. Positive before negative. Detail-heavy when energy highest.
TRANSITION (Minutes 25-35): Synthesize findings, address objections, clarify decisions.
CLOSING (Minutes 35-40): Restate decisions, confirm action items, preview next meeting.

## OUTPUT FORMAT

# Meeting Talking Points: [Client Name] | [Date] | [Meeting Type]

## I. CONVERSATION FLOW OVERVIEW
Meeting Duration Target, Opening Strategy, Core Topics list, Closing Strategy

## II. OPENING SEQUENCE (Minutes 1-5)
Opening Point with data-driven statement, supporting data, delivery guidance, meta coaching

## III. CORE TOPIC SEQUENCE (Minutes 5-30)
Multiple core topics with points, supporting data, regulatory context, delivery guidance, anticipated objections, meta coaching

## IV. TRANSITION SEQUENCE (Minutes 25-35)
Synthesis point, decision checkpoint, delivery guidance

## V. CLOSING SEQUENCE (Minutes 35-40)
Restate decisions, action items, next meeting

## VI. BEHAVIORAL INTELLIGENCE OVERLAY
Client decision style, detected anxiety level, recent life events, past objections with prepared responses

## VII. REGULATORY & MARKET CONTEXT NOTES
Regulatory points, market context relevant to client

## VIII. TIMING & PACING GUIDANCE
Table with sequence, topic, time allocation, key metrics, notes`;

const V33_TALKING_POINTS_USER_TEMPLATE = `Generate comprehensive v3.3 talking points for an upcoming meeting with {{clientName}}.

Client Information:
{{clientInfo}}

Top Holdings:
{{holdings}}

Performance Data:
{{performance}}

Goals:
{{goals}}

Life Events:
{{lifeEvents}}

Behavioral Context:
{{behavioralContext}}

Meeting Type: {{meetingType}}

Generate v3.3 talking points including:
1. Meeting-type-specific point prioritization (Tier 1/2/3)
2. Data-driven point anchoring with actual holdings and performance references
3. Risk-adjusted language mapping based on client's risk profile
4. Life event sensitivity adjustments
5. Full conversation flow architecture (opening → core → transitions → closing)
6. Meta-coaching guidance for each point (tone, pacing, pause points, objection handling)
7. Behavioral intelligence overlay
8. Regulatory/market context integration
9. Timing and pacing guidance table

Every talking point must reference actual client data (holdings, performance, dollar amounts). No generic or hypothetical examples.`;

export type TalkingPointsV33Input = TalkingPointsInput & {
  performance?: Array<{ period: string; returnPct: string; benchmarkPct: string | null }>;
  goals?: Array<{ goalName: string; targetAmount: number; onTrackStatus: string }>;
  lifeEvents?: Array<{ eventDate: string; description: string }>;
  behavioralContext?: { anxietyLevel: string; decisionSpeed: string; detailPreference: string };
  meetingType?: string;
};

export async function generateTalkingPointsStructured(
  data: TalkingPointsV33Input
): Promise<V33TalkingPointsResult> {
  const meta = await generateTalkingPointsWithMeta(data);
  const flow = parseConversationFlow(meta.output);
  return {
    content: meta.output,
    guardrailFlagged: meta.guardrailFlagged,
    guardrailViolations: meta.guardrailViolations,
    conversationFlow: {
      totalDurationMinutes: flow.totalDurationMinutes,
      openingMinutes: flow.openingMinutes,
      coreMinutes: flow.coreMinutes,
      transitionMinutes: flow.transitionMinutes,
      closingMinutes: flow.closingMinutes,
    },
    talkingPoints: parseTalkingPoints(meta.output),
    meetingType: parseMeetingType(data.meetingType || "annual_review"),
  };
}

export async function generateTalkingPointsWithMeta(
  data: TalkingPointsV33Input
): Promise<ChatCompletionMeta> {
  if (!isAIAvailable()) {
    return {
      output: `### Talking Points for ${data.clientName}

- Portfolio is well-diversified across ${new Set(data.holdings.map(h => h.sector)).size} sectors
- Top holding: ${data.holdings[0]?.ticker || 'N/A'} at ${data.holdings[0]?.weight || 0}% weight
${data.clientInfo.interests ? `- Personal interests to mention: ${data.clientInfo.interests}` : ''}
- Review any changes in risk tolerance or investment objectives
- Discuss market outlook and portfolio positioning

*AI-enhanced talking points available with OpenAI integration*`,
      guardrailFlagged: false,
      guardrailViolations: [],
    };
  }

  try {
    const context: Record<string, string> = {
      clientName: data.clientName,
      clientInfo: JSON.stringify(data.clientInfo, null, 2),
      holdings: JSON.stringify(data.holdings.slice(0, 8), null, 2),
      performance: data.performance ? JSON.stringify(data.performance, null, 2) : 'Not available',
      goals: data.goals ? JSON.stringify(data.goals, null, 2) : 'Not available',
      lifeEvents: data.lifeEvents ? data.lifeEvents.map(e => `- ${e.eventDate}: ${e.description}`).join('\n') : 'None reported',
      behavioralContext: data.behavioralContext ? JSON.stringify(data.behavioralContext, null, 2) : 'Not assessed',
      meetingType: data.meetingType || 'annual_review',
    };

    const userPrompt = V33_TALKING_POINTS_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = context[key];
      return val !== undefined ? sanitizeForPrompt(val, 8000) : '';
    });

    const rawResult = await chatCompletion(V33_TALKING_POINTS_SYSTEM_PROMPT, userPrompt, true, 8192);

    const guardrailResult = applyFiduciaryGuardrails(rawResult);
    return {
      output: guardrailResult.output,
      guardrailFlagged: guardrailResult.flagged || !guardrailResult.passed,
      guardrailViolations: guardrailResult.violations.map(v => ({
        ruleId: v.ruleId,
        description: v.description,
        severity: v.severity,
      })),
    };
  } catch (error) {
    logger.error({ err: error }, "Talking points generation error");
    return { output: `Talking points generation failed. Please try again.`, guardrailFlagged: false, guardrailViolations: [] };
  }
}

export async function generateTalkingPoints(
  data: TalkingPointsV33Input
): Promise<string> {
  const meta = await generateTalkingPointsWithMeta(data);
  return meta.output;
}
