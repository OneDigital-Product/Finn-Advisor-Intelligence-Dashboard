import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { getProfileReminders } from "@server/engines/reminder-engine";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisorId = auth.session.userId!;

    const reminders = await getProfileReminders(storage, advisorId);
    return NextResponse.json(reminders);
  } catch (err: any) {
    logger.error({ err: err }, "[Reminders] Pending error:");
    return NextResponse.json({ error: "Failed to fetch pending reminders" }, { status: 500 });
  }
}
