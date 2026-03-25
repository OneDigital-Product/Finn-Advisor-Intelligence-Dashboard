import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ weekStart: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { weekStart } = await params;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekMeetings = await storage.getMeetingsByDateRange(advisor.id, weekStart, weekEnd.toISOString().split("T")[0]);
    const meetingsWithClients = await Promise.all(
      weekMeetings.map(async (m) => {
        const client = m.clientId ? await storage.getClient(m.clientId) : null;
        return { ...m, client };
      })
    );

    const days: Record<string, any[]> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      days[key] = meetingsWithClients.filter(m => m.startTime.startsWith(key));
    }

    return NextResponse.json({ weekStart, days, meetings: meetingsWithClients });
  } catch (error: any) {
    logger.error({ err: error }, "Calendar week API error");
    return NextResponse.json({ message: "Failed to fetch week data" }, { status: 500 });
  }
}
