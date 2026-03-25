import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { validateBody } from "@lib/validation";
import { checkRateLimit } from "@lib/rate-limit";
import { storage } from "@server/storage";
import { verifyPassword } from "@server/auth";
import { logger } from "@server/lib/logger";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const rateResult = await checkRateLimit(ip, 15 * 60 * 1000, 10);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { message: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const rawBody = await request.json();
    const parsed = validateBody(loginSchema, rawBody);
    if (parsed.error) return parsed.error;

    const { email, password } = parsed.data;

    // Check advisors first
    const advisor = await storage.getAdvisorByEmail(email);
    if (
      advisor &&
      advisor.passwordHash &&
      verifyPassword(password, advisor.passwordHash)
    ) {
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
    }

    // Then check associates
    const associate = await storage.getAssociateByEmail(email);
    if (
      associate &&
      associate.passwordHash &&
      verifyPassword(password, associate.passwordHash)
    ) {
      if (!associate.active) {
        return NextResponse.json(
          { message: "Account is inactive" },
          { status: 403 }
        );
      }

      const session = await getSession();
      session.userId = associate.id;
      session.userType = "associate";
      session.userName = associate.name;
      session.userEmail = associate.email;
      session.userAvatarUrl = associate.avatarUrl ?? undefined;
      await session.save();

      storage
        .recordLoginEvent({
          userId: associate.id,
          userType: "associate",
          userName: associate.name,
          userEmail: associate.email,
        })
        .catch(() => {});

      return NextResponse.json({
        id: associate.id,
        name: associate.name,
        email: associate.email,
        type: "associate",
        role: associate.role,
        avatarUrl: associate.avatarUrl,
      });
    }

    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  } catch (error) {
    logger.error({ err: error }, "Login error:");
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
