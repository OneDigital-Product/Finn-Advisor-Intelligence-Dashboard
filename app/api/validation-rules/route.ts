import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { validationRules } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const module = url.searchParams.get("module");

    let conditions: any[] = [];
    if (module && module !== "all") {
      conditions.push(eq(validationRules.module, module));
    }

    const rules = await db
      .select()
      .from(validationRules)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(validationRules.module, validationRules.ruleKey);

    return NextResponse.json(rules);
  } catch (err: any) {
    logger.error({ err: err }, "[Validation] GET rules error:");
    return NextResponse.json({ error: "Failed to fetch validation rules" }, { status: 500 });
  }
}
