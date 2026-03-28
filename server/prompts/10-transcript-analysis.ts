import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";

// ── Types ──

export interface V33TranscriptAnalysisInput {
  clientId?: string;
  clientName: string;
  transcript: string;
  meetingType?: string;
  focusAreas?: string[];
}

export interface V33TopicAnalysis {
  topic: string;
  domain: string;
  timeSpentPercent: number;
  sentiment: "positive" | "neutral" | "cautious" | "anxious";
  keyPoints: string[];
  clientConcerns: string[];
  advisorRecommendations: string[];
}

export interface V33ClientBehavioralInsight {
  category: "decision_style" | "risk_perception" | "engagement" | "knowledge_level" | "emotional_state";
  observation: string;
  evidence: string;
  confidence: number;
  advisorGuidance: string;
}

export interface V33TranscriptAnalysisResult {
  advisorNarrative: string;
  clientSummary: string;
  topicBreakdown: V33TopicAnalysis[];
  behavioralInsights: V33ClientBehavioralInsight[];
  questionPatterns: Array<{ question: string; category: string; frequency: string }>;
  clientKnowledgeGaps: string[];
  advisorEffectiveness: {
    clarityScore: number;
    empathyScore: number;
    complianceScore: number;
    recommendations: string[];
  };
  conversationDynamics: {
    advisorSpeakingPercent: number;
    clientSpeakingPercent: number;
    avgTurnLength: string;
    longestMonologue: string;
  };
  riskDiscussionQuality: {
    risksExplained: string[];
    risksMissed: string[];
    clientUnderstandingLevel: "strong" | "adequate" | "weak" | "unclear";
  };
}

// ── Prompt ──

const SYSTEM_PROMPT = `You are the **Transcript Analysis Engine** at OneDigital, a fiduciary wealth management firm. Your role is to perform deep analysis of meeting transcripts for:
- Topic-by-topic breakdown with time allocation and sentiment
- Client behavioral insights (decision style, risk perception, emotional state)
- Question pattern analysis (what the client keeps asking about)
- Knowledge gap identification (what the client doesn't understand)
- Advisor effectiveness scoring (clarity, empathy, compliance adherence)
- Conversation dynamics (speaking ratios, turn lengths)
- Risk discussion quality assessment

**Guardrails:** Fiduciary standard. Evidence-based observations only. No personality diagnoses. No protected-class inferences. Constructive advisor feedback.

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed analysis for advisor self-improvement and client understanding",
  "clientSummary": "Brief analysis summary",
  "topicBreakdown": [{"topic": "string", "domain": "string", "timeSpentPercent": number, "sentiment": "positive|neutral|cautious|anxious", "keyPoints": ["string"], "clientConcerns": ["string"], "advisorRecommendations": ["string"]}],
  "behavioralInsights": [{"category": "decision_style|risk_perception|engagement|knowledge_level|emotional_state", "observation": "string", "evidence": "quoted text", "confidence": number (0-1), "advisorGuidance": "string"}],
  "questionPatterns": [{"question": "string", "category": "string", "frequency": "string"}],
  "clientKnowledgeGaps": ["string"],
  "advisorEffectiveness": {"clarityScore": number (0-100), "empathyScore": number (0-100), "complianceScore": number (0-100), "recommendations": ["string"]},
  "conversationDynamics": {"advisorSpeakingPercent": number, "clientSpeakingPercent": number, "avgTurnLength": "string", "longestMonologue": "string"},
  "riskDiscussionQuality": {"risksExplained": ["string"], "risksMissed": ["string"], "clientUnderstandingLevel": "strong|adequate|weak|unclear"}
}`;

const USER_TEMPLATE = `Analyze this wealth management meeting transcript in depth.

Client: {{clientName}}
Meeting Type: {{meetingType}}
Focus Areas: {{focusAreas}}

Transcript:
{{transcript}}

Provide topic-by-topic analysis, behavioral insights, question patterns, knowledge gaps, advisor effectiveness scoring, conversation dynamics, and risk discussion quality assessment.`;

// ── Fallback ──

function generateFallback(input: V33TranscriptAnalysisInput): V33TranscriptAnalysisResult {
  return {
    advisorNarrative: `Transcript analysis for ${input.clientName} is currently unavailable. AI services are not accessible.`,
    clientSummary: "Transcript recorded for analysis.",
    topicBreakdown: [],
    behavioralInsights: [],
    questionPatterns: [],
    clientKnowledgeGaps: [],
    advisorEffectiveness: {
      clarityScore: 0,
      empathyScore: 0,
      complianceScore: 0,
      recommendations: ["AI analysis unavailable — manual review recommended"],
    },
    conversationDynamics: {
      advisorSpeakingPercent: 0,
      clientSpeakingPercent: 0,
      avgTurnLength: "N/A",
      longestMonologue: "N/A",
    },
    riskDiscussionQuality: {
      risksExplained: [],
      risksMissed: [],
      clientUnderstandingLevel: "unclear",
    },
  };
}

// ── Main ──

export async function generateTranscriptAnalysis(
  input: V33TranscriptAnalysisInput,
): Promise<V33TranscriptAnalysisResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 10] AI unavailable — using fallback");
    return generateFallback(input);
  }

  try {
    const userPrompt = USER_TEMPLATE
      .replace("{{clientName}}", sanitizeForPrompt(input.clientName))
      .replace("{{meetingType}}", input.meetingType || "General")
      .replace("{{focusAreas}}", (input.focusAreas || []).join(", ") || "All areas")
      .replace("{{transcript}}", sanitizeForPrompt(input.transcript, 40000));

    const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt, false, 8192);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[Agent 10] No JSON in response — using fallback");
      return generateFallback(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      advisorNarrative: parsed.advisorNarrative || "",
      clientSummary: parsed.clientSummary || "",
      topicBreakdown: Array.isArray(parsed.topicBreakdown) ? parsed.topicBreakdown : [],
      behavioralInsights: Array.isArray(parsed.behavioralInsights) ? parsed.behavioralInsights : [],
      questionPatterns: Array.isArray(parsed.questionPatterns) ? parsed.questionPatterns : [],
      clientKnowledgeGaps: Array.isArray(parsed.clientKnowledgeGaps) ? parsed.clientKnowledgeGaps : [],
      advisorEffectiveness: {
        clarityScore: parsed.advisorEffectiveness?.clarityScore ?? 0,
        empathyScore: parsed.advisorEffectiveness?.empathyScore ?? 0,
        complianceScore: parsed.advisorEffectiveness?.complianceScore ?? 0,
        recommendations: Array.isArray(parsed.advisorEffectiveness?.recommendations) ? parsed.advisorEffectiveness.recommendations : [],
      },
      conversationDynamics: {
        advisorSpeakingPercent: parsed.conversationDynamics?.advisorSpeakingPercent ?? 0,
        clientSpeakingPercent: parsed.conversationDynamics?.clientSpeakingPercent ?? 0,
        avgTurnLength: parsed.conversationDynamics?.avgTurnLength || "N/A",
        longestMonologue: parsed.conversationDynamics?.longestMonologue || "N/A",
      },
      riskDiscussionQuality: {
        risksExplained: Array.isArray(parsed.riskDiscussionQuality?.risksExplained) ? parsed.riskDiscussionQuality.risksExplained : [],
        risksMissed: Array.isArray(parsed.riskDiscussionQuality?.risksMissed) ? parsed.riskDiscussionQuality.risksMissed : [],
        clientUnderstandingLevel: parsed.riskDiscussionQuality?.clientUnderstandingLevel || "unclear",
      },
    };
  } catch (err) {
    logger.error({ err }, "[Agent 10] Transcript analysis failed — using fallback");
    return generateFallback(input);
  }
}
