import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const url = new URL(request.url);
    const view = url.searchParams.get("view") || undefined;
    const startDate = url.searchParams.get("startDate") || undefined;
    const endDate = url.searchParams.get("endDate") || undefined;
    const clientId = url.searchParams.get("clientId") || undefined;

    if (view && !["day", "week", "month"].includes(view)) {
      return NextResponse.json({ message: "view must be day, week, or month" }, { status: 400 });
    }
    if (startDate && !dateRegex.test(startDate)) {
      return NextResponse.json({ message: "startDate must be YYYY-MM-DD" }, { status: 400 });
    }
    if (endDate && !dateRegex.test(endDate)) {
      return NextResponse.json({ message: "endDate must be YYYY-MM-DD" }, { status: 400 });
    }

    const start = startDate || new Date().toISOString().split("T")[0];

    let end: string;
    if (endDate) {
      end = endDate;
    } else if (view === "day") {
      const d = new Date(start);
      d.setDate(d.getDate() + 1);
      end = d.toISOString().split("T")[0];
    } else if (view === "week") {
      const d = new Date(start);
      d.setDate(d.getDate() + 7);
      end = d.toISOString().split("T")[0];
    } else {
      const d = new Date(start);
      d.setMonth(d.getMonth() + 1);
      end = d.toISOString().split("T")[0];
    }

    let allMeetings = await storage.getMeetingsByDateRange(advisor.id, start, end);

    if (clientId) {
      allMeetings = allMeetings.filter(m => m.clientId === clientId);
    }

    const meetingsWithClients = await Promise.all(
      allMeetings.map(async (meeting) => {
        const client = meeting.clientId ? await storage.getClient(meeting.clientId) : null;
        return { ...meeting, client };
      })
    );

    if (view === "day") {
      return NextResponse.json({ view: "day", startDate: start, endDate: end, meetings: meetingsWithClients });
    } else if (view === "week") {
      const grouped: Record<string, any[]> = {};
      for (const m of meetingsWithClients) {
        const day = m.startTime.split("T")[0];
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(m);
      }
      return NextResponse.json({ view: "week", startDate: start, endDate: end, days: grouped, meetings: meetingsWithClients });
    } else {
      const grouped: Record<string, any[]> = {};
      for (const m of meetingsWithClients) {
        const day = m.startTime.split("T")[0];
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(m);
      }
      return NextResponse.json({ view: "month", startDate: start, endDate: end, days: grouped, meetings: meetingsWithClients });
    }
  } catch (error: any) {
    logger.error({ err: error }, "Calendar API error");
    return NextResponse.json({ message: "Failed to fetch calendar data" }, { status: 500 });
  }
}
