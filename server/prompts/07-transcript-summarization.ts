import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";

// ── Types ──

export interface V33TranscriptSummarizationInput {
  clientId?: string;
  clientName: string;
  meetingDate?: string;
  transcript: string;
  meetingType?: string;
  advisorName?: string;
  previousMeetingSummary?: string;
}

export interface V33SpeakerSegment {
  speaker: "advisor" | "client" | "third_party";
  speakerName: string;
  startTime?: string;
  content: string;
  domain: string;
  sentiment: "positive" | "neutral" | "cautious" | "anxious" | "frustrated";
}

export interface V33TranscriptDecision {
  decisionId: string;
  description: string;
  status: "made" | "deferred" | "tabled";
  owner: string;
  evidence: string;
}

export interface V33ComplianceExtract {
  suitabilityDiscussed: boolean;
  riskDisclosuresDocumented: boolean;
  feeDiscussionsDocumented: boolean;
  fiduciaryStatementsPresent: boolean;
  gapsIdentified: string[];
}

export interface V33TranscriptSummarizationResult {
  advisorNarrative: string;
  clientSummary: string;
  speakerSegments: V33SpeakerSegment[];
  decisions: V33TranscriptDecision[];
  complianceExtract: V33ComplianceExtract;
  emotionalArc: string;
  domainsCovered: string[];
  domainsMissing: string[];
  contradictions: string[];
  quantitativeData: Array<{ label: string; value: string; context: string }>;
  keyTopics: string[];
  nextSteps: Array<{ action: string; owner: string; deadline: string | null }>;
}

// ── Prompt ──

const SYSTEM_PROMPT = `You are the **Transcript Summarization Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Analyze wealth management meeting transcripts with speaker diarization
- Extract compliance-relevant statements (suitability, risk disclosure, fiduciary)
- Track emotional arc and sentiment evolution throughout the conversation
- Identify decisions made, deferred, or tabled with evidence quotes
- Map discussion segments to the 9 financial planning domains
- Detect contradictions and missing topics
- Extract all quantitative data (balances, ages, dates, amounts)
- Generate dual summaries: advisor-facing (detailed) and client-friendly (plain language)

**Guardrails:** Fiduciary standard. Quote evidence for decisions. Flag compliance gaps. Never fabricate statements not in the transcript.

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed advisor-facing summary with analysis",
  "clientSummary": "Client-friendly summary in plain language",
  "speakerSegments": [{"speaker": "advisor|client|third_party", "speakerName": "string", "content": "string", "domain": "string", "sentiment": "positive|neutral|cautious|anxious|frustrated"}],
  "decisions": [{"decisionId": "string", "description": "string", "status": "made|deferred|tabled", "owner": "string", "evidence": "quoted text"}],
  "complianceExtract": {"suitabilityDiscussed": boolean, "riskDisclosuresDocumented": boolean, "feeDiscussionsDocumented": boolean, "fiduciaryStatementsPresent": boolean, "gapsIdentified": ["string"]},
  "emotionalArc": "Description of how client sentiment evolved",
  "domainsCovered": ["domain names"],
  "domainsMissing": ["domain names that should have been discussed"],
  "contradictions": ["description of contradictions found"],
  "quantitativeData": [{"label": "string", "value": "string", "context": "string"}],
  "keyTopics": ["main topics discussed"],
  "nextSteps": [{"action": "string", "owner": "string", "deadline": "string or null"}]
}`;

const USER_TEMPLATE = `Summarize this wealth management meeting transcript.

Client: {{clientName}}
Meeting Date: {{meetingDate}}
Meeting Type: {{meetingType}}
Advisor: {{advisorName}}

{{previousContext}}

Transcript:
{{transcript}}

Analyze speaker roles, extract compliance moments, track emotional arc, identify decisions, and generate structured summaries. Flag any contradictions or missing topics.`;

// ── Fallback ──

function generateFallback(input: V33TranscriptSummarizationInput): V33TranscriptSummarizationResult {
  const wordCount = input.transcript.split(/\s+/).length;
  return {
    advisorNarrative: `Transcript received for ${input.clientName} (${wordCount} words). AI summarization is currently unavailable — manual review required.`,
    clientSummary: "Meeting transcript has been recorded and will be reviewed.",
    speakerSegments: [],
    decisions: [],
    complianceExtract: {
      suitabilityDiscussed: false,
      riskDisclosuresDocumented: false,
      feeDiscussionsDocumented: false,
      fiduciaryStatementsPresent: false,
      gapsIdentified: ["AI analysis unavailable — manual compliance review required"],
    },
    emotionalArc: "Unable to assess — AI unavailable",
    domainsCovered: [],
    domainsMissing: [],
    contradictions: [],
    quantitativeData: [],
    keyTopics: [],
    nextSteps: [],
  };
}

// ── Main ──

export async function generateTranscriptSummarization(
  input: V33TranscriptSummarizationInput,
): Promise<V33TranscriptSummarizationResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 07] AI unavailable — using fallback");
    return generateFallback(input);
  }

  try {
    const previousContext = input.previousMeetingSummary
      ? `Previous meeting summary (for context/contradiction detection):\n${sanitizeForPrompt(input.previousMeetingSummary, 3000)}`
      : "No previous meeting summary available.";

    const userPrompt = USER_TEMPLATE
      .replace("{{clientName}}", sanitizeForPrompt(input.clientName))
      .replace("{{meetingDate}}", input.meetingDate || "Not specified")
      .replace("{{meetingType}}", input.meetingType || "General")
      .replace("{{advisorName}}", sanitizeForPrompt(input.advisorName || "Advisor"))
      .replace("{{previousContext}}", previousContext)
      .replace("{{transcript}}", sanitizeForPrompt(input.transcript, 40000));

    const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt, false, 8192);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[Agent 07] No JSON in response — using fallback");
      return generateFallback(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      advisorNarrative: parsed.advisorNarrative || "",
      clientSummary: parsed.clientSummary || "",
      speakerSegments: Array.isArray(parsed.speakerSegments) ? parsed.speakerSegments : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      complianceExtract: {
        suitabilityDiscussed: !!parsed.complianceExtract?.suitabilityDiscussed,
        riskDisclosuresDocumented: !!parsed.complianceExtract?.riskDisclosuresDocumented,
        feeDiscussionsDocumented: !!parsed.complianceExtract?.feeDiscussionsDocumented,
        fiduciaryStatementsPresent: !!parsed.complianceExtract?.fiduciaryStatementsPresent,
        gapsIdentified: Array.isArray(parsed.complianceExtract?.gapsIdentified) ? parsed.complianceExtract.gapsIdentified : [],
      },
      emotionalArc: parsed.emotionalArc || "",
      domainsCovered: Array.isArray(parsed.domainsCovered) ? parsed.domainsCovered : [],
      domainsMissing: Array.isArray(parsed.domainsMissing) ? parsed.domainsMissing : [],
      contradictions: Array.isArray(parsed.contradictions) ? parsed.contradictions : [],
      quantitativeData: Array.isArray(parsed.quantitativeData) ? parsed.quantitativeData : [],
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    };
  } catch (err) {
    logger.error({ err }, "[Agent 07] Transcript summarization failed — using fallback");
    return generateFallback(input);
  }
}
