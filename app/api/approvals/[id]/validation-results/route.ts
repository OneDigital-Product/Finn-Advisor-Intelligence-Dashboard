import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { validationResults } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const url = new URL(request.url);
    const history = url.searchParams.get("history");

    if (history === "true") {
      const allResults = await db
        .select()
        .from(validationResults)
        .where(eq(validationResults.approvalItemId, id))
        .orderBy(desc(validationResults.createdAt));

      return NextResponse.json({ approvalItemId: id, results: allResults });
    }

    const latestRunRow = await db
      .select({ runId: validationResults.runId })
      .from(validationResults)
      .where(eq(validationResults.approvalItemId, id))
      .orderBy(desc(validationResults.createdAt))
      .limit(1);

    if (latestRunRow.length === 0) {
      return NextResponse.json({
        approvalItemId: id,
        passed: false,
        totalChecks: 0,
        passCount: 0,
        failCount: 0,
        warnCount: 0,
        results: [],
        runId: null,
      });
    }

    const latestRunId = latestRunRow[0].runId;
    const results = await db
      .select()
      .from(validationResults)
      .where(and(
        eq(validationResults.approvalItemId, id),
        eq(validationResults.runId, latestRunId)
      ))
      .orderBy(validationResults.module, validationResults.ruleKey);

    const passCount = results.filter(r => r.status === "pass").length;
    const failCount = results.filter(r => r.status === "fail").length;
    const warnCount = results.filter(r => r.status === "warn").length;

    return NextResponse.json({
      approvalItemId: id,
      runId: latestRunId,
      passed: failCount === 0 && results.length > 0,
      totalChecks: results.length,
      passCount,
      failCount,
      warnCount,
      results,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[Validation] Results error:");
    return NextResponse.json({ error: "Failed to fetch validation results" }, { status: 500 });
  }
}
