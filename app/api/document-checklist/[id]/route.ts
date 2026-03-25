import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { z } from "zod";
import { logger } from "@server/lib/logger";

const updateChecklistItemSchema = z.object({
  received: z.boolean({ required_error: "received must be a boolean" }),
  receivedDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const parsed = updateChecklistItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.errors[0].message }, { status: 400 });
    }

    const updateData: { received: boolean; receivedDate?: string | null; notes?: string | null } = { received: parsed.data.received };
    if (parsed.data.receivedDate !== undefined) updateData.receivedDate = parsed.data.receivedDate;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const updated = await storage.updateDocumentChecklistItem(id, updateData);
    if (!updated) return NextResponse.json({ message: "Checklist item not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (err: any) {
    logger.error({ err: err }, "[Documents] PATCH checklist item error:");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
