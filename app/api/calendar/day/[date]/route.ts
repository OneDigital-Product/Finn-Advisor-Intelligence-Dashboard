import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { date } = await params;
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayMeetings = await storage.getMeetingsByDateRange(advisor.id, date, nextDay.toISOString().split("T")[0]);
    const meetingsWithClients = await Promise.all(
      dayMeetings.map(async (m) => {
        const client = m.clientId ? await storage.getClient(m.clientId) : null;
        return { ...m, client };
      })
    );

    return NextResponse.json({ date, meetings: meetingsWithClients });
  } catch (error: any) {
    logger.error({ err: error }, "Calendar day API error");
    return NextResponse.json({ message: "Failed to fetch day data" }, { status: 500 });
  }
}
