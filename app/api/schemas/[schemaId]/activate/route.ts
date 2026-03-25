import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ schemaId: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const { schemaId } = await params;
    await storage.toggleSchemaActive(schemaId, true);
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "PUT /api/schemas/:schemaId/activate error");
    return NextResponse.json({ error: "Failed to activate schema" }, { status: 500 });
  }
}
