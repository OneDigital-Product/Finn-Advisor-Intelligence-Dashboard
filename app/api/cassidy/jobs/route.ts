import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { cassidyJobs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { storage, logger } from "@server/routes/cassidy/shared";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisorId = auth.session.userId;
    const jobs = await storage.db
      .select()
      .from(cassidyJobs)
      .where(eq(cassidyJobs.advisorId, advisorId))
      .orderBy(desc(cassidyJobs.createdAt))
      .limit(50);

    return NextResponse.json(jobs);
  } catch (err) {
    logger.error({ err }, "Error fetching Cassidy jobs");
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
