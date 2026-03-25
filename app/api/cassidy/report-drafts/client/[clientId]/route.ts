import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { clients, reportArtifacts } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { clientId } = await params;
    const advisorId = auth.session.userId;
    const url = new URL(request.url);

    const [client] = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client not found or not authorized" }, { status: 404 });
    }

    const limitNum = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20") || 20, 1), 100);
    const offsetNum = Math.max(parseInt(url.searchParams.get("offset") || "0") || 0, 0);

    const drafts = await storage.db
      .select()
      .from(reportArtifacts)
      .where(and(eq(reportArtifacts.clientId, clientId), eq(reportArtifacts.advisorId, advisorId)))
      .orderBy(desc(reportArtifacts.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    return NextResponse.json({ drafts, limit: limitNum, offset: offsetNum });
  } catch (err) {
    logger.error({ err }, "Get client report drafts error");
    return NextResponse.json({ error: "Failed to retrieve drafts" }, { status: 500 });
  }
}
