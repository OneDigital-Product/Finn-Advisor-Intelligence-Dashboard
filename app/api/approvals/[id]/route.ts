import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { approvalItems } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  try {
    const { id } = await params;
    const advisorId = session.userId;

    const [item] = await db
      .select()
      .from(approvalItems)
      .where(and(eq(approvalItems.id, id), eq(approvalItems.submittedBy, advisorId!)));

    if (!item) {
      return NextResponse.json({ error: "Approval item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err: any) {
    logger.error({ err: err }, "GET /api/approvals/:id error");
    return NextResponse.json({ error: "Failed to fetch approval item" }, { status: 500 });
  }
}
