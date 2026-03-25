import { NextRequest, NextResponse } from "next/server";
import { getSessionAdvisor } from "@lib/auth-helpers";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    const { id } = await params;

    const doc = await storage.getDocument(id);
    if (!doc) return NextResponse.json({ message: "Document not found" }, { status: 404 });

    const client = await storage.getClient(doc.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    if (!doc.fileContent) return NextResponse.json({ message: "No file content available for this document" }, { status: 404 });

    const fileName = doc.fileName || `${doc.name}.txt`;
    return new NextResponse(doc.fileContent, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err: any) {
    logger.error({ err: err }, "[Documents] Download error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
