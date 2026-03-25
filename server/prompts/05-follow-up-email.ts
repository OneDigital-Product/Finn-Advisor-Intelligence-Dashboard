import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type { V33FollowUpEmailResult, EmailFormat } from "./types";
import {
  parseEmailActionItems,
  parseSubjectLine,
  parseEmailFormat,
  parseComplianceReview,
  parseMeetingType,
} from "./parse-utils";

const V33_FOLLOW_UP_EMAIL_SYSTEM_PROMPT = `You are the **Client Communication Engine** at OneDigital, translating meeting outcomes into warm, clear, actionable client correspondence. Your role is to:
- Convert meeting decisions into plain-language recaps without technical jargon
- Confirm action items with clear ownership and timelines
- Match emotional tone to client behavioral profile (anxiety level, communication style)
- Embed compliance-safe language (no forward-looking statements, proper disclaimers)
- Provide context for technical decisions in client-friendly framing
- Generate multiple format variants (formal, casual, urgent, emotional support)
- Flag compliance-sensitive content for review before sending

**Guardrails:** No forward-looking statements. Proper disclaimers on performance/returns. Jargon translation for all technical terms. Fiduciary tone (education, not prescription). Privacy-conscious. No protected-class references.

## EMAIL FORMAT VARIANTS

FORMAT: Formal (400-600 words)
- Professional, comprehensive, documentation-oriented
- Use Case: Annual reviews, complex decisions, compliance-sensitive discussions
- Structure: Formal greeting, detailed recap, action items table, scheduling, closing

FORMAT: Casual/Warm (250-400 words)
- Friendly, conversational, relationship-focused
- Use Case: Discovery meetings, routine check-ins
- Structure: Warm greeting, brief recap, key points as bullets, action items, casual closing

FORMAT: Urgent/Action-Required (150-300 words)
- Clear action priority, brief, deadline bolded
- Use Case: Regulatory deadline imminent, time-sensitive decision

FORMAT: Emotional Support/Life Event (300-450 words)
- Warm, empathetic, supportive, non-transactional
- Use Case: Recent life event (death, job loss, inheritance), elevated anxiety

## COMPLIANCE-SAFE LANGUAGE MAPPING

Replace forward-looking statements:
- "Markets are expected to rally..." → "Based on current conditions..."
- "Your portfolio will likely return 7%..." → "Historical returns for this allocation are..."
- "We project you'll retire comfortably..." → "Our analysis shows your savings trajectory..."

Replace guarantees:
- "This strategy will eliminate tax liability..." → "This strategy is designed to reduce tax impact..."
- "You'll be protected from losses..." → "This diversified approach is designed to manage downside risk..."

Always reference client's profile/goals before recommendations:
- "Based on your goals and risk tolerance, an 80/20 allocation..."

## BEHAVIORAL TONE MATCHING

ANXIOUS CLIENT:
- Lead with reassurance: "You're in good shape relative to your goals..."
- Emphasize protections: "Your allocation is designed to..."
- Offer frequent touchpoints: "Let's plan to check in..."
- AVOID: Jargon, uncertain language, deferring decisions

CONFIDENT/LOW-ANXIETY CLIENT:
- Lead with action: "Here's what we're doing and why..."
- Brief, data-forward summaries
- AVOID: Over-explaining, excessive reassurance

DETAIL-ORIENTED CLIENT:
- Detailed explanations with supporting data
- Acknowledge alternatives considered
- AVOID: Oversimplifying

SUMMARY-FOCUSED CLIENT:
- Clear headlines, bullet points, short paragraphs
- AVOID: Dense paragraphs, nuance requiring careful reading

## LIFE EVENT EMAIL SENSITIVITY

Inheritance: Congratulatory + Patient. No time pressure. Focus on thoughtful integration.
Job Loss: Supportive + Practical. Highlight flexibility. Build confidence.
Death in Family: Compassionate + Minimal. No urgency. Normalize emotions.
Retirement: Celebratory + Empowering. Confidence about plan.

## JARGON TRANSLATION
Automatically translate: rebalance, asset allocation, drift, tax-loss harvesting, fixed income, equity, volatility, RMD, Roth conversion, suitability, fiduciary, basis points, diversification, annualized return

## COMPLIANCE REVIEW GATES
1. Forward-Looking Statements: Replace with historical context + disclaimer
2. Guarantees/Promises: Replace with "designed to" / "intended to"
3. Unsupported Claims: Back with data or remove
4. Suitability Basis: Link recommendations to client profile/goals
5. Required Disclaimers: Performance, tax, professional advisor, conflict of interest
6. Tax Advice: Frame as educational; recommend tax professional
7. Specific Security Recommendations: Generalize to asset class/allocation

## REQUIRED DISCLAIMERS (include appropriate ones)
- Performance: "Past performance does not guarantee future results. All investments carry risk, including potential loss of principal."
- Tax: "This discussion is for educational purposes and is not tax advice. Please consult your tax professional on specific tax implications."
- Educational: "This communication is educational and should not be construed as specific financial advice."

## OUTPUT FORMAT

Generate the email with:
1. Subject line (clear, actionable, personalized)
2. Greeting matched to format
3. Meeting recap section (plain language)
4. What We Discussed section (decisions with simple rationale)
5. Client Action Items table (What, Deadline, How, Questions?)
6. Advisor Action Items table (What, Timeline, Follow-up method)
7. Important Information section (risk/tax context if applicable)
8. Next Steps with specific dates
9. Closing with partnership reinforcement
10. Required disclaimers in footer`;

const V33_FOLLOW_UP_EMAIL_USER_TEMPLATE = `Generate a v3.3 follow-up email after a meeting with {{clientName}}.

Advisor: {{advisorName}}
Client Email: {{clientEmail}}
Meeting Date: {{meetingDate}}
Meeting Type: {{meetingType}}

Meeting Notes/Summary:
{{meetingNotes}}

Client Behavioral Profile:
{{behavioralProfile}}

Life Events Context:
{{lifeEventContext}}

Action Items:
{{actionItems}}

Email Format: {{emailFormat}}

Generate a comprehensive v3.3 follow-up email including:
1. Format variant selection (formal/casual/urgent/emotional support) based on meeting type and client profile
2. Compliance-safe language (no forward-looking statements, proper disclaimers)
3. Behavioral tone matching (anxious/confident/detail-oriented/summary-focused)
4. Life event sensitivity adjustments if applicable
5. Jargon translation for all technical terms
6. Structured action item tables (client actions + advisor actions)
7. Required compliance disclaimers
8. Next meeting scheduling

Ensure the email passes all 7 compliance review gates.`;

export interface FollowUpEmailV33Input {
  clientName: string;
  clientEmail: string;
  meetingNotes: string;
  advisorName: string;
  meetingDate?: string;
  meetingType?: string;
  behavioralProfile?: {
    anxietyLevel?: string;
    communicationPreference?: string;
    detailPreference?: string;
    decisionSpeed?: string;
  };
  lifeEventContext?: string;
  actionItems?: string;
  emailFormat?: EmailFormat;
}

export async function generateFollowUpEmailStructured(
  data: FollowUpEmailV33Input
): Promise<V33FollowUpEmailResult> {
  const content = await generateFollowUpEmail(data);
  return {
    content,
    subjectLine: parseSubjectLine(content),
    emailFormat: data.emailFormat && data.emailFormat !== "auto" ? data.emailFormat : parseEmailFormat(content),
    actionItems: parseEmailActionItems(content),
    complianceReview: parseComplianceReview(content),
    nextMeeting: content.match(/next meeting|schedule|check in/i) ? {
      suggestedType: parseMeetingType(data.meetingType || "general"),
      suggestedTimeline: content.match(/(?:next|follow.?up).*?(\d+\s*(?:week|month|day)s?)/i)?.[1] || "4-6 weeks",
      suggestedFocusAreas: extractFocusAreas(content),
    } : null,
  };
}

function extractFocusAreas(content: string): string[] {
  const areas: string[] = [];
  const focusSection = content.match(/focus[^]*?(?=##|$)/i)?.[0] || "";
  const lines = focusSection.split("\n").filter(l => l.match(/^\s*[-*]\s/));
  for (const line of lines.slice(0, 3)) {
    areas.push(line.replace(/^\s*[-*]\s*/, "").trim());
  }
  if (areas.length === 0) {
    if (content.match(/portfolio|allocation/i)) areas.push("Portfolio review");
    if (content.match(/goal|progress/i)) areas.push("Goal progress");
    if (content.match(/action item|task/i)) areas.push("Action item follow-up");
  }
  return areas;
}

export async function generateFollowUpEmail(data: FollowUpEmailV33Input): Promise<string> {
  if (!isAIAvailable()) {
    return `Subject: Follow-Up from Our Meeting - ${data.meetingDate || new Date().toLocaleDateString()}

Dear ${data.clientName},

Thank you for taking the time to meet with me today. I wanted to follow up on our discussion and summarize the key points we covered.

${data.meetingNotes ? `During our meeting, we discussed the following:\n\n${data.meetingNotes.substring(0, 500)}\n` : ''}
I will be working on the action items we discussed and will keep you updated on our progress. Please don't hesitate to reach out if you have any questions or if anything comes up before our next meeting.

Best regards,
${data.advisorName}
Senior Wealth Advisor, CFP
OneDigital

*AI-enhanced email drafting available with OpenAI integration*`;
  }

  try {
    const context: Record<string, string> = {
      clientName: data.clientName,
      clientEmail: data.clientEmail || '',
      advisorName: data.advisorName,
      meetingDate: data.meetingDate || new Date().toISOString().split('T')[0],
      meetingType: data.meetingType || 'general',
      meetingNotes: data.meetingNotes,
      behavioralProfile: data.behavioralProfile ? JSON.stringify(data.behavioralProfile, null, 2) : 'Not assessed',
      lifeEventContext: data.lifeEventContext || 'None reported',
      actionItems: data.actionItems || 'To be determined from meeting notes',
      emailFormat: data.emailFormat || 'auto',
    };

    const userPrompt = V33_FOLLOW_UP_EMAIL_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = context[key];
      return val !== undefined ? sanitizeForPrompt(val, 15000) : '';
    });

    return await chatCompletion(V33_FOLLOW_UP_EMAIL_SYSTEM_PROMPT, userPrompt, false, 4096);
  } catch (error) {
    logger.error({ err: error }, "Follow-up email generation error");
    return "Email generation failed. Please try again.";
  }
}
