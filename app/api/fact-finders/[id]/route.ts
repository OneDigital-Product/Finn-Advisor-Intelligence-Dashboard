import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { factFinderDefinitions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const [definition] = await db
      .select()
      .from(factFinderDefinitions)
      .where(eq(factFinderDefinitions.id, id))
      .limit(1);

    if (!definition) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(definition);
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinders] GET by id error:");
    return NextResponse.json({ message: "Failed to fetch fact finder" }, { status: 500 });
  }
}
