import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { factFinderDefinitions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { renderFactFinder } from "@server/engines/fact-finder-renderer";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const answersParam = new URL(request.url).searchParams.get("answers");
    const answers = answersParam ? JSON.parse(answersParam) : {};
    const rendered = renderFactFinder(definition, answers);

    return NextResponse.json(rendered);
  } catch (err: any) {
    logger.error({ err: err }, "[FactFinders] Render error:");
    return NextResponse.json({ message: "Failed to render fact finder" }, { status: 500 });
  }
}
