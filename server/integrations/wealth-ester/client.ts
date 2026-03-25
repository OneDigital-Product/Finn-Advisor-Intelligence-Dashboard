import { logger } from "../../lib/logger";
import { sanitizeForPrompt, isAIAvailable, chatCompletion } from "../../openai";

export interface EstateDocumentAnalysis {
  documentType: string;
  trustProvisions: TrustProvision[];
  beneficiaries: BeneficiaryInfo[];
  successorTrustees: TrusteeInfo[];
  keyConditions: KeyCondition[];
  summary: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rawExtractions: Record<string, unknown>;
}

export interface TrustProvision {
  provisionType: string;
  description: string;
  details: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface BeneficiaryInfo {
  name: string;
  relationship: string;
  percentage: number | null;
  conditions: string | null;
  class: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface TrusteeInfo {
  name: string;
  role: "primary_trustee" | "successor_trustee" | "co_trustee";
  order: number;
  conditions: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface KeyCondition {
  conditionType: string;
  description: string;
  trigger: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

const ESTATE_DOCUMENT_SYSTEM_PROMPT = `You are an expert estate document analysis engine. Analyze the provided estate planning document (trust agreement, will, or similar) and extract structured data.

Return ONLY valid JSON with this exact structure:
{
  "documentType": "trust_agreement | will | power_of_attorney | beneficiary_designation | other",
  "trustProvisions": [
    {
      "provisionType": "distribution | termination | amendment | spendthrift | discretionary | mandatory",
      "description": "Brief title of the provision",
      "details": "Full extracted text or summary of the provision",
      "confidence": "HIGH | MEDIUM | LOW"
    }
  ],
  "beneficiaries": [
    {
      "name": "Full name of beneficiary",
      "relationship": "spouse | child | grandchild | sibling | charity | trust | other",
      "percentage": null or number (0-100),
      "conditions": "Any conditions on the bequest, or null",
      "class": "primary | contingent | remainder",
      "confidence": "HIGH | MEDIUM | LOW"
    }
  ],
  "successorTrustees": [
    {
      "name": "Full name",
      "role": "primary_trustee | successor_trustee | co_trustee",
      "order": 1,
      "conditions": "Conditions for assuming role, or null",
      "confidence": "HIGH | MEDIUM | LOW"
    }
  ],
  "keyConditions": [
    {
      "conditionType": "age_restriction | survivorship | no_contest | incapacity | remarriage | other",
      "description": "Description of the condition",
      "trigger": "What triggers this condition, or null",
      "confidence": "HIGH | MEDIUM | LOW"
    }
  ],
  "summary": "A 2-3 sentence executive summary of the document",
  "confidence": "HIGH | MEDIUM | LOW"
}

Rules:
- Extract ALL beneficiaries mentioned, including contingent and remainder beneficiaries
- Identify ALL trust provisions including distribution schedules, termination clauses, amendment powers
- Flag any ambiguous or unclear provisions with LOW confidence
- If percentages are not explicitly stated, set to null
- For wills, map bequests to beneficiaries
- Preserve exact names as written in the document`;


export async function analyzeEstateDocument(
  documentText: string,
  documentType?: string,
  clientContext?: { clientName?: string; existingBeneficiaries?: string[] }
): Promise<EstateDocumentAnalysis> {
  const fallbackResult: EstateDocumentAnalysis = {
    documentType: documentType || "other",
    trustProvisions: [],
    beneficiaries: [],
    successorTrustees: [],
    keyConditions: [],
    summary: "Estate document analysis requires AI integration. Please configure your OpenAI API key to enable automated estate document analysis.",
    confidence: "LOW",
    rawExtractions: {},
  };

  if (!isAIAvailable()) {
    logger.warn("AI not available for estate document analysis");
    return extractBasicEstateInfo(documentText, fallbackResult);
  }

  try {
    const sanitizedText = sanitizeForPrompt(documentText, 40000);

    let userPrompt = `Analyze the following estate planning document and extract all structured data. Respond with valid JSON only.\n\n${sanitizedText}`;

    if (clientContext?.clientName) {
      userPrompt += `\n\nClient Name: ${clientContext.clientName}`;
    }
    if (clientContext?.existingBeneficiaries?.length) {
      userPrompt += `\nKnown beneficiaries for cross-reference: ${clientContext.existingBeneficiaries.join(", ")}`;
    }
    if (documentType) {
      userPrompt += `\nExpected document type: ${documentType}`;
    }

    const content = await chatCompletion(ESTATE_DOCUMENT_SYSTEM_PROMPT, userPrompt, true, 4000);
    if (!content) {
      logger.error("Empty response from AI for estate document analysis");
      return extractBasicEstateInfo(documentText, fallbackResult);
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content) as EstateDocumentAnalysis;

    logger.info({
      documentType: parsed.documentType,
      beneficiaryCount: parsed.beneficiaries?.length || 0,
      provisionCount: parsed.trustProvisions?.length || 0,
      trusteeCount: parsed.successorTrustees?.length || 0,
      conditionCount: parsed.keyConditions?.length || 0,
      confidence: parsed.confidence,
    }, "Estate document analysis complete");

    return {
      documentType: parsed.documentType || documentType || "other",
      trustProvisions: parsed.trustProvisions || [],
      beneficiaries: parsed.beneficiaries || [],
      successorTrustees: parsed.successorTrustees || [],
      keyConditions: parsed.keyConditions || [],
      summary: parsed.summary || "Document analyzed successfully.",
      confidence: parsed.confidence || "MEDIUM",
      rawExtractions: parsed as unknown as Record<string, unknown>,
    };
  } catch (error: any) {
    logger.error({ err: error }, "Error analyzing estate document with AI");
    return extractBasicEstateInfo(documentText, fallbackResult);
  }
}

function extractBasicEstateInfo(
  text: string,
  fallback: EstateDocumentAnalysis
): EstateDocumentAnalysis {
  const beneficiaryMatches = text.match(/(?:beneficiar(?:y|ies))[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/gi) || [];
  const trusteeMatches = text.match(/(?:trustee|successor\s+trustee)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/gi) || [];
  const percentMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/g) || [];

  const beneficiaries: BeneficiaryInfo[] = beneficiaryMatches.slice(0, 10).map((match) => {
    const nameMatch = match.match(/[A-Z][a-z]+ [A-Z][a-z]+/);
    return {
      name: nameMatch?.[0] || match,
      relationship: "other",
      percentage: null,
      conditions: null,
      class: "primary" as const,
      confidence: "LOW" as const,
    };
  });

  const successorTrustees: TrusteeInfo[] = trusteeMatches.slice(0, 5).map((match, idx) => {
    const nameMatch = match.match(/[A-Z][a-z]+ [A-Z][a-z]+/);
    const isSuccessor = /successor/i.test(match);
    return {
      name: nameMatch?.[0] || match,
      role: isSuccessor ? "successor_trustee" as const : "primary_trustee" as const,
      order: idx + 1,
      conditions: null,
      confidence: "LOW" as const,
    };
  });

  return {
    ...fallback,
    beneficiaries,
    successorTrustees,
    summary: `Basic extraction found ${beneficiaries.length} beneficiary reference(s) and ${successorTrustees.length} trustee reference(s). AI-enhanced analysis available with OpenAI integration.`,
    rawExtractions: {
      percentageReferences: percentMatches,
      beneficiaryReferences: beneficiaryMatches,
      trusteeReferences: trusteeMatches,
    },
  };
}

export function convertAnalysisToFacts(
  analysis: EstateDocumentAnalysis,
  sourceReference: string
): Array<{
  factType: string;
  factLabel: string;
  factValue: string;
  normalizedValue: string | null;
  confidence: string;
  sourceSnippet: string | null;
  sourceReference: string;
  ambiguityFlag: boolean;
}> {
  const facts: Array<{
    factType: string;
    factLabel: string;
    factValue: string;
    normalizedValue: string | null;
    confidence: string;
    sourceSnippet: string | null;
    sourceReference: string;
    ambiguityFlag: boolean;
  }> = [];

  for (const ben of analysis.beneficiaries) {
    facts.push({
      factType: "estate_beneficiary",
      factLabel: `Beneficiary: ${ben.name}`,
      factValue: `${ben.name} (${ben.class}) — ${ben.relationship}${ben.percentage !== null ? `, ${ben.percentage}%` : ""}${ben.conditions ? ` [${ben.conditions}]` : ""}`,
      normalizedValue: JSON.stringify({ name: ben.name, relationship: ben.relationship, percentage: ben.percentage, class: ben.class }),
      confidence: ben.confidence,
      sourceSnippet: ben.conditions,
      sourceReference,
      ambiguityFlag: ben.confidence === "LOW",
    });
  }

  for (const trustee of analysis.successorTrustees) {
    facts.push({
      factType: "estate_trustee",
      factLabel: `${trustee.role === "successor_trustee" ? "Successor Trustee" : trustee.role === "co_trustee" ? "Co-Trustee" : "Trustee"}: ${trustee.name}`,
      factValue: `${trustee.name} (Order: ${trustee.order})${trustee.conditions ? ` — ${trustee.conditions}` : ""}`,
      normalizedValue: JSON.stringify({ name: trustee.name, role: trustee.role, order: trustee.order }),
      confidence: trustee.confidence,
      sourceSnippet: trustee.conditions,
      sourceReference,
      ambiguityFlag: trustee.confidence === "LOW",
    });
  }

  for (const provision of analysis.trustProvisions) {
    facts.push({
      factType: "estate_provision",
      factLabel: `${provision.provisionType}: ${provision.description}`,
      factValue: provision.details,
      normalizedValue: JSON.stringify({ type: provision.provisionType, description: provision.description }),
      confidence: provision.confidence,
      sourceSnippet: provision.details.substring(0, 200),
      sourceReference,
      ambiguityFlag: provision.confidence === "LOW",
    });
  }

  for (const condition of analysis.keyConditions) {
    facts.push({
      factType: "estate_condition",
      factLabel: `Condition: ${condition.conditionType}`,
      factValue: `${condition.description}${condition.trigger ? ` — Trigger: ${condition.trigger}` : ""}`,
      normalizedValue: JSON.stringify({ type: condition.conditionType, trigger: condition.trigger }),
      confidence: condition.confidence,
      sourceSnippet: condition.description.substring(0, 200),
      sourceReference,
      ambiguityFlag: condition.confidence === "LOW",
    });
  }

  facts.push({
    factType: "estate_document_type",
    factLabel: `Document Type: ${analysis.documentType}`,
    factValue: analysis.summary,
    normalizedValue: analysis.documentType,
    confidence: analysis.confidence,
    sourceSnippet: analysis.summary.substring(0, 200),
    sourceReference,
    ambiguityFlag: false,
  });

  return facts;
}
