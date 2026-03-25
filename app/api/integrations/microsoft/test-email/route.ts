import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { sendFollowUpEmail } from "@server/integrations/microsoft/email";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { recipientEmail } = await request.json();
    if (!recipientEmail) {
      return NextResponse.json({ error: "recipientEmail required" }, { status: 400 });
    }

    const result = await sendFollowUpEmail({
      clientName: "Test User",
      clientEmail: recipientEmail,
      advisorName: "Test Advisor",
      meetingNotes: "This is a test email from the Advisor Intelligence Suite.",
    });

    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err }, "Test email error");
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
