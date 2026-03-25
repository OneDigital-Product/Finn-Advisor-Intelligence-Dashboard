import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { factFinderDefinitions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const definitions = await db
      .select()
      .from(factFinderDefinitions)
      .where(eq(factFinderDefinitions.isActive, true))
      .orderBy(factFinderDefinitions.name);

    return NextResponse.json(definitions);
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinders] GET error:");
    return NextResponse.json({ message: "Failed to fetch fact finders" }, { status: 500 });
  }
}
