import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import crypto from "crypto";
import { analyzeEstateDocument, convertAnalysisToFacts } from "@server/integrations/wealth-ester/client";

const analyzeDocumentBodySchema = z.object({
  text: z.string().max(10 * 1024 * 1024, "Text exceeds 10MB limit").optional(),
  documentType: z.enum(["trust_agreement", "will", "power_of_attorney", "beneficiary_designation", "other"]).optional(),
});

const analysisCache = new Map<string, {
  clientId: string;
  advisorId: string;
  facts: Array<{
    factType: string;
    factLabel: string;
    factValue: string;
    normalizedValue: string | null;
    confidence: string;
    sourceSnippet: string | null;
    sourceReference: string;
    ambiguityFlag: boolean;
  }>;
  createdAt: number;
}>();

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, val] of analysisCache) {
    if (val.createdAt < cutoff) analysisCache.delete(key);
  }
}, 15 * 60 * 1000);

export { analysisCache };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    const advisorId = auth.session.userId!;

    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Access denied" }, { status: 403 });
    const client = await storage.getClient(clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (client.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let documentText = "";
    let fileName = "estate_document.txt";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const textField = formData.get("text") as string | null;
      const docTypeField = formData.get("documentType") as string | null;

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        documentText = buffer.toString("utf-8");
        fileName = file.name || fileName;
      } else if (textField) {
        documentText = textField;
      } else {
        return NextResponse.json({ error: "No document file or text provided" }, { status: 400 });
      }

      if (documentText.trim().length < 50) {
        return NextResponse.json({ error: "Document text is too short for meaningful analysis" }, { status: 400 });
      }

      const documentType = docTypeField || "trust_agreement";
      const analysisId = crypto.randomUUID();

      const analysis = await analyzeEstateDocument(documentText, documentType, {
        clientName: `${client.firstName} ${client.lastName}`,
      });

      const facts = convertAnalysisToFacts(analysis, `estate-doc:${fileName}`);

      analysisCache.set(analysisId, {
        clientId,
        advisorId,
        facts,
        createdAt: Date.now(),
      });

      logger.info({
        analysisId,
        clientId,
        documentType: analysis.documentType,
        factCount: facts.length,
        confidence: analysis.confidence,
      }, "Estate document analysis complete");

      return NextResponse.json({
        analysisId,
        documentType: analysis.documentType,
        summary: analysis.summary,
        confidence: analysis.confidence,
        trustProvisions: analysis.trustProvisions,
        beneficiaries: analysis.beneficiaries,
        successorTrustees: analysis.successorTrustees,
        keyConditions: analysis.keyConditions,
        candidateFacts: facts.map((f, idx) => ({
          ...f,
          factIndex: idx,
          status: "pending",
        })),
        totalFacts: facts.length,
      });
    } else {
      const raw = await request.json();
      const bodyFields = analyzeDocumentBodySchema.safeParse(raw);
      const parsedBody = bodyFields.success ? bodyFields.data : {};

      if (parsedBody.text) {
        documentText = parsedBody.text;
      } else {
        return NextResponse.json({ error: "No document file or text provided" }, { status: 400 });
      }

      if (documentText.trim().length < 50) {
        return NextResponse.json({ error: "Document text is too short for meaningful analysis" }, { status: 400 });
      }

      const documentType = parsedBody.documentType || "trust_agreement";
      const analysisId = crypto.randomUUID();

      const analysis = await analyzeEstateDocument(documentText, documentType, {
        clientName: `${client.firstName} ${client.lastName}`,
      });

      const facts = convertAnalysisToFacts(analysis, `estate-doc:${fileName}`);

      analysisCache.set(analysisId, {
        clientId,
        advisorId,
        facts,
        createdAt: Date.now(),
      });

      logger.info({
        analysisId,
        clientId,
        documentType: analysis.documentType,
        factCount: facts.length,
        confidence: analysis.confidence,
      }, "Estate document analysis complete");

      return NextResponse.json({
        analysisId,
        documentType: analysis.documentType,
        summary: analysis.summary,
        confidence: analysis.confidence,
        trustProvisions: analysis.trustProvisions,
        beneficiaries: analysis.beneficiaries,
        successorTrustees: analysis.successorTrustees,
        keyConditions: analysis.keyConditions,
        candidateFacts: facts.map((f, idx) => ({
          ...f,
          factIndex: idx,
          status: "pending",
        })),
        totalFacts: facts.length,
      });
    }
  } catch (error: any) {
    logger.error({ err: error }, "Error analyzing estate document");
    return NextResponse.json({ error: "Failed to analyze estate document" }, { status: 500 });
  }
}
