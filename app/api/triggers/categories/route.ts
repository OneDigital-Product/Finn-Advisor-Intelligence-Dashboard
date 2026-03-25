import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const categories = await storage.getTriggerCategories();
    return NextResponse.json(categories);
  } catch (err: any) {
    logger.error({ err: err }, "[Triggers] GET categories error:");
    return NextResponse.json({ error: "Failed to fetch trigger categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { name, description, defaultActions } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const category = await storage.createTriggerCategory({
      name,
      description: description || null,
      defaultActions: defaultActions || [],
      isActive: true,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    logger.error({ err: err }, "[Triggers] POST category error:");
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
