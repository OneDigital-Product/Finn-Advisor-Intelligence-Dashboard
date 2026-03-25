import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { validateBody } from "../lib/validation";
import { requireAuth } from "./middleware";
import { storage } from "../storage";
import { querySopKnowledgeBase } from "../openai";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function splitLongText(text: string, maxLen: number, overlap: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < text.length; i += maxLen - overlap) {
    result.push(text.substring(i, i + maxLen).trim());
  }
  return result;
}

function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let current = "";

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...splitLongText(para, chunkSize, overlap));
      continue;
    }

    if ((current + "\n\n" + para).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  if (chunks.length === 0 && text.trim()) {
    chunks.push(...splitLongText(text, chunkSize, overlap));
  }

  return chunks;
}

const createSopDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  content: z.string().min(1).max(500000),
  version: z.string().max(20).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

const updateSopDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  content: z.string().min(1).max(500000).optional(),
  version: z.string().max(20).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

const sopQuerySchema = z.object({
  question: z.string().min(1).max(2000),
  category: z.string().optional(),
});

const createCustodialInstructionSchema = z.object({
  custodian: z.string().min(1).max(200),
  actionType: z.string().min(1).max(200),
  formName: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  requiredFields: z.array(z.string()).optional(),
  requiredSignatures: z.array(z.string()).optional(),
  supportingDocuments: z.array(z.string()).optional(),
  instructions: z.string().max(10000).optional(),
  processingTime: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateCustodialInstructionSchema = createCustodialInstructionSchema.partial();

const formRequirementsQuerySchema = z.object({
  custodian: z.string().min(1),
  actionType: z.string().min(1),
});

export function registerSopRoutes(app: Express) {
  app.get("/api/sop/documents", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const docs = await storage.getSopDocuments(status);
      res.json(docs);
    } catch (err) {
      logger.error({ err }, "Error fetching SOP documents");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/sop/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getSopDocument(req.params.id);
      if (!doc) return res.status(404).json({ message: "SOP document not found" });
      const chunks = await storage.getSopChunks(req.params.id);
      res.json({ ...doc, chunks });
    } catch (err) {
      logger.error({ err }, "Error fetching SOP document");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sop/documents", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createSopDocumentSchema, req, res);
      if (!body) return;

      const doc = await storage.createSopDocument({
        ...body,
        uploadedBy: req.session.userId || null,
      });

      const chunks = chunkText(body.content);
      for (let i = 0; i < chunks.length; i++) {
        await storage.createSopChunk({
          documentId: doc.id,
          chunkIndex: i,
          content: chunks[i],
          metadata: { charCount: chunks[i].length, wordCount: chunks[i].split(/\s+/).length },
        });
      }

      res.status(201).json({ ...doc, chunkCount: chunks.length });
    } catch (err) {
      logger.error({ err }, "Error creating SOP document");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/sop/documents/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateSopDocumentSchema, req, res);
      if (!body) return;

      const existing = await storage.getSopDocument(req.params.id);
      if (!existing) return res.status(404).json({ message: "SOP document not found" });

      const updated = await storage.updateSopDocument(req.params.id, body);

      if (body.content) {
        await storage.deleteSopChunksByDocument(req.params.id);
        const chunks = chunkText(body.content);
        for (let i = 0; i < chunks.length; i++) {
          await storage.createSopChunk({
            documentId: req.params.id,
            chunkIndex: i,
            content: chunks[i],
            metadata: { charCount: chunks[i].length, wordCount: chunks[i].split(/\s+/).length },
          });
        }
      }

      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error updating SOP document");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/sop/documents/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getSopDocument(req.params.id);
      if (!existing) return res.status(404).json({ message: "SOP document not found" });
      await storage.deleteSopDocument(req.params.id);
      res.json({ message: "Deleted" });
    } catch (err) {
      logger.error({ err }, "Error deleting SOP document");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sop/query", requireAuth, async (req, res) => {
    try {
      const body = validateBody(sopQuerySchema, req, res);
      if (!body) return;

      const relevantChunks = await storage.searchSopChunks(body.question, 8);

      const custodialMatches = await storage.getCustodialInstructions();
      const questionLower = body.question.toLowerCase();
      const relevantCustodial = custodialMatches.filter(ci =>
        questionLower.includes(ci.custodian.toLowerCase()) ||
        questionLower.includes(ci.actionType.toLowerCase()) ||
        questionLower.includes(ci.formName.toLowerCase())
      ).slice(0, 5);

      const result = await querySopKnowledgeBase(
        body.question,
        relevantChunks.map(c => ({
          content: c.content,
          documentTitle: c.documentTitle,
          documentCategory: c.documentCategory,
        })),
        relevantCustodial.length > 0 ? relevantCustodial.map(ci => ({
          custodian: ci.custodian,
          actionType: ci.actionType,
          formName: ci.formName,
          instructions: ci.instructions,
        })) : undefined
      );

      res.json(result);
    } catch (err) {
      logger.error({ err }, "Error querying SOP knowledge base");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/custodial-instructions", requireAuth, async (req, res) => {
    try {
      const custodian = req.query.custodian as string | undefined;
      const actionType = req.query.actionType as string | undefined;
      const instructions = await storage.getCustodialInstructions({ custodian, actionType });
      res.json(instructions);
    } catch (err) {
      logger.error({ err }, "Error fetching custodial instructions");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/custodial-instructions/:id", requireAuth, async (req, res) => {
    try {
      const instr = await storage.getCustodialInstruction(req.params.id);
      if (!instr) return res.status(404).json({ message: "Custodial instruction not found" });
      res.json(instr);
    } catch (err) {
      logger.error({ err }, "Error fetching custodial instruction");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/custodial-instructions", requireAuth, async (req, res) => {
    try {
      const body = validateBody(createCustodialInstructionSchema, req, res);
      if (!body) return;
      const instr = await storage.createCustodialInstruction(body);
      res.status(201).json(instr);
    } catch (err) {
      logger.error({ err }, "Error creating custodial instruction");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/custodial-instructions/:id", requireAuth, async (req, res) => {
    try {
      const body = validateBody(updateCustodialInstructionSchema, req, res);
      if (!body) return;
      const existing = await storage.getCustodialInstruction(req.params.id);
      if (!existing) return res.status(404).json({ message: "Custodial instruction not found" });
      const updated = await storage.updateCustodialInstruction(req.params.id, body);
      res.json(updated);
    } catch (err) {
      logger.error({ err }, "Error updating custodial instruction");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/custodial-instructions/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getCustodialInstruction(req.params.id);
      if (!existing) return res.status(404).json({ message: "Custodial instruction not found" });
      await storage.deleteCustodialInstruction(req.params.id);
      res.json({ message: "Deleted" });
    } catch (err) {
      logger.error({ err }, "Error deleting custodial instruction");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/custodial-instructions/form-requirements", requireAuth, async (req, res) => {
    try {
      const body = validateBody(formRequirementsQuerySchema, req, res);
      if (!body) return;

      const instructions = await storage.getCustodialInstructions({
        custodian: body.custodian,
        actionType: body.actionType,
      });

      if (instructions.length === 0) {
        return res.json({
          found: false,
          message: `No form requirements found for ${body.custodian} — ${body.actionType}`,
          requirements: null,
        });
      }

      const instr = instructions[0];
      res.json({
        found: true,
        requirements: {
          custodian: instr.custodian,
          actionType: instr.actionType,
          formName: instr.formName,
          description: instr.description,
          requiredFields: instr.requiredFields,
          requiredSignatures: instr.requiredSignatures,
          supportingDocuments: instr.supportingDocuments,
          instructions: instr.instructions,
          processingTime: instr.processingTime,
          notes: instr.notes,
        },
      });
    } catch (err) {
      logger.error({ err }, "Error checking form requirements");
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/custodial-instructions/custodians/list", requireAuth, async (req, res) => {
    try {
      const all = await storage.getCustodialInstructions();
      const custodians = [...new Set(all.map(i => i.custodian))].sort();
      const actionTypes = [...new Set(all.map(i => i.actionType))].sort();
      res.json({ custodians, actionTypes });
    } catch (err) {
      logger.error({ err }, "Error listing custodians");
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
