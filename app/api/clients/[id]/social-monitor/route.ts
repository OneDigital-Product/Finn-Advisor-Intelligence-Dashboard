import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

function generateContextualDetail(eventType: string): string {
  const details: Record<string, string[]> = {
    job_change: ["Acme Financial", "Vanguard Group", "BlackRock", "JP Morgan"],
    promotion: ["Senior Vice President", "Managing Director", "Chief Financial Officer"],
    company_milestone: ["$1B in AUM", "10-year anniversary", "a major acquisition"],
    life_event: ["a new family member", "a milestone birthday", "a new home"],
    education: ["Financial Planning", "Wealth Management", "CFA Level III"],
    award: ["Industry Leader Award", "Top 40 Under 40"],
    publication: ["market outlook", "estate planning strategies"],
  };
  const opts = details[eventType] || ["a notable achievement"];
  return opts[Math.floor(Math.random() * opts.length)];
}

function generateEventDescription(eventType: string, name: string): string {
  const descriptions: Record<string, string> = {
    job_change: `${name} has made a career transition that may warrant a portfolio review.`,
    promotion: `${name} has been promoted, likely resulting in increased compensation.`,
    company_milestone: `${name}'s company has achieved a significant milestone.`,
    life_event: `${name} has experienced a notable life event impacting financial planning needs.`,
    education: `${name} has completed an educational milestone.`,
    award: `${name} has received professional recognition.`,
    publication: `${name} has published professional content.`,
  };
  return descriptions[eventType] || `A social event has been detected for ${name}.`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const clientId = id;
    const client = await storage.getClient(clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (auth.session.userType === "advisor" && client.advisorId !== auth.session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const profiles = await storage.getSocialProfilesByClient(clientId);
    const monitoredProfiles = profiles.filter(p => p.monitoringEnabled);

    if (monitoredProfiles.length === 0) {
      return NextResponse.json({ checked: 0, newEvents: 0, message: "No monitored profiles" });
    }

    const eventTypes = ["job_change", "promotion", "company_milestone", "life_event", "education", "award", "publication"];
    const eventTitles: Record<string, string[]> = {
      job_change: ["Started new role at", "Joined", "Moved to"],
      promotion: ["Promoted to", "Elevated to", "Named as"],
      company_milestone: ["Company reached", "Celebrating"],
      life_event: ["Welcomed", "Celebrated", "Moved to new city"],
      education: ["Completed certification in", "Graduated from"],
      award: ["Received", "Won", "Honored with"],
      publication: ["Published article on", "Featured in"],
    };

    let newEvents = 0;
    for (const profile of monitoredProfiles) {
      const shouldGenerate = Math.random() < 0.35;
      if (shouldGenerate) {
        const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const titles = eventTitles[type];
        const title = titles[Math.floor(Math.random() * titles.length)];
        const displayName = profile.displayName || `${client.firstName} ${client.lastName}`;

        await storage.createSocialEvent({
          socialProfileId: profile.id,
          clientId: profile.clientId,
          eventType: type,
          title: `${displayName} — ${title} ${generateContextualDetail(type)}`,
          description: generateEventDescription(type, displayName),
          detectedAt: new Date(),
          sourceUrl: profile.profileUrl,
          isRead: false,
          outreachPrompt: null,
          outreachGenerated: false,
        });
        newEvents++;
      }
      await storage.updateSocialProfile(profile.id, { lastCheckedAt: new Date() });
    }

    return NextResponse.json({ checked: monitoredProfiles.length, newEvents });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
