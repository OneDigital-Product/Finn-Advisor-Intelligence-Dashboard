import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(
  request: Request, { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const meeting = await storage.getMeeting(id);
  if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });

  if (meeting.advisorId !== session.userId) {
    return NextResponse.json({ message: "Access denied" }, { status: 403 });
  }

  let client = null;
  if (meeting.clientId) {
    client = await storage.getClient(meeting.clientId);
  }

  return NextResponse.json({ ...meeting, client });
} catch (err) {
    logger.error({ err }, "[meetings/[id]] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
