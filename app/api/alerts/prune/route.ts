import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { AlertEngine } from "@server/engines/alert-engine";

const engine = new AlertEngine();

export async function POST() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const pruned = await engine.pruneDismissedAlerts(30);
    return NextResponse.json({ success: true, pruned });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to prune alerts" }, { status: 500 });
  }
}
