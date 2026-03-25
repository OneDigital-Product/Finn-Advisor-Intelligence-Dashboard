import { NextResponse } from "next/server";
import { handleRecordingComplete, verifyZoomSignature } from "@server/integrations/zoom/webhooks";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);

    // Fail-closed: reject if no secret is configured
    if (!process.env.ZOOM_WEBHOOK_SECRET) {
      logger.warn("[Zoom Webhook] ZOOM_WEBHOOK_SECRET not configured — rejecting webhook");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 403 });
    }

    // Build a mock request object for signature verification
    const timestamp = request.headers.get("x-zm-request-timestamp") || "";
    const signature = request.headers.get("x-zm-signature") || "";
    const mockReq = {
      headers: {
        "x-zm-request-timestamp": timestamp,
        "x-zm-signature": signature,
      },
    };

    if (!verifyZoomSignature(mockReq as any, body)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.event === "endpoint.url_validation") {
      const crypto = await import("crypto");
      const hashForValidation = crypto
        .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET || "")
        .update(event.payload?.plainToken || "")
        .digest("hex");
      return NextResponse.json({
        plainToken: event.payload?.plainToken,
        encryptedToken: hashForValidation,
      });
    }

    if (event.event === "recording.completed") {
      await handleRecordingComplete(event.payload || event);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error({ err }, "Zoom webhook error");
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
