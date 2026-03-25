import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { getStandardChecklist } from "@server/routes/utils";
import { logger } from "@server/lib/logger";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const client = await storage.getClient(id);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });

    const existing = await storage.getDocumentChecklist(id);
    if (existing.length > 0) return NextResponse.json(existing);

    const standardChecklist = getStandardChecklist(id);
    const created = [];
    for (const item of standardChecklist) {
      const result = await storage.createDocumentChecklistItem(item);
      created.push(result);
    }

    return NextResponse.json(created);
  } catch (err: any) {
    logger.error({ err: err }, "[Documents] Init checklist error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
