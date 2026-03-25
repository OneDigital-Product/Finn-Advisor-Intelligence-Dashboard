import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { isZoomEnabled } from "@server/integrations/zoom/client";
import { createZoomMeeting } from "@server/integrations/zoom/meetings";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { meetingId } = await request.json();
    if (!meetingId) {
      return NextResponse.json({ error: "meetingId required" }, { status: 400 });
    }

    if (!isZoomEnabled()) {
      return NextResponse.json({ error: "Zoom integration not enabled" }, { status: 400 });
    }

    const result = await createZoomMeeting(meetingId);
    if (!result) {
      return NextResponse.json({ error: "Failed to create Zoom meeting" }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err }, "Create Zoom meeting error");
    return NextResponse.json({ error: "Failed to create Zoom meeting" }, { status: 500 });
  }
}
