import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

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
      if (current.trim()) { chunks.push(current.trim()); current = ""; }
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
  if (current.trim()) chunks.push(current.trim());
  if (chunks.length === 0 && text.trim()) chunks.push(...splitLongText(text, chunkSize, overlap));
  return chunks;
}

const createSchema = z.object({
  title: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  content: z.string().min(1).max(500000),
  version: z.string().max(20).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const docs = await storage.getSopDocuments(status);
    return NextResponse.json(docs);
  } catch (err) {
    logger.error({ err }, "Error fetching SOP documents");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });

    const doc = await storage.createSopDocument({
      ...parsed.data,
      uploadedBy: auth.session.userId || null,
    });

    const chunks = chunkText(parsed.data.content);
    for (let i = 0; i < chunks.length; i++) {
      await storage.createSopChunk({
        documentId: doc.id,
        chunkIndex: i,
        content: chunks[i],
        metadata: { charCount: chunks[i].length, wordCount: chunks[i].split(/\s+/).length },
      });
    }

    return NextResponse.json({ ...doc, chunkCount: chunks.length }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "Error creating SOP document");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
