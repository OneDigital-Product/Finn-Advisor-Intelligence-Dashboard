import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { logger } from "@server/lib/logger";
import { custodialChanges } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") || undefined;

    if (statusFilter && statusFilter !== "all") {
      const results = await db
        .select()
        .from(custodialChanges)
        .where(eq(custodialChanges.status, statusFilter))
        .orderBy(desc(custodialChanges.createdAt));
      return NextResponse.json(results);
    }

    const results = await db
      .select()
      .from(custodialChanges)
      .orderBy(desc(custodialChanges.createdAt));
    return NextResponse.json(results);
  } catch (err) {
    logger.error({ err }, "Error fetching custodial changes");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
