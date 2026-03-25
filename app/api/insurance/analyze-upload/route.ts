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

async function extractTextFromBuffer(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === "application/pdf") {
    const pdfParse = (await import("pdf-parse") as any).default;
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimetype === "text/plain" || mimetype === "text/csv") {
    return buffer.toString("utf-8");
  }
  if (mimetype.startsWith("image/")) {
    return "[Image file uploaded — please describe the key coverage details visible in this document for analysis]";
  }
  return buffer.toString("utf-8");
}

function normalizeAnalysis(raw: string): DiagnosticResponse {
  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
  } catch {
    logger.warn("Insurance analysis returned non-JSON, wrapping as fallback");
    return {
      documentInventory: null,
      clientRiskSnapshot: {
        namedInsureds: null, properties: null, vehicles: null, carriers: null,
        estimatedNetWorth: null, domainsCovered: null, domainsMissing: ["All"],
        protectionReadiness: "AT_RISK",
        immediateAdvisorFocus: ["Unable to parse analysis — please re-upload documents"],
      },
      dataQualityGates: null, coverageDomains: null, calculationEngine: null,
      domainScores: null, riskFlags: null, recommendations: null, referralBrief: null,
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
    if (clientContext.netWorthSource) contextLines.push(`- Net Worth Source: ${clientContext.netWorthSource}`);
    if (clientContext.homeValue) contextLines.push(`- Home Value (market): $${Number(clientContext.homeValue).toLocaleString()}`);
    if (clientContext.homeSquareFootage) contextLines.push(`- Home Square Footage: ${clientContext.homeSquareFootage} sq ft`);
    if (clientContext.rebuildYear) contextLines.push(`- Home Rebuild Year: ${clientContext.rebuildYear}`);
    if (clientContext.numberOfVehicles) contextLines.push(`- Number of Vehicles: ${clientContext.numberOfVehicles}`);
    if (clientContext.vehicleDetails) contextLines.push(`- Vehicle Details: ${clientContext.vehicleDetails}`);
    if (clientContext.dependents) contextLines.push(`- Number of Dependents: ${clientContext.dependents}`);
    if (clientContext.occupation) contextLines.push(`- Occupation: ${clientContext.occupation}`);
    if (clientContext.state) contextLines.push(`- State: ${clientContext.state}`);
    if (clientContext.valuableArticlesEstimate) contextLines.push(`- Estimated Valuable Articles: $${Number(clientContext.valuableArticlesEstimate).toLocaleString()}`);
    if (clientContext.hasUmbrella !== undefined) contextLines.push(`- Has Umbrella Policy: ${clientContext.hasUmbrella ? "Yes" : "No / Unknown"}`);
    if (clientContext.additionalNotes) contextLines.push(`- Additional Notes: ${clientContext.additionalNotes}`);
  }

  const maxDocLength = 48000;
  const truncatedText = documentText.length > maxDocLength
    ? documentText.slice(0, maxDocLength) + "\n\n[Document text truncated at " + maxDocLength + " characters — analyze all visible data above]"
    : documentText;

  return `Run the full P&C Shield 11-step diagnostic workflow on the following insurance document(s). The focus area is ${lineType === "property" ? "Property" : "Casualty/Liability"}, but analyze ALL domains present in the documents.

Client Context:
${contextLines.length > 0 ? contextLines.join("\n") : "No additional client context provided. Use assumptions and flag them."}

Document Text:
"""
${truncatedText}
"""

Return the COMPLETE JSON structure with all fields populated from your analysis.`;
}

const SYSTEM_PROMPT = `You are P&C Shield, OneDigital's Personal Lines Insurance Diagnostic Engine. Analyze uploaded insurance documents and return comprehensive diagnostic reports as valid JSON.`;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: "Maximum 5 files allowed" }, { status: 400 });
    }

    const lineType = (formData.get("lineType") as string) || "property";
    if (!["property", "casualty"].includes(lineType)) {
      return NextResponse.json({ error: "lineType must be 'property' or 'casualty'" }, { status: 400 });
    }

    let clientContext: z.infer<typeof clientContextSchema> = undefined;
    const clientContextRaw = formData.get("clientContext") as string | null;
    if (clientContextRaw) {
      try {
        const raw = JSON.parse(clientContextRaw);
        clientContext = clientContextSchema.parse(raw);
      } catch {
        logger.warn("Could not parse clientContext from upload");
      }
    }

    const extractedTexts: string[] = [];
    const fileNames: string[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await extractTextFromBuffer(buffer, file.type);
        extractedTexts.push(`--- ${file.name} ---\n${text}`);
        fileNames.push(file.name);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn({ err: errMsg, filename: file.name }, "Failed to extract text from file");
        extractedTexts.push(`--- ${file.name} ---\n[Could not extract text from this file]`);
        fileNames.push(file.name);
      }
    }

    const combinedText = extractedTexts.join("\n\n");
    const userPrompt = buildDocumentPrompt(lineType, combinedText, clientContext);
    const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt, true, 16384);
    const analysis = normalizeAnalysis(raw);

    return NextResponse.json({
      success: true,
      lineType,
      analysis,
      filesProcessed: fileNames,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errMsg }, "Insurance upload analysis error");
    return NextResponse.json({ error: sanitizeErrorMessage(err, "Failed to analyze insurance documents") }, { status: 500 });
  }
}
