import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdvisor } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { hashPassword } from "@server/auth";
import { logger } from "@server/lib/logger";

const createAssociateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  role: z.string().optional(),
  phone: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// GET /api/associates
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const allAssociates = await storage.getAllAssociates();
    const safe = allAssociates.map(({ passwordHash, ...rest }) => rest);
    return NextResponse.json(safe);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/associates
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const validation = validateBody(createAssociateSchema, body);
    if (validation.error) return validation.error;

    const existing = await storage.getAssociateByEmail(validation.data.email);
    if (existing) {
      return NextResponse.json(
        { message: "An associate with this email already exists" },
        { status: 400 }
      );
    }

    const associate = await storage.createAssociate({
      name: validation.data.name,
      email: validation.data.email,
      role: validation.data.role || "analyst",
      phone: validation.data.phone || null,
      passwordHash: hashPassword(validation.data.password),
      active: true,
    });

    const { passwordHash, ...safe } = associate;
    return NextResponse.json(safe);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
