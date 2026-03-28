import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";

// ── Types ──

export interface V33DocumentClassificationInput {
  clientId?: string;
  clientName?: string;
  filename: string;
  fileSize?: number;
  mimeType?: string;
  textPreview: string;
}

export interface V33DocumentClassificationResult {
  advisorNarrative: string;
  clientSummary: string;
  classification: {
    documentType: string;
    category: "financial_statement" | "tax_document" | "insurance_policy" | "estate_document" | "legal_document" | "correspondence" | "compliance" | "other";
    subcategory: string;
    custodian: string | null;
    confidenceScore: number;
  };
  complianceRelevance: {
    isComplianceRelated: boolean;
    complianceCategories: string[];
    retentionRequirement: string;
    reviewRequired: boolean;
  };
  suggestedActions: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    reason: string;
  }>;
  metadata: {
    estimatedDate: string | null;
    estimatedPeriod: string | null;
    keyEntities: string[];
    tags: string[];
  };
}

// ── Prompt ──

const V33_DOC_CLASSIFICATION_SYSTEM_PROMPT = `You are the **Document Classification Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Classify uploaded documents by type, category, and subcategory
- Identify custodian/issuer when applicable
- Assess compliance relevance and retention requirements
- Extract key metadata (dates, entities, periods)
- Suggest filing and review actions
- Tag documents for searchability

**Document Categories:**
- financial_statement: Account statements, performance reports, trade confirmations
- tax_document: Tax returns, 1099s, K-1s, W-2s, estimated tax documents
- insurance_policy: Life, disability, LTC, umbrella, property policies
- estate_document: Wills, trusts, POAs, beneficiary forms, probate filings
- legal_document: Contracts, prenups, business agreements, court orders
- correspondence: Client letters, advisor notes, meeting summaries
- compliance: Suitability reviews, AML/KYC, disclosures, regulatory filings
- other: Unclassified

**Guardrails:** No PII in classification output. Confidence-scored. Flag uncertain classifications.

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Classification analysis with reasoning",
  "clientSummary": "Brief classification result",
  "classification": {
    "documentType": "specific type (e.g., 'Schwab Monthly Statement')",
    "category": "financial_statement|tax_document|insurance_policy|estate_document|legal_document|correspondence|compliance|other",
    "subcategory": "more specific (e.g., 'brokerage_statement', '1099-DIV', 'term_life')",
    "custodian": "custodian name or null",
    "confidenceScore": number (0-1)
  },
  "complianceRelevance": {
    "isComplianceRelated": boolean,
    "complianceCategories": ["category"],
    "retentionRequirement": "string (e.g., '7 years', 'permanent')",
    "reviewRequired": boolean
  },
  "suggestedActions": [{"action": "string", "priority": "high|medium|low", "reason": "string"}],
  "metadata": {
    "estimatedDate": "ISO date or null",
    "estimatedPeriod": "string (e.g., 'Q4 2025', 'FY 2025') or null",
    "keyEntities": ["entity names found"],
    "tags": ["searchable tags"]
  }
}`;

const V33_DOC_CLASSIFICATION_USER_TEMPLATE = `Classify the following document:

Filename: {{filename}}
File size: {{fileSize}}
MIME type: {{mimeType}}
Client: {{clientName}}

Document text preview (first 5000 chars):
{{textPreview}}

Classify by type, category, and compliance relevance. Extract key metadata. Suggest filing actions.`;

// ── Fallback ──

function generateFallback(input: V33DocumentClassificationInput): V33DocumentClassificationResult {
  const filename = (input.filename || "").toLowerCase();
  let category: V33DocumentClassificationResult["classification"]["category"] = "other";
  let docType = "Unknown Document";
  let subcategory = "unclassified";

  if (filename.includes("statement") || filename.includes("stmt")) {
    category = "financial_statement";
    docType = "Account Statement";
    subcategory = "account_statement";
  } else if (filename.includes("1099") || filename.includes("tax") || filename.includes("w2") || filename.includes("k-1")) {
    category = "tax_document";
    docType = "Tax Document";
    subcategory = filename.includes("1099") ? "1099" : "tax_return";
  } else if (filename.includes("policy") || filename.includes("insurance")) {
    category = "insurance_policy";
    docType = "Insurance Policy";
    subcategory = "policy_document";
  } else if (filename.includes("trust") || filename.includes("will") || filename.includes("estate") || filename.includes("poa")) {
    category = "estate_document";
    docType = "Estate Document";
    subcategory = filename.includes("trust") ? "trust_agreement" : "estate_planning";
  }

  return {
    advisorNarrative: `Document "${input.filename}" classified as ${docType} based on filename analysis. AI classification unavailable — manual review recommended for accuracy.`,
    clientSummary: `${docType} — needs manual review`,
    classification: {
      documentType: docType,
      category,
      subcategory,
      custodian: null,
      confidenceScore: 0.3,
    },
    complianceRelevance: {
      isComplianceRelated: category === "compliance" || category === "tax_document",
      complianceCategories: [],
      retentionRequirement: "7 years (default)",
      reviewRequired: true,
    },
    suggestedActions: [{
      action: "Manual classification review",
      priority: "medium",
      reason: "AI classification unavailable — filename-only classification applied",
    }],
    metadata: {
      estimatedDate: null,
      estimatedPeriod: null,
      keyEntities: input.clientName ? [input.clientName] : [],
      tags: [category, subcategory],
    },
  };
}

// ── Main ──

export async function generateDocumentClassification(
  input: V33DocumentClassificationInput,
): Promise<V33DocumentClassificationResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 12] AI unavailable — using filename fallback");
    return generateFallback(input);
  }

  try {
    const userPrompt = V33_DOC_CLASSIFICATION_USER_TEMPLATE
      .replace("{{filename}}", sanitizeForPrompt(input.filename))
      .replace("{{fileSize}}", input.fileSize ? `${Math.round(input.fileSize / 1024)}KB` : "unknown")
      .replace("{{mimeType}}", input.mimeType || "unknown")
      .replace("{{clientName}}", sanitizeForPrompt(input.clientName || "Unknown"))
      .replace("{{textPreview}}", sanitizeForPrompt(input.textPreview, 5000));

    const raw = await chatCompletion(V33_DOC_CLASSIFICATION_SYSTEM_PROMPT, userPrompt, false, 4096);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[Agent 12] No JSON in response — using fallback");
      return generateFallback(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      advisorNarrative: parsed.advisorNarrative || "",
      clientSummary: parsed.clientSummary || "",
      classification: {
        documentType: parsed.classification?.documentType || "Unknown",
        category: parsed.classification?.category || "other",
        subcategory: parsed.classification?.subcategory || "unclassified",
        custodian: parsed.classification?.custodian || null,
        confidenceScore: typeof parsed.classification?.confidenceScore === "number" ? parsed.classification.confidenceScore : 0,
      },
      complianceRelevance: {
        isComplianceRelated: !!parsed.complianceRelevance?.isComplianceRelated,
        complianceCategories: Array.isArray(parsed.complianceRelevance?.complianceCategories) ? parsed.complianceRelevance.complianceCategories : [],
        retentionRequirement: parsed.complianceRelevance?.retentionRequirement || "7 years (default)",
        reviewRequired: parsed.complianceRelevance?.reviewRequired !== false,
      },
      suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
      metadata: {
        estimatedDate: parsed.metadata?.estimatedDate || null,
        estimatedPeriod: parsed.metadata?.estimatedPeriod || null,
        keyEntities: Array.isArray(parsed.metadata?.keyEntities) ? parsed.metadata.keyEntities : [],
        tags: Array.isArray(parsed.metadata?.tags) ? parsed.metadata.tags : [],
      },
    };
  } catch (err) {
    logger.error({ err }, "[Agent 12] Classification failed — using fallback");
    return generateFallback(input);
  }
}
