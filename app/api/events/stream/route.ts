import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { sseEventBus } from "@server/lib/sse-event-bus";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { session } = auth;

  const userId = session.userId;
  let mockRes: any = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ message: "SSE stream connected" })}\n\n`
        )
      );

      mockRes = {
        write(data: string) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {
            // stream closed
          }
        },
        end() {
          try {
            controller.close();
          } catch {
            // already closed
          }
        },
      };

      sseEventBus.addClient(mockRes, userId);
    },
    cancel() {
      if (mockRes) sseEventBus.removeClient(mockRes);
      logger.debug({ userId }, "SSE stream cancelled");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
} catch (err) {
    logger.error({ err }, "[events/stream] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
