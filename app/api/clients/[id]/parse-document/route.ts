import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { parseClientDocument, classifyDocument } from "@server/openai";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const parseDocumentBodySchema = z.object({
  text: z.string().max(10 * 1024 * 1024, "Text exceeds 10MB limit").optional(),
  documentType: z.string().optional(),
  applyUpdates: z.union([z.literal("true"), z.literal(true), z.literal("false"), z.literal(false)]).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const clientId = id;

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const textField = formData.get("text") as string | null;
    const documentTypeField = formData.get("documentType") as string | null;
    const applyUpdatesField = formData.get("applyUpdates") as string | null;

    const parsed = parseDocumentBodySchema.safeParse({
      text: textField || undefined,
      documentType: documentTypeField || undefined,
      applyUpdates: applyUpdatesField || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    let documentText = "";
    let fileName = "";
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      documentText = buffer.toString("utf-8");
      fileName = file.name;
    } else if (parsed.data.text) {
      documentText = parsed.data.text;
    } else {
      return NextResponse.json({ message: "No document file or text provided" }, { status: 400 });
    }

    const documentType = parsed.data.documentType || "general";

    const result = await parseClientDocument(documentText, documentType, {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
    });

    if (parsed.data.applyUpdates === "true" || parsed.data.applyUpdates === true) {
      const cleanUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(result.profileUpdates)) {
        if (value !== null && value !== undefined && value !== "") {
          cleanUpdates[key] = value;
        }
      }
      if (Object.keys(cleanUpdates).length > 0) {
        await storage.updateClient(id, cleanUpdates);
      }

      const createdAccountIds: string[] = [];
      for (const acct of result.accounts) {
        if (acct.accountNumber && acct.accountType) {
          const created = await storage.createAccount({
            clientId: id,
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
        const targetAccountId = createdAccountIds[0] || (await storage.getAccountsByClient(id))[0]?.id;
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

    if (!fileName) {
      fileName = `${documentType}_${new Date().toISOString().slice(0, 10)}.txt`;
    }

    const savedDoc = await storage.createDocument({
      clientId: id,
      name: fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
      type: documentType,
      status: "uploaded",
      uploadDate: new Date().toISOString(),
      fileName,
      fileContent: documentText,
    });

    let classificationResult: any = null;
    try {
      const checklist = await storage.getDocumentChecklist(id);
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
      logger.error({ err: classErr }, "[Documents] Classification error (non-fatal):");
    }

    return NextResponse.json({ ...result, savedDocumentId: savedDoc.id, classification: classificationResult });
  } catch (err: any) {
    logger.error({ err: err }, "[Documents] Parse document error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
