import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

const simulateEventSchema = z.object({
  eventType: z.enum(["job_change", "promotion", "company_milestone", "life_event", "education", "award", "publication"]),
  title: z.string().min(1),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id: profileId } = await params;
    const profile = await storage.getSocialProfile(profileId);
    if (!profile) return NextResponse.json({ message: "Profile not found" }, { status: 404 });

    const client = await storage.getClient(profile.clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (auth.session.userType === "advisor" && client.advisorId !== auth.session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = simulateEventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Validation failed", errors: parsed.error.flatten() }, { status: 400 });

    const event = await storage.createSocialEvent({
      socialProfileId: profile.id,
      clientId: profile.clientId,
      eventType: parsed.data.eventType,
      title: parsed.data.title,
      description: parsed.data.description || null,
      detectedAt: new Date(),
      sourceUrl: parsed.data.sourceUrl || null,
      isRead: false,
      outreachPrompt: null,
      outreachGenerated: false,
    });
    return NextResponse.json(event);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
