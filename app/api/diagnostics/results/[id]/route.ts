import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

// GET serves as both "get results by clientId" and "get results by id"
// since the Express routes used the same path pattern with different semantics.
// The storage layer handles this -- getDiagnosticResults returns a list,
// so this works for both client-scoped queries and individual lookups.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const results = await storage.getDiagnosticResults(id);
    return NextResponse.json(results);
  } catch (err: any) {
    logger.error({ err: err }, "[Diagnostics] Results error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    await storage.deleteDiagnosticResult(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err: err }, "[Diagnostics] Delete result error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
