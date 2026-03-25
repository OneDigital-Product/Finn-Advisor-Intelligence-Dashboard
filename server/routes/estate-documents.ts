// DEPRECATION: This Express route is superseded by the App Router version at
// app/api/clients/[id]/estate-documents/analyze/route.ts
// Both import from the same wealth-ester/client.ts integration.
// TODO: Remove this Express route once App Router version is fully verified.
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { upload, uploadLimiter } from "./utils";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { candidateFacts } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { analyzeEstateDocument, convertAnalysisToFacts } from "../integrations/wealth-ester/client";
import type { InsertCandidateFact } from "@shared/schema";

const analyzeDocumentBodySchema = z.object({
  text: z.string().max(10 * 1024 * 1024, "Text exceeds 10MB limit").optional(),
  documentType: z.enum(["trust_agreement", "will", "power_of_attorney", "beneficiary_designation", "other"]).optional(),
});

const reviewEstateFactSchema = z.object({
  analysisId: z.string().uuid("analysisId must be a valid UUID"),
  actions: z.array(z.object({
    factIndex: z.number().int().min(0),
    action: z.enum(["approve", "edit", "reject"]),
    factValue: z.string().optional(),
    editorNote: z.string().optional(),
  })),
});

async function verifyClientAccess(req: Request, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(req);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

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

export function registerEstateDocumentRoutes(app: Express) {
  app.post(
    "/api/clients/:clientId/estate-documents/analyze",
    requireAuth,
    uploadLimiter,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const clientId = req.params.clientId as string;
        const advisorId = req.session.userId!;

        const hasAccess = await verifyClientAccess(req, clientId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const client = await storage.getClient(clientId);
        if (!client) {
          res.status(404).json({ error: "Client not found" });
          return;
        }

        const bodyFields = analyzeDocumentBodySchema.safeParse(req.body);
        const parsedBody = bodyFields.success ? bodyFields.data : {};

        let documentText = "";
        let fileName = "estate_document.txt";

        if (req.file) {
          documentText = req.file.buffer.toString("utf-8");
          fileName = req.file.originalname || fileName;
        } else if (parsedBody.text) {
          documentText = parsedBody.text;
        } else {
          res.status(400).json({ error: "No document file or text provided" });
          return;
        }

        if (documentText.trim().length < 50) {
          res.status(400).json({ error: "Document text is too short for meaningful analysis" });
          return;
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

        res.json({
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
      } catch (error: any) {
        logger.error({ err: error }, "Error analyzing estate document");
        res.status(500).json({ error: "Failed to analyze estate document" });
      }
    }
  );

  app.post(
    "/api/clients/:clientId/estate-documents/review",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = req.params.clientId as string;
        const advisorId = req.session.userId!;

        const hasAccess = await verifyClientAccess(req, clientId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const body = validateBody(reviewEstateFactSchema, req, res);
        if (!body) return;

        const { analysisId, actions } = body;

        const cached = analysisCache.get(analysisId);
        if (!cached) {
          res.status(404).json({ error: "Analysis not found or expired. Please re-analyze the document." });
          return;
        }

        if (cached.clientId !== clientId || cached.advisorId !== advisorId) {
          res.status(403).json({ error: "Analysis does not belong to this client/advisor" });
          return;
        }

        const serverFacts = cached.facts;

        const insertValues: InsertCandidateFact[] = [];
        let approvedCount = 0;
        let editedCount = 0;
        let rejectedCount = 0;

        for (const action of actions) {
          const fact = serverFacts[action.factIndex];
          if (!fact) continue;

          if (action.action === "reject") {
            rejectedCount++;
            continue;
          }

          const status = action.action === "edit" ? "edited" : "approved";
          if (action.action === "approve") approvedCount++;
          if (action.action === "edit") editedCount++;

          insertValues.push({
            jobId: analysisId,
            clientId,
            factType: fact.factType,
            factLabel: fact.factLabel,
            factValue: action.action === "edit" && action.factValue ? action.factValue : fact.factValue,
            normalizedValue: fact.normalizedValue || null,
            confidence: fact.confidence,
            sourceSnippet: fact.sourceSnippet || null,
            sourceReference: fact.sourceReference || null,
            ambiguityFlag: fact.ambiguityFlag || false,
            originalReviewRequired: false,
            editorNote: action.editorNote || null,
            status,
            reviewerId: advisorId,
            reviewedAt: new Date(),
          });
        }

        if (insertValues.length > 0) {
          await storage.db.insert(candidateFacts).values(insertValues);
        }

        analysisCache.delete(analysisId);

        logger.info({
          analysisId,
          clientId,
          approved: approvedCount,
          edited: editedCount,
          rejected: rejectedCount,
        }, "Estate document facts reviewed");

        res.json({
          status: "reviewed",
          analysisId,
          approved: approvedCount,
          edited: editedCount,
          rejected: rejectedCount,
          totalCommitted: insertValues.length,
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error reviewing estate document facts");
        res.status(500).json({ error: "Failed to review estate document facts" });
      }
    }
  );

  app.get(
    "/api/clients/:clientId/estate-documents/facts",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const clientId = req.params.clientId as string;

        const hasAccess = await verifyClientAccess(req, clientId);
        if (!hasAccess) {
          res.status(403).json({ error: "Access denied" });
          return;
        }

        const allFacts = await storage.db
          .select()
          .from(candidateFacts)
          .where(eq(candidateFacts.clientId, clientId));

        const estateRelatedFacts = allFacts.filter(f =>
          f.factType.startsWith("estate_")
        );

        res.json({
          facts: estateRelatedFacts,
          count: estateRelatedFacts.length,
          byType: {
            beneficiaries: estateRelatedFacts.filter(f => f.factType === "estate_beneficiary").length,
            trustees: estateRelatedFacts.filter(f => f.factType === "estate_trustee").length,
            provisions: estateRelatedFacts.filter(f => f.factType === "estate_provision").length,
            conditions: estateRelatedFacts.filter(f => f.factType === "estate_condition").length,
          },
        });
      } catch (error: any) {
        logger.error({ err: error }, "Error fetching estate document facts");
        res.status(500).json({ error: "Failed to fetch estate document facts" });
      }
    }
  );
}
