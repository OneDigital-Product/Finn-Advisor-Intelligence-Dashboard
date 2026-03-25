import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { upload, uploadLimiter, getStandardChecklist } from "./utils";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { storage } from "../storage";
import { parseClientDocument, classifyDocument } from "../openai";

const updateChecklistItemSchema = z.object({
  received: z.boolean({ required_error: "received must be a boolean" }),
  receivedDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const parseDocumentBodySchema = z.object({
  text: z.string().max(10 * 1024 * 1024, "Text exceeds 10MB limit").optional(),
  documentType: z.string().optional(),
  applyUpdates: z.union([z.literal("true"), z.literal(true), z.literal("false"), z.literal(false)]).optional(),
});

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerDocumentRoutes(app: Express) {
  app.patch("/api/document-checklist/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateChecklistItemSchema, req, res);
      if (!body) return;
      const updateData: { received: boolean; receivedDate?: string | null; notes?: string | null } = { received: body.received };
      if (body.receivedDate !== undefined) updateData.receivedDate = body.receivedDate;
      if (body.notes !== undefined) updateData.notes = body.notes;
      const updated = await storage.updateDocumentChecklistItem(p(req.params.id), updateData);
      if (!updated) return res.status(404).json({ message: "Checklist item not found" });
      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:id/init-checklist", requireAuth, async (req, res) => {
    try {
      const client = await storage.getClient(p(req.params.id));
      if (!client) return res.status(404).json({ message: "Client not found" });

      const existing = await storage.getDocumentChecklist(p(req.params.id));
      if (existing.length > 0) return res.json(existing);

      const standardChecklist = getStandardChecklist(p(req.params.id));
      const created = [];
      for (const item of standardChecklist) {
        const result = await storage.createDocumentChecklistItem(item);
        created.push(result);
      }
      res.json(created);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:id/parse-document", requireAuth, uploadLimiter, upload.single("file"), async (req, res) => {
    try {
      const client = await storage.getClient(p(req.params.id));
      if (!client) return res.status(404).json({ message: "Client not found" });

      const bodyFields = validateBody(parseDocumentBodySchema, req, res);
      if (!bodyFields) return;

      let documentText = "";
      if (req.file) {
        documentText = req.file.buffer.toString("utf-8");
      } else if (bodyFields.text) {
        documentText = bodyFields.text;
      } else {
        return res.status(400).json({ message: "No document file or text provided" });
      }

      const documentType = bodyFields.documentType || "general";

      const result = await parseClientDocument(documentText, documentType, {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
      });

      if (bodyFields.applyUpdates === "true" || bodyFields.applyUpdates === true) {
        const cleanUpdates: Record<string, any> = {};
        for (const [key, value] of Object.entries(result.profileUpdates)) {
          if (value !== null && value !== undefined && value !== "") {
            cleanUpdates[key] = value;
          }
        }
        if (Object.keys(cleanUpdates).length > 0) {
          await storage.updateClient(p(req.params.id), cleanUpdates);
        }

        const createdAccountIds: string[] = [];
        for (const acct of result.accounts) {
          if (acct.accountNumber && acct.accountType) {
            const created = await storage.createAccount({
              clientId: p(req.params.id),
              accountNumber: acct.accountNumber,
              accountType: acct.accountType,
              custodian: acct.custodian || "Unknown",
              balance: acct.balance || "0",
              taxStatus: acct.taxStatus || null,
              model: acct.model || null,
              status: "active",
            });
            createdAccountIds.push(created.id);
          }
        }

        if (result.holdings.length > 0) {
          const targetAccountId = createdAccountIds[0] || (await storage.getAccountsByClient(p(req.params.id)))[0]?.id;
          if (targetAccountId) {
            for (const h of result.holdings) {
              if (h.ticker && h.name) {
                await storage.createHolding({
                  accountId: targetAccountId,
                  ticker: h.ticker,
                  name: h.name,
                  shares: h.shares || "0",
                  marketValue: h.marketValue || "0",
                  costBasis: h.costBasis || null,
                  unrealizedGainLoss: null,
                  weight: null,
                  sector: h.sector || null,
                });
              }
            }
          }
        }
      }

      const fileName = req.file?.originalname || `${documentType}_${new Date().toISOString().slice(0, 10)}.txt`;
      const savedDoc = await storage.createDocument({
        clientId: p(req.params.id),
        name: fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
        type: documentType,
        status: "uploaded",
        uploadDate: new Date().toISOString(),
        fileName,
        fileContent: documentText,
      });

      let classificationResult: any = null;
      try {
        const checklist = await storage.getDocumentChecklist(p(req.params.id));
        const pendingItems = checklist.filter(item => !item.received);
        if (pendingItems.length > 0) {
          const pendingIds = new Set(pendingItems.map(item => item.id));
          const classConfig = await storage.getActiveDocumentClassificationConfig();
          const classification = await classifyDocument({
            fileName,
            documentType,
            fileContent: documentText,
            clientName: `${client.firstName} ${client.lastName}`,
            checklistItems: pendingItems.map(item => ({
              id: item.id,
              category: item.category,
              documentName: item.documentName,
              description: item.description,
            })),
          }, classConfig ? { systemPrompt: classConfig.systemPrompt, userPromptTemplate: classConfig.userPromptTemplate } : null);

          classificationResult = classification;
          if (
            classification.matchedChecklistItemId &&
            typeof classification.matchedChecklistItemId === "string" &&
            pendingIds.has(classification.matchedChecklistItemId)
          ) {
            await storage.updateDocumentChecklistItem(classification.matchedChecklistItemId, {
              received: true,
              receivedDate: new Date().toISOString().split("T")[0],
              documentId: savedDoc.id,
              notes: `Auto-classified: ${classification.reasoning} (confidence: ${classification.confidence})`,
            });
          }
        }
      } catch (classErr: any) {
        logger.error({ err: classErr }, "Document classification error (non-fatal)");
      }

      res.json({ ...result, savedDocumentId: savedDoc.id, classification: classificationResult });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authorized" });

      const doc = await storage.getDocument(p(req.params.id));
      if (!doc) return res.status(404).json({ message: "Document not found" });

      const client = await storage.getClient(doc.clientId);
      if (!client || client.advisorId !== advisor.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!doc.fileContent) return res.status(404).json({ message: "No file content available for this document" });

      const fileName = doc.fileName || `${doc.name}.txt`;
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(doc.fileContent);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}
