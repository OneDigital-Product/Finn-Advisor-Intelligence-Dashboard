import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { hashPassword } from "@server/auth";
import { logger } from "@server/lib/logger";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  title: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = validateBody(signupSchema, rawBody);
    if (parsed.error) return parsed.error;

    const { name, email, password, title } = parsed.data;

    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith("@onedigital.com")) {
      return NextResponse.json(
        { message: "Only @onedigital.com email addresses are allowed" },
        { status: 400 }
      );
    }

    const existingAdvisor = await storage.getAdvisorByEmail(emailLower);
    if (existingAdvisor) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const existingAssociate = await storage.getAssociateByEmail(emailLower);
    if (existingAssociate) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const advisor = await storage.createAdvisor({
      name,
      email: emailLower,
      title: title || "Financial Advisor",
      passwordHash,
    });

    const session = await getSession();
    session.userId = advisor.id;
    session.userType = "advisor";
    session.userName = advisor.name;
    session.userEmail = advisor.email;
    session.userAvatarUrl = advisor.avatarUrl ?? undefined;
    await session.save();

    storage
      .recordLoginEvent({
        userId: advisor.id,
        userType: "advisor",
        userName: advisor.name,
        userEmail: advisor.email,
      })
      .catch(() => {});

    return NextResponse.json({
      id: advisor.id,
      name: advisor.name,
      email: advisor.email,
      type: "advisor",
      title: advisor.title,
      avatarUrl: advisor.avatarUrl,
      onboardingCompleted: advisor.onboardingCompleted,
    });
  } catch (error) {
    logger.error({ err: error }, "Signup error:");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
