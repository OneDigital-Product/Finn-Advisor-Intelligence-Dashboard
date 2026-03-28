import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";

// ── Types ──

export interface V33NaturalLanguageQueryInput {
  advisorId: string;
  query: string;
  clientContext?: {
    clientId?: string;
    clientName?: string;
    totalAum?: number;
    segment?: string;
  };
  availableDataSources?: string[];
}

export interface V33QueryResult {
  advisorNarrative: string;
  clientSummary: string;
  queryIntent: "lookup" | "comparison" | "calculation" | "recommendation" | "status" | "unknown";
  answerText: string;
  confidence: number;
  dataSources: string[];
  supportingData: Array<{
    label: string;
    value: string;
    source: string;
  }>;
  followUpQuestions: string[];
  caveats: string[];
}

// ── Prompt ──

const V33_NLQ_SYSTEM_PROMPT = `You are the **Natural Language Query Engine** (Finn) at OneDigital, a fiduciary wealth management firm. Your role is to:
- Interpret advisor questions about clients, portfolios, accounts, and practice data
- Translate natural language into structured data lookups
- Return clear, quantified answers with supporting evidence
- Suggest follow-up questions for deeper analysis
- Always cite data sources and flag when data may be stale or incomplete

**Guardrails:** Fiduciary standard. Never fabricate data. If uncertain, say so. Always distinguish fact from inference. No investment recommendations — provide data, not advice.

## QUERY CATEGORIES
1. **Lookup**: "What is [client]'s AUM?" → Direct data retrieval
2. **Comparison**: "How does [client A] compare to [client B]?" → Multi-record comparison
3. **Calculation**: "What is my average client AUM?" → Aggregate computation
4. **Recommendation**: "Which clients need attention?" → Signal-based filtering
5. **Status**: "Are there any overdue tasks?" → State check

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed answer with context and reasoning",
  "clientSummary": "Brief answer suitable for quick reference",
  "queryIntent": "lookup|comparison|calculation|recommendation|status|unknown",
  "answerText": "Direct, concise answer to the question",
  "confidence": number (0-1),
  "dataSources": ["source1", "source2"],
  "supportingData": [{"label": "string", "value": "string", "source": "string"}],
  "followUpQuestions": ["Suggested follow-up question 1", "Question 2"],
  "caveats": ["Any important disclaimers or data limitations"]
}`;

const V33_NLQ_USER_TEMPLATE = `Advisor query: "{{query}}"

Context:
{{clientContext}}

Available data sources: {{dataSources}}

Interpret this query and provide a structured answer. If the query references a specific client, use the provided context. If it's a book-level query, analyze across the available data. Always cite sources and flag uncertainty.`;

// ── Fallback ──

function generateFallback(input: V33NaturalLanguageQueryInput): V33QueryResult {
  return {
    advisorNarrative: `Query received: "${input.query}". AI processing is currently unavailable. Please try again or use the search and filter tools directly.`,
    clientSummary: "Query processing unavailable — please retry.",
    queryIntent: "unknown",
    answerText: "I'm unable to process this query right now. AI services are temporarily unavailable.",
    confidence: 0,
    dataSources: [],
    supportingData: [],
    followUpQuestions: [],
    caveats: ["AI query engine is currently unavailable"],
  };
}

// ── Main ──

export async function generateNaturalLanguageQuery(
  input: V33NaturalLanguageQueryInput,
): Promise<V33QueryResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 09] AI unavailable — using fallback");
    return generateFallback(input);
  }

  try {
    const clientCtx = input.clientContext
      ? `Client: ${input.clientContext.clientName || "N/A"}\nAUM: ${input.clientContext.totalAum ? `$${input.clientContext.totalAum.toLocaleString()}` : "N/A"}\nSegment: ${input.clientContext.segment || "N/A"}`
      : "No specific client context provided (book-level query)";

    const userPrompt = V33_NLQ_USER_TEMPLATE
      .replace("{{query}}", sanitizeForPrompt(input.query))
      .replace("{{clientContext}}", clientCtx)
      .replace("{{dataSources}}", (input.availableDataSources || ["Salesforce", "Orion", "Local DB"]).join(", "));

    const raw = await chatCompletion(V33_NLQ_SYSTEM_PROMPT, userPrompt, false, 4096);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[Agent 09] No JSON in response — using fallback");
      return generateFallback(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      advisorNarrative: parsed.advisorNarrative || "",
      clientSummary: parsed.clientSummary || "",
      queryIntent: parsed.queryIntent || "unknown",
      answerText: parsed.answerText || "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      dataSources: Array.isArray(parsed.dataSources) ? parsed.dataSources : [],
      supportingData: Array.isArray(parsed.supportingData) ? parsed.supportingData : [],
      followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
      caveats: Array.isArray(parsed.caveats) ? parsed.caveats : [],
    };
  } catch (err) {
    logger.error({ err }, "[Agent 09] NLQ processing failed — using fallback");
    return generateFallback(input);
  }
}
