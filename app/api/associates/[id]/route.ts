import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisor } from "@lib/auth-helpers";
import { validateBody, validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { hashPassword } from "@server/auth";
import { logger } from "@server/lib/logger";

const updateAssociateSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    role: z.string().optional(),
    phone: z.string().nullable().optional(),
    password: z.string().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/associates/[id]
// ---------------------------------------------------------------------------
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  const { id } = await params;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  try {
    const body = await request.json();
    const validation = validateBody(updateAssociateSchema, body);
    if (validation.error) return validation.error;

    const update: any = {};
    if (validation.data.name !== undefined) update.name = validation.data.name;
    if (validation.data.email !== undefined) update.email = validation.data.email;
    if (validation.data.role !== undefined) update.role = validation.data.role;
    if (validation.data.phone !== undefined) update.phone = validation.data.phone;
    if (validation.data.active !== undefined) update.active = validation.data.active;
    if (validation.data.password) update.passwordHash = hashPassword(validation.data.password);

    const result = await storage.updateAssociate(id, update);
    if (!result) {
      return NextResponse.json({ message: "Associate not found" }, { status: 404 });
    }

    const { passwordHash, ...safe } = result;
    return NextResponse.json(safe);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

// Also support PUT for flexibility
export { PATCH as PUT };

// ---------------------------------------------------------------------------
// DELETE /api/associates/[id]
// ---------------------------------------------------------------------------
export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  const { id } = await params;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  try {
    await storage.deleteAssociate(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
