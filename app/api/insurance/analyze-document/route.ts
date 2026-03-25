import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { chatCompletion } from "@server/openai";
import { logger } from "@server/lib/logger";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

const clientContextSchema = z.object({
  totalAum: z.number().optional(),
  netWorth: z.number().optional(),
  netWorthSource: z.string().optional(),
  homeValue: z.number().optional(),
  homeSquareFootage: z.number().optional(),
  rebuildYear: z.number().optional(),
  numberOfVehicles: z.number().optional(),
  vehicleDetails: z.string().optional(),
  dependents: z.number().optional(),
  occupation: z.string().optional(),
  state: z.string().optional(),
  valuableArticlesEstimate: z.number().optional(),
  hasUmbrella: z.boolean().optional(),
  additionalNotes: z.string().optional(),
}).optional();

const documentSchema = z.object({
  clientId: z.string().uuid(),
  lineType: z.enum(["property", "casualty"]),
  documentText: z.string().min(1, "Document text is required"),
  clientContext: clientContextSchema,
});

const diagnosticResponseSchema = z.object({
  documentInventory: z.array(z.any()).nullable(),
  clientRiskSnapshot: z.any().nullable(),
  dataQualityGates: z.any().nullable(),
  coverageDomains: z.any().nullable(),
  calculationEngine: z.any().nullable(),
  domainScores: z.any().nullable(),
  riskFlags: z.array(z.any()).nullable(),
  recommendations: z.array(z.any()).nullable(),
  referralBrief: z.any().nullable(),
  advisorReport: z.string().nullable(),
  clientSummary: z.string().nullable(),
  assumptions: z.array(z.any()).nullable(),
  questionsToAskClient: z.array(z.string()).nullable(),
});

type DiagnosticResponse = z.infer<typeof diagnosticResponseSchema>;

function normalizeAnalysis(raw: string): DiagnosticResponse {
  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
  } catch {
    return {
      documentInventory: null, clientRiskSnapshot: null, dataQualityGates: null,
      coverageDomains: null, calculationEngine: null, domainScores: null,
      riskFlags: null, recommendations: null, referralBrief: null,
      advisorReport: raw, clientSummary: raw, assumptions: null, questionsToAskClient: null,
    } as DiagnosticResponse;
  }

  const result = diagnosticResponseSchema.safeParse(parsed);
  if (result.success) return result.data;

  const nullDefaults: Record<string, unknown> = {
    documentInventory: null, clientRiskSnapshot: null, dataQualityGates: null,
    coverageDomains: null, calculationEngine: null, domainScores: null,
    riskFlags: null, recommendations: null, referralBrief: null,
    advisorReport: null, clientSummary: null, assumptions: null, questionsToAskClient: null,
  };
  const merged = { ...nullDefaults, ...parsed };
  const retryResult = diagnosticResponseSchema.safeParse(merged);
  if (retryResult.success) return retryResult.data;

  return {
    ...nullDefaults,
    advisorReport: typeof parsed.advisorReport === "string" ? parsed.advisorReport : null,
    clientSummary: typeof parsed.clientSummary === "string" ? parsed.clientSummary : null,
  } as DiagnosticResponse;
}

function buildDocumentPrompt(lineType: string, documentText: string, clientContext?: z.infer<typeof clientContextSchema>) {
  const contextLines: string[] = [];
  if (clientContext) {
    if (clientContext.totalAum) contextLines.push(`- Total AUM: $${Number(clientContext.totalAum).toLocaleString()}`);
    if (clientContext.netWorth) contextLines.push(`- Estimated Net Worth: $${Number(clientContext.netWorth).toLocaleString()}`);
    if (clientContext.homeValue) contextLines.push(`- Home Value (market): $${Number(clientContext.homeValue).toLocaleString()}`);
    if (clientContext.homeSquareFootage) contextLines.push(`- Home Square Footage: ${clientContext.homeSquareFootage} sq ft`);
    if (clientContext.dependents) contextLines.push(`- Number of Dependents: ${clientContext.dependents}`);
    if (clientContext.occupation) contextLines.push(`- Occupation: ${clientContext.occupation}`);
    if (clientContext.state) contextLines.push(`- State: ${clientContext.state}`);
    if (clientContext.hasUmbrella !== undefined) contextLines.push(`- Has Umbrella Policy: ${clientContext.hasUmbrella ? "Yes" : "No / Unknown"}`);
    if (clientContext.additionalNotes) contextLines.push(`- Additional Notes: ${clientContext.additionalNotes}`);
  }

  const maxDocLength = 48000;
  const truncatedText = documentText.length > maxDocLength
    ? documentText.slice(0, maxDocLength) + "\n\n[Document text truncated]"
    : documentText;

  return `Run the full P&C Shield diagnostic workflow on the following insurance document(s). Focus area: ${lineType === "property" ? "Property" : "Casualty/Liability"}.

Client Context:
${contextLines.length > 0 ? contextLines.join("\n") : "No additional client context provided."}

Document Text:
"""
${truncatedText}
"""

Return the COMPLETE JSON structure with all fields populated from your analysis.`;
}

const SYSTEM_PROMPT = `You are P&C Shield, OneDigital's Personal Lines Insurance Diagnostic Engine. Analyze insurance documents and return comprehensive diagnostic reports as valid JSON.`;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = documentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const { lineType, documentText, clientContext } = parsed.data;
    const userPrompt = buildDocumentPrompt(lineType, documentText, clientContext);
    const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt, true, 16384);
    const analysis = normalizeAnalysis(raw);

    return NextResponse.json({
      success: true,
      lineType,
      analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errMsg }, "Insurance document analysis error");
    return NextResponse.json({ error: sanitizeErrorMessage(err, "Failed to analyze insurance document") }, { status: 500 });
  }
}
