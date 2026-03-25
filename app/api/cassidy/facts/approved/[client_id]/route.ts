import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { clients, candidateFacts } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ client_id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { client_id } = await params;
    const advisorId = auth.session.userId;

    const client = await storage.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, client_id), eq(clients.advisorId, advisorId)))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({ error: "Client not found or not authorized" }, { status: 404 });
    }

    const approvedFacts = await storage.db
      .select()
      .from(candidateFacts)
      .where(
        and(
          eq(candidateFacts.clientId, client_id),
          inArray(candidateFacts.status, ["approved", "edited"]),
        ),
      );

    const highCount = approvedFacts.filter((f) => f.confidence === "HIGH").length;
    const mediumCount = approvedFacts.filter((f) => f.confidence === "MEDIUM").length;
    const lowCount = approvedFacts.filter((f) => f.confidence === "LOW").length;

    return NextResponse.json({
      count: approvedFacts.length,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      facts: approvedFacts,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching approved facts");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
