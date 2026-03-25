import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { checkAndCreateReminders } from "@server/engines/reminder-engine";
import { logger } from "@server/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisorId = auth.session.userId!;

    const url = new URL(request.url);
    const days = url.searchParams.get("days");
    const includeExpired = url.searchParams.get("includeExpired");

    const daysArray = days
      ? String(days).split(",").map(Number).filter((n) => !isNaN(n))
      : [30, 60, 90];

    const result = await checkAndCreateReminders(
      storage,
      advisorId,
      daysArray,
      includeExpired !== "false"
    );

    return NextResponse.json({
      ...result,
      summary: `Created ${result.createdTasks} reminder tasks, skipped ${result.skippedDuplicates} duplicates`,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[Reminders] Check error:");
    return NextResponse.json({ error: "Failed to check reminders" }, { status: 500 });
  }
}
