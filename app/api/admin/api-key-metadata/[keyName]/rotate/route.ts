import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ keyName: string }> }
) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;
  try {
    const { keyName } = await params;
    const advisor = await getSessionAdvisor(auth.session);
    const result = await storage.markApiKeyRotated(keyName, advisor?.name || "unknown");
    if (!result) {
      return NextResponse.json({ message: "Key metadata not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "POST /api/admin/api-key-metadata/:keyName/rotate error");
    return NextResponse.json({ message: "Failed to mark key as rotated" }, { status: 500 });
  }
}
