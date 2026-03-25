import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { marketDataService } from "@server/market-data";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const tickers = (url.searchParams.get("tickers") || "")
    .split(",")
    .filter(Boolean)
    .map((t) => t.toUpperCase());

  if (tickers.length === 0) {
    return NextResponse.json(
      { message: "tickers query parameter required" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(":connection established\n\n"));

      // Send initial quotes
      try {
        const quotes = await marketDataService.getQuotes(tickers);
        for (const quote of quotes.values()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(quote)}\n\n`));
        }
      } catch (error) {
        logger.error({ err: error }, "Error sending initial SSE quotes");
      }

      // Note: WebSocket-based live streaming requires server-level state
      // that cannot be maintained in a serverless Next.js route handler.
      // The initial quotes are sent, and the stream stays open for the client.
      // In production, use a dedicated WebSocket server for live updates.
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
} catch (err) {
    logger.error({ err }, "[market/stream] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
