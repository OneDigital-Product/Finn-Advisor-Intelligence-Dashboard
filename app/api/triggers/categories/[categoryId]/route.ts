import { NextRequest, NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const auth = await requireAdvisor();
    if (auth.error) return auth.error;
    const { categoryId } = await params;

    const body = await request.json();
    const { name, description, defaultActions } = body;
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (defaultActions !== undefined) updateData.defaultActions = defaultActions;

    const category = await storage.updateTriggerCategory(categoryId, updateData);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json(category);
  } catch (err: any) {
    logger.error({ err: err }, "[Triggers] PUT category error:");
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}
