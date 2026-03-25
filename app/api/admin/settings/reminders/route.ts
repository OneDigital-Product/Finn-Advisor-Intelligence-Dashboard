import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { db } from "@server/db";
import { sql } from "drizzle-orm";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const reminderSettingsSchema = z.object({
  profileExpiration: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
  documentDeadline: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
  complianceReview: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
  clientReview: z.object({ enabled: z.boolean(), days: z.number() }).optional(),
});

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const result = await db.execute(
      sql`SELECT value FROM system_config WHERE key = 'reminder_settings'`
    );
    const row = (result as any).rows?.[0];
    if (row?.value) {
      return NextResponse.json(row.value);
    }
    return NextResponse.json({
      profileExpiration: { enabled: true, days: 30 },
      documentDeadline: { enabled: true, days: 14 },
      complianceReview: { enabled: true, days: 60 },
      clientReview: { enabled: true, days: 90 },
    });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/settings/reminders error");
    return NextResponse.json({ message: "Failed to fetch reminder settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const parsed = reminderSettingsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    await db.execute(
      sql`INSERT INTO system_config (key, value, updated_at) VALUES ('reminder_settings', ${JSON.stringify(parsed.data)}::jsonb, NOW())
          ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(parsed.data)}::jsonb, updated_at = NOW()`
    );
    return NextResponse.json(parsed.data);
  } catch (err) {
    logger.error({ err }, "PATCH /api/admin/settings/reminders error");
    return NextResponse.json({ message: "Failed to save reminder settings" }, { status: 500 });
  }
}
