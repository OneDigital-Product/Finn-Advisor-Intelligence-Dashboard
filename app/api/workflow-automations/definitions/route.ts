import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;
    const isActive = url.searchParams.get("isActive") === "true" ? true : url.searchParams.get("isActive") === "false" ? false : undefined;
    const definitions = await storage.getWorkflowDefinitions_v2({ category, isActive });
    return NextResponse.json(definitions);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
