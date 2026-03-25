import { handleCassidyCallback } from "@server/integrations/cassidy/callback-handler";
import { NextResponse } from "next/server";
import { logger } from "@server/lib/logger";

// The callback handler is framework-agnostic — delegate directly.
// It expects (req, res) but we need to adapt for Next.js.
export async function POST(request: Request) {
  try {
  const body = await request.json();

  // Create a mock req/res pair for the Express-style handler
  const result = await new Promise<{ status: number; body: any }>((resolve) => {
    const mockReq = {
      body,
      headers: Object.fromEntries(request.headers.entries()),
    };
    const mockRes = {
      status(code: number) {
        return {
          json(data: any) {
            resolve({ status: code, body: data });
          },
        };
      },
      json(data: any) {
        resolve({ status: 200, body: data });
      },
    };
    handleCassidyCallback(mockReq as any, mockRes as any);
  });

  return Response.json(result.body, { status: result.status });
} catch (err) {
    logger.error({ err }, "[cassidy/callback] POST failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
