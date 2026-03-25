import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { insertCharitableGoalSchema } from "@shared/schema";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const raw = await request.json();
    const data = insertCharitableGoalSchema.parse(raw);
    const client = await storage.getClient(data.clientId);
    if (!client || client.advisorId !== advisor.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const goal = await storage.createCharitableGoal(data);
    return NextResponse.json(goal);
  } catch (error: any) {
    return NextResponse.json({ error: sanitizeErrorMessage(error, "Failed to create charitable goal") }, { status: 400 });
  }
}
