import { NextResponse } from "next/server";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const config = await storage.getAlertConfig(advisor.id);
    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to get alert config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const { alertType, enabled, threshold } = await request.json();
    if (!alertType)
      return NextResponse.json({ error: "alertType required" }, { status: 400 });

    const result = await storage.upsertAlertConfig(advisor.id, alertType, {
      enabled,
      threshold,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
