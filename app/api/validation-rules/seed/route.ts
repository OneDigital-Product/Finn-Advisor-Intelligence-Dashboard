import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { db } from "@server/db";
import { validationRules } from "@shared/schema";
import { sql } from "drizzle-orm";
import { DEFAULT_VALIDATION_RULES } from "@server/engines/submission-validator";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const existing = await db.select({ count: sql<number>`count(*)::int` }).from(validationRules);
    if ((existing[0]?.count || 0) > 0) {
      return NextResponse.json({ message: "Rules already exist", count: existing[0].count });
    }

    const rows = DEFAULT_VALIDATION_RULES.map(r => ({
      ...r,
      enabled: true,
      config: {},
    }));

    await db.insert(validationRules).values(rows);
    return NextResponse.json({ message: "Default validation rules seeded", count: rows.length });
  } catch (err: any) {
    logger.error({ err: err }, "[Validation] Seed error:");
    return NextResponse.json({ error: "Failed to seed validation rules" }, { status: 500 });
  }
}
