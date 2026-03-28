import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";

// ── Types ──

export interface V33DocumentParsingInput {
  clientId: string;
  clientName: string;
  documentText: string;
  filename?: string;
  documentType?: string;
  clientContext?: {
    age?: number;
    totalAum?: number;
    accountTypes?: string[];
    knownCustodians?: string[];
  };
}

export interface V33ParsedAccount {
  accountNumber: string;
  accountType: string;
  custodian: string;
  taxStatus: "taxable" | "tax-deferred" | "tax-free" | "unknown";
  balance: number;
  asOfDate: string;
}

export interface V33ParsedHolding {
  ticker: string;
  name: string;
  shares: number;
  marketValue: number;
  costBasis: number | null;
  accountNumber: string;
}

export interface V33ParsedBeneficiary {
  name: string;
  relationship: string;
  percentage: number;
  beneficiaryType: "primary" | "contingent";
  accountNumber: string;
}

export interface V33DocumentParsingResult {
  advisorNarrative: string;
  clientSummary: string;
  documentType: string;
  custodian: string;
  asOfDate: string;
  dataQualityScore: number;
  importReady: boolean;
  accounts: V33ParsedAccount[];
  holdings: V33ParsedHolding[];
  beneficiaries: V33ParsedBeneficiary[];
  validationFlags: Array<{
    field: string;
    severity: "critical" | "warning" | "info";
    message: string;
  }>;
  importActions: Array<{
    action: string;
    target: string;
    priority: "high" | "medium" | "low";
  }>;
}

// ── Prompt ──

const V33_DOCUMENT_PARSING_SYSTEM_PROMPT = `You are the **Document Parsing Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Parse financial documents (statements, tax returns, insurance policies, estate docs) into structured data
- Identify custodian, account types, holdings, beneficiaries, and key dates
- Validate extracted data against known limits and client context
- Assess data quality and OCR confidence
- Flag discrepancies and stale information

**Guardrails:** Fiduciary standard. Calculation-first validation. Never fabricate data not present in the document. Flag uncertainty with low confidence scores.

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed parsing results with findings and recommendations",
  "clientSummary": "Brief summary of what was extracted and any issues",
  "documentType": "statement | tax_return | insurance_policy | estate_document | benefits_summary | other",
  "custodian": "Custodian name or 'unknown'",
  "asOfDate": "ISO 8601 date or empty string",
  "dataQualityScore": number (0-1),
  "importReady": boolean,
  "accounts": [{"accountNumber": "string", "accountType": "string", "custodian": "string", "taxStatus": "taxable|tax-deferred|tax-free|unknown", "balance": number, "asOfDate": "ISO date"}],
  "holdings": [{"ticker": "string", "name": "string", "shares": number, "marketValue": number, "costBasis": number or null, "accountNumber": "string"}],
  "beneficiaries": [{"name": "string", "relationship": "string", "percentage": number, "beneficiaryType": "primary|contingent", "accountNumber": "string"}],
  "validationFlags": [{"field": "string", "severity": "critical|warning|info", "message": "string"}],
  "importActions": [{"action": "string", "target": "string", "priority": "high|medium|low"}]
}`;

const V33_DOCUMENT_PARSING_USER_TEMPLATE = `Parse the following financial document for client {{clientName}}.

Document filename: {{filename}}
Suggested document type: {{documentType}}

Client context:
- Age: {{age}}
- Total AUM: {{totalAum}}
- Known account types: {{accountTypes}}
- Known custodians: {{custodians}}

Document text:
{{documentText}}

Extract all accounts, holdings, beneficiaries, and key dates. Validate against client context. Flag any discrepancies or data quality issues.`;

// ── Fallback ──

function generateFallback(input: V33DocumentParsingInput): V33DocumentParsingResult {
  return {
    advisorNarrative: `Document "${input.filename || "uploaded document"}" received for ${input.clientName}. AI parsing is currently unavailable — manual review required.`,
    clientSummary: "Document uploaded for processing. Manual review needed.",
    documentType: input.documentType || "other",
    custodian: "unknown",
    asOfDate: "",
    dataQualityScore: 0,
    importReady: false,
    accounts: [],
    holdings: [],
    beneficiaries: [],
    validationFlags: [{
      field: "system",
      severity: "warning",
      message: "AI parsing unavailable — document requires manual review",
    }],
    importActions: [{
      action: "flag_for_review",
      target: "general",
      priority: "medium",
    }],
  };
}

// ── Main ──

export async function generateDocumentParsing(
  input: V33DocumentParsingInput,
): Promise<V33DocumentParsingResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 08] AI unavailable — using fallback");
    return generateFallback(input);
  }

  try {
    const userPrompt = V33_DOCUMENT_PARSING_USER_TEMPLATE
      .replace("{{clientName}}", sanitizeForPrompt(input.clientName))
      .replace("{{filename}}", sanitizeForPrompt(input.filename || "unknown"))
      .replace("{{documentType}}", sanitizeForPrompt(input.documentType || "unknown"))
      .replace("{{age}}", String(input.clientContext?.age ?? "unknown"))
      .replace("{{totalAum}}", input.clientContext?.totalAum ? `$${input.clientContext.totalAum.toLocaleString()}` : "unknown")
      .replace("{{accountTypes}}", (input.clientContext?.accountTypes || []).join(", ") || "none specified")
      .replace("{{custodians}}", (input.clientContext?.knownCustodians || []).join(", ") || "none specified")
      .replace("{{documentText}}", sanitizeForPrompt(input.documentText, 40000));

    const raw = await chatCompletion(V33_DOCUMENT_PARSING_SYSTEM_PROMPT, userPrompt, false, 4096);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[Agent 08] No JSON in response — using fallback");
      return generateFallback(input);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      advisorNarrative: parsed.advisorNarrative || "",
      clientSummary: parsed.clientSummary || "",
      documentType: parsed.documentType || input.documentType || "other",
      custodian: parsed.custodian || "unknown",
      asOfDate: parsed.asOfDate || "",
      dataQualityScore: typeof parsed.dataQualityScore === "number" ? parsed.dataQualityScore : 0,
      importReady: !!parsed.importReady,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
      beneficiaries: Array.isArray(parsed.beneficiaries) ? parsed.beneficiaries : [],
      validationFlags: Array.isArray(parsed.validationFlags) ? parsed.validationFlags : [],
      importActions: Array.isArray(parsed.importActions) ? parsed.importActions : [],
    };
  } catch (err) {
    logger.error({ err }, "[Agent 08] Document parsing failed — using fallback");
    return generateFallback(input);
  }
}
