import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const [allClients, allActivities, allMeetings, allTasks] = await Promise.all([
      storage.getClients(advisor.id),
      storage.getActivities(advisor.id),
      storage.getMeetings(advisor.id),
      storage.getTasks(advisor.id),
    ]);

    const rows = allClients.map(c => {
      const clientActivities = allActivities.filter(a => a.clientId === c.id);
      const clientMeetings = allMeetings.filter(m => m.clientId === c.id);
      const clientTasks = allTasks.filter(t => t.clientId === c.id);
      const daysSinceContact = c.lastContactDate
        ? Math.floor((Date.now() - new Date(c.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        clientId: c.id,
        clientName: `${c.firstName} ${c.lastName}`,
        segment: c.segment,
        lastContact: c.lastContactDate,
        nextReview: c.nextReviewDate,
        daysSinceContact,
        activityCount: clientActivities.length,
        meetingCount: clientMeetings.length,
        openTasks: clientTasks.filter(t => t.status === "pending" || t.status === "in-progress").length,
        completedTasks: clientTasks.filter(t => t.status === "completed").length,
        engagementStatus: daysSinceContact === null ? "no_contact" :
          daysSinceContact <= 30 ? "active" :
          daysSinceContact <= 60 ? "recent" :
          daysSinceContact <= 90 ? "aging" : "at_risk",
      };
    });

    rows.sort((a, b) => (b.daysSinceContact ?? 999) - (a.daysSinceContact ?? 999));

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      totalClients: rows.length,
      engagementBreakdown: {
        active: rows.filter(r => r.engagementStatus === "active").length,
        recent: rows.filter(r => r.engagementStatus === "recent").length,
        aging: rows.filter(r => r.engagementStatus === "aging").length,
        atRisk: rows.filter(r => r.engagementStatus === "at_risk").length,
      },
      clients: rows,
    });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
