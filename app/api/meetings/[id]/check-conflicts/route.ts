import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { id } = await params;
    const meeting = await storage.getMeeting(id);
    if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });

    const conflicts = await storage.checkMeetingConflicts(
      advisor.id, meeting.startTime, meeting.endTime, meeting.id
    );

    return NextResponse.json({ hasConflicts: conflicts.length > 0, conflicts });
  } catch (error: any) {
    logger.error({ err: error }, "Conflict check API error");
    return NextResponse.json({ message: "Failed to check conflicts" }, { status: 500 });
  }
}
