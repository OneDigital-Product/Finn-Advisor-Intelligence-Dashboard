import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const meetingNotesSchema = z.object({
  notes: z.string().nullable().optional(),
});

export async function POST(
  request: Request, { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  const body = await request.json();
  const validation = validateBody(meetingNotesSchema, body);
  if (validation.error) return validation.error;
  const data = validation.data;

  const existing = await storage.getMeeting(id);
  if (!existing) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  if (existing.advisorId !== session.userId) return NextResponse.json({ message: "Access denied" }, { status: 403 });

  const meeting = await storage.updateMeeting(id, { notes: data.notes });
  if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });

  return NextResponse.json(meeting);
} catch (err) {
    logger.error({ err }, "[meetings/[id]/notes] POST failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
