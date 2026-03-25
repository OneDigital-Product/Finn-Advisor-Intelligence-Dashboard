import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const all = await storage.getCustodialInstructions();
    const custodians = [...new Set(all.map(i => i.custodian))].sort();
    const actionTypes = [...new Set(all.map(i => i.actionType))].sort();
    return NextResponse.json({ custodians, actionTypes });
  } catch (err) {
    logger.error({ err }, "Error listing custodians");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
