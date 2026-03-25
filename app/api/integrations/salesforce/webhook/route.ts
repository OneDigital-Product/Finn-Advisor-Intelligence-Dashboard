import { NextResponse } from "next/server";
import { logger } from "@server/lib/logger";

export async function POST(request: Request) {
  try {
    const sfWebhookSecret = process.env.SALESFORCE_WEBHOOK_SECRET;
    if (!sfWebhookSecret) {
      logger.warn("[SF Webhook] SALESFORCE_WEBHOOK_SECRET not configured — rejecting webhook");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 403 });
    }

    const signature = request.headers.get("x-sf-signature");
    if (!signature) {
      logger.warn("[SF Webhook] Missing x-sf-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const rawBody = await request.text();
    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = createHmac("sha256", sfWebhookSecret).update(rawBody).digest("hex");
    const valid =
      signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));

    if (!valid) {
      logger.warn("[SF Webhook] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    logger.info({ event: event?.event || "unknown" }, "[SF Webhook] Received valid event");
    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error({ err }, "Salesforce webhook error");
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
