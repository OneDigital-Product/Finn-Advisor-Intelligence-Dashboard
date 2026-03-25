import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const result = await storage.getDiagnosticResult(id);
    if (!result) return NextResponse.json({ message: "Result not found" }, { status: 404 });

    return NextResponse.json(result);
  } catch (err: any) {
    logger.error({ err: err }, "[Diagnostics] Result error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
