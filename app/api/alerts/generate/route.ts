import { NextResponse } from "next/server";
import { requireAdvisor, getSessionAdvisor } from "@lib/auth-helpers";
import { AlertEngine, type AlertType } from "@server/engines/alert-engine";
import { logger } from "@server/lib/logger";

const engine = new AlertEngine();

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const { types } = body || {};
    const alertTypes = types as AlertType[] | undefined;

    const result = await engine.run(advisor.id, alertTypes);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({ err }, "API error");
    return NextResponse.json({ error: "Alert generation failed" }, { status: 500 });
  }
}
